import test from 'node:test';import assert from 'node:assert/strict';
import {positionKey,clampSelection,documentPositions} from '../src/document-position.js';
test('closed document positions persist independently across workspaces',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
 const key=positionKey({root:'/a'},'150/input/2.txt'),state={selection:{ranges:[{anchor:123,head:123}],main:0},scrollTop:900};
 documentPositions(storage).set(key,state);assert.deepEqual(documentPositions(storage).get(key),state);
 assert.equal(documentPositions(storage).get(positionKey({root:'/b'},'150/input/2.txt')),undefined);
});
test('externally shortened documents clamp old cursor and selection safely',()=>{
 assert.deepEqual(clampSelection({ranges:[{anchor:100,head:120}],main:0},50),{ranges:[{anchor:50,head:50}],main:0});
});
