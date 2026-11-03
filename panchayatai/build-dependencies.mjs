import fs from 'node:fs/promises';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
import {build} from 'esbuild';
const out='panchayatai/vendor';
await fs.mkdir(out,{recursive:true});
const inputs={app:'firebase/app',auth:'firebase/auth',ai:'firebase/ai',appcheck:'firebase/app-check',db:'firebase/firestore',pdf:'pdfjs-dist/build/pdf.mjs',pdflib:'pdf-lib',ocr:'tesseract.js'};
await fs.mkdir('.vendor-build',{recursive:true});
for(const [name,module]of Object.entries(inputs))await fs.writeFile('.vendor-build/'+name+'.js',`export * from ${JSON.stringify(module)};`);
await build({entryPoints:Object.keys(inputs).map(n=>'.vendor-build/'+n+'.js'),outdir:out,bundle:true,splitting:true,format:'esm',platform:'browser',minify:true,target:'es2022',legalComments:'linked',define:{'process.env.NODE_ENV':'"production"'}});
for(const [src,dest]of [['pdfjs-dist/build/pdf.worker.min.mjs','pdf.worker.min.mjs'],['pdfjs-dist/cmaps','cmaps'],['pdfjs-dist/standard_fonts','standard_fonts'],['tesseract.js/dist/worker.min.js','worker.min.js']])await fs.cp('node_modules/'+src,path.join(out,dest),{recursive:true});
await fs.mkdir(path.join(out,'core'),{recursive:true});
for(const f of await fs.readdir('node_modules/tesseract.js-core'))if(/^tesseract-core.*\.(wasm|js)$/.test(f))await fs.copyFile('node_modules/tesseract.js-core/'+f,path.join(out,'core',f));
await fs.mkdir(path.join(out,'lang'),{recursive:true});
for(const lang of ['eng','hin']){
  const url='https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/main/'+lang+'.traineddata';
  const r=await fetch(url);if(!r.ok)throw Error('Language download failed: '+lang);
  await fs.writeFile(path.join(out,'lang',lang+'.traineddata.gz'),gzipSync(Buffer.from(await r.arrayBuffer())));
}
await fs.writeFile(path.join(out,'ready.json'),JSON.stringify({builtAt:new Date().toISOString(),firebase:'12.4.0',pdfjs:'4.10.38',tesseract:'5.1.1'}));
console.log('Self-hosted dependencies ready.');
