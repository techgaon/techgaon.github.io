const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const sandbox={window:{},console};
vm.runInNewContext(fs.readFileSync(__dirname+"/ai-errors.js","utf8"),sandbox);
const AI=sandbox.window.PAI_AI_ERRORS;
test("App Check rejection has specific actionable error",()=>{
 const e=Error("403 PERMISSION_DENIED: To access this model, you must enforce Firebase App Check.");
 assert.equal(AI.explain(e).code,"AI_APP_CHECK");
});
test("Invalid Gemini project key and API restrictions have separate codes",()=>{
 assert.equal(AI.explain(Error("403 PERMISSION_DENIED: The caller does not have permission.")).code,"AI_PROJECT_KEY");
 assert.equal(AI.explain(Error("Requests to this API firebasevertexai.googleapis.com are blocked.")).code,"AI_API_RESTRICTION");
});
test("Unconfigured Firebase AI Logic and model errors are distinct",()=>{
 assert.equal(AI.explain(Error("404 Firebase AI Logic genai config not found.")).code,"AI_SETUP");
 assert.equal(AI.explain(Error("404 Model gemini-invalid was not found.")).code,"AI_MODEL_NOT_FOUND");
});
test("Google quota remains distinct from app unlimited setting",()=>{
 assert.equal(AI.explain(Error("429 RESOURCE_EXHAUSTED quota exceeded")).code,"AI_RATE_LIMIT");
});
test("never show URLs or API keys or tokens in visible error",()=>{
 const fake="Request failed https://firebasevertexai.googleapis.com/key?key=AIza1234567890abcdefghijklmnopqrstuvwxyz at server";
 const e=AI.explain(Error(fake));
 assert.ok(!e.technical.includes("https://"));
 assert.ok(!e.technical.includes("AIza"));
 const safe=AI.asError(Error(fake));
 assert.ok(!safe.message.includes("https://"));
});
test("short, safe status for broken network",()=>{
 const e=AI.explain(Error("Failed to fetch: net::ERR_CONNECTION_CLOSED"));
 assert.equal(e.code,"AI_NETWORK");
});

test("AI module loading problem has separate actionable code",()=>{
 assert.equal(AI.explain(Error("AI could not load. Please refresh")).code,"AI_MODULE_NOT_LOADED");
});
