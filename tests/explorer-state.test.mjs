import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {explorerState} from '../server/explorer-state.mjs';
test('tree expansion survives fresh stores and isolates roots and SSH hosts',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'tree-state-'));try{
 const w={root:'/project'},store=explorerState(directory);
 await store.write(w,{rootExpanded:false,expanded:['a','a/b']});
 assert.deepEqual(await explorerState(directory).read(w),{rootExpanded:false,expanded:['a','a/b']});
 assert.deepEqual((await store.read({...w,host:'remote'})).expanded,[]);
 assert.deepEqual((await store.read({root:'/other'})).expanded,[]);
 await Promise.all([store.write(w,{rootExpanded:true,expanded:['a']}),store.write(w,{rootExpanded:true,expanded:[]})]);
 assert.deepEqual(await explorerState(directory).read(w),{rootExpanded:true,expanded:[]});
 }finally{await fs.rm(directory,{recursive:true});}
});
