/* A session counts once per browser tab. Dates use India time. */
(() => {
  let count = null;
  function paint() {
    const foot = document.querySelector('.drawer-foot');
    if (!foot || count === null) return;
    let label = foot.querySelector('.vc');
    if (!label) { label = document.createElement('div'); label.className = 'vc hint'; foot.prepend(label); }
    const text = '👁 Total visitors: ' + Number(count).toLocaleString('en-IN');
    if (label.textContent !== text) label.textContent = text;
    const view = document.querySelector('#view');
    if (view?.querySelector('.home-options')) {
      let home = view.querySelector('.vc-home');
      if (!home) { home = document.createElement('p'); home.className = 'hint vc-home'; home.style.textAlign = 'center'; view.appendChild(home); }
      if (home.textContent !== text) home.textContent = text;
    }
  }
  async function run() {
    if (!window.firebase || !firebase.apps.length) return;
    const db = firebase.firestore(), total = db.collection('stats').doc('visits');
    try {
      if (!sessionStorage.getItem('pai_v2')) {
        const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        const daily = db.collection('paiVisitorDays').doc(day);
        const batch = db.batch();
        batch.set(total, { count: firebase.firestore.FieldValue.increment(1) }, { merge: true });
        batch.set(daily, { count: firebase.firestore.FieldValue.increment(1) }, { merge: true });
        await batch.commit(); sessionStorage.setItem('pai_v2', '1');
      }
      total.onSnapshot(doc => { count = doc.data()?.count || 0; paint(); }, e => console.warn('Visitor count unavailable', e.code));
    } catch(e) { console.warn('Visitor tracking unavailable', e.code); }
  }
  new MutationObserver(paint).observe(document.querySelector('#view'), { childList: true });
  if (document.readyState === 'complete') run(); else window.addEventListener('load', run, { once: true });
})();
