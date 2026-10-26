import test from 'node:test';import assert from 'node:assert/strict';
import {transferPlan,copySelection,pasteSelection,hasFileClipboard} from '../src/explorer-transfer.js';
test('batch includes all independent selections and deduplicates descendants',()=>{assert.deepEqual(transferPlan(['a','b','a/child'],'dest',[],true,true),[{path:'a',destination:'dest/a'},{path:'b',destination:'dest/b'}]);});
test('conflicts and self-descendant destinations rejected before execution',()=>{assert.throws(()=>transferPlan(['a','b'],'dest',[{name:'b'}],true,true));assert.throws(()=>transferPlan(['a'],'a/child',[],true,true));assert.throws(()=>transferPlan(['x/a','y/a'],'dest',[],true,true));});
test('shared clipboard handles multi-file cuts and refuses changed source roots',async()=>{let identity='one',received;const source={identity:()=>identity,transfer:async paths=>{received=paths;}};copySelection(['a','b'],true,source);await pasteSelection({});assert.deepEqual(received,['a','b']);assert.equal(hasFileClipboard(),false);copySelection(['c'],false,source);identity='two';await assert.rejects(pasteSelection({}),/源目录/);});
test('same-directory copies use copy suffix before extension and skip occupied names',()=>{
 assert.deepEqual(transferPlan(['AGENTS.md'],'.',[{name:'AGENTS.md'},{name:'AGENTS copy.md'},{name:'AGENTS copy 2.md'}],true,false),[{path:'AGENTS.md',destination:'AGENTS copy 3.md'}]);
 assert.deepEqual(transferPlan(['dir/a copy.md'],'dir',[{name:'a copy.md'}],true,false),[{path:'dir/a copy.md',destination:'dir/a copy 2.md'}]);
});
test('same-directory folder and dotfile copies preserve full names; cut stays a no-op',()=>{
 assert.deepEqual(transferPlan(['folder.v1','.env'],'.',[{name:'folder.v1',directory:true},{name:'.env'}],true,false),[{path:'folder.v1',destination:'folder.v1 copy'},{path:'.env',destination:'.env copy'}]);
 assert.deepEqual(transferPlan(['a'],'.',[{name:'a'}],true,true),[]);
 assert.throws(()=>transferPlan(['a'],'a/child',[],true,false));
});
test('batch duplicate copies reserve generated names',()=>{
 assert.deepEqual(transferPlan(['a.txt','a copy.txt'],'.',[{name:'a.txt'},{name:'a copy.txt'}],true,false),[{path:'a.txt',destination:'a copy 2.txt'},{path:'a copy.txt',destination:'a copy 3.txt'}]);
});
