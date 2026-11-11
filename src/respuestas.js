// API del brief: guarda respuestas (POST, público) y las lista o borra (GET/DELETE, con contraseña).
const MAX_BODY = 64 * 1024;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
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

// La contraseña de /admin vive como secreto ADMIN_PASSWORD en Cloudflare, nunca en el repositorio.
async function isAdmin(request, env) {
  const h = request.headers.get("authorization") || "";
  const pass = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!pass || !env.ADMIN_PASSWORD) return false;
  return sameText(await sha256Hex(pass), await sha256Hex(String(env.ADMIN_PASSWORD)));
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
  if (body && body.hp) return json({ ok: true }); // trampa para bots
  const r = body && body.respuestas;
  if (!r || typeof r !== "object" || Array.isArray(r)) return json({ error: "missing_answers" }, 400);

  const clean = {};
  for (const [k, v] of Object.entries(r).slice(0, 80)) {
    if (/^[a-z_]{1,40}$/.test(k)) clean[k] = String(v ?? "").slice(0, 3000);
  }
  if (!clean.nombre || !clean.nombre.trim()) return json({ error: "missing_name" }, 400);

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
  return json({ ok: true, id });
}

export async function onRequestGet({ request, env }) {
  if (!(await isAdmin(request, env))) return json({ error: "unauthorized" }, 401);
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
  if (!(await isAdmin(request, env))) return json({ error: "unauthorized" }, 401);
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!/^[0-9a-f-]{36}$/.test(id)) return json({ error: "bad_id" }, 400);
  await env.DB.prepare("DELETE FROM respuestas WHERE id = ?1").bind(id).run();
  return json({ ok: true });
}
