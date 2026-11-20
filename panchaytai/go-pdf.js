const VENDOR = new URL('/panchayatai/vendor/', import.meta.url).href;
const NEWS_URL = 'https://techgaon.in/karmcharinews/';
const FOOTER = '100 शब्दों में कर्मचारी न्यूज़ पढ़ें — क्लिक करें';
const normalize = value => String(value || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}\p{M}]+/gu, '');
const stop = new Set('है हैं का की के को में से और पर यह वह लिए एक जी भी ही तथा करें क्या कैसे कब कौन कितना किन किस the a an of and or is are to in for on this that as with what how which your you'.split(' '));

// Matching is performed against actual PDF text or OCR boxes, never guessed coordinates.
export function relevantLines(lines, evidence = {}) {
  const prepared = lines.map((line, index) => ({ ...line, index, normalized: normalize(line.text) }));
  let offset = 0;
  for (const line of prepared) { line.start = offset; offset += line.normalized.length; line.end = offset; }
  const all = prepared.map(line => line.normalized).join('');
  const exact = new Set();
  for (const quote of evidence.quotes || []) {
    const query = normalize(quote);
    if (query.length < 12) continue;
    let at = all.indexOf(query);
    while (at !== -1) {
      for (const line of prepared) if (line.end > at && line.start < at + query.length) exact.add(line.index);
      at = all.indexOf(query, at + query.length);
    }
  }
  if (exact.size) return { lines: [...exact].map(index => lines[index]), exact: true };
  const tokens = [...new Set(String((evidence.question || '') + ' ' + (evidence.answer || '')).normalize('NFKC').toLowerCase().split(/[^\p{L}\p{N}\p{M}]+/u).filter(word => word.length >= 3 && !stop.has(word)))];
  const scored = prepared.map(line => {
    const words = new Set(String(line.text).normalize('NFKC').toLowerCase().split(/[^\p{L}\p{N}\p{M}]+/u));
    const matches = tokens.filter(word => words.has(word));
    return { line, score: matches.length, hasText: matches.some(word => /\p{L}/u.test(word)) };
  }).filter(item => item.score >= 2 && item.hasText).sort((a,b) => b.score - a.score);
  const anchors = scored.filter(item => item.score >= 3).slice(0,3);
  const selected = new Set(anchors.map(item => item.line.index));
  for (const anchor of anchors) for (const neighbour of scored) {
    if (Math.abs(neighbour.line.index-anchor.line.index) === 1 && Math.abs(neighbour.line.y-anchor.line.y) < Math.max(neighbour.line.height,anchor.line.height)*2.5) selected.add(neighbour.line.index);
  }
  return { lines: [...selected].sort((a,b) => a-b).slice(0,6).map(index => lines[index]), exact: false };
}

let readerPromise;
async function reader() {
  readerPromise ||= import(VENDOR + 'pdf.js').then(sdk => { sdk.GlobalWorkerOptions.workerSrc = VENDOR + 'pdf.worker.min.mjs'; return sdk; });
  return readerPromise;
}
function textLines(content, viewport, sdk) {
  const rows = [];
  for (const item of content.items) {
    if (!item.str?.trim() || !item.transform) continue;
    const transform = sdk.Util.transform(viewport.transform, item.transform);
    const height = Math.max(5, Math.hypot(transform[2], transform[3]));
    const left = transform[4], top = transform[5] - height;
    const width = Math.max(1, Math.abs(item.width * viewport.scale));
    let row = rows.find(row => Math.abs(row.top - top) < Math.max(3, height * .4));
    if (!row) { row = { top, items: [] }; rows.push(row); }
    row.items.push({ text: item.str, x: left, y: top, width, height });
  }
  return rows.sort((a,b) => a.top - b.top).map(row => {
    row.items.sort((a,b) => a.x - b.x);
    const x = Math.min(...row.items.map(item => item.x)), y = Math.min(...row.items.map(item => item.y));
    return { text: row.items.map(item => item.text).join(' '), x, y,
      width: Math.max(...row.items.map(item => item.x + item.width)) - x,
      height: Math.max(...row.items.map(item => item.y + item.height)) - y };
  });
}
async function ocrLines(page, viewport, getWorker) {
  const scale = 2, renderViewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas'); canvas.width = Math.ceil(renderViewport.width); canvas.height = Math.ceil(renderViewport.height);
  try {
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: renderViewport }).promise;
    const worker = await getWorker();
    const result = await worker.recognize(canvas, {}, { blocks: true, text: true });
    const lines = result.data.lines || (result.data.blocks || []).flatMap(block => (block.paragraphs || []).flatMap(paragraph => paragraph.lines || []));
    return lines.filter(line => line.bbox && line.text?.trim()).map(line => ({ text: line.text, x: line.bbox.x0 / scale, y: line.bbox.y0 / scale, width: (line.bbox.x1-line.bbox.x0) / scale, height: (line.bbox.y1-line.bbox.y0) / scale }));
  } finally { canvas.width = canvas.height = 0; }
}
async function footerImage(doc, width) {
  await document.fonts.load('600 18px "Noto Sans Devanagari"');
  const canvas = document.createElement('canvas'); canvas.width = Math.ceil((width - 32) * 3); canvas.height = 54;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = '#0f5132'; ctx.font = '600 30px "Noto Sans Devanagari", "Nirmala UI", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(FOOTER, canvas.width / 2, 27, canvas.width - 12);
  return doc.embedPng(canvas.toDataURL('image/png'));
}
function addLink(doc, page, rect, url, sdk) {
  const annotation = doc.context.obj({ Type: 'Annot', Subtype: 'Link', Rect: rect, Border: [0,0,0], A: { Type: 'Action', S: 'URI', URI: sdk.PDFString.of(url) } });
  const ref = doc.context.register(annotation), annotations = page.node.lookup(sdk.PDFName.of('Annots'));
  if (annotations) annotations.push(ref); else page.node.set(sdk.PDFName.of('Annots'), doc.context.obj([ref]));
}

