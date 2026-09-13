import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {Workspace} from '../server/workspace.mjs';
import {linkedWorkspace,linkedPath} from '../server/linked-workspace.mjs';
test('external directory links expand and linked files read/write; broken links remain visible',async()=>{
 const base=await fs.mkdtemp(path.join(os.tmpdir(),'harness-links-'));
 try{
 const root=path.join(base,'root'),target=path.join(base,'target');await fs.mkdir(root);await fs.mkdir(target);
 await fs.writeFile(path.join(target,'a.txt'),'before');await fs.symlink(target,path.join(root,'link'));await fs.symlink('missing',path.join(root,'broken'));await fs.symlink('loop',path.join(root,'loop'));
 const w=linkedWorkspace(new Workspace(root)),entries=await w.list();
 assert.equal(entries.find(e=>e.name==='link').directory,true);assert.equal(entries.find(e=>e.name==='link').symbolicLink,true);
 assert.equal(entries.find(e=>e.name==='broken').broken,true);assert.equal(entries.find(e=>e.name==='loop').broken,true);
 assert.equal((await w.list('link'))[0].name,'a.txt');
 const old=await w.read('link/a.txt');await w.write('link/a.txt',Buffer.from('after').toString('base64'),old.version);
 assert.equal(await fs.readFile(path.join(target,'a.txt'),'utf8'),'after');
 await assert.rejects(w.list('../target'),/outside/);
 // Rename/trash must operate on the link, never its target.
 await fs.rename(await linkedPath(root,'link'),path.join(root,'renamed'));
 assert.equal((await fs.lstat(path.join(root,'renamed'))).isSymbolicLink(),true);
 assert.equal(await fs.readFile(path.join(target,'a.txt'),'utf8'),'after');
 }finally{await fs.rm(base,{recursive:true});}
});
