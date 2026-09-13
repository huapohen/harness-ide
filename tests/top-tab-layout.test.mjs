import {test} from 'node:test';import assert from 'node:assert/strict';import {topTabLayout} from '../src/top-tab-layout.js';
test('top tabs retain free positions and separate collisions even when overflowing',()=>{
 assert.equal(topTabLayout([{x:300,width:100}],800)[0].left,300);
 const items=topTabLayout([{x:300,width:100},{x:320,width:120},{x:350,width:100}],400);
 for(let i=1;i<items.length;i++)assert.ok(items[i].left>=items[i-1].left+items[i-1].width+4);
});
