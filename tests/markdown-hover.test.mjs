import {test} from 'node:test';import assert from 'node:assert/strict';import {markdownInteractions} from '../src/markdown-links.js';
test('image hover releases blobs and stale failures cannot close a newer image',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const saved={document:globalThis.document,MutationObserver:globalThis.MutationObserver,innerWidth:globalThis.innerWidth,innerHeight:globalThis.innerHeight},create=URL.createObjectURL,revoke=URL.revokeObjectURL,events={},cards=[],revoked=[],requests=new Map();
 globalThis.innerWidth=1000;globalThis.innerHeight=800;globalThis.MutationObserver=class{observe(){}disconnect(){}};
 globalThis.document={addEventListener(){},removeEventListener(){},body:{append:node=>cards.push(node)},createElement:()=>({style:{},setAttribute(){},append(){},remove(){this.removed=true;}})};
 URL.createObjectURL=()=>`blob:test-${cards.length}`;URL.revokeObjectURL=url=>revoked.push(url);
 const element={isConnected:true,getClientRects:()=>[{}],addEventListener:(key,fn)=>events[key]=fn,removeEventListener(){}};
 const move=href=>events.pointermove({target:{closest:()=>({dataset:{},tagName:'A',getAttribute:()=>href,getBoundingClientRect:()=>({left:40,top:400,bottom:420})})}});
 const settle=()=>new Promise(resolve=>setImmediate(resolve));let dispose;
 try{dispose=markdownInteractions({element,source:{},tab:{path:'report.md'},api:(route,q)=>new Promise((resolve,reject)=>requests.set(q.href,{resolve,reject})),open(){},onError(){}});
 move('old.png');t.mock.timers.tick(300);move('new.png');t.mock.timers.tick(300);
 requests.get('new.png').resolve({data:'YWJj',mime:'image/png'});await settle();assert.equal(cards.length,1);requests.get('old.png').reject(Error('late failure'));await settle();assert.notEqual(cards[0].removed,true);
 dispose.hide();assert.equal(cards[0].removed,true);assert.equal(revoked.length,1);
 move('pending.png');t.mock.timers.tick(300);dispose();requests.get('pending.png').resolve({data:'YWJj',mime:'image/png'});await settle();assert.equal(cards.length,1);
 }finally{dispose?.();Object.assign(globalThis,saved);URL.createObjectURL=create;URL.revokeObjectURL=revoke;}
});
