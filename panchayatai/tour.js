/* Panchayat AI — first-use, repeatable, accessible guided home tour. */
(() => {
  "use strict";
  const KEY = "pai_design_tour_2026_v2";
  const $ = s => document.querySelector(s);
  const tutorial = [
    {selector:".top .brand",title:"पंचायत AI में स्वागत है",description:"यह आपका डिजिटल पंचायत सहायक है। सरकारी पत्राचार और उपयोगी AI Tools एक ही जगह मिलेंगे।"},
    {selector:"#paiBottomNav",title:"चार मुख्य सुविधाएँ, एक Tap पर",description:"नीचे होम, AI Help, पत्र बनाएँ और AI Tools के चार स्थायी बटन हैं। किसी भी Screen से सीधे इन पर जा सकते हैं।"},
    {selector:"#homeGoogleLogin",title:"Google से सुरक्षित Login",description:"पहले इसी बटन से Login करें। फिर अपनी पदवार Profile पूरी करें, ताकि पत्रों में सही पदनाम और कार्यालय विवरण आएँ।"},
    {selector:".home-feature-pair [data-go='chat']",title:"AI Help — सवाल पूछें",description:"उत्तर प्रदेश के पंचायत कार्यों, प्रक्रियाओं और नियमों पर प्रश्न पूछें। महत्वपूर्ण कानूनी जानकारी को मूल शासनादेश से जरूर मिलाएँ।"},
    {selector:".home-feature-pair [data-go='tools']",title:"AI Tools",description:"फोटो से केवल टेक्स्ट निकालें, फ़ाइलें कन्वर्ट करें और दूसरे डिजिटल टूल इस्तेमाल करें।"},
    {selector:".home-options [data-draft='patra']",title:"सरकारी पत्र तैयार करें",description:"पत्र, नोटिस, स्पष्टीकरण और कार्यालय आदेश बनाने के लिए किसी भी Draft Tile पर जाएँ।"},
    {selector:".home-news-estimate [data-go='estimate']",title:"Estimate और MB Calculator",description:"पंचायत कार्यों से जुड़ी गणना और Estimate Tools यहाँ मिलते हैं।"},
    {selector:"#menuBtn",title:"बाकी सुविधाएँ यहाँ",description:"मेनू से Profile, RTI, Saved Drafts और Plus खोलें। टूर दोबारा देखने के लिए मेनू का ‘ऐप टूर’ चुनें। रंग, Dark Mode और Font Size भी मेनू से बदल सकते हैं।"}
  ];
  let layer = null, steps = [], at = 0, before = null, started = false, pending = false;
  let frame = 0, lastScroll = 0;

  function wasSeen() { try { return localStorage.getItem(KEY) === "1"; } catch { return false; } }
  function markSeen() { try { localStorage.setItem(KEY, "1"); } catch {} }
  function clearDrawer() {
    $("#drawer")?.classList.remove("open");
    $("#scrim")?.classList.remove("show");
  }

  function findSteps() {
    return tutorial.filter(step => {
      const node = $(step.selector);
      return !!node && node.getClientRects().length > 0;
    });
  }

  function place() {
    if (!layer || !steps.length) return;
    const target = $(steps[at].selector);
    const spot = $(".pai-tour-spotlight");
    const panel = $(".pai-tour-panel");
    if (!target || !spot || !panel) return;
    const r = target.getBoundingClientRect(), vw = innerWidth, vh = innerHeight;
    const pad = 5;
    const x = Math.max(5, Math.min(vw - 5, r.left - pad));
    const y = Math.max(5, Math.min(vh - 5, r.top - pad));
    const w = Math.max(12, Math.min(vw - x - 5, r.width + pad * 2));
    const h = Math.max(12, Math.min(vh - y - 5, r.height + pad * 2));
    spot.style.left = x + "px";
    spot.style.top = y + "px";
    spot.style.width = w + "px";
    spot.style.height = h + "px";

    const panelW = Math.min(390, vw - 28);
    const panelH = panel.offsetHeight;
    const left = Math.max(14, Math.min(vw - panelW - 14, r.left + r.width / 2 - panelW / 2));
    let top;
    if (vh - (y + h) >= panelH + 16) top = y + h + 12;
    else if (y >= panelH + 16) top = y - panelH - 12;
    else top = Math.max(12, Math.min(vh - panelH - 12, vh * .5 - panelH / 2));
    panel.style.left = left + "px";
    panel.style.top = Math.max(10, top) + "px";
  }

  function focusPanel() { $(".pai-tour-next")?.focus({preventScroll:true}); }
  function show(index) {
    if (!layer) return;
    at = index;
    const step = steps[index];
    if (!step) { close(true); return; }
    const target = $(step.selector);
    if (!target) { close(true); return; }
    $(".pai-tour-title").textContent = step.title;
    $(".pai-tour-description").textContent = step.description;
    $(".pai-tour-count").textContent = (at + 1) + " / " + steps.length;
    $(".pai-tour-progress").innerHTML = steps.map((_, i) =>
      '<span class="' + (i <= at ? 'on' : '') + '"></span>').join("");
    $(".pai-tour-back").disabled = at === 0;
    $(".pai-tour-next").textContent = at === steps.length - 1 ? "पूरा करें ✓" : "आगे बढ़ें →";
    target.scrollIntoView({behavior:"auto",block:"center",inline:"nearest"});
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => { place(); setTimeout(place, 95); });
    focusPanel();
  }

  function close(complete) {
    if (complete) markSeen();
    if (layer) layer.remove();
    layer = null; steps = []; at = 0; started = false;
    cancelAnimationFrame(frame);
    if (before?.isConnected) {
      try { before.focus({preventScroll:true}); } catch {}
    }
    before = null;
  }

  function open({auto = false} = {}) {
    if (layer) { show(0); return; }
    if (auto && (wasSeen() || document.hidden)) return;
    if ($("#upgradeModal:not(.hidden)")) return;

    // Keep the tour on home; use existing routing rather than a second renderer.
    if (!$("#view .hero") && !auto) {
      if ($("#drawer [data-go='home']")) $("#drawer [data-go='home']").click();
    }
    steps = findSteps();
    if (steps.length < 2) return;
    before = document.activeElement;
    clearDrawer();

    layer = document.createElement("div");
    layer.className = "pai-tour-layer";
    layer.setAttribute("role","dialog");
    layer.setAttribute("aria-modal","true");
    layer.setAttribute("aria-label","पंचायत AI ऐप टूर");
    layer.innerHTML = '<div class="pai-tour-spotlight" aria-hidden="true"></div>' +
      '<section class="pai-tour-panel" tabindex="-1">' +
        '<div class="pai-tour-heading"><span class="pai-tour-kicker">ऐप टूर · पंचायत AI</span>' +
          '<button class="pai-tour-close" type="button" aria-label="टूर बंद करें">×</button></div>' +
        '<h2 class="pai-tour-title"></h2>' +
        '<p class="pai-tour-description"></p>' +
        '<div class="pai-tour-progress" aria-hidden="true"></div>' +
        '<div class="pai-tour-actions">' +
          '<button class="pai-tour-back" type="button">← पीछे</button>' +
          '<button class="pai-tour-next" type="button">आगे बढ़ें →</button></div>' +
        '<div class="pai-tour-foot"><span class="pai-tour-count"></span>' +
          '<button class="pai-tour-skip" type="button">टूर छोड़ें</button></div></section>';
    document.body.appendChild(layer);
    started = true;
    $(".pai-tour-close").onclick = () => close(true);
    $(".pai-tour-skip").onclick = () => close(true);
    $(".pai-tour-next").onclick = () => show(at + 1);
    $(".pai-tour-back").onclick = () => show(Math.max(0, at - 1));
    show(0);
  }

  function scheduleFirstTour() {
    if (wasSeen() || started || pending || document.hidden || !$("#view .hero")) return;
    pending = true;
    setTimeout(() => {
      pending = false;
      if (!wasSeen() && !started && $("#view .hero") && !document.hidden) open({auto:true});
    }, 1250);
  }

  document.addEventListener("click", e => {
    const opener = e.target.closest("#tourTop,#appTourLink,.hero-tour-btn");
    if (!opener) return;
    e.preventDefault();
    e.stopPropagation();
    open();
  });
  window.addEventListener("keydown", e => {
    if (!layer) return;
    if (e.key === "Escape") { e.preventDefault(); close(true); return; }
    if (e.key === "ArrowRight") { e.preventDefault(); show(Math.min(at + 1, steps.length)); return; }
    if (e.key === "ArrowLeft") { e.preventDefault(); show(Math.max(at - 1, 0)); return; }
    if (e.key === "Tab") {
      const controls = Array.from(layer.querySelectorAll("button:not(:disabled)"));
      if (!controls.length) return;
      const first = controls[0], last = controls[controls.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  window.addEventListener("resize", () => { if (layer) place(); });
  window.addEventListener("scroll", () => {
    if (!layer) return;
    // Repaint the highlight after programmatic scroll.
    if (Date.now() - lastScroll > 70) { lastScroll = Date.now(); requestAnimationFrame(place); }
  }, {passive:true});
  window.addEventListener("hashchange", () => {
    if (layer) close(false);
    scheduleFirstTour();
  });
  const view = $("#view");
  if (view) new MutationObserver(scheduleFirstTour).observe(view,{childList:true});
  window.PanchayatTour = {open:() => open(), close:() => close(true)};
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded",scheduleFirstTour,{once:true});
  } else scheduleFirstTour();
})();