export async function prepareGoPdf(bytes, evidence = {}, onProgress = () => {}) {
  const pdfjs = await reader(), sdk = window.PDFLib;
  if (!sdk) throw new Error('PDF tools could not load. Please refresh and try again.');
  const [source, parsed] = await Promise.all([sdk.PDFDocument.load(bytes), pdfjs.getDocument({ data: new Uint8Array(bytes.slice(0)), cMapUrl: VENDOR + 'cmaps/', cMapPacked: true, standardFontDataUrl: VENDOR + 'standard_fonts/' }).promise]);
  const output = await sdk.PDFDocument.create(), font = await output.embedFont(sdk.StandardFonts.Helvetica);
  let worker, workerPromise, highlighted = 0, scanned = false, ocrFailed = false;
  const getWorker = () => workerPromise ||= import('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/+esm').then(async module => {
    const engine = module.default || module;
    worker = await engine.createWorker('hin+eng', 1, { workerPath: VENDOR + 'worker.min.js', corePath: VENDOR + 'core/', langPath: VENDOR + 'lang/' });
    return worker;
  });
  const footers = new Map();
  try {
    for (let index = 0; index < source.getPageCount(); index++) {
      onProgress(`Preparing GO · page ${index+1}/${source.getPageCount()}`);
      const original = source.getPage(index), pdfPage = await parsed.getPage(index+1), viewport = pdfPage.getViewport({ scale: 1 });
      let lines = textLines(await pdfPage.getTextContent(), viewport, pdfjs);
      let matches = relevantLines(lines, evidence);
      if ((!matches.lines.length || lines.reduce((sum,line) => sum + line.text.length,0) < 60) && (evidence.quotes?.length || evidence.question)) {
        scanned = true; onProgress(`Reading scanned GO · page ${index+1}/${source.getPageCount()}`);
        try { lines = await ocrLines(pdfPage, viewport, getWorker); matches = relevantLines(lines, evidence); }
        catch (error) { ocrFailed = true; console.warn('GO OCR unavailable', error); }
      }
      const crop = original.getCropBox();
      const embedded = await output.embedPage(original, { left: crop.x, bottom: crop.y, right: crop.x + crop.width, top: crop.y + crop.height });
      const rotation = ((original.getRotation().angle % 360) + 360) % 360;
      const swap = rotation === 90 || rotation === 270;
      const width = swap ? embedded.height : embedded.width, height = swap ? embedded.width : embedded.height, footerHeight = 40;
      const page = output.addPage([width, height + footerHeight]);
      const positions = { 0: [0, footerHeight], 90: [0, footerHeight + embedded.width], 180: [embedded.width, footerHeight + embedded.height], 270: [embedded.height, footerHeight] };
      const [x,y] = positions[rotation] || positions[0];
      page.drawPage(embedded, { x, y, rotate: sdk.degrees(-rotation) });
      for (const line of matches.lines) {
        const sx = width / viewport.width, sy = height / viewport.height;
        const left = Math.max(0,line.x*sx-1), right = Math.min(width,(line.x + line.width)*sx+1);
        const bottom = Math.max(footerHeight,footerHeight+height-(line.y+line.height)*sy-1), top = Math.min(footerHeight+height,footerHeight+height-line.y*sy+1);
        if (right <= left || top <= bottom) continue;
        page.drawRectangle({ x: left, y: bottom, width: right-left, height: top-bottom,
          color: sdk.rgb(1,.87,0), opacity: .28, blendMode: sdk.BlendMode.Multiply });
        highlighted++;
      }
      // Preserve existing source web links while rotating and adding a footer margin.
      for (const annotation of await pdfPage.getAnnotations()) {
        if (!annotation.url || !/^https?:\/\//i.test(annotation.url) || !annotation.rect) continue;
        const rect = viewport.convertToViewportRectangle(annotation.rect), sx = width/viewport.width, sy=height/viewport.height;
        addLink(output,page,[Math.min(rect[0],rect[2])*sx,footerHeight+height-Math.max(rect[1],rect[3])*sy,Math.max(rect[0],rect[2])*sx,footerHeight+height-Math.min(rect[1],rect[3])*sy],annotation.url,sdk);
      }
      if (!footers.has(width)) footers.set(width, await footerImage(output,width));
      page.drawImage(footers.get(width),{x:16,y:17,width:width-32,height:18});
      addLink(output,page,[16,16,width-16,36],NEWS_URL,sdk);
      const company='TechGaon AI Services', app='PANCHAYT AI', size=7;
      page.drawText(company,{x:16,y:5,size,font,color:sdk.rgb(.06,.32,.2)});
      page.drawText(app,{x:width-16-font.widthOfTextAtSize(app,size),y:5,size,font,color:sdk.rgb(.06,.32,.2)});
      addLink(output,page,[14,2,150,14],'https://techgaon.in/',sdk);
      addLink(output,page,[width-130,2,width-14,14],'https://techgaon.in/panchayatai/',sdk);
      pdfPage.cleanup();
    }
    return { bytes: await output.save(), highlighted, scanned, ocrFailed };
  } finally { if(worker) await worker.terminate(); await parsed.destroy(); }
}
