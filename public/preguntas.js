/* Preguntas del brief. Las usan el formulario (index.html) y la página privada (admin.html).
   type: "text" | "long" | "one" | "many". En "one" y "many" siempre se agrega la opción "Otro". */
window.BRIEF = {
  otro: "Otro",
  secciones: [
    {
      id: "vos", nombre: "Sobre vos",
      preguntas: [
        { id: "nombre", type: "text", req: true, q: "¿Cómo te llamás?", ph: "Nombre y apellido", auto: "name" },
        { id: "contacto", type: "text", req: true, q: "¿Por dónde te escribimos?", note: "Escribí tu número de teléfono o tu mail.", ph: "WhatsApp o mail", auto: "tel" },
        { id: "rubro", type: "text", req: true, q: "¿A qué te dedicás?", note: "Contalo con tus palabras.", ph: "Ej.: arquitecta, nutricionista" },
        { id: "vender", type: "many", req: true, q: "¿Qué te gustaría vender más?",
          o: ["Servicios uno a uno", "Proyectos completos", "Asesorías", "Cursos o talleres", "Productos físicos", "Productos digitales"] },
        { id: "canales", type: "many", req: true, q: "Hoy, ¿cómo te llegan los clientes?",
          o: ["Me recomiendan", "Instagram", "TikTok", "Google", "LinkedIn", "Conocidos", "Todavía no tengo clientes"] },
        { id: "diferencial", type: "many", max: 2, req: true, q: "¿Por qué te eligen a vos y no a otro?",
          o: ["Por cómo trato a la gente", "Por la calidad de lo que entrego", "Porque cumplo los tiempos", "Por el precio", "Porque me especialicé en algo puntual", "Por mi experiencia", "Por mi estilo", "Todavía no lo sé"] }
      ]
    },
    {
      id: "objetivos", nombre: "Lo que querés lograr",
      preguntas: [
        { id: "para_que", type: "many", max: 2, req: true, q: "¿Para qué querés trabajar tu marca personal?",
          o: ["Conseguir más clientes", "Poder cobrar más", "Que me reconozcan en lo mío", "Encontrar socios o trabajo", "Lanzar un curso o producto", "Ordenar lo que ya hago"] },
        { id: "exito", type: "one", req: true, q: "En 6 meses, ¿qué te haría decir «valió la pena»?",
          o: ["Que me escriban por redes todas las semanas", "Cerrar clientes nuevos gracias a las redes", "Que me conozcan en mi rubro", "Tener un perfil que me dé orgullo mostrar", "Publicar seguido sin que me cueste"] },
        { id: "fecha", type: "one", req: true, q: "¿Tenés algo importante en los próximos meses?", note: "Así sabemos si hay algo urgente para priorizar.",
          o: ["No, nada en particular", "Lanzo un negocio o emprendimiento", "Lanzo un producto o servicio nuevo", "Un evento, feria o charla", "Se viene mi temporada alta"] }
      ]
    },
    {
      id: "publico", nombre: "Tu cliente ideal",
      preguntas: [
        { id: "conoce", type: "one", req: true, q: "¿Sabés quién es tu cliente ideal?", note: "Es la persona con la que más te gusta trabajar y que mejor te paga.",
          o: ["Sí, lo tengo claro", "Más o menos", "No, hay que encontrarlo juntos"] },
        /* Si responde que no lo conoce, estas cuatro se saltean y lo trabajamos en la llamada. */
        { id: "quien", type: "many", req: true, skipIf: { id: "conoce", v: "No, hay que encontrarlo juntos" }, q: "¿Quién te contrata o te gustaría que te contrate?",
          o: ["Particulares", "Parejas o familias", "Emprendedores", "Empresas o pymes", "Gente de mi rubro"] },
        { id: "edad", type: "many", req: true, skipIf: { id: "conoce", v: "No, hay que encontrarlo juntos" }, q: "¿Qué edad tiene, más o menos?",
          o: ["18 a 24", "25 a 34", "35 a 44", "45 a 54", "55 o más"] },
        { id: "donde", type: "one", req: true, skipIf: { id: "conoce", v: "No, hay que encontrarlo juntos" }, q: "¿Dónde está?",
          o: ["En mi ciudad", "En todo el país", "En cualquier lado, trabajo online"] },
        { id: "dudas", type: "many", max: 2, req: true, skipIf: { id: "conoce", v: "No, hay que encontrarlo juntos" }, q: "¿Qué duda tiene antes de contratarte?",
          o: ["Si le alcanza la plata", "Si voy a cumplir los tiempos", "Si le va a gustar el resultado", "Cómo es el proceso", "Si puede confiar en mí", "Si hay alguien más barato"] }
      ]
    },
    {
      id: "redes", nombre: "Tus redes hoy",
      preguntas: [
        { id: "usuario", type: "text", q: "¿Cuál es tu red principal?", ph: "@usuario o link", note: "Si todavía no tenés, seguí de largo." },
        { id: "redes_usa", type: "many", req: true, q: "¿Qué redes usás para tu trabajo?",
          o: ["Instagram", "TikTok", "LinkedIn", "Facebook", "YouTube", "Web propia", "Ninguna todavía"] },
        { id: "redes_crecer", type: "many", max: 2, req: true, q: "¿Dónde te gustaría crecer?",
          o: ["Instagram", "TikTok", "LinkedIn", "YouTube", "No sé, que me recomienden"] },
        { id: "frecuencia", type: "one", req: true, q: "¿Cada cuánto publicás?",
          o: ["Casi nunca", "Menos de una vez por semana", "Una o dos veces por semana", "Tres o más veces por semana"] },
        { id: "identidad", type: "many", req: true, q: "¿Qué tenés armado de tu imagen?",
          o: ["Logo", "Colores", "Tipografías", "Fotos profesionales mías", "Fotos de mis trabajos", "Nada todavía"] }
      ]
    },
    {
      id: "estilo", nombre: "Tu estilo",
      preguntas: [
        { id: "personalidad", type: "many", max: 3, req: true, q: "Si tu marca fuera una persona, ¿cómo sería?",
          o: ["Cercana", "Seria", "Creativa", "Elegante", "Divertida", "Experta", "Cálida", "Atrevida"] },
        { id: "estetica", type: "many", max: 2, req: true, q: "¿Qué estilo te gusta para tu contenido?",
          o: ["Minimalista", "Cálido y natural", "Moderno y con fuerza", "Elegante", "Colorido", "Urbano"] },
        { id: "referentes", type: "long", q: "¿Hay alguna cuenta que te guste cómo comunica?", ph: "Usuarios o links, de cualquier rubro", note: "Opcional, pero ayuda mucho." },
        { id: "camara", type: "one", req: true, q: "¿Cómo te llevás con la cámara?",
          o: ["Me muero de vergüenza", "Me cuesta, pero me animo", "Bien, con un poco de práctica", "Me encanta"] },
        { id: "no_mostrar", type: "many", req: true, q: "¿Hay algo que prefieras no mostrar?",
          o: ["Mi cara", "Mi voz", "Mi familia", "Mi casa", "Mis opiniones", "Mis precios", "Nada, todo bien"] }
      ]
    },
    {
      id: "recursos", nombre: "Tiempo y recursos",
      preguntas: [
        { id: "tiempo", type: "one", req: true, q: "¿Cuánto tiempo por semana podés dedicarle a grabar o sacar fotos?",
          o: ["Menos de una hora", "Una o dos horas", "De tres a cinco horas", "Más de cinco horas"] },
        { id: "pauta", type: "one", req: true, q: "¿Tenés presupuesto para publicidad paga?",
          o: ["No por ahora", "Menos de USD 50 por mes", "Entre USD 50 y 150 por mes", "Más de USD 150 por mes"] },
        { id: "extra", type: "long", q: "¿Algo más que quieras contar?", ph: "Dudas, ideas, lo que te entusiasma o lo que te frena", note: "Opcional." }
      ]
    }
  ]
};
