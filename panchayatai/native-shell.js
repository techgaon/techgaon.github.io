/* Panchayat AI — disclaimer in menu (web + app); opening animation and Plus hiding only inside the Android app */
(() => {
  "use strict";
  const isNative = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  const wire = () => { const l = document.getElementById("disclaimerLink"), t = document.getElementById("disclaimerText");
    if (l && t) l.onclick = e => { e.preventDefault(); e.stopPropagation(); t.classList.toggle("hidden"); }; };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", wire) : wire();
  if (!isNative) return;
})();
