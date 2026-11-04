/* पंचायत AI — विज़िटर काउंट (Firestore: stats/visits.count) */
(() => {
  const fmt = n => Number(n || 0).toLocaleString("en-IN");
  let count = null;
  function paint() {
    if (count === null) return;
    const html = `👁 कुल विज़िटर: <b>${fmt(count)}</b>`;
    const foot = document.querySelector(".drawer-foot");
    if (foot && !foot.querySelector(".vc")) foot.insertAdjacentHTML("afterbegin", `<div class="vc" style="padding:0 22px 8px;color:#5f6b66"></div>`);
    if (foot) foot.querySelector(".vc").innerHTML = html;
    const view = document.querySelector("#view");
    if (view && view.querySelector(".hero") && !view.querySelector(".vc-home"))
      view.insertAdjacentHTML("beforeend", `<p class="hint vc-home" style="text-align:center;margin-top:16px">${html}</p>`);
  }
  async function run() {
    if (!window.firebase || !firebase.apps.length) return;
    const db = firebase.firestore(), ref = db.collection("stats").doc("visits");
    try {
      if (!sessionStorage.getItem("pai_v")) {
        await ref.set({ count: firebase.firestore.FieldValue.increment(1) }, { merge: true });
        sessionStorage.setItem("pai_v", "1");
      }
      count = (await ref.get()).data().count; paint();
    } catch (e) { console.warn("visits", e); }
  }
  new MutationObserver(paint).observe(document.querySelector("#view"), { childList: true });
  if (document.readyState === "complete") run(); else window.addEventListener("load", run);
})();
