// API de la calculadora: guarda cada plan que un cliente manda (POST, público) y los lista o borra (GET/DELETE, con contraseña).
import { json, adminError } from "./respuestas.js";

const MAX_BODY = 8 * 1024;

// La tabla se crea sola la primera vez, así no hace falta correr nada a mano en Cloudflare.
async function ensureTable(env) {
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS presupuestos (id TEXT PRIMARY KEY, creado TEXT NOT NULL, cliente TEXT, total INTEGER, plan TEXT NOT NULL, user_agent TEXT)"
  ).run();
}

export async function onRequestPost({ request, env }) {
  if (Number(request.headers.get("content-length") || 0) > MAX_BODY) return json({ error: "too_large" }, 413);
  let body;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY) return json({ error: "too_large" }, 413);
    body = JSON.parse(text);
  } catch {
    return json({ error: "bad_json" }, 400);
  }
  const items = Array.isArray(body && body.items) ? body.items.slice(0, 20).map((s) => String(s).slice(0, 120)) : [];
  if (!items.length) return json({ error: "missing_plan" }, 400);
  const total = Math.max(0, Math.min(1e10, Math.round(Number(body.total) || 0)));
  const plan = {
    items,
    paquete: String(body.paquete || "").slice(0, 40),
    dolar: Number(body.dolar) || null,
  };
  await ensureTable(env);
  const id = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT INTO presupuestos (id, creado, cliente, total, plan, user_agent) VALUES (?1, ?2, ?3, ?4, ?5, ?6)"
  )
    .bind(id, new Date().toISOString(), String(body.cliente || "").slice(0, 80), total, JSON.stringify(plan),
      (request.headers.get("user-agent") || "").slice(0, 300))
    .run();
  return json({ ok: true, id });
}

export async function onRequestGet({ request, env }) {
  const denied = await adminError(request, env);
  if (denied) return denied;
  await ensureTable(env);
  const { results } = await env.DB.prepare(
    "SELECT id, creado, cliente, total, plan FROM presupuestos ORDER BY creado DESC LIMIT 1000"
  ).all();
  return json({
    presupuestos: results.map((row) => {
      let plan = {};
      try { plan = JSON.parse(row.plan); } catch {}
      return { ...row, plan };
    }),
  });
}

export async function onRequestDelete({ request, env }) {
  const denied = await adminError(request, env);
  if (denied) return denied;
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!/^[0-9a-f-]{36}$/.test(id)) return json({ error: "bad_id" }, 400);
  await ensureTable(env);
  await env.DB.prepare("DELETE FROM presupuestos WHERE id = ?1").bind(id).run();
  return json({ ok: true });
}
