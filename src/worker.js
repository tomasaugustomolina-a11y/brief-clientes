// Punto de entrada: /api/respuestas (brief), /api/planes (calculadora) y /api/contacto los atiende el código; todo lo demás son los archivos de /public.
import * as respuestas from "./respuestas.js";
import * as planes from "./presupuestos.js";

const rutas = {
  "/api/respuestas": { POST: respuestas.onRequestPost, GET: respuestas.onRequestGet, DELETE: respuestas.onRequestDelete },
  "/api/planes": { POST: planes.onRequestPost, GET: planes.onRequestGet, DELETE: planes.onRequestDelete },
};
const sinCache = { "x-content-type-options": "nosniff", "cache-control": "no-store" };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/contacto" && request.method === "GET") {
      try {
        return await respuestas.onRequestContacto({ request, env });
      } catch (err) {
        console.error("contacto", err);
        return new Response(JSON.stringify({ ok: true, sinRevisar: true }), { headers: { "content-type": "application/json", ...sinCache } });
      }
    }
    const handlers = rutas[url.pathname];
    if (handlers) {
      const handler = handlers[request.method];
      if (!handler) return new Response("Method not allowed", { status: 405, headers: { allow: "GET, POST, DELETE", ...sinCache } });
      try {
        return await handler({ request, env });
      } catch (err) {
        console.error("api", err);
        return new Response(JSON.stringify({ error: "server_error" }), { status: 500, headers: { "content-type": "application/json", ...sinCache } });
      }
    }
    return env.ASSETS.fetch(request);
  },
};
