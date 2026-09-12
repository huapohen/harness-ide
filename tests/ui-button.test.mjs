import test from 'node:test';
import assert from 'node:assert/strict';
import {button} from '../src/ui.js';

test('button executes its action in the click stack and handles failures', async()=>{
 const previous=globalThis.document,debug=console.debug,errors=[];
 globalThis.document={createElement:()=>({setAttribute(){}})};
 console.debug=(...args)=>errors.push(args);
 try{
  let invoked=false;
  button('New','New',()=>{invoked=true;}).onclick();
  assert.equal(invoked,true,'native-sensitive actions must retain the click activation');
  assert.doesNotThrow(()=>button('Fail','Fail',()=>{throw Error('sync');}).onclick());
  button('Fail','Fail',()=>Promise.reject(Error('async'))).onclick();
  await Promise.resolve();
  assert.deepEqual(errors.map(x=>x[1]),['sync','async']);
 }finally{globalThis.document=previous;console.debug=debug;}
});
