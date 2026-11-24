/* node --test panchayatai/tools-excel.test.cjs */
const test=require("node:test");
const assert=require("node:assert/strict");
const vm=require("node:vm");
const fs=require("node:fs");
const path=require("node:path");
const source=fs.readFileSync(path.join(__dirname,"tools-excel.js"),"utf8");
function setup(){
  const saved=[];
  const XLSX={
    utils:{
      book_new:()=>({SheetNames:[],Sheets:{}}),
      aoa_to_sheet:rows=>({rows}),
      book_append_sheet:(wb,ws,name)=>{
        wb.SheetNames.push(name);wb.Sheets[name]=ws;saved.push({name,rows:ws.rows});
      },
      sheet_to_json:ws=>ws.rows
    },
    write:()=>new Uint8Array([80,75,3,4]),
    read:()=>({SheetNames:["Report"],Sheets:{
      Report:{rows:[["Item","Amount"],["Sand","100"],["Steel","250"]]}
    }})
  };
  const window={
    XLSX,
    mammoth:{convertToHtml:async()=>({value:"<table><tr><td>Item</td></tr></table>"})},
    html2pdf:()=>({set(){return this;},from(){return this;},
      outputPdf:async()=>new Blob([new Uint8Array(1200)],{type:"application/pdf"})})
  };
  const mkrow=values=>({cells:values.map(textContent=>({textContent}))});
  class DOMParser {
    parseFromString(){
      return {
        querySelectorAll:()=>[{
          parentElement:{closest:()=>false},
          rows:[mkrow(["Item","Qty"]),mkrow(["मौरंग","5"])]
        }],
        body:{querySelectorAll:()=>[{
          closest:()=>null,textContent:"Word Paragraph outside table"
        }]}
      };
    }
  }
  const document={
    createElement:()=>({style:{},appendChild(){},remove(){}}),
    body:{appendChild(){}},
    fonts:{ready:Promise.resolve()}
  };
  class Node{constructor(props){Object.assign(this,props);}}
  const docx={Paragraph:Node,TextRun:Node,TableRow:Node,TableCell:Node,
    Table:Node,Document:Node,WidthType:{PERCENTAGE:"pct"},
    Packer:{toBlob:async()=>new Blob(["mock DOCX"])}
  };
  const page={
    getTextContent:async()=>({items:[
      {str:"Name",transform:[0,0,0,0,10,700],width:30},
      {str:"Price",transform:[0,0,0,0,110,700],width:30},
      {str:"Sand",transform:[0,0,0,0,10,680],width:30},
      {str:"100",transform:[0,0,0,0,110,680],width:30}
    ]}),
    cleanup(){}
  };
  const pdf={numPages:1,getPage:async()=>page,destroy:async()=>{}};
  const helpers={
    loadScript:async()=>{},
    loadDocx:async()=>docx,
    loadPdfjs:async()=>({getDocument:()=>({promise:Promise.resolve(pdf)})}),
    textFromPdf:async()=>"",
  };
  vm.runInNewContext(source,{window,Blob,DOMParser,document,
    requestAnimationFrame:callback=>callback()},{filename:"tools-excel.js"});
  return {api:window.PAI_EXCEL_CONVERT,saved,helpers,
    file:{name:"example",arrayBuffer:async()=>new ArrayBuffer(8)}};
}
test("extract PDF text into separate columns by x/y coordinates",()=>{
  const {api}=setup();
  const rows=api.pdfLines([
    {str:"Name",transform:[0,0,0,0,10,700],width:30},
    {str:"Price",transform:[0,0,0,0,110,700],width:30},
    {str:"Sand",transform:[0,0,0,0,10,680],width:30},
    {str:"100",transform:[0,0,0,0,110,680],width:30}
  ]);
  assert.equal(JSON.stringify(rows),JSON.stringify([["Name","Price"],["Sand","100"]]));
});
test("Word tables and paragraphs export as distinct XLSX sheets",async()=>{
  const {api,saved,file,helpers}=setup();
  const result=await api.convert("word-excel",file,helpers,()=>{},await file.arrayBuffer());
  assert.equal(result.ext,".xlsx");
  assert.equal(saved.length,2);
  assert.equal(saved[0].name,"Table 1");
  assert.equal(saved[1].name,"Word Text");
  assert.equal(saved[0].rows[1][0].v,"मौरंग");
});
test("PDF to Excel creates an XLSX workbook with page table",async()=>{
  const {api,saved,file,helpers}=setup();
  const result=await api.convert("pdf-excel",file,helpers,()=>{},await file.arrayBuffer());
  assert.equal(result.ext,".xlsx");
  assert.equal(saved[0].name,"Page 1");
  assert.equal(saved[0].rows[1][1].v,"100");
});
test("Excel to PDF and Word have outputs and explanatory notes",async()=>{
  const {api,file,helpers}=setup();
  const bytes=await file.arrayBuffer();
  const pdf=await api.convert("excel-pdf",file,helpers,()=>{},bytes);
  const docx=await api.convert("excel-word",file,helpers,()=>{},bytes);
  assert.equal(pdf.ext,".pdf");
  assert.equal(docx.ext,".docx");
  assert.ok(pdf.blob.size>100);
  assert.ok(docx.blob.size>0);
  assert.match(pdf.note,/Charts/);
  assert.match(docx.note,/Formatting|Charts/);
});
test("conversion code does not send user files to a remote API",()=>{
  assert.equal(source.includes("fetch("),false);
  assert.equal(source.includes("XMLHttpRequest"),false);
});
