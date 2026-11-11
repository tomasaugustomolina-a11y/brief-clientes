// Punto de entrada: /api/respuestas lo atiende el código; todo lo demás son los archivos de /public.
import { onRequestPost, onRequestGet, onRequestDelete } from "./respuestas.js";

const handlers = { POST: onRequestPost, GET: onRequestGet, DELETE: onRequestDelete };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/respuestas") {
      const handler = handlers[request.method];
      if (!handler) return new Response("Method not allowed", { status: 405, headers: { allow: "GET, POST, DELETE", "x-content-type-options": "nosniff", "cache-control": "no-store" } });
      try {
        return await handler({ request, env });
      } catch (err) {
        console.error("api", err);
        return new Response(JSON.stringify({ error: "server_error" }), { status: 500, headers: { "content-type": "application/json", "x-content-type-options": "nosniff", "cache-control": "no-store" } });
      }
    }
    return env.ASSETS.fetch(request);
  },
};
