/* Panchayat AI: premium animated Home tiles, no change to app routing. */
(() => {
  "use strict";
  const icons = {
    chat: `<defs><radialGradient id="pai-ai-glow"><stop stop-color="#60e8ff" stop-opacity=".55"/><stop offset="1" stop-color="#1b6ba8" stop-opacity="0"/></radialGradient></defs>
      <circle cx="48" cy="39" r="39" fill="url(#pai-ai-glow)"/>
      <circle class="pai-holo-ring" cx="48" cy="39" r="28" fill="none" stroke="#73efff" stroke-width="2.5" stroke-dasharray="14 4 3 5" opacity=".93"/>
      <circle class="pai-holo-ring-reverse" cx="48" cy="39" r="35" fill="none" stroke="#68baf1" stroke-width="1.3" stroke-dasharray="4 9" opacity=".65"/>
      <circle cx="48" cy="39" r="22" fill="#063a70" stroke="#7bf2ff" stroke-opacity=".8" stroke-width="1.6"/>
      <text x="48" y="50" text-anchor="middle" fill="#ecffff" font-family="Manrope,Arial,sans-serif" font-size="30" font-weight="900">AI</text>
      <g class="pai-icon-spark"><circle cx="17" cy="27" r="3.3" fill="#9ffcff"/><path d="M77 12v8m-4-4h8" stroke="#8df7ff" stroke-width="2" stroke-linecap="round"/></g>
      <g class="pai-icon-laptop"><path d="M21 72h54l4 10H17z" fill="#4597c4" stroke="#a8faff" stroke-width="1.5"/><rect x="27" y="64" width="42" height="11" rx="2" fill="#163f70" stroke="#9aeefa"/><path d="M36 80h24" stroke="#d5feff" stroke-width="2" stroke-linecap="round"/></g>`,
    tools: `<rect x="15" y="23" width="66" height="45" rx="7" fill="#2e66a3" stroke="#9cdafa" stroke-width="2"/><rect x="21" y="29" width="54" height="31" rx="4" fill="#d4f7fc"/><path d="M10 74h76l-8 8H18z" fill="#6799c4" stroke="#b0e9f7" stroke-width="1.5"/><circle cx="48" cy="45" r="12" fill="#268bb6"/><g class="pai-icon-spark"><path d="M48 28v7m0 20v7m-17-17h7m20 0h7m-30-12 5 5m16 16 5 5m0-26-5 5m-16 16-5 5" stroke="#fff" stroke-width="3" stroke-linecap="round"/></g><circle cx="48" cy="45" r="4" fill="#f0ffff"/>`,
    patra: `<rect x="24" y="14" width="47" height="60" rx="5" fill="#f8fbff" stroke="#91aeea" stroke-width="2" transform="rotate(5 47 44)"/><path d="M33 28h28m-28 9h23m-23 9h19" stroke="#95b6e1" stroke-width="3" stroke-linecap="round"/><path d="M10 43h76v43H10z" fill="#6daafb" stroke="#5192db" stroke-width="2"/><path d="M11 44l37 28 37-28" fill="#b5d7ff" stroke="#e9f6ff" stroke-width="2"/><path d="M11 85 39 62m46 23L57 62" stroke="#e8f5ff" stroke-width="2"/>`,
    spasht: `<rect x="22" y="11" width="55" height="76" rx="6" fill="#f6fbff" stroke="#82b6d8" stroke-width="2"/><path d="M33 29h32m-32 10h30m-30 10h25" stroke="#a2c0dc" stroke-width="3" stroke-linecap="round"/><rect x="30" y="60" width="38" height="19" rx="7" fill="#d3f7f0"/><path d="m39 69 7 6 12-13" fill="none" stroke="#229a8b" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`,
    notice: `<path d="M15 44h18l38-23v53L33 55H15z" fill="#7ba8ec" stroke="#5286c9" stroke-width="2"/><path d="M31 56l8 24h13l-9-23" fill="#c4ddff" stroke="#73a4e0" stroke-width="2"/><path d="M79 34q8 10 0 22M85 25q14 21 0 39" fill="none" stroke="#51bed2" stroke-width="4" stroke-linecap="round"/><path d="M22 38h10v22H22z" fill="#d9f2ff"/>`,
    aadesh: `<path d="M27 10h47v64q-2 13-14 13H22q12-1 12-14V20q0-10-7-10z" fill="#e6f4ff" stroke="#719fc9" stroke-width="2"/><path d="M41 27h23m-23 10h23m-23 10h18m-18 9h16" stroke="#91b2d8" stroke-width="3" stroke-linecap="round"/><circle cx="63" cy="66" r="11" fill="#f5d88e" stroke="#cda657" stroke-width="2"/><path d="m60 76-6 12m13-12 6 12" stroke="#e7ba65" stroke-width="5"/>`,
    news: `<rect x="15" y="16" width="67" height="67" rx="6" fill="#f0f9ff" stroke="#7da8c4" stroke-width="2"/><path d="M23 26h52v10H23z" fill="#4f94c9"/><rect x="23" y="44" width="24" height="26" rx="3" fill="#9be1dc"/><path d="M53 46h20m-20 8h20m-20 8h17M23 77h49" stroke="#8eacc4" stroke-width="3" stroke-linecap="round"/><path d="M32 51v12m-6-6h12" stroke="#208e99" stroke-width="3"/>`,
    estimate: `<path d="M24 17h50v63H24z" fill="#eff8ff" stroke="#7ba5cd" stroke-width="2"/><path d="M33 25h31v13H33z" fill="#afdcf8"/><path d="M34 50h9m12 0h9m-30 11h9m12 0h9m-30 11h9m12 0h9" stroke="#609abd" stroke-width="5" stroke-linecap="round"/><path d="M18 82l58-59" stroke="#4fa6b5" stroke-width="5" stroke-linecap="round"/><path d="m14 78 8 8m43-59 8 8" stroke="#bdf1ee" stroke-width="3"/>`,
    rti: `<rect x="17" y="11" width="53" height="67" rx="5" fill="#f7fbff" stroke="#9db7dd" stroke-width="2"/><text x="43" y="37" text-anchor="middle" font-family="Manrope,Arial,sans-serif" font-size="17" font-weight="900" fill="#345eac">RTI</text><path d="M27 46h29m-29 9h29m-29 9h20" stroke="#a7bad6" stroke-width="3" stroke-linecap="round"/><circle cx="65" cy="67" r="17" fill="#c8efff" fill-opacity=".75" stroke="#438ebc" stroke-width="5"/><path d="m77 80 12 12" stroke="#376da6" stroke-width="7" stroke-linecap="round"/>`,
    plans: `<path d="m48 9 12 25 28 4-20 20 5 29-25-13-25 13 5-29L8 38l28-4z" fill="#ffe1a0" stroke="#e6b45d" stroke-width="2"/><path d="m48 24 7 15 17 2-12 12 3 18-15-8-15 8 3-18-12-12 17-2z" fill="#fff3d3"/><path d="M72 12v10m-5-5h10" stroke="#80d1db" stroke-width="3" stroke-linecap="round"/>`
  };
  const subs = {
    chat:"पंचायत नियम व AI सहायता",tools:"फ़ाइल और टेक्स्ट टूल्स",
    patra:"सरकारी पत्र तैयार करें",spasht:"नोटिस का उत्तर",
    notice:"कारण बताओ नोटिस",aadesh:"आदेश-पत्र बनाएँ",
    news:"पंचायत की खबरें",estimate:"काम की गणना",
    rti:"सूचना का अधिकार",plans:"अतिरिक्त सुविधाएँ"
  };
  function identify(tile) {
    if (tile.dataset.draft) return tile.dataset.draft;
    if (tile.dataset.go) return tile.dataset.go;
    if (tile.href && tile.href.includes("karmcharinews")) return "news";
    return null;
  }
  function icon(kind) {
    return '<svg class="pai-tile-svg" viewBox="0 0 96 96" focusable="false" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">'+icons[kind]+'</svg>';
  }
  function enhance(home) {
    const area = home?.querySelector(".home-options");
    if (!area || area.classList.contains("pai-home-premium")) return;
    area.classList.add("pai-home-premium");
    const header=document.createElement("div");
    header.className="pai-home-section-label";
    header.innerHTML='<span>डिजिटल पंचायत की सुविधाएँ</span><small>अपना काम चुनें</small>';
    area.insertBefore(header,area.firstChild);
    for (const tile of area.querySelectorAll(".tile")) {
      const kind=identify(tile);
      if (!kind || !Object.prototype.hasOwnProperty.call(icons,kind)) continue;
      const holder=tile.querySelector(".e");
      if(!holder)continue;
      tile.classList.add("pai-home-tile","pai-home-tile--"+kind);
      holder.classList.add("pai-home-icon");
      holder.classList.remove("pai-ai-logo");
      holder.innerHTML=icon(kind);
      if(!tile.querySelector("small") && subs[kind]){
        const desc=document.createElement("small");
        desc.textContent=subs[kind];
        tile.appendChild(desc);
      }
      const arrow=document.createElement("span");
      arrow.className="pai-home-arrow";
      arrow.setAttribute("aria-hidden","true");
      arrow.textContent="›";
      tile.appendChild(arrow);
    }
  }
  window.PAI_HOME_UI={enhance};
})();
