import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Pool } from "pg";
import * as dotenv from "dotenv";


dotenv.config();

const log = {
  info: (msg: string) => console.error(`[INFO] ${new Date().toISOString()} - ${msg}`),
  error: (msg: string) => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`),
};

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5434'),
  database: process.env.DB_NAME || 'laboratorio_mcp',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'mcp_password',
});

async function ventasTotalMesAnterior() {
  log.info('📊 Calculando ventas totales del mes anterior');
  
  const query = `
    SELECT 
      COUNT(*) as total_transacciones,
      COALESCE(SUM(monto), 0) as total_ventas,
      COALESCE(AVG(monto), 0) as promedio_venta,
      MIN(monto) as venta_minima,
      MAX(monto) as venta_maxima,
      TO_CHAR(DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month'), 'YYYY-MM') as mes
    FROM ventas
    WHERE fecha >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
      AND fecha < DATE_TRUNC('month', CURRENT_DATE)
  `;
  
  try {
    const result = await pool.query(query);
    const data = result.rows[0];
    
    const response = {
      success: true,
      mes: data.mes,
      total_transacciones: parseInt(data.total_transacciones),
      total_ventas: parseFloat(data.total_ventas),
      promedio_venta: parseFloat(data.promedio_venta),
      venta_minima: parseFloat(data.venta_minima || 0),
      venta_maxima: parseFloat(data.venta_maxima || 0),
    };
    
    log.info(`✓ Ventas mes anterior: $${response.total_ventas.toFixed(2)}`);
    return response;
    
  } catch (error) {
    log.error(`✗ Error consultando ventas: ${error}`);
    return {
      success: false,
      error: String(error),
    };
  }
}


async function ventasPorDia(dias: number = 30) {
  log.info(`📈 Obteniendo ventas de los últimos ${dias} días`);
  
  const query = `
    SELECT 
      fecha,
      COUNT(*) as transacciones,
      SUM(monto) as total,
      AVG(monto) as promedio,
      STRING_AGG(DISTINCT producto, ', ') as productos
    FROM ventas
    WHERE fecha >= CURRENT_DATE - INTERVAL '${dias} days'
      AND fecha <= CURRENT_DATE
    GROUP BY fecha
    ORDER BY fecha DESC
  `;
  
  try {
    const result = await pool.query(query);
    
    const ventas_diarias = result.rows.map(row => ({
      fecha: row.fecha.toISOString().split('T')[0],
      transacciones: parseInt(row.transacciones),
      total: parseFloat(row.total),
      promedio: parseFloat(row.promedio),
      productos: row.productos
    }));
    
    const resumen = {
      periodo_dias: dias,
      total_dias_con_ventas: ventas_diarias.length,
      venta_total_periodo: ventas_diarias.reduce((sum, d) => sum + d.total, 0),
      promedio_diario: ventas_diarias.length > 0 
        ? ventas_diarias.reduce((sum, d) => sum + d.total, 0) / ventas_diarias.length 
        : 0
    };
    
    log.info(`✓ Obtenidas ${ventas_diarias.length} días con ventas`);
    
    return {
      success: true,
      resumen,
      ventas_diarias
    };
    
  } catch (error) {
    log.error(`✗ Error consultando ventas por día: ${error}`);
    return {
      success: false,
      error: String(error),
    };
  }
}

const server = new Server(
  {
    name: "mcp-ventas",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  log.info('📋 Listando tools disponibles');
  
  return {
    tools: [
      {
        name: "ventas_total_mes_anterior",
        description: "Calcula el total de ventas, promedio y estadísticas del mes anterior completo",
        inputSchema: {
          type: "object",
          properties: {},
          required: []
        }
      },
      {
        name: "ventas_por_dia",
        description: "Obtiene las ventas agrupadas por día de los últimos N días (por defecto 30)",
        inputSchema: {
          type: "object",
          properties: {
            n: {
              type: "number",
              description: "Número de días a consultar (por defecto 30)",
              default: 30
            }
          },
          required: []
        }
      }
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  log.info(`🔧 Ejecutando tool: ${name}`);
  log.info(`📥 Argumentos: ${JSON.stringify(args)}`);
  
  try {
    let result;
    
    switch (name) {
      case "ventas_total_mes_anterior":
        result = await ventasTotalMesAnterior();
        break;
        
      case "ventas_por_dia":
        
        const dias = typeof args?.n === 'number' ? args.n : 30;
        result = await ventasPorDia(dias);
        break;
        
      default:
        throw new Error(`Tool desconocida: ${name}`);
    }
    
    log.info('✓ Tool ejecutada exitosamente');
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
    
  } catch (error) {
    log.error(`✗ Error ejecutando tool: ${error}`);
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: false,
            error: String(error),
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
});


async function main() {
  log.info('🚀 Iniciando MCP Server - Ventas');
  log.info(`📊 Base de datos: ${process.env.DB_NAME}@${process.env.DB_HOST}:${process.env.DB_PORT}`);

  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    log.info('✓ Conexión a base de datos verificada');
  } catch (error) {
    log.error(`✗ Error conectando a base de datos: ${error}`);
    process.exit(1);
  }
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  log.info('✓ Servidor MCP Ventas iniciado correctamente');
}

main().catch((error) => {
  log.error(`✗ Error fatal: ${error}`);
  process.exit(1);
});