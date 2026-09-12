import test from 'node:test';
import assert from 'node:assert/strict';
import {Kernel} from '../src/kernel.js';
test('failed plugin replacement rolls back service and event handlers exactly once',async()=>{
 const k=new Kernel();let events=0;
 const old={id:'replaceable',activate(ctx){ctx.provide('value',42);ctx.on('test',()=>events++);}};
 await k.mount(old);await assert.rejects(k.replace({id:'replaceable',activate(ctx){ctx.provide('value',0);throw Error('bad update');}}));
 assert.equal(k.get('value'),42);k.emit('test');assert.equal(events,1);
 await k.replace({id:'replaceable',activate(ctx){ctx.provide('value',99);ctx.on('test',()=>events+=10);}});
 assert.equal(k.get('value'),99);k.emit('test');assert.equal(events,11);await k.dispose();assert.equal(k.services.size,0);
});
