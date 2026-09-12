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
 await fs.symlink(os.tmpdir(),path.join(root,'outside'));await assert.rejects(fileAction(w,{action:'create',path:'outside/escape'}));
 await assert.rejects(fileAction(w,{action:'delete',path:'.'}));
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
