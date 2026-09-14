import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {openOffice} from '../server/office-open.mjs';
test('Office system open passes a local filename as one argument and rejects other formats',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'office-open-test-'));try{const file='test name.pptx';await fs.writeFile(path.join(root,file),'test');let args;await openOffice({root},{path:file},async(...a)=>{args=a;});assert.deepEqual(args,['/usr/bin/open',[path.join(root,file)]]);await assert.rejects(openOffice({root},{path:'script.sh'}),/Unsupported/);await assert.rejects(openOffice({root,host:'remote'},{path:file}),/本地/);}finally{await fs.rm(root,{recursive:true});}
});
