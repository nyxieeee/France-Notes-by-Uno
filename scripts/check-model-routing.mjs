import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
const before=globalThis.fetch,key=process.env.VITE_MISTRAL_API_KEY;process.env.VITE_MISTRAL_API_KEY='fixture-key';
try{
 const source=await fs.readFile(new URL('../api/mistral.ts',import.meta.url),'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 const {default:handler}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
 let sent,calls=0;globalThis.fetch=async(url,options)=>{calls++;assert.equal(url,'https://api.mistral.ai/v1/chat/completions');sent=JSON.parse(options.body);return Response.json({choices:[{message:{content:'A quiz response'}}]})};
 const response={statusCode:200,status(value){this.statusCode=value;return this},json(value){this.value=value;return this}};
 await handler({method:'POST',body:{model:'mistral-small-latest',messages:[{role:'user',content:'Generate a quiz.'}],max_tokens:200}},response);
 assert.equal(response.statusCode,200);assert.equal(sent.model,'ministral-8b-latest');assert.equal(sent.messages[0].content,'Generate a quiz.');assert.equal(sent.max_tokens,200);
 await handler({method:'GET'},response);assert.equal(response.statusCode,405);assert.equal(calls,1);
 console.log('Passed: production proxy pins ministral-8b-latest even for an older client, preserves request content and rejects GET.');
}finally{globalThis.fetch=before;if(key===undefined)delete process.env.VITE_MISTRAL_API_KEY;else process.env.VITE_MISTRAL_API_KEY=key}
