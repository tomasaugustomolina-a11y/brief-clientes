// Tema guardado antes de pintar, para que no parpadee. Va en un archivo aparte para que la página no necesite scripts en línea.
try { var t = localStorage.getItem("tema"); if (t === "dark" || t === "light") document.documentElement.setAttribute("data-theme", t); } catch (e) {}
