import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {Workspace} from '../server/workspace.mjs';import {rightExplorer} from '../server/right-explorer.mjs';import {explorerState} from '../server/explorer-state.mjs';
test('right Explorer root and filesystem actions do not change primary workspace',async()=>{
 const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'harness-right-tree-'));try{const left=tmp+'/left',right=tmp+'/right';await fs.mkdir(left);await fs.mkdir(right);await fs.writeFile(left+'/only-left','left');await fs.writeFile(right+'/only-right','right');await fs.symlink(left,right+'/linked');const primary=new Workspace(left);
 const info=await rightExplorer({root:right,action:'info'},primary);assert.equal(info.root,await fs.realpath(right));assert.equal(primary.root,left);
 const entries=await rightExplorer({root:right,action:'list'},primary);assert.ok(entries.some(e=>e.name==='linked'&&e.directory&&e.symbolicLink));assert.ok(!entries.some(e=>e.name==='only-left'));
 assert.equal((await rightExplorer({root:right,action:'list',path:'linked'},primary))[0].name,'only-left');
 await rightExplorer({root:right,action:'manage',operation:'create',path:'new.txt'},primary);assert.equal(await fs.readFile(right+'/new.txt','utf8'),'');await assert.rejects(fs.stat(left+'/new.txt'));assert.equal(primary.root,left);
 await assert.rejects(rightExplorer({root:right,action:'list',path:'..'},primary),/outside/);await assert.rejects(rightExplorer({root:'relative',action:'info'},primary),/绝对路径/);
 }finally{await fs.rm(tmp,{recursive:true,force:true});}
});
test('separate state stores retain selected row and scroll without changing left state',async()=>{
 const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'harness-right-state-'));try{const left=explorerState(tmp+'/left'),right=explorerState(tmp+'/right'),workspace={root:'/test'};
 await left.write(workspace,{expanded:['left'],rootExpanded:true});await right.write(workspace,{expanded:['right'],rootExpanded:false,selected:'right/a',scrollTop:210});
 assert.deepEqual((await left.read(workspace)).expanded,['left']);const saved=await explorerState(tmp+'/right').read(workspace);assert.equal(saved.selected,'right/a');assert.equal(saved.scrollTop,210);assert.equal(saved.rootExpanded,false);
 }finally{await fs.rm(tmp,{recursive:true,force:true});}
});
