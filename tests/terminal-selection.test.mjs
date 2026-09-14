import test from 'node:test';import assert from 'node:assert/strict';import {installSelectionBoundary} from '../src/terminal-selection.js';
test('visible first and last rows do not trigger autoscroll; outside drag still does',()=>{
 const calls=[],selection={startAutoScroll:d=>calls.push(d),stopAutoScroll:()=>calls.push(0)};
 installSelectionBoundary({renderer:{selectionManager:selection}});
 for(const y of [0,10,380,399,400,-1,401])selection.updateAutoScroll(y,400);
 assert.deepEqual(calls,[0,0,0,0,0,-1,1]);
});
