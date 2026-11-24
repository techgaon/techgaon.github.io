/* node --test panchayatai/gst-keypad.test.cjs */
const test=require("node:test");
const assert=require("node:assert/strict");
const vm=require("node:vm");
const fs=require("node:fs");
const path=require("node:path");

const source=fs.readFileSync(path.join(__dirname,"gst.js"),"utf8");
function mockNode(dataset={}){
  return {dataset,value:"",checked:true,hidden:true,textContent:"",onclick:null,onchange:null,oninput:null,
    setAttribute(){},scrollIntoView(){}};
}
function loadKeypad(){
  let html="",stageHTML="";
  let stageNodes=new Map();
  const findNode=(key,dataset={})=>{
    if(!stageNodes.has(key))stageNodes.set(key,mockNode(dataset));
    return stageNodes.get(key);
  };
  const stage={
    get innerHTML(){return stageHTML;},
    set innerHTML(v){stageHTML=v;stageNodes=new Map();},
    querySelector(q){return findNode(q);},
    querySelectorAll(q){
      const pattern=q==="[data-gst-key]"?/data-gst-key="([^"]+)"/g:
        q==="[data-gst-rate]"?/data-gst-rate="([^"]+)" data-gst-mode="([^"]+)"/g:null;
      if(!pattern)return [];
      return [...stageHTML.matchAll(pattern)].map(m=>q==="[data-gst-key]"?
        findNode("key:"+m[1],{gstKey:m[1]}):
        findNode("rate:"+m[1]+":"+m[2],{gstRate:m[1],gstMode:m[2]}));
    }
  };
  const el={
    set innerHTML(v){html=v;},
    get innerHTML(){return html;},
    querySelector(q){return q==="#gst-calculator-stage"?stage:mockNode();}
  };
  const context={window:{},document:{getElementById(){return {};}},navigator:{},setTimeout};
  vm.runInNewContext(source,context,{filename:"gst.js",timeout:3000});
  context.window.PAI_GST.mountCalculator(el);
  function key(value){
    const button=stage.querySelectorAll("[data-gst-key]").find(b=>b.dataset.gstKey===value);
    assert.ok(button,"Missing keypad button "+value);button.onclick();
  }
  function rate(value,mode){
    const button=stage.querySelectorAll("[data-gst-rate]").find(b=>Number(b.dataset.gstRate)===value&&b.dataset.gstMode===mode);
    assert.ok(button,"Missing tax quick key "+value);button.onclick();
  }
  return {key,rate,stage,get html(){return stage.innerHTML}};
}
test("reference-style keypad has no +3%/-3%, retains 5/18/40 and app theme tokens",()=>{
  const pad=loadKeypad();
  assert.ok(pad.html.includes('data-gst-rate="5"'));
  assert.ok(pad.html.includes('data-gst-rate="18"'));
  assert.ok(pad.html.includes('data-gst-rate="40"'));
  assert.ok(!pad.html.includes('data-gst-rate="3"'));
  assert.ok(source.includes("var(--ink)"));
  assert.ok(source.includes("font-family:inherit"));
});
test("79317 +40% produces source screenshot breakdown including rounded total",()=>{
  const pad=loadKeypad();
  for(const k of ["7","9","3","1","7"])pad.key(k);
  pad.rate(40,"add");
  pad.key("=");
  assert.ok(pad.html.includes("₹79,317.00"));
  assert.ok(pad.html.includes("CGST (20%)"));
  assert.ok(pad.html.includes("SGST (20%)"));
  assert.ok(pad.html.includes("₹15,863.40"));
  assert.ok(pad.html.includes("₹1,11,044.00"));
  assert.ok(pad.html.includes("WhatsApp Share")&&pad.html.includes("Copy"));
  pad.stage.querySelector("#gst-round").onchange({target:{checked:false}});
  assert.ok(pad.html.includes("₹1,11,043.80"));
});
test("inclusive 18% extracts GST and result contains edit and share controls",()=>{
  const pad=loadKeypad();
  for(const k of ["1","1","8"])pad.key(k);
  pad.rate(18,"remove");
  pad.key("=");
  assert.ok(pad.html.includes("₹100.00"));
  assert.ok(pad.html.includes("CGST (9%)"));
  assert.ok(pad.html.includes("₹9.00"));
  assert.ok(pad.html.includes("id=\"gst-edit\""));
});
