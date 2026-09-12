import test from 'node:test';import assert from 'node:assert/strict';import {form} from '../src/ui.js';
test('creation dialog survives menu cancel and submits the entered name',async()=>{
 const previous={document:globalThis.document,requestAnimationFrame:globalThis.requestAnimationFrame};const nodes=[],frames=[];
 globalThis.document={createElement:tag=>{const e={tag,children:[],isConnected:true,setAttribute(){},append(...items){this.children.push(...items);},focus(){},showModal(){this.open=true;},close(){this.open=false;this.onclose?.();},remove(){this.isConnected=false;}};nodes.push(e);return e;},body:{append(){}}};globalThis.requestAnimationFrame=fn=>frames.push(fn);
 try{const result=form('',[{name:'name',label:'',value:''}],'创建');const d=nodes.find(e=>e.tag==='dialog'),f=nodes.find(e=>e.tag==='form'),input=nodes.find(e=>e.tag==='input');assert.ok(!d.open);frames[0]();assert.ok(d.open);let prevented=false;d.oncancel({preventDefault(){prevented=true;}});assert.ok(prevented&&d.open);input.value='new.txt';f.onsubmit({preventDefault(){}});assert.deepEqual(await result,{name:'new.txt'});assert.equal(d.isConnected,false);}finally{Object.assign(globalThis,previous);}
});
