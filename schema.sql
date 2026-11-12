CREATE TABLE IF NOT EXISTS respuestas (
  id TEXT PRIMARY KEY,
  creado TEXT NOT NULL,
  cliente TEXT,
  nombre TEXT,
  rubro TEXT,
  respuestas TEXT NOT NULL,
  user_agent TEXT
);
CREATE INDEX IF NOT EXISTS idx_respuestas_creado ON respuestas(creado);

-- Topes por conexión (contraseñas equivocadas y envíos seguidos). La crea sola la API si no existe.
-- clave es una huella de la IP, no la IP. Las filas se borran al día.
CREATE TABLE IF NOT EXISTS intentos (tipo TEXT NOT NULL, clave TEXT NOT NULL, ts INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_intentos ON intentos(tipo, clave, ts);

-- Planes que los clientes arman en la calculadora (/presupuesto). El Worker también la crea solo si falta.
CREATE TABLE IF NOT EXISTS planes (
  id TEXT PRIMARY KEY,
  creado TEXT NOT NULL,
  nombre TEXT NOT NULL,
  horas INTEGER,
  plan TEXT NOT NULL,
  user_agent TEXT
);
