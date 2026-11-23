const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),readline=require('node:readline');
(async()=>{
 const vendor=path.resolve('panchayatai/vendor');
 const core=path.join(vendor,'core/tesseract-core-simd-lstm.wasm');
 const create=require(core+'.js');
 const m=await create({wasmBinary:fs.readFileSync(core),print:()=>{},printErr:()=>{}});
 m.FS.mkdir('/tessdata');
 for(const lang of ['eng','hin'])m.FS.writeFile('/tessdata/'+lang+'.traineddata',zlib.gunzipSync(fs.readFileSync(path.join(vendor,'lang/'+lang+'.traineddata.gz'))));
 const api=new m.TessBaseAPI();if(api.Init('/tessdata','eng+hin',1)!==0)throw Error('OCR initialization failed');
 api.SetPageSegMode(3);process.stdout.write(JSON.stringify({ready:true})+'\n');
 for await(const line of readline.createInterface({input:process.stdin,crlfDelay:Infinity})){
  let ptr;
  try{const t=JSON.parse(line),raw=fs.readFileSync(t.file);if(raw.length!==t.width*t.height)throw Error('Invalid raster');
   ptr=m._malloc(raw.length);m.HEAPU8.set(raw,ptr);api.SetImage(ptr,t.width,t.height,1,t.width);api.SetSourceResolution(180);api.Recognize(null);
   process.stdout.write(JSON.stringify({text:api.GetUTF8Text(),confidence:api.MeanTextConf()})+'\n');
  }catch(e){process.stdout.write(JSON.stringify({error:e.message})+'\n')}
  finally{api.Clear();if(ptr)m._free(ptr)}
 }
 api.End();m.destroy(api);
})().catch(e=>{process.stderr.write(e.stack);process.exit(1)});
