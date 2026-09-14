import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import settings from '../server/plugins/settings.mjs';
test('hidden activity icons survive settings reload and unrelated layout writes',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'harness-activity-')),previous=process.env.HARNESS_SETTINGS_DIR;
 process.env.HARNESS_SETTINGS_DIR=dir;
 const mount=async()=>{const routes=new Map();await settings.activate({get:()=>({register:(name,fn)=>{routes.set(name,fn);return()=>{};}}),effect(){}});return routes;};
 try{
  let routes=await mount();await routes.get('settings/layout/write')({hiddenPanels:['git','remote','plugins']});
  routes=await mount();assert.deepEqual((await routes.get('settings/layout/read')()).hiddenPanels,['git','remote','plugins']);
  await routes.get('settings/layout/write')({topTabAlignment:'left'});assert.deepEqual((await routes.get('settings/layout/read')()).hiddenPanels,['git','remote','plugins']);
  await routes.get('settings/layout/write')({hiddenPanels:[]});routes=await mount();assert.deepEqual((await routes.get('settings/layout/read')()).hiddenPanels,[]);
 }finally{if(previous===undefined)delete process.env.HARNESS_SETTINGS_DIR;else process.env.HARNESS_SETTINGS_DIR=previous;await fs.rm(dir,{recursive:true,force:true});}
});
