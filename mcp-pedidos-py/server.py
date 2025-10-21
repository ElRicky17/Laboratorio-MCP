#!/usr/bin/env python3
"""
MCP Server - Pedidos (FastMCP)
Servidor MCP para gestión de pedidos con PostgreSQL usando FastMCP
"""

import sys
import logging
from typing import Dict, Any
from datetime import datetime

import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
import os

from fastmcp import FastMCP


logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stderr
)
logger = logging.getLogger('mcp-pedidos')


load_dotenv()

DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', 5434)),
    'database': os.getenv('DB_NAME', 'laboratorio_mcp'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'mcp_password')
}


mcp = FastMCP("Pedidos Server")



def get_db_connection():
    """Obtiene una conexión a PostgreSQL"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        return conn
    except Exception as e:
        logger.error(f"✗ Error conectando a PostgreSQL: {e}")
        raise

def execute_query(query: str, params: tuple = None, fetch_one: bool = False):
    """Ejecuta una query y retorna resultados"""
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, params)
            
            if query.strip().upper().startswith('SELECT'):
                result = cur.fetchone() if fetch_one else cur.fetchall()
                return [dict(row) for row in (result if isinstance(result, list) else [result])] if result else []
            else:
                conn.commit()
                return {"success": True, "affected_rows": cur.rowcount}
                
    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"✗ Error ejecutando query: {e}")
        raise
    finally:
        if conn:
            conn.close()



@mcp.tool()
def pedidos_estado_por_id(id: int) -> Dict[str, Any]:
    """
    Consulta el estado y detalles de un pedido específico por su ID
    
    Args:
        id: ID del pedido a consultar
        
    Returns:
        Información completa del pedido incluyendo estado actual
    """
    logger.info(f"📦 Consultando estado del pedido ID: {id}")
    
    query = """
        SELECT 
            id,
            cliente,
            monto,
            estado,
            descripcion,
            created_at
        FROM pedidos
        WHERE id = %s
    """
    
    try:
        result = execute_query(query, (id,), fetch_one=True)
        
        if not result:
            return {
                "success": False,
                "error": f"No se encontró el pedido con ID {id}"
            }
        
        pedido = result[0]
        
        response = {
            "success": True,
            "pedido": {
                "id": pedido['id'],
                "cliente": pedido['cliente'],
                "monto": float(pedido['monto']),
                "estado": pedido['estado'],
                "descripcion": pedido['descripcion'],
                "fecha_creacion": pedido['created_at'].isoformat() if pedido['created_at'] else None
            }
        }
        
        logger.info(f"✓ Pedido {id} encontrado - Estado: {pedido['estado']}")
        return response
        
    except Exception as e:
        logger.error(f"✗ Error consultando pedido: {e}")
        return {
            "success": False,
            "error": str(e)
        }

@mcp.tool()
def pedidos_crear(cliente: str, monto: float, descripcion: str = "") -> Dict[str, Any]:
    """
    Crea un nuevo pedido en el sistema
    
    Args:
        cliente: Nombre del cliente que realiza el pedido
        monto: Monto total del pedido en la moneda local
        descripcion: Descripción opcional del pedido (productos, notas, etc)
        
    Returns:
        Información del pedido creado incluyendo su ID único
    """
    logger.info(f"📝 Creando nuevo pedido para cliente: {cliente}")
    
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = """
                INSERT INTO pedidos (cliente, monto, descripcion, estado, created_at)
                VALUES (%s, %s, %s, 'pendiente', CURRENT_TIMESTAMP)
                RETURNING id, cliente, monto, estado, descripcion, created_at
            """
            
            cur.execute(query, (cliente, monto, descripcion))
            conn.commit()
            
            pedido = cur.fetchone()
            
            if not pedido:
                raise Exception("No se pudo obtener el pedido creado")
            
            response = {
                "success": True,
                "mensaje": "Pedido creado exitosamente",
                "pedido": {
                    "id": pedido['id'],
                    "cliente": pedido['cliente'],
                    "monto": float(pedido['monto']),
                    "estado": pedido['estado'],
                    "descripcion": pedido['descripcion'],
                    "fecha_creacion": pedido['created_at'].isoformat() if pedido['created_at'] else None
                }
            }
            
            logger.info(f"✓ Pedido creado exitosamente - ID: {pedido['id']}")
            return response
            
    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"✗ Error creando pedido: {e}")
        return {
            "success": False,
            "error": str(e)
        }
    finally:
        if conn:
            conn.close()


if __name__ == "__main__":
    try:
        logger.info(" Iniciando MCP Server - Pedidos (FastMCP)")
        logger.info(f" Base de datos: {DB_CONFIG['database']}@{DB_CONFIG['host']}")
        
        # Verificar conexión
        conn = get_db_connection()
        conn.close()
        logger.info("✓ Conexión a base de datos verificada")
        
        # Iniciar servidor
        mcp.run()
        
    except KeyboardInterrupt:
        logger.info("⏹  Servidor detenido por el usuario")
    except Exception as e:
        logger.error(f"✗ Error fatal: {e}")
        sys.exit(1)