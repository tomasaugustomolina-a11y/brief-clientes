# Brief de clientes

Formulario móvil, pregunta a pregunta, para conocer a cada cliente antes de armar su estrategia de marca personal.

- `public/index.html`: el formulario. Link por cliente: `/?c=nombre-del-cliente`.
- `public/admin.html`: página privada (`/admin`) para ver las respuestas, armar links por cliente y descargar Excel o JSON.
- `public/preguntas.js`: las preguntas. Se editan acá y las usan las dos páginas.
- `functions/api/respuestas.js`: guarda las respuestas en la base D1 `brief-clientes` (Cloudflare).

## Publicación

Cloudflare Pages conectado a este repositorio. Configuración: sin comando de build, carpeta de salida `public`. La base y la contraseña de `/admin` se configuran en `wrangler.toml`.

Para cambiar la contraseña de `/admin`: calcular el SHA-256 de la nueva (`printf '%s' 'nueva' | shasum -a 256`) y reemplazar `ADMIN_HASH` en `wrangler.toml`.
