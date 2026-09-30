import test from 'node:test';import assert from 'node:assert/strict';import editing from '../src/plugins/editing.js';
test('selecting a replacement in an editable file preserves the copied clipboard by default',async()=>{
 const listeners=new Map(),sent=[],commands=new Map();const original={document:globalThis.document,window:globalThis.window,localStorage:globalThis.localStorage,HTMLTextAreaElement:globalThis.HTMLTextAreaElement,HTMLInputElement:globalThis.HTMLInputElement};
 class Input{};const input=new Input();Object.assign(input,{value:'copied replacement',selectionStart:7,selectionEnd:18,readOnly:false});const file={contains:t=>t===input};const target={closest:()=>file};
 globalThis.HTMLTextAreaElement=Input;globalThis.HTMLInputElement=Input;globalThis.localStorage={getItem:()=>null};globalThis.window={webkit:{messageHandlers:{clipboard:{postMessage:x=>sent.push(x)}}}};globalThis.document={activeElement:input,addEventListener:(n,f)=>listeners.set(n,f),removeEventListener:()=>{}};
 const cleanup=[];try{editing.activate({get:()=>({command:(id,label,fn)=>{commands.set(id,fn);return()=>{};},current:()=>null}),effect:fn=>cleanup.push(fn)});
 listeners.get('mousedown')({button:0,target});listeners.get('mouseup')({button:0});await new Promise(r=>setTimeout(r,5));assert.equal(sent.length,0);
 globalThis.localStorage={getItem:k=>k==='selection-copy-edit'?'on':null};listeners.get('mousedown')({button:0,target});listeners.get('mouseup')({button:0});await new Promise(r=>setTimeout(r,5));assert.equal(sent[0].text,'replacement');window.__clipboardPending.get(sent[0].id).resolve('');
 }finally{for(const fn of cleanup)fn();for(const [k,v]of Object.entries(original)){if(v===undefined)delete globalThis[k];else globalThis[k]=v;}}
});
