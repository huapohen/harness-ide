import test from 'node:test';import assert from 'node:assert/strict';import {isInputSourceKey,installTerminalIME} from '../src/terminal-ime.js';
test('IME switching keys are reserved while ordinary terminal control keys remain',()=>{
 assert.equal(isInputSourceKey({ctrlKey:true,code:'Space'}),true);assert.equal(isInputSourceKey({key:'Fn'}),true);assert.equal(isInputSourceKey({ctrlKey:true,key:'c'}),false);
});
test('composition input is not prevented and handlers are removable',()=>{
 const handlers=new Map(),input={addEventListener:(k,v)=>handlers.set(k,v),removeEventListener:k=>handlers.delete(k)};
 const dispose=installTerminalIME({querySelector:()=>input,addEventListener(){},removeEventListener(){}});let stopped=false;
 handlers.get('beforeinput')({stopPropagation(){stopped=true;},preventDefault(){throw Error('IME cancelled');}});assert.equal(stopped,true);dispose();assert.equal(handlers.size,0);
});
test('direct IME digits and punctuation are sent without duplicating composition',async()=>{
 const handlers=new Map(),sent=[],input={value:'',addEventListener:(k,v)=>handlers.set(k,v),removeEventListener:k=>handlers.delete(k)};
 const dispose=installTerminalIME({querySelector:()=>input,addEventListener(){},removeEventListener(){}},data=>sent.push(data));
 for(const data of ['1','，','。'])handlers.get('input')({inputType:'insertText',data});
 handlers.get('compositionstart')();handlers.get('input')({inputType:'insertCompositionText',data:'ni',isComposing:true});
 handlers.get('compositionend')({data:'你'});handlers.get('input')({inputType:'insertText',data:'你'});
 await Promise.resolve();handlers.get('input')({inputType:'insertText',data:'2'});
 assert.deepEqual(sent,['1','，','。','2']);assert.equal(input.value,'');dispose();
});
