import test from 'node:test';import assert from 'node:assert/strict';
import {retargetMovedTabs} from '../src/explorer-move-tabs.js';
test('moving pinned dirty files updates paths without closing or changing buffers',()=>{
 const calls=[],tabs=['a.md','a.srt','a.txt'].map(path=>({path,pinned:true,dirty:true,acceptRename:(...args)=>calls.push(args)}));
 for(const t of tabs)retargetMovedTabs(tabs,{root:'/work'},{root:'/work'},{root:'/work'},t.path,'dest/'+t.path);
 assert.deepEqual(calls.map(x=>x[0]),['dest/a.md','dest/a.srt','dest/a.txt']);assert.ok(tabs.every(t=>t.pinned&&t.dirty));
});
test('folder move includes external buffers and excludes different remote workspaces',()=>{
 const calls=[],tabs=[{path:'/work/folder/a',external:true,acceptRename:(...a)=>calls.push(a)},{path:'other',acceptRename:()=>assert.fail()}];
 retargetMovedTabs(tabs,{root:'/work'},{root:'/work'},{root:'/other'},'folder','folder');assert.deepEqual(calls,[['/other/folder/a','a',true]]);
});
