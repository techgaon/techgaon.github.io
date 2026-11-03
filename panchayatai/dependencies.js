// Local, version-pinned bundles are built by the repository's dependency workflow.
// Until the first successful build, the pinned public distribution is used.
const cdn = {
  app:'https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js',
  auth:'https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js',
  ai:'https://www.gstatic.com/firebasejs/12.4.0/firebase-ai.js',
  appcheck:'https://www.gstatic.com/firebasejs/12.4.0/firebase-app-check.js',
  pdf:'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs',
  pdflib:'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/+esm',
  ocr:'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/+esm'
};
export function deadline(promise, ms=25000, message='Connection timed out. Please retry.') {
  let timer;
  return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(message)),ms)})]).finally(()=>clearTimeout(timer));
}
let local;
async function localAvailable(){
  if(local!==undefined)return local;
  try {const r=await fetch('vendor/ready.json',{signal:AbortSignal.timeout(4000)}); local=r.ok;}catch{local=false}
  return local;
}
export async function dependency(name){
  const available=await localAvailable();
  return deadline(import(available?'./vendor/'+name+'.js':cdn[name]));
}
export async function pdfReader(){
  const sdk=await dependency('pdf');
  sdk.GlobalWorkerOptions.workerSrc=await localAvailable()?new URL('vendor/pdf.worker.min.mjs',document.baseURI).href:'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
  return sdk;
}
export async function ocrOptions(){
  return await localAvailable()?{workerPath:new URL('vendor/worker.min.js',document.baseURI).href,corePath:new URL('vendor/core/',document.baseURI).href,langPath:new URL('vendor/lang/',document.baseURI).href}:{};
}
