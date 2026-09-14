import test from 'node:test';import assert from 'node:assert/strict';
import {commitRows} from '../src/explorer-local-refresh.js';
test('local move preserves unrelated rows and only inserts the changed row',()=>{
 const a={id:'a'},b={id:'b'},added={id:'new'};let inserts=0;
 const host={children:[a,b],get firstElementChild(){return this.children[0]||null;},insertBefore(node,before){inserts++;this.children.splice(before?this.children.indexOf(before):this.children.length,0,node);}};
 Object.defineProperty(a,'nextElementSibling',{get:()=>b});Object.defineProperty(b,'nextElementSibling',{get:()=>null});
 commitRows(host,{children:[{existingRow:a},added,{existingRow:b}]});
 assert.deepEqual(host.children,[a,added,b]);assert.equal(inserts,1);
});
