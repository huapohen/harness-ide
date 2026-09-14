import test from 'node:test';import assert from 'node:assert/strict';
import {stickyAncestorRows} from '../src/explorer-sticky.js';
const branch=(name,top,bottom,children=[])=>{const row={dataset:{path:name},getBoundingClientRect:()=>({top}),getAttribute:()=> 'true',nextElementSibling:{children}};return {classList:{contains:()=>true},firstElementChild:row,getBoundingClientRect:()=>({bottom})};};
test('sticky ancestors exclude completed siblings and switch to the current branch',()=>{
 const old=branch('old',-200,0),current=branch('current',-10,300,[branch('child',0,250)]);
 assert.deepEqual(stickyAncestorRows({children:[old,current]},22).map(r=>r.dataset.path),['current','child']);
 assert.deepEqual(stickyAncestorRows({children:[branch('old',-100,20),branch('next',30,400)]},22),[]);
});
