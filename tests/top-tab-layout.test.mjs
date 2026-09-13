import {test} from 'node:test';import assert from 'node:assert/strict';import {topTabLayout} from '../src/top-tab-layout.js';
test('top tabs retain free positions and separate collisions even when overflowing',()=>{
 assert.equal(topTabLayout([{x:300,width:100}],800)[0].left,300);
 const items=topTabLayout([{x:300,width:100},{x:320,width:120},{x:350,width:100}],400);
 for(let i=1;i<items.length;i++)assert.ok(items[i].left>=items[i-1].left+items[i-1].width+4);
});
test('left right and centered groups preserve spacing',()=>{
 const items=[{x:250,width:100},{x:400,width:100}];
 assert.deepEqual(topTabLayout(items,600,4,'left').map(x=>x.left),[0,104]);
 assert.deepEqual(topTabLayout(items,600,4,'right').map(x=>x.left),[396,500]);
 assert.deepEqual(topTabLayout(items,600,4,'center').map(x=>x.left),[198,302]);
});
