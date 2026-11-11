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

-- Planes de la calculadora (/presupuesto). El Worker también la crea solo si falta.
CREATE TABLE IF NOT EXISTS presupuestos (
  id TEXT PRIMARY KEY,
  creado TEXT NOT NULL,
  cliente TEXT,
  total INTEGER,
  plan TEXT NOT NULL,
  user_agent TEXT
);
