// Aviso por mail con Resend (https://resend.com), sin dominio propio:
// en el plan gratis, desde onboarding@resend.dev se puede mandar al mail con el que te registraste.
// Se configura en Cloudflare (Settings > Variables and Secrets), nunca en el repositorio:
//   RESEND_API_KEY  (secreto)  la clave de la API de Resend
//   AVISO_MAIL      (variable) el mail donde querés recibir los avisos (el de tu cuenta de Resend)
// Si falta alguna de las dos, no se manda nada y todo lo demás sigue andando.
export async function avisarPorMail(env, { asunto, texto }) {
  const key = String(env.RESEND_API_KEY || "").trim();
  const to = String(env.AVISO_MAIL || "").trim();
  if (!key || !to) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ from: "Avisos de tu web <onboarding@resend.dev>", to: [to], subject: asunto, text: texto }),
    });
  } catch {
    // Si el mail falla, el plan igual quedó guardado en /admin.
  }
}
