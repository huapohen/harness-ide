import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import {Workspace} from '../server/workspace.mjs';import {LocalHistory} from '../server/history.mjs';
test('history persists saved binary versions and restores deleted nested files safely',async()=>{const tmp=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'ide-history-')));try{const root=tmp+'/workspace';await fs.mkdir(root);await fs.mkdir(root+'/nested');const bytes=Buffer.from([0,255,137,80,78,71]);await fs.writeFile(root+'/nested/image.png',bytes);const w=new Workspace(root),history=new LocalHistory(w,tmp+'/history');const old=await history.capture('nested/image.png');await fs.writeFile(root+'/nested/image.png','new');await history.captureTree('nested','Before Delete');await fs.rm(root+'/nested',{recursive:true});const fresh=new LocalHistory(w,tmp+'/history');assert.equal((await fresh.records()).length,2);await fresh.restore(old.id,null);assert.deepEqual(await fs.readFile(root+'/nested/image.png'),bytes);await assert.rejects(fresh.restore(old.id,null),/已变化/);const current=await w.read('nested/image.png');await fresh.restore(old.id,current.version);assert.ok((await fresh.records()).some(r=>r.reason==='Before Restore'));await assert.rejects(fresh.entry('../outside'),/无效/);await fs.writeFile(path.join(fresh.scope,old.hash+'.blob'),'corrupt');await assert.rejects(fresh.entry(old.id),/校验失败/);}finally{await fs.rm(tmp,{recursive:true,force:true});}});
test('empty provided snapshot is backed up exactly without rereading changed disk content',async()=>{
 const tmp=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'ide-history-empty-')));
 try{await fs.writeFile(tmp+'/file.txt','changed later');const history=new LocalHistory(new Workspace(tmp),tmp+'/history');
 const record=await history.capture('file.txt',false,'Opened','');assert.equal(record.size,0);assert.equal((await history.entry(record.id)).data,'');
 }finally{await fs.rm(tmp,{recursive:true,force:true});}
});
test('restore rechecks version after backup, preserving a concurrent new save',async()=>{
 const tmp=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'ide-history-race-')));
 try{const file=tmp+'/file.txt';await fs.writeFile(file,'old');const w=new Workspace(tmp),history=new LocalHistory(w,tmp+'/history');const old=await history.capture('file.txt');await fs.writeFile(file,'current');const {version}=await w.read('file.txt');
 const original=history.capture.bind(history);history.capture=async(...args)=>{const result=await original(...args);if(args[2]==='Before Restore')await fs.writeFile(file,'concurrent save');return result;};
 await assert.rejects(history.restore(old.id,version),/已变化/);assert.equal(await fs.readFile(file,'utf8'),'concurrent save');
 }finally{await fs.rm(tmp,{recursive:true,force:true});}
});
