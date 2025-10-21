# Laboratorio MCP Multi-Gateway

**Estudiante:** David Ricaurte Antolinez  
**Curso:** Implementación - Semestre 7  
**Profesor:** Sebastián Zapata  
**Fecha de Entrega:** 21 de Octubre, 2025  
**Universidad:** Unviersidad EIA

---

## 📋 Tabla de Contenidos

1. [Descripción del Proyecto](#descripción-del-proyecto)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Tools Disponibles](#tools-disponibles)
4. [Instalación y Configuración](#instalación-y-configuración)
5. [Pruebas y Validación](#pruebas-y-validación)
6. [Estructura del Proyecto](#estructura-del-proyecto)
7. [Solución de Problemas](#solución-de-problemas)
8. [Evidencias](#evidencias)
9. [Conclusiones](#conclusiones)

---

## 📋 Descripción del Proyecto

Sistema de gestión empresarial implementado mediante el protocolo **MCP (Model Context Protocol)** con arquitectura multi-servidor. El sistema permite a **Claude Desktop** interactuar con dos dominios de negocio independientes (Ventas y Pedidos) a través de un gateway centralizado que enruta las peticiones según prefijos definidos.

### Objetivos Cumplidos

- ✅ Implementar 2 servidores MCP independientes
- ✅ Crear gateway para enrutamiento inteligente
- ✅ Exponer 4 tools funcionales a Claude Desktop
- ✅ Persistencia en PostgreSQL con datos reales
- ✅ Manejo de errores y logs apropiados

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────┐
│     Claude Desktop (Usuario)    │
│         Interface stdio         │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│        MCP Gateway (Node.js)     │
│  Enrutamiento por prefijos:     │
│  • ventas_*  → MCP Ventas       │
│  • pedidos_* → MCP Pedidos      │
└──────┬──────────────────┬───────┘
       │                  │
       ▼                  ▼
┌─────────────┐    ┌──────────────┐
│ MCP Ventas  │    │ MCP Pedidos  │
│ Node/TypeScript  │ Python/FastMCP│
│ 2 tools     │    │ 2 tools      │
└──────┬──────┘    └──────┬───────┘
       │                  │
       └────────┬─────────┘
                ▼
      ┌──────────────────┐
      │   PostgreSQL     │
      │   Puerto: 5434   │
      │ • Tabla: ventas  │
      │ • Tabla: pedidos │
      └──────────────────┘
```

### Flujo de Ejecución

1. **Usuario** escribe consulta en Claude Desktop
2. **Claude Desktop** identifica la tool necesaria
3. **Gateway** recibe la petición vía stdio
4. **Gateway** enruta según prefijo (ventas_* o pedidos_*)
5. **Servidor MCP** ejecuta consulta en PostgreSQL
6. **Respuesta** retorna por el mismo camino
7. **Claude** presenta resultado al usuario

---

## 🛠️ Tools Disponibles

### Dominio: Ventas (Prefijo: `ventas_`)

#### 1. `ventas_total_mes_anterior`

**Descripción:** Calcula estadísticas agregadas del mes calendario anterior completo.

**Parámetros:** Ninguno

**Retorna:**
```json
{
  "success": true,
  "mes": "2025-09",
  "total_transacciones": 15,
  "total_ventas": 12450.50,
  "promedio_venta": 830.03,
  "venta_minima": 45.00,
  "venta_maxima": 2800.00
}
```

**Ejemplo de uso:**
```
Usuario: ¿Cuáles fueron las ventas totales del mes anterior?
```

---

#### 2. `ventas_por_dia`

**Descripción:** Genera serie temporal de ventas diarias para los últimos N días.

**Parámetros:**
- `n` (number, opcional): Número de días a consultar (default: 30)

**Retorna:**
```json
{
  "success": true,
  "resumen": {
    "periodo_dias": 30,
    "total_dias_con_ventas": 28,
    "venta_total_periodo": 25300.75,
    "promedio_diario": 903.60
  },
  "ventas_diarias": [
    {
      "fecha": "2025-10-20",
      "transacciones": 3,
      "total": 1275.50,
      "promedio": 425.17,
      "productos": "Laptop Dell XPS, Mouse Logitech, Cable HDMI"
    }
  ]
}
```

**Ejemplo de uso:**
```
Usuario: Dame las ventas de los últimos 15 días
```

---

### Dominio: Pedidos (Prefijo: `pedidos_`)

#### 3. `pedidos_estado_por_id`

**Descripción:** Consulta el estado y detalles completos de un pedido específico.

**Parámetros:**
- `id` (integer, requerido): ID del pedido a consultar

**Retorna:**
```json
{
  "success": true,
  "pedido": {
    "id": 1,
    "cliente": "Juan Pérez",
    "monto": 1250.00,
    "estado": "completado",
    "descripcion": "Laptop Dell XPS 15 - Entregado",
    "fecha_creacion": "2025-10-15T10:30:00"
  }
}
```

**Ejemplo de uso:**
```
Usuario: Consulta el estado del pedido con ID 1
```

---

#### 4. `pedidos_crear`

**Descripción:** Crea un nuevo pedido en el sistema con estado inicial "pendiente".

**Parámetros:**
- `cliente` (string, requerido): Nombre del cliente
- `monto` (number, requerido): Monto total del pedido
- `descripcion` (string, opcional): Descripción del pedido

**Retorna:**
```json
{
  "success": true,
  "mensaje": "Pedido creado exitosamente",
  "pedido": {
    "id": 11,
    "cliente": "María González",
    "monto": 750.50,
    "estado": "pendiente",
    "descripcion": "Tablet Samsung + Funda",
    "fecha_creacion": "2025-10-20T18:45:30"
  }
}
```

**Ejemplo de uso:**
```
Usuario: Crea un pedido para María González con monto 750.50 y descripción "Tablet Samsung"
```

---

## 🚀 Instalación y Configuración

### Requisitos Previos

- **Node.js** 18+ ([Descargar](https://nodejs.org/))
- **Python** 3.11+ ([Descargar](https://www.python.org/))
- **PostgreSQL** 15+ (Docker recomendado)
- **Claude Desktop** ([Descargar](https://claude.ai/download))
- **Git** para clonar el repositorio

### Paso 1: Clonar Repositorio

```bash
git clone [URL_DEL_REPOSITORIO]
cd laboratorio-mcp
```

### Paso 2: Configurar Base de Datos

```bash
# Iniciar PostgreSQL con Docker
docker run --name postgres-mcp \
  -e POSTGRES_PASSWORD=mcp_password \
  -e POSTGRES_DB=laboratorio_mcp \
  -p 5434:5432 \
  -d postgres:15

# Esperar 5 segundos
sleep 5

# Ejecutar script SQL
docker exec -i postgres-mcp psql -U postgres -d laboratorio_mcp < database/schema.sql

# Verificar tablas creadas
docker exec -it postgres-mcp psql -U postgres -d laboratorio_mcp -c "\dt"
```

### Paso 3: Configurar Servidor Pedidos (Python)

```bash
cd mcp-pedidos-py

# Crear entorno virtual
python -m venv venv

# Activar entorno virtual
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tu configuración

# Probar servidor (opcional)
python server.py
# Presionar Ctrl+C para detener
```

### Paso 4: Configurar Servidor Ventas (Node/TypeScript)

```bash
cd ../mcp-ventas-node

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tu configuración

# Compilar TypeScript
npm run build

# Probar servidor (opcional)
npm start
# Presionar Ctrl+C para detener
```

### Paso 5: Configurar Gateway

```bash
cd ../mcp-gateway

# Instalar dependencias
npm install

# Probar gateway (opcional)
node gateway.js
# Deberías ver:
# [GATEWAY-INFO] ✓ Conectado exitosamente a servidor Ventas
# [GATEWAY-INFO] ✓ Conectado exitosamente a servidor Pedidos
# [GATEWAY-INFO] ✓ Gateway inicializado exitosamente con 2 backend(s)
# Presionar Ctrl+C para detener
```

### Paso 6: Configurar Claude Desktop

1. **Ubicar archivo de configuración:**
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - Mac: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Linux: `~/.config/Claude/claude_desktop_config.json`

2. **Crear/editar el archivo:**

```json
{
  "mcpServers": {
    "laboratorio-gateway": {
      "command": "node",
      "args": [
        "[RUTA_COMPLETA_AL_PROYECTO]/mcp-gateway/gateway.js"
      ]
    }
  }
}
```

**Ejemplo Windows:**
```json
{
  "mcpServers": {
    "laboratorio-gateway": {
      "command": "node",
      "args": [
        "C:\\Users\\usuario\\laboratorio-mcp\\mcp-gateway\\gateway.js"
      ]
    }
  }
}
```

3. **Reiniciar Claude Desktop completamente**

### Paso 7: Verificar Instalación

1. Abrir Claude Desktop
2. Ir a **Settings** (⚙️) → **Developer** → **MCP Servers**
3. Verificar estado: `✅ laboratorio-gateway - Connected - 4 tools`

---

## 🧪 Pruebas y Validación

### Test 1: Verificar Conexión

**Comando:**
```
Settings → Developer → MCP Servers
```

**Resultado Esperado:**
```
✅ laboratorio-gateway
Status: Connected
Tools: 4
```

### Test 2: Ventas Totales Mes Anterior

**Consulta:**
```
¿Cuáles fueron las ventas totales del mes anterior?
```

**Validación:**
- ✅ Respuesta contiene total_transacciones
- ✅ Respuesta contiene total_ventas
- ✅ Respuesta contiene promedio_venta
- ✅ Los números son consistentes con la BD

### Test 3: Ventas por Día

**Consulta:**
```
Dame las ventas de los últimos 20 días
```

**Validación:**
- ✅ Respuesta contiene array de ventas_diarias
- ✅ Cada día tiene fecha, transacciones, total
- ✅ Resumen calcula correctamente el promedio

### Test 4: Consultar Pedido

**Consulta:**
```
Consulta el estado del pedido con ID 1
```

**Validación:**
- ✅ Respuesta contiene información del pedido
- ✅ Incluye cliente, monto, estado, descripción
- ✅ Maneja correctamente pedidos inexistentes

### Test 5: Crear Pedido

**Consulta:**
```
Crea un pedido para "Test Usuario" con monto 999.99 y descripción "Prueba sistema"
```

**Validación:**
- ✅ Respuesta indica success: true
- ✅ Retorna ID del nuevo pedido
- ✅ Estado inicial es "pendiente"
- ✅ Pedido existe en la base de datos

**Verificación en BD:**
```bash
docker exec -it postgres-mcp psql -U postgres -d laboratorio_mcp \
  -c "SELECT * FROM pedidos WHERE cliente='Test Usuario';"
```

---

## 📁 Estructura del Proyecto

```
laboratorio-mcp/
├── README.md                    # Este archivo
│
├── database/
│   ├── schema.sql              # Estructura de BD y datos iniciales
│
├── mcp-pedidos-py/             # Servidor Pedidos (Python/FastMCP)
│   ├── server.py               # Código principal
│   ├── requirements.txt        # Dependencias Python
│   ├── .env                   # Configuración local (no incluir en Git)
│   └── venv/                  # Entorno virtual Python
│
├── mcp-ventas-node/           # Servidor Ventas (Node/TypeScript)
│   ├── src/
│   │   └── server.ts          # Código fuente TypeScript
│   ├── dist/
│   │   └── server.js          # Código compilado
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env
│   └── node_modules/
│
├── mcp-gateway/               # Gateway MCP
│   ├── gateway.js             # Código principal del gateway
│   ├── package.json
│   ├── node_modules/
│
│
```
---


## 📄 Licencia

Este proyecto fue desarrollado con fines académicos para el curso de Implementación.

---

## 🙏 Agradecimientos

- Profesor Sebastián Zapata por la guía y recursos proporcionados
- Anthropic por Claude Desktop y la documentación de MCP
- Comunidad de desarrolladores MCP por ejemplos y mejores prácticas

---

**Fin del documento**