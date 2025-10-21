import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);



const log = {
  info: (msg) => console.error(`[GATEWAY-INFO] ${new Date().toISOString()} - ${msg}`),
  error: (msg) => console.error(`[GATEWAY-ERROR] ${new Date().toISOString()} - ${msg}`),
  warn: (msg) => console.error(`[GATEWAY-WARN] ${new Date().toISOString()} - ${msg}`),
};


const BACKEND_SERVERS = {
  ventas: {
    name: "Ventas",
    prefix: "ventas_",
    command: "node",
    args: [join(__dirname, "..", "mcp-ventas-node", "dist", "server.js")],
    cwd: join(__dirname, "..", "mcp-ventas-node"),
  },
  pedidos: {
    name: "Pedidos",
    prefix: "pedidos_",
  
    command: join(__dirname, "..", "mcp-pedidos-py", "venv", "Scripts", "python.exe"),
    args: [join(__dirname, "..", "mcp-pedidos-py", "server.py")],
    cwd: join(__dirname, "..", "mcp-pedidos-py"),
  },
};


class BackendClient {
  constructor(config) {
    this.config = config;
    this.client = null;
    this.connected = false;
  }

  async connect() {
    log.info(`🔌 Conectando a servidor ${this.config.name}...`);
    
    try {
      this.client = new Client(
        {
          name: `gateway-client-${this.config.name.toLowerCase()}`,
          version: "1.0.0",
        },
        {
          capabilities: {},
        }
      );

      const transport = new StdioClientTransport({
        command: this.config.command,
        args: this.config.args,
        cwd: this.config.cwd,
      });

      await this.client.connect(transport);
      this.connected = true;

      log.info(`✓ Conectado exitosamente a servidor ${this.config.name}`);
      
    } catch (error) {
      log.error(`✗ Error conectando a ${this.config.name}: ${error.message}`);
      throw error;
    }
  }

  async listTools() {
    if (!this.connected || !this.client) {
      throw new Error(`Cliente ${this.config.name} no está conectado`);
    }
    
    try {
      const response = await this.client.listTools();
      return response.tools || [];
    } catch (error) {
      log.error(`✗ Error listando tools de ${this.config.name}: ${error.message}`);
      return [];
    }
  }

  async callTool(name, args) {
    if (!this.connected || !this.client) {
      throw new Error(`Cliente ${this.config.name} no está conectado`);
    }
    
    try {
      log.info(`  ↳ Ejecutando en ${this.config.name}: ${name}`);
      const response = await this.client.callTool({ name, arguments: args || {} });
      return response;
    } catch (error) {
      log.error(`✗ Error ejecutando tool ${name} en ${this.config.name}: ${error.message}`);
      throw error;
    }
  }

  isConnected() {
    return this.connected;
  }
}

class GatewayServer {
  constructor() {
    this.backends = new Map();
    this.server = new Server(
      {
        name: "mcp-gateway",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    
    this.setupHandlers();
  }

  async initialize() {
    log.info(" ========================================");
    log.info(" Inicializando MCP Gateway");
    log.info(" ========================================");
 
    for (const [key, config] of Object.entries(BACKEND_SERVERS)) {
      try {
        const backend = new BackendClient(config);
        await backend.connect();
        this.backends.set(key, backend);
        log.info(`✓ Backend ${config.name} registrado con prefijo: ${config.prefix}`);
      } catch (error) {
        log.error(`✗ No se pudo conectar a ${config.name}: ${error.message}`);
        
      }
    }
    
    if (this.backends.size === 0) {
      throw new Error(" No se pudo conectar a ningún servidor backend");
    }
    
    log.info(`✓ Gateway inicializado exitosamente con ${this.backends.size} backend(s)`);
    log.info("========================================");
  }

  setupHandlers() {
 
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      log.info("📋 Claude Desktop solicitó lista de tools");
      
      const allTools = [];

      for (const [key, backend] of this.backends.entries()) {
        try {
          if (backend.isConnected()) {
            const tools = await backend.listTools();
            allTools.push(...tools);
            log.info(`  ✓ ${tools.length} tool(s) de ${backend.config.name}`);
          }
        } catch (error) {
          log.error(`  ✗ Error obteniendo tools de ${backend.config.name}: ${error.message}`);
        }
      }
      
      log.info(` Total de tools disponibles: ${allTools.length}`);
      
      allTools.forEach(tool => {
        log.info(`  • ${tool.name}`);
      });
      
      return { tools: allTools };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      log.info("========================================");
      log.info(`🔧 Llamada a tool: ${name}`);
      log.info(`📥 Argumentos: ${JSON.stringify(args || {})}`);
      
      try {
        let targetBackend = null;
        let backendName = null;
        
        for (const [key, backend] of this.backends.entries()) {
          if (name.startsWith(backend.config.prefix)) {
            targetBackend = backend;
            backendName = key;
            break;
          }
        }
        
        if (!targetBackend) {
          throw new Error(`No se encontró backend para la tool: ${name}`);
        }
        
        log.info(`→ Enrutando a: ${targetBackend.config.name}`);
        
        // Ejecutar la tool en el backend correspondiente
        const result = await targetBackend.callTool(name, args);
        
        log.info(`✓ Tool ejecutada exitosamente`);
        log.info("========================================");
        
        return result;
        
      } catch (error) {
        log.error(`✗ Error ejecutando tool ${name}: ${error.message}`);
        log.info("========================================");
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: error.message,
                tool: name,
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
    });
  }

  async start() {
    log.info(" Iniciando servidor Gateway en modo STDIO...");
    
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    log.info("✓ Gateway MCP iniciado correctamente");
    log.info("✓ Esperando conexiones de Claude Desktop...");
    log.info("========================================");
  }
}

async function main() {
  try {
    const gateway = new GatewayServer();
    
  
    await gateway.initialize();
    
 
    await gateway.start();
    
  } catch (error) {
    log.error(`✗ Error fatal en Gateway: ${error.message}`);
    log.error(error.stack);
    process.exit(1);
  }
}

process.on("SIGINT", () => {
  log.info("⏹️  Gateway detenido por el usuario (SIGINT)");
  process.exit(0);
});

process.on("SIGTERM", () => {
  log.info("⏹️  Gateway detenido (SIGTERM)");
  process.exit(0);
});

main();