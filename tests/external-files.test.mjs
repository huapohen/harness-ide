import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {externalFile} from '../server/external-files.mjs';
test('Save As creates files and prevents overwrite / stale save',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'harness-saveas-'));const p=path.join(dir,'文件.md'),data=Buffer.from('# hello').toString('base64');
 try{await externalFile({action:'write',path:p,data,version:null});await assert.rejects(externalFile({action:'write',path:p,data,version:null}));const old=await externalFile({action:'read',path:p});await fs.writeFile(p,'outside');await assert.rejects(externalFile({action:'write',path:p,data,version:old.version}));assert.equal(await fs.readFile(p,'utf8'),'outside');await assert.rejects(externalFile({action:'read',path:'relative.md'}));}finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('concurrent saves reject stale versions across symlinks and hardlinks',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'harness-save-race-'));const file=path.join(dir,'file.txt'),symlink=path.join(dir,'symlink.txt'),hardlink=path.join(dir,'hardlink.txt');
 try{
  await fs.writeFile(file,'original');await fs.symlink(file,symlink);await fs.link(file,hardlink);
  const {version}=await externalFile({action:'read',path:file});
  const results=await Promise.allSettled([file,symlink,hardlink].map((p,i)=>externalFile({action:'write',path:p,version,data:Buffer.from('save '+i).toString('base64')})));
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.filter(r=>r.status==='rejected').length,2);
  const winner=results.findIndex(r=>r.status==='fulfilled');assert.equal(await fs.readFile(file,'utf8'),'save '+winner);assert.ok((await fs.lstat(symlink)).isSymbolicLink());
  const current=await externalFile({action:'read',path:hardlink});await externalFile({action:'write',path:hardlink,version:current.version,data:Buffer.from('next valid save').toString('base64')});assert.equal(await fs.readFile(file,'utf8'),'next valid save');
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
