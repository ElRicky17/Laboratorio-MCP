-- ================================================
-- LABORATORIO MCP - BASE DE DATOS
-- ================================================

-- Eliminar tablas si existen
DROP TABLE IF EXISTS ventas CASCADE;
DROP TABLE IF EXISTS pedidos CASCADE;

-- ================================================
-- TABLA: VENTAS
-- ================================================
CREATE TABLE ventas (
    id SERIAL PRIMARY KEY,
    fecha DATE NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    producto VARCHAR(100) NOT NULL,
    cantidad INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================
-- TABLA: PEDIDOS
-- ================================================
CREATE TABLE pedidos (
    id SERIAL PRIMARY KEY,
    cliente VARCHAR(100) NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    estado VARCHAR(50) DEFAULT 'pendiente',
    descripcion TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================
-- DATOS DE PRUEBA: VENTAS (ultimos 60 dias)
-- ================================================

-- Ventas del mes actual
INSERT INTO ventas (fecha, monto, producto, cantidad) VALUES
    (CURRENT_DATE, 1250.00, 'Laptop Dell XPS', 1),
    (CURRENT_DATE - INTERVAL '1 day', 350.50, 'Mouse Logitech', 5),
    (CURRENT_DATE - INTERVAL '2 days', 899.99, 'Monitor Samsung 27"', 2),
    (CURRENT_DATE - INTERVAL '3 days', 45.00, 'Cable HDMI', 10),
    (CURRENT_DATE - INTERVAL '4 days', 2100.00, 'iPhone 15', 1),
    (CURRENT_DATE - INTERVAL '5 days', 75.50, 'Teclado mecanico', 3),
    (CURRENT_DATE - INTERVAL '6 days', 450.00, 'Audifonos Sony', 2),
    (CURRENT_DATE - INTERVAL '7 days', 1800.00, 'MacBook Air M2', 1),
    (CURRENT_DATE - INTERVAL '8 days', 125.00, 'Webcam HD', 4),
    (CURRENT_DATE - INTERVAL '9 days', 90.00, 'Mouse Pad RGB', 6);

-- Ventas del mes anterior
INSERT INTO ventas (fecha, monto, producto, cantidad) VALUES
    (CURRENT_DATE - INTERVAL '31 days', 3200.00, 'Laptop Gaming', 2),
    (CURRENT_DATE - INTERVAL '32 days', 450.00, 'SSD 1TB', 3),
    (CURRENT_DATE - INTERVAL '33 days', 180.00, 'RAM 16GB', 4),
    (CURRENT_DATE - INTERVAL '34 days', 95.00, 'Mouse Gamer', 5),
    (CURRENT_DATE - INTERVAL '35 days', 1500.00, 'Monitor 4K', 1),
    (CURRENT_DATE - INTERVAL '36 days', 220.00, 'Teclado RGB', 2),
    (CURRENT_DATE - INTERVAL '37 days', 85.00, 'Mousepad XL', 8),
    (CURRENT_DATE - INTERVAL '38 days', 2800.00, 'iMac 24"', 1),
    (CURRENT_DATE - INTERVAL '39 days', 350.00, 'Auriculares Gaming', 3),
    (CURRENT_DATE - INTERVAL '40 days', 125.00, 'Microfono USB', 4),
    (CURRENT_DATE - INTERVAL '41 days', 450.00, 'Webcam 4K', 2),
    (CURRENT_DATE - INTERVAL '42 days', 75.00, 'Cable USB-C', 15),
    (CURRENT_DATE - INTERVAL '43 days', 1200.00, 'Tablet iPad', 1),
    (CURRENT_DATE - INTERVAL '44 days', 380.00, 'Disco Duro 2TB', 3),
    (CURRENT_DATE - INTERVAL '45 days', 150.00, 'Hub USB', 5);

-- Mas ventas para tener datos de 60 dias
INSERT INTO ventas (fecha, monto, producto, cantidad) VALUES
    (CURRENT_DATE - INTERVAL '50 days', 890.00, 'Impresora HP', 2),
    (CURRENT_DATE - INTERVAL '51 days', 125.00, 'Cartuchos tinta', 8),
    (CURRENT_DATE - INTERVAL '52 days', 450.00, 'Router WiFi 6', 3),
    (CURRENT_DATE - INTERVAL '53 days', 75.00, 'Cable Ethernet', 12),
    (CURRENT_DATE - INTERVAL '54 days', 1800.00, 'PS5', 1),
    (CURRENT_DATE - INTERVAL '55 days', 350.00, 'Juegos PS5', 5),
    (CURRENT_DATE - INTERVAL '56 days', 180.00, 'Control PS5', 3),
    (CURRENT_DATE - INTERVAL '57 days', 2500.00, 'Smart TV 55"', 1),
    (CURRENT_DATE - INTERVAL '58 days', 95.00, 'Soporte TV', 2),
    (CURRENT_DATE - INTERVAL '59 days', 450.00, 'Soundbar', 1);

-- ================================================
-- DATOS DE PRUEBA: PEDIDOS
-- ================================================
INSERT INTO pedidos (cliente, monto, estado, descripcion) VALUES
    ('Juan Perez', 1250.00, 'completado', 'Laptop Dell XPS 15 - Entregado'),
    ('Maria Garcia', 450.50, 'en_proceso', 'Monitor Samsung + Mouse - En camino'),
    ('Carlos Lopez', 2100.00, 'pendiente', 'iPhone 15 Pro Max - Procesando pago'),
    ('Ana Martinez', 850.00, 'completado', 'Teclado + Audifonos - Entregado'),
    ('Pedro Rodriguez', 3200.00, 'cancelado', 'Laptop Gaming - Cliente cancelo'),
    ('Laura Sanchez', 180.00, 'en_proceso', 'Webcam HD - En preparacion'),
    ('Diego Torres', 1500.00, 'completado', 'MacBook Air M2 - Entregado'),
    ('Sofia Ramirez', 95.00, 'pendiente', 'Mouse Pad RGB - Esperando stock'),
    ('Miguel Angel', 450.00, 'en_proceso', 'Audifonos Sony - En camino'),
    ('Valentina Cruz', 750.00, 'completado', 'Tablet + Funda - Entregado');

-- ================================================
-- VISTAS UTILES
-- ================================================

-- Vista: Ventas por mes
CREATE VIEW ventas_por_mes AS
SELECT 
    DATE_TRUNC('month', fecha) as mes,
    COUNT(*) as total_transacciones,
    SUM(monto) as total_ventas,
    AVG(monto) as promedio_venta
FROM ventas
GROUP BY DATE_TRUNC('month', fecha)
ORDER BY mes DESC;

-- Vista: Resumen de pedidos por estado
CREATE VIEW resumen_pedidos AS
SELECT 
    estado,
    COUNT(*) as cantidad,
    SUM(monto) as total_monto
FROM pedidos
GROUP BY estado
ORDER BY cantidad DESC;

-- ================================================
-- INDICES PARA MEJOR RENDIMIENTO
-- ================================================
CREATE INDEX idx_ventas_fecha ON ventas(fecha);
CREATE INDEX idx_pedidos_estado ON pedidos(estado);
CREATE INDEX idx_pedidos_cliente ON pedidos(cliente);

-- ================================================
-- VERIFICACION
-- ================================================
SELECT 'Ventas totales:', COUNT(*) FROM ventas;
SELECT 'Pedidos totales:', COUNT(*) FROM pedidos;
SELECT 'Ventas mes anterior:', SUM(monto) FROM ventas 
    WHERE fecha >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
    AND fecha < DATE_TRUNC('month', CURRENT_DATE);
