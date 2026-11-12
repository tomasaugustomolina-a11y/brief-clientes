/* Calculadora de plan (/presupuesto): el cliente elige cuánto contenido se imagina y ve el tiempo que se ahorra.
   Acá no hay precios: el presupuesto lo paso yo después de recibir el plan. */
(function () {
  "use strict";

  /* ---------- Para ajustar: horas que le lleva cada pieza a alguien que no se dedica a esto ---------- */
  var HORAS = { reel: 3, carrusel: 2, historia: 0.25 };
  var PLANIFICAR = 3; // pensar qué publicar y armar el calendario del mes
  var CONTENIDO = [
    { id: "reel", nombre: "Reels", max: 31, una: "reel", varias: "reels", hago: "Idea, guion, edición, subtítulos y publicación." },
    { id: "carrusel", nombre: "Carruseles o posts", max: 20, una: "carrusel", varias: "carruseles", hago: "Idea, textos, diseño y publicación." },
    { id: "historia", nombre: "Historias", max: 60, una: "historia", varias: "historias", hago: "Diseño, texto y publicación." }
  ];
  var EXTRAS = [
    { id: "manual", nombre: "Manual de marca completo", nota: "Colores, tipografías, tono y usos" },
    { id: "landing", nombre: "Landing / portfolio web", nota: "Tu página propia, lista para compartir" }
  ];
  var PAQUETES = {
    esencial: { reel: 4, carrusel: 4, historia: 20, extras: [] },
    acelerado: { reel: 30, carrusel: 12, historia: 30, extras: [] }
  };

  var params = new URLSearchParams(location.search);
  var cliente = (params.get("c") || "").replace(/\s+/g, " ").trim().slice(0, 60);
  var nombre = cliente.split(" ")[0];
  var $ = function (id) { return document.getElementById(id); };
  var st;

  // La firma es el wordmark, igual que en el brief.
  var WORDMARK = '<span class="wm" role="img" aria-label="Tomi">' +
    '<svg class="sw" viewBox="0 0 100 80" aria-hidden="true"><path d="M4 50 C 24 18, 40 18, 52 40 S 80 62, 96 30"/></svg>' +
    '<span class="w" aria-hidden="true">Tom<span class="i">ı<i class="d"></i></span></span></span>';
  $("brand").innerHTML = WORDMARK;
  $("sentSign").innerHTML = WORDMARK;
  if (nombre) { $("title").textContent = nombre + ", armá tu plan"; document.title = "Plan de " + nombre + " | Tomi"; }

  /* ---------- Cuentas ---------- */
  function medio(n) { return (Math.round(n * 2) / 2).toString().replace(".", ","); }
  // "45 min", "2,5 h", "12 h"
  function tiempo(h) { return h < 1 ? Math.round(h * 60) + " min" : medio(h) + " h"; }
  function horasDe(c, n) { return n * HORAS[c.id]; }
  function hayContenido(s) { return s.reel + s.carrusel + s.historia > 0; }
  function horasTotal(s) {
    var h = 0;
    CONTENIDO.forEach(function (c) { h += horasDe(c, s[c.id]); });
    return hayContenido(s) ? Math.round(h + PLANIFICAR) : 0;
  }
  function semana(n) {
    var w = n / 4;
    if (w < 1) return n + " en el mes";
    return "≈ " + medio(w) + " por semana";
  }
  // Lo mismo dicho en algo que se entiende de un vistazo
  function equivale(h) {
    if (!h) return "Sumá reels, carruseles o historias para ver el tiempo.";
    if (h < 8) return "Tiempo que podés dedicarle a tu trabajo, no a las redes.";
    var dias = Math.round(h / 8 * 2) / 2, d = Math.floor(dias), sem = h / 4;
    var txt = dias === 1 ? "1 día entero" : dias % 1 ? d + (d === 1 ? " día y medio" : " días y medio") : d + " días enteros";
    return "Son " + txt + " de trabajo, o unas " + (sem >= 10 ? Math.round(sem) : medio(sem)) + " horas por semana.";
  }
  function samePack(s) {
    for (var k in PAQUETES) {
      var p = PAQUETES[k], ok = p.reel === s.reel && p.carrusel === s.carrusel && p.historia === s.historia;
      EXTRAS.forEach(function (e) { if (!!s.extras[e.id] !== (p.extras.indexOf(e.id) !== -1)) ok = false; });
      if (ok) return k;
    }
    return "";
  }
  function packState(k) {
    var p = PAQUETES[k], ex = {};
    p.extras.forEach(function (id) { ex[id] = true; });
    return { reel: p.reel, carrusel: p.carrusel, historia: p.historia, extras: ex };
  }

  /* ---------- Pantalla ---------- */
  function fill(el) { el.style.setProperty("--pct", ((el.value - el.min) / (el.max - el.min) * 100) + "%"); }
  CONTENIDO.forEach(function (c) {
    var row = document.createElement("div"); row.className = "row";
    row.innerHTML = '<div class="row-head"><label class="row-name" for="s-' + c.id + '">' + c.nombre + '</label>' +
      '<div class="stepper"><button type="button" class="step" data-d="-1" aria-label="Menos ' + c.varias + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg></button>' +
      '<span class="row-val" id="v-' + c.id + '" aria-hidden="true"></span>' +
      '<button type="button" class="step" data-d="1" aria-label="Más ' + c.varias + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M12 5v14" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg></button></div></div>' +
      '<p class="row-do">' + c.hago + '</p>' +
      '<p class="row-note"><span id="n-' + c.id + '"></span><span class="save" id="h-' + c.id + '"></span></p>' +
      '<input type="range" id="s-' + c.id + '" min="0" max="' + c.max + '" step="1">';
    $("sliders").appendChild(row);
    var input = row.querySelector("input");
    input.addEventListener("input", function () { st[c.id] = +input.value; render(true); });
    row.querySelectorAll(".step").forEach(function (b) {
      b.addEventListener("click", function () {
        st[c.id] = Math.max(0, Math.min(c.max, st[c.id] + (+b.dataset.d))); render(true);
      });
    });
  });
  EXTRAS.forEach(function (e) {
    var b = document.createElement("button"); b.type = "button"; b.className = "extra"; b.setAttribute("aria-pressed", "false"); b.dataset.id = e.id;
    b.innerHTML = "<b>" + e.nombre + "</b><small>" + e.nota + "</small>" +
      '<svg class="tick" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12.5l5 5 10-11" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    b.addEventListener("click", function () { st.extras[e.id] = !st.extras[e.id]; render(true); });
    $("extras").appendChild(b);
  });
  document.querySelectorAll(".pack").forEach(function (b) {
    b.addEventListener("click", function () { st = packState(b.dataset.pack); render(true); });
  });

  var lastTotal = null;
  function render(animate) {
    CONTENIDO.forEach(function (c) {
      var input = $("s-" + c.id), n = st[c.id];
      input.value = n; fill(input);
      $("v-" + c.id).textContent = n;
      $("n-" + c.id).textContent = n ? semana(n) : "Sin " + c.varias;
      $("h-" + c.id).textContent = n ? "Te ahorro " + tiempo(horasDe(c, n)) : "";
      input.setAttribute("aria-valuetext", n + " " + (n === 1 ? c.una : c.varias) + " por mes" + (n ? ", te ahorro " + tiempo(horasDe(c, n)) : ""));
      var steps = input.parentNode.querySelectorAll(".step");
      steps[0].disabled = n <= 0; steps[1].disabled = n >= c.max;
    });
    document.querySelectorAll(".extra").forEach(function (b) { b.setAttribute("aria-pressed", st.extras[b.dataset.id] ? "true" : "false"); });
    var pk = samePack(st);
    document.querySelectorAll(".pack").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.pack === pk ? "true" : "false"); });

    var t = horasTotal(st), texto = t ? "≈ " + t + (t === 1 ? " hora" : " horas") : "0 horas";
    $("tUsd").textContent = texto;
    $("savedN").textContent = texto;
    $("savedEq").textContent = equivale(t);
    $("tPack").textContent = pk ? "Paquete " + pk.charAt(0).toUpperCase() + pk.slice(1) : "";
    if (animate && lastTotal !== null && lastTotal !== t) {
      var el = $("tUsd"); el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump");
    }
    lastTotal = t;

    var det = $("detail"); det.innerHTML = "";
    function fila(a, b) {
      var li = document.createElement("li"), x = document.createElement("span"), y = document.createElement("span");
      x.textContent = a; y.textContent = b; li.appendChild(x); li.appendChild(y); det.appendChild(li);
    }
    CONTENIDO.forEach(function (c) {
      var n = st[c.id];
      if (n) fila(n + " " + (n === 1 ? c.una : c.varias) + " por mes", "≈ " + tiempo(horasDe(c, n)));
    });
    if (hayContenido(st)) fila("Pensar qué publicar y armar el calendario", "≈ " + tiempo(PLANIFICAR));
    EXTRAS.forEach(function (e) { if (st.extras[e.id]) fila(e.nombre, "Una vez"); });
    fila("Estrategia base", "El primer mes");
  }

  /* ---------- Mandar el plan: queda guardado en /admin ---------- */
  var fNombre = $("fNombre"), fContacto = $("fContacto"), enviando = false;
  if (cliente) fNombre.value = cliente;
  function marcar(el, msg) {
    el.setAttribute("aria-invalid", "true");
    $("sendMsg").textContent = msg;
    el.focus({ preventScroll: true });
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  function soltar() { enviando = false; $("formBtn").disabled = $("sendBtn").disabled = false; }
  function enviar() {
    if (enviando) return;
    [fNombre, fContacto].forEach(function (el) { el.removeAttribute("aria-invalid"); });
    if (!hayContenido(st) && !EXTRAS.some(function (e) { return st.extras[e.id]; })) {
      $("sendMsg").textContent = "Elegí al menos un reel, un carrusel o una historia.";
      $("h-content").scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (!fNombre.value.trim()) return marcar(fNombre, "Contame cómo te llamás.");
    if (!fContacto.value.trim()) return marcar(fContacto, "Dejame tu WhatsApp o tu mail.");
    enviando = true; $("formBtn").disabled = $("sendBtn").disabled = true;
    $("sendMsg").textContent = "Mandando…";
    fetch("/api/planes", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        hp: $("hp").value, cliente: cliente, nombre: fNombre.value.trim(), contacto: fContacto.value.trim(),
        reel: st.reel, carrusel: st.carrusel, historia: st.historia,
        extras: EXTRAS.filter(function (e) { return st.extras[e.id]; }).map(function (e) { return e.id; }),
        paquete: samePack(st), horas: horasTotal(st)
      })
    }).then(function (r) {
      if (r.ok) return "ok";
      if (r.status === 429) return "muchos";
      if (r.status === 400) return r.json().then(function (d) { return d && d.error === "bad_contact" ? "contacto" : "error"; }, function () { return "error"; });
      return "error";
    }).then(function (res) {
      if (res === "contacto") { soltar(); return marcar(fContacto, "Revisá el número o el mail: no parece estar bien escrito."); }
      if (res === "muchos") { soltar(); $("sendMsg").textContent = "Llegaron muchos envíos seguidos. Esperá unos minutos y probá de nuevo."; return; }
      if (res !== "ok") throw new Error("http");
      $("sendForm").hidden = true; $("sent").hidden = false;
      $("sentTitle").textContent = "¡Listo, " + fNombre.value.trim().split(/\s+/)[0] + "! Ya me llegó tu plan.";
      $("sendBtn").textContent = "Enviado";
      $("sent").focus({ preventScroll: true });
      $("sent").scrollIntoView({ behavior: "smooth", block: "center" });
    }).catch(function () {
      soltar();
      $("sendMsg").textContent = "No se pudo mandar. Revisá tu conexión y probá de nuevo.";
    });
  }
  $("sendForm").addEventListener("submit", function (e) { e.preventDefault(); enviar(); });
  $("sendBtn").addEventListener("click", enviar);

  /* ---------- Tema ---------- */
  var themeBtn = $("themeBtn");
  function isDark() {
    var t = document.documentElement.getAttribute("data-theme");
    if (t) return t === "dark";
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  function syncTheme() {
    var dark = isDark();
    themeBtn.setAttribute("aria-label", dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro");
    var m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute("content", dark ? "#000000" : "#FFFFFF");
  }
  themeBtn.addEventListener("click", function () {
    var next = isDark() ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("tema", next); } catch (e) {}
    syncTheme();
  });
  syncTheme();

  st = packState("esencial");
  render(false);
})();
