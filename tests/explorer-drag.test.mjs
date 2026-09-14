import test from 'node:test';
import assert from 'node:assert/strict';
import {dropTarget,destination} from '../src/explorer-drag.js';
test('drop resolves the replacement tree and ignores an inactive explorer',()=>{
 const previous=globalThis.document;
 const row={dataset:{path:'folder',directory:'true'},closest:()=>row};
 globalThis.document={elementFromPoint:()=>row};
 let host={contains:()=>false};
 const dispose=dropTarget(()=>host,()=>({root:'/workspace'}),()=>{});
 try{
  assert.equal(destination(0,0),undefined);
  host={contains:()=>true};
  assert.equal(destination(0,0).dir,'folder');
  host=null;
  assert.equal(destination(0,0),undefined);
 }finally{dispose();globalThis.document=previous;}
});
