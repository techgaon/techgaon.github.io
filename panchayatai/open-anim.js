/* Panchayat AI — opening animation (web + app): icon with rotating glow ring and twinkling AI sparkles */
(() => {
  "use strict";
  try { if (sessionStorage.getItem("pai-open-shown")) return; sessionStorage.setItem("pai-open-shown", "1"); } catch {}
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const css = `#pai-open{position:fixed;inset:0;z-index:2147483000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;
  background:radial-gradient(circle at 50% 42%,#0f8a58 0%,#0a6340 55%,#063f29 100%);transition:opacity .45s ease}
  #pai-open.hide{opacity:0;pointer-events:none}
  #pai-open .wrap{position:relative;width:168px;height:168px}
  #pai-open .ring{position:absolute;inset:-18px;border-radius:50%;
  background:conic-gradient(from 0deg,transparent 0 55%,#ffd166 75%,#9be7c4 88%,transparent 100%);
  -webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 6px),#000 calc(100% - 5px));
  mask:radial-gradient(farthest-side,transparent calc(100% - 6px),#000 calc(100% - 5px));animation:pai-open-spin 1.1s linear infinite}
  #pai-open img{width:168px;height:168px;border-radius:36px;box-shadow:0 14px 40px #0006;animation:pai-open-pop .6s cubic-bezier(.2,1.4,.4,1) both}
  #pai-open .sp{position:absolute;color:#ffd166;font-size:26px;animation:pai-open-tw 1.2s ease-in-out infinite}
  #pai-open .sp.b{color:#9be7c4;font-size:18px;animation-delay:-.6s}
  #pai-open p{margin:0;color:#e8fff3;font:600 15px/1.4 system-ui,sans-serif;letter-spacing:.3px;opacity:.9}
  @keyframes pai-open-spin{to{transform:rotate(360deg)}}
  @keyframes pai-open-pop{from{transform:scale(.6);opacity:0}to{transform:scale(1);opacity:1}}
  @keyframes pai-open-tw{0%,100%{transform:scale(.6) rotate(0);opacity:.35}50%{transform:scale(1.25) rotate(45deg);opacity:1}}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  const el = document.createElement("div"); el.id = "pai-open"; el.setAttribute("aria-hidden", "true");
  el.innerHTML = `<div class="wrap">${reduce ? "" : '<div class="ring"></div>'}<img src="icon.svg?v=20261125-laptop1" alt="">
   <span class="sp" style="top:-22px;right:-30px">✦</span><span class="sp b" style="bottom:-14px;left:-30px">✦</span></div><p>आपका डिजिटल पंचायत सहायक</p>`;
  const add = () => document.body.appendChild(el);
  document.body ? add() : document.addEventListener("DOMContentLoaded", add);
  const start = Date.now();
  const done = () => setTimeout(() => { el.classList.add("hide"); setTimeout(() => el.remove(), 500); }, Math.max(0, 1600 - (Date.now() - start)));
  document.readyState === "complete" ? done() : window.addEventListener("load", done);
  setTimeout(done, 6000);
})();
