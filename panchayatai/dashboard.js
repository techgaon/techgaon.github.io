/* Panchayat AI homepage. Preserve admin banner controls; replace the redundant
   role dashboard with a lightweight, self-playing illustrated story strip. */
(() => {
  "use strict";

  const workingSecretary = `<svg viewBox="0 0 260 178" xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true">
    <defs><linearGradient id="pai-office-window" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#c4f1f4"/><stop offset="1" stop-color="#eafafe"/></linearGradient></defs>
    <rect x="7" y="12" width="246" height="152" rx="22" fill="#c8eaf2" opacity=".45"/>
    <rect x="19" y="24" width="86" height="70" rx="9" fill="url(#pai-office-window)" stroke="#a0c9e1"/>
    <path d="M24 77L45 61 57 68 78 51 100 66v21H24z" fill="#79c6ad" opacity=".75"/>
    <path d="M30 78V68l13-11 13 11v10m6 0V61l13-10 15 11v16" fill="none" stroke="#4f899d" stroke-width="2"/>
    <path d="M54 25v69M20 59h84" stroke="#ffffff" stroke-width="3" opacity=".7"/>
    <ellipse cx="116" cy="158" rx="108" ry="7" fill="#86bfd0" opacity=".25"/>
    <path d="M26 135h211" stroke="#5e91ae" stroke-width="8" stroke-linecap="round"/>
    <path d="M37 140v22m189-22v22" stroke="#7493a8" stroke-width="6" stroke-linecap="round"/>
    <path d="M49 110Q45 103 57 94L76 92Q91 93 98 115L98 138H43z" fill="#376f9e"/>
    <path d="M55 98L66 113 77 98" fill="#f5fbff" opacity=".93"/>
    <ellipse cx="70" cy="69" rx="22" ry="26" fill="#deb08a"/>
    <path d="M48 66Q45 44 62 39Q85 34 93 57L92 66 85 57Q63 50 48 66" fill="#253a55"/>
    <path d="M50 64Q43 75 50 86" fill="none" stroke="#253a55" stroke-width="6" stroke-linecap="round"/>
    <circle cx="63" cy="70" r="1.7" fill="#223752"/><circle cx="79" cy="70" r="1.7" fill="#223752"/>
    <path d="M66 82q7 4 13-1" fill="none" stroke="#965d4a" stroke-width="2" stroke-linecap="round"/>
    <path d="M82 111l29 9" stroke="#dba884" stroke-width="12" stroke-linecap="round" class="pai-typing-hand"/>
    <path d="M119 91h82a8 8 0 0 1 8 8v46h-90z" fill="#294b76"/>
    <rect x="125" y="97" width="78" height="42" rx="4" fill="#dcf5fa"/>
    <rect x="129" y="100" width="70" height="36" rx="3" fill="#e4faff"/>
    <text x="164" y="115" text-anchor="middle" fill="#1d5879" font-family="Noto Sans Devanagari,Anek Devanagari,sans-serif" font-size="10" font-weight="800">पंचायत AI</text>
    <path d="M138 123h52m-52 5h34" stroke="#58aabb" stroke-width="2.5" stroke-linecap="round" class="pai-laptop-lines"/>
    <circle cx="189" cy="129" r="4" fill="#38afa9" opacity=".8"/>
    <path d="M112 145h105l-10 7h-85z" fill="#7395ac"/>
    <g class="pai-orbit-a"><circle cx="207" cy="45" r="25" fill="#ffffff" stroke="#69c6c4" stroke-width="2.5"/>
      <path d="M207 32v8m0 10v8m-13-13h8m10 0h8" stroke="#328d9a" stroke-width="3" stroke-linecap="round"/>
      <circle cx="207" cy="45" r="6" fill="#34aaa5"/><circle cx="207" cy="45" r="2.5" fill="#fff"/></g>
    <g class="pai-orbit-b"><rect x="149" y="22" width="36" height="22" rx="9" fill="#e6fffa" stroke="#7ccdc3"/>
      <path d="M158 31h19m-19 5h12" stroke="#3da8a4" stroke-width="2" stroke-linecap="round"/></g>
    <circle cx="230" cy="87" r="5" fill="#38babb" opacity=".75"/><circle cx="221" cy="114" r="3" fill="#69b2c6"/>
  </svg>`;

  function happyPerson(shirt, symbol) {
    const extra = symbol === "village"
      ? `<path d="M178 94l18-17 19 17v23h-37z" fill="#79bca6"/><path d="M174 95l22-23 22 23" fill="none" stroke="#427b96" stroke-width="5" stroke-linejoin="round"/><rect x="192" y="102" width="10" height="15" fill="#f3fbff"/>`
      : symbol === "help"
      ? `<g class="pai-phone-handheld"><rect x="183" y="72" width="47" height="69" rx="10" fill="#294b76" stroke="#86c9cc" stroke-width="2"/><rect x="188" y="79" width="37" height="52" rx="5" fill="#ecffff"/><rect x="200" y="75" width="12" height="2.5" rx="1.2" fill="#c2dce4"/><circle cx="206.5" cy="136.2" r="2.6" fill="#bce4e6"/><text x="206.5" y="100" text-anchor="middle" fill="#1b557c" font-family="Noto Sans Devanagari,Anek Devanagari,sans-serif" font-size="9.2" font-weight="800">पंचायत</text><text x="206.5" y="115" text-anchor="middle" fill="#1a9d98" font-family="Manrope,sans-serif" font-size="13.5" font-weight="800">AI</text><path d="M195 122h23" stroke="#82c8ca" stroke-width="2" stroke-linecap="round"/></g>`
      : `<path d="M183 83h31v38h-31z" fill="#f5fdff" stroke="#78bac8" stroke-width="2"/><path d="M189 93h20m-20 7h20m-20 7h11" stroke="#6ca9b9" stroke-width="2.5" stroke-linecap="round"/>`;
    return `<svg viewBox="0 0 260 178" xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true">
      <circle cx="137" cy="86" r="76" fill="#c6e9f1" opacity=".59"/>
      <path d="M22 153q114-20 217 0" fill="none" stroke="#a2d3da" stroke-width="4" stroke-linecap="round" opacity=".75"/>
      <ellipse cx="131" cy="161" rx="90" ry="9" fill="#76b9c7" opacity=".18"/>
      <path d="M69 153v-25q2-30 37-38h39q43 10 43 40v23z" fill="${shirt}"/>
      <path d="M105 96l24 23 22-23" fill="#f3faff" opacity=".97"/>
      <path d="M109 108l19 20 20-20" fill="none" stroke="#ffffff" stroke-opacity=".30" stroke-width="2"/>
      <path d="M98 57q-4-29 21-33 34-6 45 20l-1 22-14 17h-39z" fill="#263c5a"/>
      <ellipse cx="132" cy="67" rx="32" ry="35" fill="#dca682"/>
      <path d="M99 63Q94 40 113 31Q146 21 164 49l-1 12q-9-17-20-18-17 16-44 20" fill="#263c5a"/>
      <circle cx="122" cy="68" r="2" fill="#233752"/><circle cx="145" cy="68" r="2" fill="#233752"/>
      <path d="M122 82q11 10 24 0" fill="none" stroke="#a25d4c" stroke-width="3" stroke-linecap="round"/>
      <path d="M79 119l-19-21" stroke="#dca682" stroke-width="13" stroke-linecap="round"/>
      <path d="M57 97l-6-14m6 14l7-16" stroke="#dca682" stroke-width="7" stroke-linecap="round"/>
      <path d="M175 120l17-17" stroke="#dca682" stroke-width="12" stroke-linecap="round"/>
      <circle cx="200" cy="46" r="22" fill="#eafff8" stroke="#6bc9b2" stroke-width="2.5" class="pai-orbit-a"/>
      <path d="M190 46l7 7 13-16" fill="none" stroke="#19a88e" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" class="pai-orbit-a"/>
      <g class="pai-happy-spark"><path d="M68 32l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#ffc96c"/></g>
      <g class="pai-happy-spark"><path d="M227 122l2.5 7 7 2.5-7 2.5-2.5 7-2.5-7-7-2.5 7-2.5z" fill="#5fc6c8"/></g>
      ${extra}
    </svg>`;
  }


  const documentScene = `<svg viewBox="0 0 260 178" xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true">
    <circle cx="129" cy="86" r="77" fill="#c9edf3" opacity=".58"/>
    <rect x="40" y="42" width="126" height="112" rx="12" fill="#8dbdcb" opacity=".27" transform="rotate(-7 103 98)"/>
    <rect x="61" y="24" width="135" height="137" rx="13" fill="#fff" stroke="#8bbccb" stroke-width="2"/>
    <rect x="61" y="24" width="135" height="29" rx="12" fill="#285c8d"/>
    <rect x="61" y="40" width="135" height="13" fill="#285c8d"/>
    <text x="129" y="43" text-anchor="middle" fill="#fff" font-family="Noto Sans Devanagari,sans-serif" font-size="13" font-weight="800">पंचायत AI</text>
    <path d="M80 70h96M80 81h89M80 92h74M80 103h83M80 114h56" stroke="#9ac8d4" stroke-width="4" stroke-linecap="round" class="pai-laptop-lines"/>
    <rect x="79" y="126" width="55" height="20" rx="8" fill="#e4f9f1"/>
    <path d="M90 135l6 5 9-10" fill="none" stroke="#20a788" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" class="pai-happy-spark"/>
    <path d="M142 135h32" stroke="#a0bfc8" stroke-width="3" stroke-linecap="round"/>
    <g class="pai-orbit-a"><circle cx="205" cy="50" r="25" fill="#e8fffa" stroke="#65c8b7" stroke-width="2.5"/><path d="M194 51l8 8 15-18" fill="none" stroke="#1cae92" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></g>
    <g class="pai-orbit-b"><rect x="18" y="66" width="39" height="42" rx="12" fill="#24618a"/><text x="37" y="93" font-family="Arial,sans-serif" font-size="14" text-anchor="middle" font-weight="800" fill="#fff">AI</text></g>
    <circle cx="212" cy="115" r="5" fill="#5ac9bb"/><path d="M218 128h12m-6-6v12" stroke="#68bcc8" stroke-width="3" stroke-linecap="round"/>
  </svg>`;

  const meetingScene = `<svg viewBox="0 0 260 178" xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true">
    <circle cx="130" cy="88" r="77" fill="#c7ebf0" opacity=".65"/>
    <path d="M25 151Q125 137 236 151" fill="none" stroke="#8ebfc9" stroke-width="4" stroke-linecap="round"/>
    <path d="M79 46l31-27h43l30 27" fill="#377f90" stroke="#336d85" stroke-width="3" stroke-linejoin="round"/>
    <rect x="86" y="46" width="91" height="54" rx="5" fill="#f0faf9" stroke="#88b6bf" stroke-width="2"/>
    <rect x="100" y="57" width="63" height="30" rx="4" fill="#d5f5f2"/>
    <text x="131.5" y="69" text-anchor="middle" fill="#246185" font-family="Noto Sans Devanagari,sans-serif" font-size="8" font-weight="800">पंचायत</text>
    <text x="131.5" y="81" text-anchor="middle" fill="#1d928d" font-family="Manrope,Arial,sans-serif" font-size="11" font-weight="800">AI</text>
    <path d="M84 101h97" stroke="#6ca4b5" stroke-width="5" stroke-linecap="round"/>
    <g class="pai-orbit-b">
      <circle cx="55" cy="106" r="13" fill="#c78c68"/><path d="M35 146q0-27 20-27t20 27z" fill="#448d9e"/>
      <path d="M45 102q0-14 10-14t10 14" fill="#233b54"/>
    </g>
    <g class="pai-orbit-a">
      <circle cx="204" cy="104" r="13" fill="#dda37d"/><path d="M184 147q0-28 20-28t20 28z" fill="#477eab"/>
      <path d="M191 101q0-15 13-15t13 15" fill="#2f4156"/>
    </g>
    <circle cx="130" cy="126" r="12" fill="#d8a583"/><path d="M106 160q0-25 24-25t24 25z" fill="#8b76aa"/>
    <path d="M119 123q0-15 11-15t11 15" fill="#2c425b"/>
    <g class="pai-happy-spark"><path d="M199 28l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#ffc56e"/></g>
    <path d="M32 62h20m-10-10v20" stroke="#57bcb7" stroke-width="3" stroke-linecap="round"/>
  </svg>`;

  const scenes = [
    {tag:"स्मार्ट पंचायत",title:"सचिव के साथ पंचायत AI",detail:"कंप्यूटर पर काम करता सचिव, चारों ओर AI की सहायता।",art:workingSecretary},
    {tag:"काम हुआ आसान",title:"खुश हैं पंचायत सचिव",detail:"पत्र, नोटिस और आख्या तैयार—काम तेज़, मुस्कान बरकरार।",art:happyPerson("#467fae","paper")},
    {tag:"डिजिटल ग्राम पंचायत",title:"खुश हैं ग्राम प्रधान",detail:"योजनाएँ, प्रस्ताव और जानकारी अब समझना आसान।",art:happyPerson("#438b87","village")},
    {tag:"हर साथी की मदद",title:"खुश हैं पंचायत सहायक",detail:"दैनिक कार्यालयी काम में AI बना उपयोगी साथी।",art:happyPerson("#805f9e","help")},
    {tag:"सरकारी पत्राचार",title:"मिनटों में पत्र और नोटिस",detail:"AI की सहायता से साफ-सुथरे सरकारी दस्तावेज़ तैयार।",art:documentScene},
    {tag:"स्मार्ट ग्राम सभा",title:"डिजिटल पंचायत बैठक",detail:"योजनाओं और प्रस्तावों पर सभी को मिले स्पष्ट जानकारी।",art:meetingScene}
  ];

  function addGreetingEmblem(hero) {
    const h = hero?.querySelector("h1");
    if (!h || !/🙏\s*$/u.test(h.textContent || "")) return;
    const previous = h.textContent.replace(/\s*🙏\s*$/u,"");
    h.textContent = previous;
    hero.classList.add("pai-hero-greeting");
    const emoji = document.createElement("span");
    emoji.className = "pai-greeting-emoji";
    emoji.textContent = "🙏";
    emoji.setAttribute("aria-label","प्रणाम");
    emoji.setAttribute("role","img");
    hero.appendChild(emoji);
  }

  function addAutoStories(hero) {
    if (!hero || hero.nextElementSibling?.classList.contains("pai-scene-showcase")) return;
    const section = document.createElement("section");
    section.className = "pai-scene-showcase pai-scene-on";
    section.setAttribute("aria-label","पंचायत AI से काम आसान होने के दृश्य");
    const reduceMotion = () => document.body.classList.contains("pai-motion-off") ||
      (typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    let index = 0;
    const paint = () => {
      const scene = scenes[index];
      section.classList.remove("pai-scene-on");
      section.innerHTML = '<div class="pai-scene-inner">'+
        '<div class="pai-scene-copy"><span class="pai-scene-brand">✦ पंचायत AI</span><span class="pai-scene-kicker">'+scene.tag+'</span>'+
        '<h2 class="pai-scene-title">'+scene.title+'</h2>'+
        '<p class="pai-scene-subtitle">'+scene.detail+'</p></div>'+
        '<div class="pai-scene-art" aria-hidden="true">'+scene.art+'</div></div>'+
        '<div class="pai-scene-progress" aria-hidden="true">'+
        scenes.map((_,i)=>'<i class="'+(i===index?'on':'')+'"></i>').join("")+'</div>';
      // Restart entrance animation for the newly displayed frame.
      void section.offsetWidth;
      section.classList.add("pai-scene-on");
    };
    paint();
    hero.insertAdjacentElement("afterend",section);
    const interval = window.setInterval(() => {
      if (!section.isConnected) {window.clearInterval(interval); return;}
      if (document.hidden || reduceMotion()) return;
      index = (index+1)%scenes.length;
      paint();
    }, 4600);
  }

  function mount(home,{user,design}={}) {
    if (!home) return;
    const conf=design||{};
    const hero=home.querySelector(".hero");
    if(hero&&conf.bannerImage) {
      try {
        const url=new URL(conf.bannerImage);
        if(url.protocol==="https:"&&url.hostname==="techgaon.in"&&/\.(png|jpg|jpeg|webp)$/i.test(url.pathname)){
          hero.style.backgroundImage='linear-gradient(115deg,rgba(19,44,81,.94),rgba(23,67,106,.76)),url("'+url.href+'")';
          hero.style.backgroundSize="cover";
          hero.style.backgroundPosition="center";
        }
      }catch(e){console.warn("Invalid banner image",e);}
    }
    const label=home.querySelector(".hero-eyebrow");
    if(label&&conf.label)label.textContent=String(conf.label).slice(0,45);
    if(!user){
      if(conf.title&&hero?.querySelector("h1"))hero.querySelector("h1").textContent=String(conf.title).slice(0,70);
      if(conf.subtitle&&hero?.querySelector("p"))hero.querySelector("p").textContent=String(conf.subtitle).slice(0,180);
    }else if(conf.subtitle){
      const desc=hero?.querySelector("p");
      if(desc)desc.textContent+=" · "+String(conf.subtitle).slice(0,180);
    }
    if(conf.showNews===false)home.querySelector('.home-news-estimate a[href*="karmcharinews"]')?.remove();
    if(conf.showEstimate===false)home.querySelector(".home-news-estimate .home-estimate")?.remove();
    if(conf.showPlus===false)home.querySelector(".home-final-pair .plus-tile")?.remove();
    for(const row of home.querySelectorAll(".home-news-estimate,.home-final-pair")){
      if(row.children.length===0)row.remove();
      else if(row.children.length===1)row.style.gridTemplateColumns="minmax(0,1fr)";
    }
    addGreetingEmblem(hero);
    addAutoStories(hero);
    // Deliberately do not render the removed "MY WORKSPACE" dashboard.
    // All routes and existing home-options continue to work.
  }
  window.PAI_DASH={mount};
})();
