# Brief de clientes

Formulario móvil, pregunta a pregunta, para conocer a cada cliente antes de armar su estrategia de marca personal.

- `public/index.html`: el formulario. Link por cliente: `/?c=nombre-del-cliente`.
- `public/admin.html`: página privada (`/admin`) para ver las respuestas, armar links por cliente y descargar Excel o JSON.
- `public/preguntas.js`: las preguntas. Se editan acá y las usan las dos páginas.
- `src/worker.js` y `src/respuestas.js`: guardan las respuestas en la base D1 `brief-clientes` (Cloudflare).

## Publicación

Cloudflare Workers conectado a este repositorio: cada push a `main` se publica solo (`npx wrangler deploy`). La base se configura en `wrangler.toml`.

La contraseña de `/admin` es el secreto `ADMIN_PASSWORD` del Worker (Cloudflare > Workers & Pages > brief-clientes > Settings > Variables and Secrets). Para cambiarla se edita ahí; no va en el repositorio.
