import test from 'node:test';import assert from 'node:assert/strict';import plugin from '../src/plugins/html.js';
test('late failed HTML request cannot cover a newer successful page with an error',async()=>{
 const old={document:globalThis.document,window:globalThis.window};let receive,viewer,rejectOld;
 class Node{constructor(tag){this.tag=tag;this.children=[];this.isConnected=true;this.contentWindow={};}setAttribute(){}append(...nodes){this.children.push(...nodes);}prepend(n){this.children.unshift(n);}querySelector(selector){return this.children.find(n=>selector==='.html-error'&&n.className?.includes('html-error'));}}
 globalThis.document={createElement:tag=>new Node(tag)};globalThis.window={addEventListener:(name,fn)=>receive=fn,removeEventListener(){}};
 try{const api=async(name,q)=>q.path==='old.html'?new Promise((resolve,reject)=>rejectOld=reject):{data:Buffer.from('<h1>New page</h1>').toString('base64')};
 plugin.activate({get:n=>n==='api'?api:{register:(ext,fn)=>{viewer=fn;return()=>{};}},effect(){}});
 const container=new Node('div');viewer(container,'<h1>Start</h1>',{path:'index.html'});const frame=container.children.find(n=>n.tag==='iframe');const id=frame.srcdoc.match(/harnessHTML:"([^"]+)"/)[1];
 receive({source:frame.contentWindow,data:{harnessHTML:id,href:'old.html'}});receive({source:frame.contentWindow,data:{harnessHTML:id,href:'new.html'}});await new Promise(r=>setImmediate(r));assert.match(frame.srcdoc,/New page/);
 rejectOld(Error('late failure'));await new Promise(r=>setImmediate(r));assert.equal(container.querySelector('.html-error'),undefined);assert.match(frame.srcdoc,/New page/);
 }finally{Object.assign(globalThis,old);}
});
