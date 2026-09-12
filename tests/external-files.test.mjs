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
