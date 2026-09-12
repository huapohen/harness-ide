import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {Kernel} from '../src/kernel.js';
import {Workspace,safePath,validateHost,exec} from '../server/workspace.mjs';
test('plugin rollback, dependency protection and cleanup',async()=>{
 const k=new Kernel();let hits=0;
 await k.mount({id:'a',activate(c){c.provide('a',1);c.on('event',()=>hits++);}});
 await k.mount({id:'b',requires:['a'],activate(c){c.provide('b',2);}});
 await assert.rejects(k.unmount('a'),/depends/);k.emit('event');assert.equal(hits,1);
 await assert.rejects(k.mount({id:'bad',activate(c){c.provide('bad',1);throw new Error('failure');}}));assert.equal(k.services.has('bad'),false);
 await k.dispose();k.emit('event');assert.equal(hits,1);assert.equal(k.services.size,0);
});
test('filesystem boundary, save conflicts, Git operations',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'harness-test-'));const root=await fs.realpath(dir);const w=new Workspace(root);
 try{
 await fs.writeFile(path.join(root,'notes.md'),'hello');
 await fs.symlink('/etc',path.join(root,'escape'));
 await assert.rejects(safePath(root,'../outside'));await assert.rejects(safePath(root,'escape/passwd'));assert.throws(()=>validateHost('-oProxyCommand=evil'));
 const file=await w.read('notes.md');await w.write('notes.md',Buffer.from('updated').toString('base64'),file.version);await assert.rejects(w.write('notes.md',file.data,file.version),/changed/);
 await exec('git',['init',root]);await exec('git',['-C',root,'config','user.email','test@example.invalid']);await exec('git',['-C',root,'config','user.name','Harness Test']);
 await w.git(['add','--','notes.md']);await w.git(['commit','-m','fixture']);await fs.writeFile(path.join(root,'notes.md'),'changed');assert.match((await w.git(['diff','--no-ext-diff'])).output,/changed/);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('SSH adapter protocol with quoted paths (local SSH transport fixture)',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),"harness-ssh-'"));const bin=path.join(dir,'bin');await fs.mkdir(bin);
 await fs.writeFile(path.join(bin,'ssh'),'#!/bin/sh\nfor arg do last="$arg"; done\nexec /bin/sh -c "$last"\n',{mode:0o755});
 const before=process.env.PATH;process.env.PATH=bin+':'+before;
 try{const w=new Workspace(dir);await fs.writeFile(path.join(dir,'远程.md'),'remote');await w.connect(dir,'test-fixture');const original=await w.read('远程.md');assert.equal(Buffer.from(original.data,'base64').toString(),'remote');await w.write('远程.md',Buffer.from('new').toString('base64'),original.version);await assert.rejects(w.write('远程.md',original.data,original.version),/changed/);await assert.rejects(w.read('../outside'),/outside workspace/);assert.ok((await w.list()).some(e=>e.name==='远程.md'));}
 finally{process.env.PATH=before;await fs.rm(dir,{recursive:true,force:true});}
});
