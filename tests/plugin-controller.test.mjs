import test from 'node:test';import assert from 'node:assert/strict';import {pluginController} from '../src/plugin-controller.js';
test('open uppercase and mixed-case preview extensions block plugin disable',async()=>{
 const old={fetch:globalThis.fetch,location:globalThis.location};globalThis.location={href:'http://localhost/index.html'};globalThis.fetch=async()=>({json:async()=>({version:'test'})});
 try{const tabs=[{path:'REPORT.HTML'},{path:'notes.MarkDown'},{path:'report.PDF'}],states={};const wb={tabs};let unmounts=0;
 const api=async name=>name==='settings/plugins/read'?{states,urls:{}}:states;
 const kernel={get:n=>n==='api'?api:wb,plugins:new Map([['html',{}],['markdown',{}],['pdf',{}]]),services:new Map(),unmount:async()=>unmounts++};
 await pluginController(kernel,[{id:'html'},{id:'markdown'},{id:'pdf'}],{});const controller=kernel.services.get('plugin-control').value;
 for(const id of ['html','markdown','pdf'])await assert.rejects(controller.change(id,'disabled'),/Close this plugin/);assert.equal(unmounts,0);
 }finally{Object.assign(globalThis,old);}
});
