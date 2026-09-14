import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {Workspace} from '../server/workspace.mjs';
import {fileAction} from '../server/file-actions.mjs';
test('Explorer create copy rename rejects overwrite and path escape',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'harness-files-'));const w=new Workspace(await fs.realpath(root));
 try{
 await fileAction(w,{action:'create',path:'file.md'});await fs.writeFile(path.join(root,'file.md'),'content');
 await fileAction(w,{action:'copy',path:'file.md',destination:'copy.md'});assert.equal(await fs.readFile(path.join(root,'copy.md'),'utf8'),'content');
 await assert.rejects(fileAction(w,{action:'rename',path:'file.md',destination:'copy.md'}));
 await fileAction(w,{action:'rename',path:'copy.md',destination:'renamed.md'});
 await assert.rejects(fileAction(w,{action:'create',path:'../escape'}));
 const linked=await fs.mkdtemp(path.join(os.tmpdir(),'harness-linked-create-'));try{await fs.symlink(linked,path.join(root,'outside'));await fileAction(w,{action:'create',path:'outside/created'});assert.equal((await fs.stat(path.join(linked,'created'))).isFile(),true);}finally{await fs.rm(linked,{recursive:true});}
 await assert.rejects(fileAction(w,{action:'delete',path:'.'}));
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('cross-root move preserves content and refuses existing destination',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'harness-cross-move-'));
 try{const a=root+'/a',b=root+'/b';await fs.mkdir(a);await fs.mkdir(b);await fs.writeFile(a+'/probe','source');await fs.writeFile(b+'/probe','existing');const w=new Workspace(a);await assert.rejects(fileAction(w,{action:'move',path:'probe',destinationRoot:b,destination:'probe'}),/已存在/);assert.equal(await fs.readFile(a+'/probe','utf8'),'source');assert.equal(await fs.readFile(b+'/probe','utf8'),'existing');await fileAction(w,{action:'move',path:'probe',destinationRoot:b,destination:'moved'});assert.equal(await fs.readFile(b+'/moved','utf8'),'source');await assert.rejects(fs.stat(a+'/probe'),{code:'ENOENT'});}finally{await fs.rm(root,{recursive:true,force:true});}
});
