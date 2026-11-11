/* El formulario: una pregunta por pantalla. Las preguntas están en preguntas.js. */
(function () {
  "use strict";
  var B = window.BRIEF, OTRO = B.otro;
  var FLOW = [];
  B.secciones.forEach(function (s, si) {
    s.preguntas.forEach(function (q, qi) { q.sec = s; q.si = si; q.qi = qi; q.n = s.preguntas.length; FLOW.push(q); });
  });

  var KEY = "brief-tomi-v2";
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var touch = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  var $ = function (id) { return document.getElementById(id); };
  var secPart = $("secPart");
  var stage = $("stage"), nextBtn = $("nextBtn"), backBtn = $("backBtn"), secName = $("secName"), barFill = $("barFill"), foot = $("foot"), where = $("where");

  // Cliente que viene en el link: ?c=lucia-fernandez
  var params = new URLSearchParams(location.search);
  var cliente = (params.get("c") || "").replace(/\s+/g, " ").trim().slice(0, 60);
  // Links nuevos traen el nombre tal cual (con tildes y mayúsculas). Los viejos venían en minúscula y con guiones.
  var nombreLink = /[A-ZÁÉÍÓÚÑÜ]/.test(cliente) ? cliente
    : cliente.replace(/[-_+.]+/g, " ").replace(/\s+/g, " ").trim()
      .split(" ").map(function (w) { return w ? w.charAt(0).toUpperCase() + w.slice(1) : w; }).join(" ");

  var st = { i: -1, a: {}, cliente: cliente };
  var hadDraft = false;
  try {
    var raw = localStorage.getItem(KEY);
    if (raw) { var d = JSON.parse(raw); if (d && d.a && (!cliente || d.cliente === cliente)) { st = d; hadDraft = d.i >= 0; st.i = -1; } }
  } catch (e) {}
  if (cliente) st.cliente = cliente;
  var resumeAt = 0;
  if (hadDraft) { try { resumeAt = Math.min(JSON.parse(localStorage.getItem(KEY)).i, FLOW.length - 1); } catch (e) { resumeAt = 0; } }
  if (resumeAt > 0 && !visible(FLOW[resumeAt])) resumeAt = prevIndex(resumeAt);
  if (resumeAt < 0) resumeAt = 0;

  /* Preguntas que se saltean según otra respuesta (skipIf en preguntas.js). */
  function visible(q) {
    if (!q || !q.skipIf) return true;
    var a = st.a[q.skipIf.id];
    return !(a && a.sel.indexOf(q.skipIf.v) !== -1);
  }
  function nextIndex(i) { var n = i + 1; while (n < FLOW.length && !visible(FLOW[n])) n++; return n; }
  function prevIndex(i) { var n = i - 1; while (n >= 0 && !visible(FLOW[n])) n--; return n; }

  function A(id) { return st.a[id] || (st.a[id] = { sel: [], otro: "", text: "" }); }
  if (nombreLink && !A("nombre").text) A("nombre").text = nombreLink;

  var saveT;
  function save() { clearTimeout(saveT); saveT = setTimeout(function () { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }, 250); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function words(text) { return text.split(" ").map(function (w, k) { return '<span class="w" style="--i:' + k + '">' + esc(w) + "</span>"; }).join(" "); }

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
  if (window.matchMedia) { try { window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", syncTheme); } catch (e) {} }
  syncTheme();

  /* ---------- Respuestas ---------- */
  function value(q) {
    var a = st.a[q.id]; if (!a) return "";
    if (q.type === "text" || q.type === "long") return (a.text || "").trim();
    var parts = a.sel.filter(function (s) { return s !== OTRO; });
    if (a.sel.indexOf(OTRO) !== -1) parts.push(a.otro.trim() ? "Otro: " + a.otro.trim() : "Otro");
    return parts.join("; ");
  }
  /* ---------- Contacto: mail o teléfono reales ---------- */
  var RE_MAIL = /^[^\s@<>()\[\]",;:]{1,64}@((?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24})$/i;
  var RE_TEL = /^\+?[\d\s().-]{8,24}$/;
  var COMUNES = ["gmail.com", "hotmail.com", "hotmail.com.ar", "outlook.com", "outlook.com.ar", "yahoo.com", "yahoo.com.ar", "live.com", "live.com.ar", "icloud.com", "me.com", "protonmail.com", "proton.me"];
  var revisados = {}, aceptados = {};
  function formatoContacto(t) {
    t = t.trim();
    if (t.indexOf("@") !== -1) {
      if (t.length > 254 || !RE_MAIL.test(t)) return "Revisá el mail: tiene que ser tipo nombre@gmail.com, sin espacios.";
      return "";
    }
    var dig = t.replace(/\D/g, "").length;
    if (!RE_TEL.test(t) || dig < 8 || dig > 15) return "Escribí un teléfono con código de área (por ejemplo 11 5555 5555) o un mail.";
    return "";
  }
  function distancia(a, b) {
    var d = [], i, j;
    for (i = 0; i <= a.length; i++) { d[i] = [i]; }
    for (j = 1; j <= b.length; j++) d[0][j] = j;
    for (i = 1; i <= a.length; i++) for (j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  }
  // "lucia@gmial.com" → "lucia@gmail.com"
  function sugerencia(t) {
    var m = t.trim().toLowerCase().match(/^(.+)@(.+)$/);
    if (!m || COMUNES.indexOf(m[2]) !== -1) return "";
    var mejor = "", dmin = 3;
    COMUNES.forEach(function (c) { var d = distancia(m[2], c); if (d < dmin) { dmin = d; mejor = c; } });
    return mejor ? t.trim().replace(/@.+$/, "@" + mejor) : "";
  }

  function problem(q) {
    var a = A(q.id);
    if (q.id === "contacto" && a.text.trim()) return formatoContacto(a.text);
    if (q.type === "text" || q.type === "long") return q.req && !a.text.trim() ? "Completá este dato para seguir." : "";
    if (a.sel.indexOf(OTRO) !== -1 && !a.otro.trim()) return "Escribí qué es «Otro» o desmarcalo.";
    if (q.req && !a.sel.length) return q.type === "one" ? "Elegí una opción para seguir." : "Elegí al menos una opción para seguir.";
    return "";
  }
  function isEmpty(q) { var a = A(q.id); return (q.type === "text" || q.type === "long") ? !a.text.trim() : !a.sel.length; }
  function hintText(q) {
    if (q.note) return q.note;
    if (q.type === "one") return "Elegí una.";
    if (q.type === "many") return q.max ? "Elegí hasta " + q.max + "." : "Podés elegir varias.";
    return "";
  }

  /* ---------- Pantallas ---------- */
  // El saludo letra por letra, para la animación de cartel. Cada letra prende con un atraso apenas distinto.
  function letters(text) {
    if (text.normalize) text = text.normalize("NFC");
    var chars = Array.from ? Array.from(text.replace(/\s/g, "")) : text.replace(/\s/g, "").split("");
    var step = Math.min(60, 620 / Math.max(chars.length, 1));
    var soloLetras = chars.map(function (c, k) { return /[.,;:!¡?¿'-]/.test(c) ? -1 : k; }).filter(function (k) { return k !== -1; });
    var falla = soloLetras.length > 2 ? soloLetras[Math.floor(Math.random() * soloLetras.length)] : -1;
    var n = 0;
    return text.split(" ").map(function (w) {
      return '<span class="w">' + (Array.from ? Array.from(w) : w.split("")).map(function (ch) {
        var d = Math.round(n * step + Math.random() * 160), c = n === falla ? " falla" : "";
        n++;
        return '<span class="l' + c + '" style="--d:' + d + 'ms">' + esc(ch) + "</span>";
      }).join("") + "</span>";
    }).join(" ");
  }
  function cardWelcome(cartel) {
    var first = (nombreLink || "").split(" ")[0];
    var hola = first ? "Hola, " + first + "." : "Hola.";
    return (cartel
        ? '<h1 class="q" tabindex="-1" aria-label="' + esc(hola) + '"><span aria-hidden="true">' + letters(hola) + "</span></h1>"
        : '<h1 class="q" tabindex="-1">' + words(hola) + "</h1>") +
      '<p class="lead">Antes de armar tu estrategia de marca personal quiero conocerte un poco. Son 5 minutos. Si ninguna opción te representa, tocá «Otro» y escribilo a tu manera.</p>' +
      '<p class="sign">— Tomi</p>' +
      (hadDraft ? '<button type="button" class="restart" id="restartBtn">Empezar de nuevo</button>' : "") +
      (touch
        ? '<p class="tip"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18M7 7.5L12 3l5 4.5M7 16.5l5 4.5 5-4.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>Deslizá hacia arriba para seguir y hacia abajo para volver.</p>'
        : '<p class="tip"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 5v6a3 3 0 0 1-3 3H5M9.5 9.5L5 14l4.5 4.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>Apretá Enter para seguir.</p>');
  }
  function cardQuestion(q) {
    var a = A(q.id), body = "", hint = hintText(q);
    if (q.type === "text") {
      var extra = q.id === "nombre" ? ' autocapitalize="words"' : (q.id === "contacto" || q.id === "usuario" ? ' autocapitalize="off" autocorrect="off" spellcheck="false"' : "");
      body = '<input class="line" id="in-' + q.id + '" type="text" enterkeyhint="next"' + extra + ' autocomplete="' + (q.auto || "off") + '" value="' + esc(a.text) + '" placeholder="' + esc(q.ph || "") + '" aria-labelledby="qh">';
    } else if (q.type === "long") {
      body = '<textarea class="line" id="in-' + q.id + '" placeholder="' + esc(q.ph || "") + '" aria-labelledby="qh">' + esc(a.text) + "</textarea>";
    } else {
      var opts = q.o.concat([OTRO]);
      var short = opts.every(function (o) { return o.length <= 14; });
      body = '<div class="opts' + (short ? " chips" : "") + '" role="group" aria-labelledby="qh">' + opts.map(function (o, k) {
        return '<button type="button" class="opt' + (o === OTRO ? " otro" : "") + '" style="--j:' + k + '" data-v="' + esc(o) + '" aria-pressed="' + (a.sel.indexOf(o) !== -1) + '">' +
          "<span>" + esc(o) + '</span><svg class="tick" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></button>';
      }).join("") + "</div>" +
      '<div id="otroWrap"' + (a.sel.indexOf(OTRO) !== -1 ? "" : " hidden") + '><input class="line" id="otroIn" type="text" enterkeyhint="next" value="' + esc(a.otro) + '" placeholder="Escribilo acá" aria-label="Tu respuesta para «Otro»"></div>';
    }
    return '<h1 class="q" id="qh" tabindex="-1">' + words(q.q) + "</h1>" +
      (hint ? '<p class="hint" id="hint">' + esc(hint) + "</p>" : "") + body +
      '<p class="err" id="err" role="alert" hidden></p>';
  }
  function cardDone() {
    return '<svg class="done-mark" viewBox="0 0 92 92" aria-hidden="true"><circle cx="46" cy="46" r="46"/><path d="M27 47l13 13 25-27"/></svg>' +
      '<h1 class="q" tabindex="-1">' + words("Respuestas guardadas.") + "</h1>" +
      '<p class="lead">Gracias. Te escribo lo antes posible.</p>' +
      '<p class="sign">— Tomi</p>';
  }

  var current = null, busy = false, autoT = null;

  function chrome() {
    var i = st.i;
    if (i === -1) {
      secName.textContent = ""; secPart.textContent = ""; barFill.style.width = "0%";
      backBtn.hidden = true; nextBtn.textContent = hadDraft ? "Seguir donde quedé" : "Empezar";
      nextBtn.setAttribute("aria-disabled", "false"); foot.hidden = false; where.style.visibility = "hidden";
      return;
    }
    if (i >= FLOW.length) { foot.hidden = true; where.style.visibility = "hidden"; return; }
    var q = FLOW[i];
    if (secName.textContent !== q.sec.nombre) swapSection(q.sec.nombre);
    var np = (q.si + 1), tp = B.secciones.length;
    secPart.innerHTML = '<span class="l">Parte ' + np + " de " + tp + '</span><span class="s">' + np + "/" + tp + "</span>";
    var vis = q.sec.preguntas.filter(visible);
    barFill.style.width = ((vis.indexOf(q) + 1) / vis.length * 100) + "%";
    backBtn.hidden = false; foot.hidden = false; where.style.visibility = "visible";
    refreshNext();
  }
  function refreshNext() {
    if (st.i < 0 || st.i >= FLOW.length) return;
    var q = FLOW[st.i], last = nextIndex(st.i) >= FLOW.length;
    var bad = !!problem(q);
    nextBtn.setAttribute("aria-disabled", bad ? "true" : "false");
    nextBtn.textContent = last ? "Enviar respuestas" : (!q.req && isEmpty(q) ? "Saltar" : "Siguiente");
  }
  function swapSection(name) {
    var span = secName;
    if (reduced || !span.animate) { span.textContent = name; return; }
    span.animate([{ transform: "none", opacity: 1 }, { transform: "translateY(-100%)", opacity: 0 }], { duration: 220, easing: "ease-in" }).onfinish = function () {
      span.textContent = name;
      span.animate([{ transform: "translateY(100%)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 320, easing: "cubic-bezier(.22,.8,.2,1)" });
    };
  }

  function build(i, cartel) {
    var el = document.createElement("section");
    el.className = "card" + (cartel ? " cartel" : "");
    el.innerHTML = i === -1 ? cardWelcome(cartel) : (i >= FLOW.length ? cardDone() : cardQuestion(FLOW[i]));
    return el;
  }
  // Prende el cartel de la bienvenida. Espera a que esté la tipografía (medio segundo como mucho).
  function encender(el) {
    var box = document.querySelector(".app"), started = false;
    box.classList.add("boot");
    var start = function () {
      if (started) return; started = true;
      el.classList.add("on"); box.classList.add("on");
      setTimeout(function () { box.classList.remove("boot", "on"); el.classList.remove("cartel", "on"); }, 3200);
    };
    var t = setTimeout(start, 500);
    try {
      document.fonts.load('400 40px "Anton"').then(function () { clearTimeout(t); requestAnimationFrame(start); }, start);
    } catch (e) { clearTimeout(t); start(); }
  }

  function go(to, dir) {
    if (busy) return;
    clearTimeout(autoT);
    var from = current;
    st.i = to;
    if (to >= 0 && to < FLOW.length) save();
    var el = build(to, !from && to === -1 && !reduced);
    var oldH = stage.clientHeight;
    stage.appendChild(el);
    current = el;
    chrome();
    fitStage();
    var dist = Math.max(oldH, stage.clientHeight, el.offsetHeight) + "px";
    var finish = function () {
      if (from && from.parentNode) from.parentNode.removeChild(from);
      busy = false;
      var f = el.querySelector("input.line, textarea.line");
      if (f && to >= 0 && to < FLOW.length && (FLOW[to].type === "text")) { try { f.focus({ preventScroll: true }); } catch (e) {} }
      else { var h = el.querySelector(".q"); if (h) try { h.focus({ preventScroll: true }); } catch (e) {} }
    };
    if (!from) {
      if (el.classList.contains("cartel")) encender(el);
      else if (!reduced) el.classList.add("reveal");
      finish(); return;
    }
    busy = true;
    if (reduced || !el.animate) {
      el.style.opacity = 0;
      var an = el.animate ? el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150 }) : null;
      el.style.opacity = "";
      if (an) an.onfinish = finish; else finish();
      return;
    }
    el.classList.add("reveal");
    var up = dir !== "back";
    // Recto en vertical; la velocidad sigue una curva en S: arranca suave, acelera y frena suave.
    var opts = { duration: 700, easing: "cubic-bezier(.76,0,.24,1)" };
    from.animate([{ transform: "translateY(0)", opacity: 1 }, { transform: "translateY(" + (up ? "-" : "") + dist + ")", opacity: 0.15 }], opts);
    el.animate([{ transform: "translateY(" + (up ? "" : "-") + dist + ")" }, { transform: "translateY(0)" }], opts).onfinish = finish;
  }

  function showErr(msg) {
    var e = current && current.querySelector("#err");
    if (!e) return;
    e.textContent = msg; e.hidden = !msg;
    fitStage();
  }

  function forward() {
    if (busy) return;
    if (st.i === -1) { go(hadDraft ? resumeAt : 0, "up"); return; }
    var q = FLOW[st.i], p = problem(q);
    if (p) { showErr(p); return; }
    if (q.id === "contacto" && !revisarContacto(A(q.id).text.trim())) return;
    var n = nextIndex(st.i);
    if (n < FLOW.length) { go(n, "up"); return; }
    send();
  }
  function backward() { if (busy || st.i <= -1) return; go(prevIndex(st.i), "back"); }

  // Antes de dejar pasar un mail: sugiere si parece mal escrito y pregunta si el dominio existe.
  // Devuelve true si se puede seguir ya; si no, muestra el aviso o sigue solo cuando llega la respuesta.
  function revisarContacto(t) {
    if (t.indexOf("@") === -1 || aceptados[t]) return true;
    var sug = sugerencia(t);
    if (sug && !revisados["sug:" + t]) {
      revisados["sug:" + t] = true;
      showFix("¿Quisiste decir " + sug + "? Si está bien como lo escribiste, tocá «Siguiente» de nuevo.", sug);
      return false;
    }
    if (revisados[t] === "malo") { showErr("No encuentro el dominio de ese mail. Revisá que esté bien escrito."); return false; }
    if (nextBtn.classList.contains("busy")) return false;
    var at = st.i;
    nextBtn.classList.add("busy"); nextBtn.textContent = "Revisando…";
    var fin = function (ok) {
      nextBtn.classList.remove("busy"); refreshNext();
      if (st.i !== at) return;
      if (ok) { aceptados[t] = true; forward(); }
      else { revisados[t] = "malo"; showErr("No encuentro el dominio de ese mail. Revisá que esté bien escrito."); }
    };
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 4000);
    fetch("/api/contacto?v=" + encodeURIComponent(t), ctl ? { signal: ctl.signal } : {})
      .then(function (r) { return r.ok ? r.json() : { ok: true }; })
      .then(function (d) { clearTimeout(timer); fin(!(d && d.ok === false && d.error === "dominio")); })
      .catch(function () { clearTimeout(timer); fin(true); }); // sin conexión con el chequeo, no se traba a nadie
    return false;
  }
  function showFix(msg, valor) {
    showErr(msg);
    var e = current && current.querySelector("#err");
    if (!e) return;
    var b = document.createElement("button");
    b.type = "button"; b.className = "fix"; b.textContent = "Usar " + valor;
    b.addEventListener("click", function () {
      var inp = current.querySelector("#in-contacto");
      A("contacto").text = valor; if (inp) inp.value = valor;
      save(); showErr(""); refreshNext(); forward();
    });
    e.appendChild(document.createElement("br")); e.appendChild(b);
    fitStage();
  }

  function send() {
    if (nextBtn.classList.contains("busy")) return;
    var respuestas = {};
    FLOW.forEach(function (q) { respuestas[q.id] = visible(q) ? value(q) : ""; });
    nextBtn.classList.add("busy"); nextBtn.textContent = "Enviando…";
    showErr("");
    fetch("/api/respuestas", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ cliente: st.cliente || "", respuestas: respuestas, hp: $("hp").value })
    }).then(function (r) {
      if (r.status === 429) throw new Error("wait");
      if (r.status === 400) return r.json().then(function (d) { throw new Error(d && d.error === "bad_contact" ? "contacto" : "http 400"); });
      if (!r.ok) throw new Error("http " + r.status);
      try { localStorage.removeItem(KEY); } catch (e) {}
      nextBtn.classList.remove("busy");
      go(FLOW.length, "up");
    }).catch(function (err) {
      nextBtn.classList.remove("busy"); refreshNext();
      if (err && err.message === "contacto") { // volver a la pregunta del contacto y avisar ahí
        var ic = -1; FLOW.forEach(function (q, k) { if (q.id === "contacto") ic = k; });
        aceptados = {}; revisados[A("contacto").text.trim()] = "malo";
        go(ic, "back");
        setTimeout(function () { showErr("Revisá el mail o teléfono: no parece válido."); }, 760);
        return;
      }
      showErr(err && err.message === "wait"
        ? "Llegaron muchos envíos seguidos desde tu conexión. Esperá unos minutos y tocá «Enviar respuestas» de nuevo."
        : "No se pudieron enviar las respuestas. Revisá tu conexión y tocá «Enviar respuestas» de nuevo.");
    });
  }

  /* ---------- Eventos ---------- */
  nextBtn.addEventListener("click", forward);
  backBtn.addEventListener("click", backward);

  stage.addEventListener("click", function (e) {
    if (e.target.closest("#restartBtn")) {
      st = { i: -1, a: {}, cliente: cliente }; hadDraft = false; resumeAt = 0;
      if (nombreLink) A("nombre").text = nombreLink;
      try { localStorage.removeItem(KEY); } catch (err) {}
      go(0, "up"); return;
    }
    var b = e.target.closest(".opt");
    if (!b || st.i < 0 || st.i >= FLOW.length) return;
    var q = FLOW[st.i], a = A(q.id), v = b.getAttribute("data-v"), k = a.sel.indexOf(v);
    clearTimeout(autoT);
    if (q.type === "one") a.sel = k !== -1 ? [] : [v];
    else if (k !== -1) a.sel.splice(k, 1);
    else if (q.solo && v === q.solo) a.sel = [v]; // "Nada, todo bien" y similares van solas
    else if (q.solo && a.sel.indexOf(q.solo) !== -1) a.sel = [v];
    else if (q.max && a.sel.length >= q.max) {
      var h = $("hint");
      if (h) { h.textContent = "Ya elegiste " + q.max + ". Desmarcá una para cambiarla."; h.classList.remove("shake"); void h.offsetWidth; h.classList.add("shake"); }
      return;
    } else a.sel.push(v);
    current.querySelectorAll(".opt").forEach(function (o) { o.setAttribute("aria-pressed", a.sel.indexOf(o.getAttribute("data-v")) !== -1); });
    var ow = $("otroWrap"), withOtro = a.sel.indexOf(OTRO) !== -1;
    if (ow) ow.hidden = !withOtro;
    var h2 = $("hint"); if (h2 && q.max && a.sel.length < q.max) { h2.textContent = hintText(q); h2.classList.remove("shake"); }
    showErr(""); refreshNext(); save();
    if (v === OTRO && withOtro) { var oi = $("otroIn"); if (oi) { oi.focus(); oi.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" }); } return; }
    if (q.type === "one" && a.sel.length && !withOtro) {
      var at = st.i;
      autoT = setTimeout(function () { if (st.i === at && !busy) forward(); }, 420);
    }
  });
  stage.addEventListener("input", function (e) {
    if (st.i < 0 || st.i >= FLOW.length) return;
    var q = FLOW[st.i];
    if (e.target.id === "otroIn") A(q.id).otro = e.target.value;
    else if (e.target.id === "in-" + q.id) A(q.id).text = e.target.value;
    else return;
    showErr(""); refreshNext(); save();
  });
  // Enter avanza desde cualquier lado (en un texto largo, Ctrl o Cmd + Enter). En una opción, Enter la elige.
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" || e.isComposing || foot.hidden) return;
    var t = e.target;
    if (t.tagName === "TEXTAREA" && !(e.ctrlKey || e.metaKey)) return;
    if (t.tagName === "BUTTON" || t.tagName === "A") return;
    e.preventDefault();
    if (t.tagName === "INPUT" && window.matchMedia("(pointer: coarse)").matches) t.blur();
    forward();
  });

  // Deslizar: hacia arriba para seguir, hacia abajo para volver
  var sy = null, sx = null, st0 = 0;
  stage.addEventListener("touchstart", function (e) {
    if (e.target.closest("input, textarea")) { sy = null; return; }
    sy = e.touches[0].clientY; sx = e.touches[0].clientX; st0 = current ? current.scrollTop : 0;
  }, { passive: true });
  stage.addEventListener("touchend", function (e) {
    if (sy === null || !current) return;
    var dy = sy - e.changedTouches[0].clientY, dx = Math.abs(sx - e.changedTouches[0].clientX);
    sy = null;
    if (Math.abs(dy) < 70 || dx > Math.abs(dy)) return;
    var atTop = st0 <= 0 && current.scrollTop <= 0;
    var atBottom = current.scrollTop + current.clientHeight >= current.scrollHeight - 2;
    if (dy > 0 && atBottom && st.i < FLOW.length) {
      if (st.i >= 0 && problem(FLOW[st.i])) { showErr(problem(FLOW[st.i])); return; }
      if (nextIndex(st.i) >= FLOW.length) return; // enviar solo con el botón
      forward();
    } else if (dy < 0 && atTop && st.i >= 0 && st.i < FLOW.length) backward();
  }, { passive: true });

  /* Teclado del celu: la app ocupa solo lo visible y el campo queda centrado. */
  var app = document.querySelector(".app"), vv = window.visualViewport, fullH = 0, lastW = 0;
  function fitViewport() {
    if (!vv) return;
    if (vv.width !== lastW) { lastW = vv.width; fullH = 0; } // al girar el celu se mide de nuevo
    fullH = Math.max(fullH, vv.height);
    var r = document.documentElement.style;
    r.setProperty("--app-h", Math.round(vv.height) + "px");
    r.setProperty("--app-top", Math.round(vv.offsetTop) + "px");
    app.classList.toggle("tight", vv.height < 560 && fullH - vv.height > 120);
    checkMore();
  }
  if (vv) { vv.addEventListener("resize", fitViewport); vv.addEventListener("scroll", fitViewport); }
  stage.addEventListener("focusin", function (e) {
    if (!e.target.matches(".line")) return;
    setTimeout(function () { try { e.target.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" }); } catch (err) {} }, 320);
  });

  /* En compu el escenario mide lo que mide la pregunta, así "Siguiente" queda cerca. */
  var desk = window.matchMedia ? window.matchMedia("(min-width: 900px) and (min-height: 600px)") : { matches: false };
  var topBar = document.querySelector(".top"), stageTarget = 0;
  function fitStage() {
    if (!desk.matches || !current) { if (stageTarget) { stage.style.height = ""; stageTarget = 0; } return; }
    var cs = getComputedStyle(app);
    var avail = app.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - topBar.offsetHeight - (foot.hidden ? 0 : foot.offsetHeight);
    var h = Math.max(120, Math.min(current.scrollHeight, avail));
    if (h !== stageTarget) { stageTarget = h; stage.style.height = h + "px"; }
    checkMore();
  }
  try { desk.addEventListener("change", fitStage); } catch (e) {}
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitStage); // Anton puede llegar después
  window.addEventListener("resize", fitStage);
  stage.addEventListener("transitionend", function (e) { if (e.target === stage) checkMore(); });

  /* Degradé y aviso abajo cuando la lista sigue más allá de lo visible. */
  var moreBtn = $("moreBtn");
  function checkMore() {
    var c = current;
    var more = !!c && c.scrollHeight - c.clientHeight - c.scrollTop > 8;
    if (more && stageTarget && c.scrollHeight <= stageTarget + 1) more = false; // en compu, mientras crece
    stage.classList.toggle("more", more);
  }
  moreBtn.addEventListener("click", function () {
    if (current) current.scrollBy({ top: Math.round(current.clientHeight * 0.6), behavior: reduced ? "auto" : "smooth" });
  });
  stage.addEventListener("scroll", checkMore, true);
  window.addEventListener("resize", checkMore);
  var mo = new MutationObserver(function () { setTimeout(checkMore, 30); });
  mo.observe(stage, { childList: true });

  go(-1);
  fitViewport();
})();
