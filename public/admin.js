/* La página privada: lista de respuestas, links por cliente y descargas. */
(function () {
  "use strict";
  var B = window.BRIEF, FLOW = [];
  B.secciones.forEach(function (s) { s.preguntas.forEach(function (q) { q.sec = s.nombre; FLOW.push(q); }); });
  // Pregunta que el formulario salteó por otra respuesta (skipIf en preguntas.js)
  function salteada(q, v) { return !!(q.skipIf && String(v[q.skipIf.id] || "").split("; ").indexOf(q.skipIf.v) !== -1); }
  function celda(q, v) { return v[q.id] || (salteada(q, v) ? "(salteada)" : ""); }
  var $ = function (id) { return document.getElementById(id); };
  var pass = "", rows = [];
  try { pass = sessionStorage.getItem("brief-admin") || ""; } catch (e) {}

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fecha(iso) { try { return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" }); } catch (e) { return iso; } }
  function hoy() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }

  function api(method, qs) {
    return fetch("/api/respuestas" + (qs || ""), { method: method, headers: { authorization: "Bearer " + pass } })
      .then(function (r) {
        if (r.status === 401) throw new Error("auth");
        if (r.status === 429) throw new Error("wait");
        if (r.status === 503) throw new Error("nopass");
        if (!r.ok) throw new Error("http");
        return r.json();
      });
  }

  /* Planes de la calculadora */
  var planes = [];
  var PIEZAS = [["reel", "reel", "reels"], ["carrusel", "carrusel", "carruseles"], ["historia", "historia", "historias"]];
  var EXTRAS = { manual: "Manual de marca completo", landing: "Landing / portfolio web" };
  function apiP(method, qs) {
    return fetch("/api/planes" + (qs || ""), { method: method, headers: { authorization: "Bearer " + pass } })
      .then(function (r) { if (!r.ok) throw new Error("http"); return r.json(); });
  }
  function loadPlanes() {
    return apiP("GET").then(function (d) { planes = d.planes || []; renderPlanes(); })
      .catch(function () { $("pList").innerHTML = '<p class="muted">No se pudieron cargar los planes.</p>'; });
  }
  function renderPlanes() {
    $("pCount").textContent = planes.length === 1 ? "1 plan" : planes.length + " planes";
    if (!planes.length) { $("pList").innerHTML = '<div class="empty"><p class="muted">Todavía nadie mandó un plan desde la calculadora.</p></div>'; return; }
    $("pList").innerHTML = planes.map(function (r) {
      var pl = r.plan || {}, items = [];
      PIEZAS.forEach(function (p) { var n = Number(pl[p[0]]) || 0; if (n) items.push(n + " " + (n === 1 ? p[1] : p[2]) + " por mes"); });
      (pl.extras || []).forEach(function (e) { if (EXTRAS[e]) items.push(EXTRAS[e]); });
      return '<details><summary><strong>' + esc(r.nombre || "Sin nombre") + '</strong><span class="when">' + esc(fecha(r.creado)) + '</span>' +
        '<span class="what">' + esc(items.slice(0, 3).join(" · ") || "Sin contenido") + (pl.paquete ? " · paquete " + esc(pl.paquete) : "") + '</span></summary>' +
        '<div class="detail"><dl><dt>Contacto</dt><dd>' + esc(pl.contacto || "") + '</dd>' +
        '<dt>Plan</dt><dd>' + items.map(esc).join("<br>") + '</dd>' +
        '<dt>Tiempo que vio que se ahorra</dt><dd>≈ ' + esc(r.horas || 0) + ' h por mes</dd>' +
        (pl.link ? '<dt>Link</dt><dd>' + esc(pl.link) + '</dd>' : "") + '</dl>' +
        '<div class="row"><button class="btn small" type="button" data-pdel="' + esc(r.id) + '">Borrar este plan</button>' +
        '<span data-pconfirm="' + esc(r.id) + '" hidden class="row"><button class="btn small blue" type="button" data-pyes="' + esc(r.id) + '">Sí, borrar</button><button class="btn small" type="button" data-pno="' + esc(r.id) + '">Cancelar</button></span></div>' +
        '</div></details>';
    }).join("");
  }
  $("pList").addEventListener("click", function (e) {
    var b;
    if ((b = e.target.closest("[data-pdel]"))) { b.hidden = true; document.querySelector('[data-pconfirm="' + b.getAttribute("data-pdel") + '"]').hidden = false; return; }
    if ((b = e.target.closest("[data-pno]"))) { var id = b.getAttribute("data-pno"); document.querySelector('[data-pconfirm="' + id + '"]').hidden = true; document.querySelector('[data-pdel="' + id + '"]').hidden = false; return; }
    if ((b = e.target.closest("[data-pyes]"))) {
      var id2 = b.getAttribute("data-pyes"); b.disabled = true;
      apiP("DELETE", "?id=" + encodeURIComponent(id2)).then(function () { planes = planes.filter(function (r) { return r.id !== id2; }); renderPlanes(); })
        .catch(function () { b.disabled = false; $("panelMsg").textContent = "No se pudo borrar. Probá de nuevo."; });
    }
  });

  function load() {
    return api("GET").then(function (d) {
      loadPlanes();
      rows = d.respuestas || [];
      try { sessionStorage.setItem("brief-admin", pass); } catch (e) {}
      $("login").hidden = true; $("panel").hidden = false; $("logoutBtn").hidden = false;
      render();
    });
  }

  function render() {
    $("count").textContent = rows.length === 1 ? "1 cliente" : rows.length + " clientes";
    $("dlXlsx").disabled = $("dlJson").disabled = !rows.length;
    if (!rows.length) {
      $("list").innerHTML = '<div class="empty"><p><strong>Todavía no completó nadie el formulario.</strong></p><p class="muted">Armá un link arriba y mandáselo a tu primer cliente.</p></div>';
      $("list").classList.remove("list");
      return;
    }
    $("list").classList.add("list");
    $("list").innerHTML = rows.map(function (r) {
      var v = r.respuestas || {};
      var secciones = B.secciones.map(function (s) {
        return '<div><h3>' + esc(s.nombre) + '</h3><dl>' + s.preguntas.map(function (q) {
          return '<dt>' + esc(q.q) + '</dt><dd>' + (v[q.id] ? esc(v[q.id]) : '<span class="muted">' + (salteada(q, v) ? "Salteada: lo vemos en la llamada" : "Sin responder") + '</span>') + '</dd>';
        }).join("") + '</dl></div>';
      }).join("");
      return '<details><summary><strong>' + esc(r.nombre || "Sin nombre") + '</strong><span class="when">' + esc(fecha(r.creado)) + '</span>' +
        '<span class="what">' + esc(v.rubro || "Rubro sin definir") + (r.cliente ? " · link de " + esc(r.cliente) : "") + '</span></summary>' +
        '<div class="detail">' + secciones +
        '<div class="row"><button class="btn small" type="button" data-del="' + esc(r.id) + '">Borrar esta respuesta</button>' +
        '<span data-confirm="' + esc(r.id) + '" hidden class="row"><button class="btn small blue" type="button" data-yes="' + esc(r.id) + '">Sí, borrar</button><button class="btn small" type="button" data-no="' + esc(r.id) + '">Cancelar</button></span></div>' +
        '</div></details>';
    }).join("");
  }

  $("loginForm").addEventListener("submit", function (e) {
    e.preventDefault();
    pass = $("pass").value.trim();
    $("loginMsg").textContent = "";
    load().catch(function (err) {
      $("loginMsg").textContent = err.message === "auth" ? "La contraseña no coincide con la que está cargada en Cloudflare."
        : err.message === "wait" ? "Demasiados intentos seguidos. Esperá 15 minutos y probá de nuevo."
        : err.message === "nopass" ? "Cloudflare todavía no tiene la contraseña: falta el secreto ADMIN_PASSWORD en Settings > Variables and Secrets."
        : "No se pudo conectar. Probá de nuevo.";
    });
  });
  if (pass) load().catch(function () { pass = ""; });

  /* Salir: borra la contraseña guardada en esta pestaña */
  $("logoutBtn").addEventListener("click", function () {
    pass = ""; rows = [];
    try { sessionStorage.removeItem("brief-admin"); } catch (e) {}
    $("pass").value = ""; $("loginMsg").textContent = "";
    $("panel").hidden = true; $("login").hidden = false; $("logoutBtn").hidden = true;
    $("list").innerHTML = ""; planes = []; $("pList").innerHTML = "";
    $("pass").focus();
  });

  /* Tema, igual que en el formulario */
  var themeBtn = $("themeBtn");
  function isDark() {
    var t = document.documentElement.getAttribute("data-theme");
    if (t) return t === "dark";
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  function syncTheme() { themeBtn.setAttribute("aria-label", isDark() ? "Cambiar a modo claro" : "Cambiar a modo oscuro"); }
  themeBtn.addEventListener("click", function () {
    var next = isDark() ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("tema", next); } catch (e) {}
    syncTheme();
  });
  syncTheme();

  /* Link por cliente */
  // El nombre viaja tal cual (con tildes), así el formulario lo escribe bien.
  function nombre() { return $("clientName").value.replace(/\s+/g, " ").trim().slice(0, 50); }
  function link() { var n = nombre(); return location.origin + "/" + (n ? "?c=" + encodeURIComponent(n).replace(/%20/g, "+") : ""); }
  function showLink() {
    var n = nombre();
    $("clientLink").textContent = link();
    $("clientHola").textContent = n ? "Lo va a saludar así: «Hola, " + n.split(" ")[0] + ".»" : "";
  }
  $("clientName").addEventListener("input", showLink); showLink();
  $("copyLink").addEventListener("click", function () {
    var t = link();
    var ok = function () { $("copyMsg").textContent = "Copiado."; setTimeout(function () { $("copyMsg").textContent = ""; }, 2000); };
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(ok, function () { $("copyMsg").textContent = "Seleccioná el link y copialo."; });
    else $("copyMsg").textContent = "Seleccioná el link y copialo.";
  });

  /* Descargas */
  function bajar(blob, nombre) {
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nombre;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  $("dlJson").addEventListener("click", function () {
    var out = rows.map(function (r) {
      return { id: r.id, fecha: r.creado, link: r.cliente || "", respuestas: FLOW.map(function (q) { return { seccion: q.sec, pregunta: q.q, respuesta: celda(q, r.respuestas || {}) }; }) };
    });
    bajar(new Blob([JSON.stringify(out, null, 2)], { type: "application/json" }), "briefs-clientes-" + hoy() + ".json");
  });
  var xlsxLoading = null;
  function loadXlsx() {
    if (window.XLSX) return Promise.resolve();
    if (!xlsxLoading) xlsxLoading = new Promise(function (ok, fail) {
      var s = document.createElement("script"); s.src = "/vendor/xlsx.mini.min.js"; // SheetJS 0.18.5, copiado al sitio para no depender de terceros
      s.onload = ok; s.onerror = function () { xlsxLoading = null; fail(); }; document.head.appendChild(s);
    });
    return xlsxLoading;
  }
  $("dlXlsx").addEventListener("click", function () {
    $("panelMsg").textContent = "";
    loadXlsx().then(function () {
      var head = ["Fecha", "Link"].concat(FLOW.map(function (q) { return q.q; }));
      var aoa = [head].concat(rows.map(function (r) { var v = r.respuestas || {}; return [fecha(r.creado), r.cliente || ""].concat(FLOW.map(function (q) { return celda(q, v); })); }));
      var ws = XLSX.utils.aoa_to_sheet(aoa);
      ws["!cols"] = head.map(function (h, i) { return { wch: i < 2 ? 14 : 30 }; });
      var wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Clientes");
      XLSX.writeFile(wb, "briefs-clientes-" + hoy() + ".xlsx");
    }).catch(function () { $("panelMsg").textContent = "No se pudo preparar el Excel. Revisá la conexión y probá de nuevo."; });
  });

  /* Borrar con confirmación */
  $("list").addEventListener("click", function (e) {
    var b;
    if ((b = e.target.closest("[data-del]"))) { b.hidden = true; document.querySelector('[data-confirm="' + b.getAttribute("data-del") + '"]').hidden = false; return; }
    if ((b = e.target.closest("[data-no]"))) { var id = b.getAttribute("data-no"); document.querySelector('[data-confirm="' + id + '"]').hidden = true; document.querySelector('[data-del="' + id + '"]').hidden = false; return; }
    if ((b = e.target.closest("[data-yes]"))) {
      var id2 = b.getAttribute("data-yes"); b.disabled = true;
      api("DELETE", "?id=" + encodeURIComponent(id2)).then(function () { rows = rows.filter(function (r) { return r.id !== id2; }); render(); })
        .catch(function () { b.disabled = false; $("panelMsg").textContent = "No se pudo borrar. Probá de nuevo."; });
    }
  });
})();
