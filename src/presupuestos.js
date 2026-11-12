// API de la calculadora (/presupuesto): guarda el plan que arma un cliente (POST, público)
// y los lista o borra (GET/DELETE, con la contraseña de /admin). No maneja precios: el presupuesto lo pasa Tomi después.
import { json, adminError, leerEnvio, huella, excedido, anotar, problemaContacto } from "./respuestas.js";

const MAX_BODY = 8 * 1024;
const TOPES = { reel: 31, carrusel: 20, historia: 60 }; // los mismos máximos que la página
const EXTRAS = ["manual", "landing"];
const PAQUETES = ["esencial", "acelerado"];

// La tabla se crea sola la primera vez, así no hace falta correr nada a mano en Cloudflare.
let tablaLista = false;
async function prepararTabla(env) {
  if (tablaLista) return;
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS planes (id TEXT PRIMARY KEY, creado TEXT NOT NULL, nombre TEXT NOT NULL, horas INTEGER, plan TEXT NOT NULL, user_agent TEXT)"
  ).run();
  tablaLista = true;
}

function entero(v, max) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(0, Math.min(max, n)) : 0;
}

export async function onRequestPost({ request, env }) {
  const envio = await leerEnvio(request, MAX_BODY);
  if (envio.error) return envio.error;
  const body = envio.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "bad_json" }, 400);
  if (body.hp) return json({ ok: true }); // trampa para bots

  const nombre = String(body.nombre || "").trim().slice(0, 80);
  const contacto = String(body.contacto || "").trim().slice(0, 254);
  if (!nombre) return json({ error: "missing_name" }, 400);
  const pc = await problemaContacto(env, contacto);
  if (pc) return json({ error: "bad_contact", motivo: pc }, 400);

  const plan = {
    contacto,
    link: String(body.cliente || "").slice(0, 80),
    reel: entero(body.reel, TOPES.reel),
    carrusel: entero(body.carrusel, TOPES.carrusel),
    historia: entero(body.historia, TOPES.historia),
    extras: Array.isArray(body.extras) ? EXTRAS.filter((e) => body.extras.includes(e)) : [],
    paquete: PAQUETES.includes(body.paquete) ? body.paquete : "",
  };
  if (!plan.reel && !plan.carrusel && !plan.historia && !plan.extras.length) return json({ error: "missing_plan" }, 400);

  const clave = await huella(request, env);
  if (await excedido(env, "plan", clave)) return json({ error: "too_many" }, 429, { "retry-after": "600" });

  await prepararTabla(env);
  const id = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO planes (id, creado, nombre, horas, plan, user_agent) VALUES (?1, ?2, ?3, ?4, ?5, ?6)")
    .bind(id, new Date().toISOString(), nombre, entero(body.horas, 1000), JSON.stringify(plan),
      (request.headers.get("user-agent") || "").slice(0, 300))
    .run();
  await anotar(env, "plan", clave);
  return json({ ok: true, id });
}

export async function onRequestGet({ request, env }) {
  const denied = await adminError(request, env);
  if (denied) return denied;
  await prepararTabla(env);
  const { results } = await env.DB.prepare("SELECT id, creado, nombre, horas, plan FROM planes ORDER BY creado DESC LIMIT 1000").all();
  return json({
    planes: results.map((row) => {
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
  await prepararTabla(env);
  await env.DB.prepare("DELETE FROM planes WHERE id = ?1").bind(id).run();
  return json({ ok: true });
}
