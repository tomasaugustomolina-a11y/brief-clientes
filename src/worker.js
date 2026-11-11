// Punto de entrada: /api/respuestas (brief) y /api/presupuestos (calculadora) los atiende el código; todo lo demás son los archivos de /public.
import * as respuestas from "./respuestas.js";
import * as presupuestos from "./presupuestos.js";

const routes = {
  "/api/respuestas": { POST: respuestas.onRequestPost, GET: respuestas.onRequestGet, DELETE: respuestas.onRequestDelete },
  "/api/presupuestos": { POST: presupuestos.onRequestPost, GET: presupuestos.onRequestGet, DELETE: presupuestos.onRequestDelete },
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const handlers = routes[url.pathname];
    if (handlers) {
      const handler = handlers[request.method];
      if (!handler) return new Response("Method not allowed", { status: 405, headers: { allow: "GET, POST, DELETE" } });
      try {
        return await handler({ request, env, ctx });
      } catch (err) {
        return new Response(JSON.stringify({ error: "server_error" }), { status: 500, headers: { "content-type": "application/json" } });
      }
    }
    return env.ASSETS.fetch(request);
  },
};
