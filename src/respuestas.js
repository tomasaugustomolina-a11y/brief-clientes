// API del brief: guarda respuestas (POST, público) y las lista o borra (GET/DELETE, con contraseña).
const MAX_BODY = 64 * 1024;
const MIN = 60 * 1000;

// Topes por conexión, para frenar a quien pruebe contraseñas o mande respuestas en cadena.
// De cada conexión se guarda una huella cifrada (no la IP) y se borra al día.
const LIMITES = {
  login: { max: 8, ventana: 15 * MIN }, // contraseñas equivocadas en /admin
  envio: { max: 6, ventana: 10 * MIN }, // respuestas enviadas
};

const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...extra,
    },
  });

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function sameText(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/* ---------- Topes por conexión ---------- */
let tablaLista = false;
async function prepararTabla(env) {
  if (tablaLista) return;
  await env.DB.batch([
    env.DB.prepare("CREATE TABLE IF NOT EXISTS intentos (tipo TEXT NOT NULL, clave TEXT NOT NULL, ts INTEGER NOT NULL)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_intentos ON intentos(tipo, clave, ts)"),
  ]);
  tablaLista = true;
}
// La huella mezcla la IP con el secreto de /admin: sin ese secreto no se puede volver a la IP.
async function huella(request, env) {
  const ip = request.headers.get("cf-connecting-ip") || "local";
  return (await sha256Hex(String(env.ADMIN_PASSWORD || "brief-clientes") + "|" + ip)).slice(0, 32);
}
// Si la base falla acá, se deja pasar: el tope no tiene que romper el formulario.
async function excedido(env, tipo, clave) {
  try {
    await prepararTabla(env);
    const { max, ventana } = LIMITES[tipo];
    const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM intentos WHERE tipo = ?1 AND clave = ?2 AND ts > ?3")
      .bind(tipo, clave, Date.now() - ventana)
      .first();
    return ((row && row.n) || 0) >= max;
  } catch (err) {
    console.error("tope: no se pudo consultar", err);
    return false;
  }
}
async function anotar(env, tipo, clave) {
  try {
    await prepararTabla(env);
    const ahora = Date.now();
    await env.DB.batch([
      env.DB.prepare("INSERT INTO intentos (tipo, clave, ts) VALUES (?1, ?2, ?3)").bind(tipo, clave, ahora),
      env.DB.prepare("DELETE FROM intentos WHERE ts < ?1").bind(ahora - 24 * 60 * MIN),
    ]);
  } catch (err) {
    console.error("tope: no se pudo anotar", err);
  }
}

// La contraseña de /admin vive como secreto ADMIN_PASSWORD en Cloudflare, nunca en el repositorio.
// Devuelve null si está bien, o la respuesta de error a mandar.
async function adminError(request, env) {
  const secret = String(env.ADMIN_PASSWORD || "").trim();
  if (!secret) return json({ error: "no_password_set" }, 503);
  const clave = await huella(request, env);
  if (await excedido(env, "login", clave)) return json({ error: "too_many_attempts" }, 429, { "retry-after": "900" });
  const h = request.headers.get("authorization") || "";
  const pass = (h.startsWith("Bearer ") ? h.slice(7) : "").trim();
  if (!pass || !sameText(await sha256Hex(pass), await sha256Hex(secret))) {
    if (pass) await anotar(env, "login", clave);
    return json({ error: "unauthorized" }, 401);
  }
  return null;
}

// Lee el cuerpo sin pasarse del máximo, aunque no venga declarado el tamaño. Devuelve null si se pasa.
async function leerTexto(request, max) {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const partes = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      try { await reader.cancel(); } catch {}
      return null;
    }
    partes.push(value);
  }
  const todo = new Uint8Array(total);
  let pos = 0;
  for (const p of partes) { todo.set(p, pos); pos += p.byteLength; }
  return new TextDecoder().decode(todo);
}

export async function onRequestPost({ request, env }) {
  // Solo el formulario de este mismo sitio puede mandar respuestas.
  const origin = request.headers.get("origin");
  if (origin) {
    let igual = false;
    try { igual = new URL(origin).host === new URL(request.url).host; } catch {}
    if (!igual) return json({ error: "bad_origin" }, 403);
  }
  if (!/^application\/json\b/i.test(request.headers.get("content-type") || "")) return json({ error: "bad_type" }, 415);
  if (Number(request.headers.get("content-length") || 0) > MAX_BODY) return json({ error: "too_large" }, 413);

  let body;
  try {
    const text = await leerTexto(request, MAX_BODY);
    if (text === null) return json({ error: "too_large" }, 413);
    body = JSON.parse(text);
  } catch {
    return json({ error: "bad_json" }, 400);
  }
  if (body && body.hp) return json({ ok: true }); // trampa para bots
  const r = body && body.respuestas;
  if (!r || typeof r !== "object" || Array.isArray(r)) return json({ error: "missing_answers" }, 400);

  const clean = Object.create(null);
  for (const [k, v] of Object.entries(r).slice(0, 80)) {
    if (/^[a-z_]{1,40}$/.test(k) && k !== "__proto__") clean[k] = String(v ?? "").slice(0, 3000);
  }
  if (!clean.nombre || !clean.nombre.trim()) return json({ error: "missing_name" }, 400);

  const clave = await huella(request, env);
  if (await excedido(env, "envio", clave)) return json({ error: "too_many" }, 429, { "retry-after": "600" });

  const id = crypto.randomUUID();
  const creado = new Date().toISOString();
  await env.DB.prepare(
    "INSERT INTO respuestas (id, creado, cliente, nombre, rubro, respuestas, user_agent) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)"
  )
    .bind(
      id,
      creado,
      String(body.cliente || "").slice(0, 80),
      clean.nombre.trim().slice(0, 160),
      (clean.rubro || "").slice(0, 200),
      JSON.stringify(clean),
      (request.headers.get("user-agent") || "").slice(0, 300)
    )
    .run();
  await anotar(env, "envio", clave);
  return json({ ok: true, id });
}

export async function onRequestGet({ request, env }) {
  const denied = await adminError(request, env);
  if (denied) return denied;
  const { results } = await env.DB.prepare(
    "SELECT id, creado, cliente, nombre, rubro, respuestas FROM respuestas ORDER BY creado DESC LIMIT 1000"
  ).all();
  return json({
    respuestas: results.map((row) => {
      let data = {};
      try { data = JSON.parse(row.respuestas); } catch {}
      return { ...row, respuestas: data };
    }),
  });
}

export async function onRequestDelete({ request, env }) {
  const denied = await adminError(request, env);
  if (denied) return denied;
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!/^[0-9a-f-]{36}$/.test(id)) return json({ error: "bad_id" }, 400);
  await env.DB.prepare("DELETE FROM respuestas WHERE id = ?1").bind(id).run();
  return json({ ok: true });
}
