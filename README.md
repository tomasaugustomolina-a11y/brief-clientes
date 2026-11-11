# Brief de clientes

Formulario móvil, pregunta a pregunta, para conocer a cada cliente antes de armar su estrategia de marca personal.

- `public/index.html` y `public/app.js`: el formulario. Link por cliente: `/?c=Nombre+Apellido`.
- `public/admin.html` y `public/admin.js`: página privada (`/admin`) para ver las respuestas, armar links por cliente y descargar Excel o JSON.
- `public/preguntas.js`: las preguntas. Se editan acá y las usan las dos páginas.
- `src/worker.js` y `src/respuestas.js`: guardan las respuestas en la base D1 `brief-clientes` (Cloudflare).

## Publicación

Cloudflare Workers conectado a este repositorio: cada push a `main` se publica solo (`npx wrangler deploy`). La base se configura en `wrangler.toml`.

La contraseña de `/admin` es el secreto `ADMIN_PASSWORD` del Worker (Cloudflare > Workers & Pages > brief-clientes > Settings > Variables and Secrets). Para cambiarla se edita ahí; no va en el repositorio.

## Seguridad

- La contraseña de `/admin` nunca va en el repositorio. Después de 8 contraseñas equivocadas desde una misma conexión, la API pide esperar 15 minutos.
- Cada conexión puede mandar hasta 6 respuestas cada 10 minutos.
- De cada conexión se guarda solo una huella (no la IP), en la tabla `intentos`, y se borra al día.
- Las páginas no usan scripts en línea ni de otros sitios (`public/_headers` lo exige con Content-Security-Policy). Si se agrega JavaScript, va en un archivo de `public/`.
- El Excel se arma con SheetJS 0.18.5, copiado en `public/vendor/`.
