import test from 'node:test';import assert from 'node:assert/strict';import {menuAt} from '../src/ui.js';
test('context menu survives opening cancellation and releases replaced listeners',()=>{
 const saved={document:globalThis.document,innerWidth:globalThis.innerWidth,innerHeight:globalThis.innerHeight};const listeners=[];
 const node=()=>({style:{},children:[],offsetWidth:100,offsetHeight:100,setAttribute(){},append(...items){this.children.push(...items);},remove(){this.removed=true;},focus(){},contains(n){return n===this||this.children.includes(n);}});
 globalThis.document={createElement:node,querySelector:()=>null,body:{append(){}},addEventListener:(type,fn,options)=>listeners.push({type,fn,...options})};globalThis.innerWidth=800;globalThis.innerHeight=600;
 const emit=(type,e)=>listeners.filter(l=>l.type===type&&!l.signal.aborted).forEach(l=>l.fn(e));
 try{const first=menuAt(10,10,[]);emit('keydown',{key:'Escape'});assert.ok(!first.removed);const second=menuAt(20,20,[]);assert.ok(first.removed);assert.ok(listeners.slice(0,3).every(l=>l.signal.aborted));emit('keyup',{key:'Escape'});assert.ok(second.removed);assert.ok(listeners.every(l=>l.signal.aborted));}finally{Object.assign(globalThis,saved);}
});
