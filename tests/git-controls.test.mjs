import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import plugin from '../server/plugins/git.mjs';import {Workspace,exec} from '../server/workspace.mjs';
test('Git scan depth and independent directory, branch creation and switching',async()=>{
 const tmp=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'harness-git-controls-')));try{
 const primary=new Workspace(tmp);const repo=path.join(tmp,'one','two');await fs.mkdir(repo,{recursive:true});await exec('git',['init','-b','main',repo]);await exec('git',['-C',repo,'-c','user.name=Test','-c','user.email=test@example.invalid','commit','--allow-empty','-m','Initial']);
 let route;plugin.activate({get:k=>k==='workspace'?primary:{register:(name,fn)=>{route=fn;return()=>{};}},effect(){}});
 assert.equal((await route({action:'repositories',depth:1})).repositories.length,0);
 assert.equal((await route({action:'repositories',depth:2})).repositories.length,1);
 assert.equal((await route({action:'repositories',sourceRoot:repo,depth:0})).repositories.length,1);assert.equal(primary.root,tmp);
 await route({action:'createBranch',sourceRoot:repo,branch:'feature/example'});assert.equal((await route({action:'status',sourceRoot:repo})).branch,'feature/example');
 await route({action:'switch',sourceRoot:repo,branch:'main'});assert.ok((await route({action:'branches',sourceRoot:repo})).branches.includes('feature/example'));
 await assert.rejects(route({action:'createBranch',sourceRoot:repo,branch:'--bad'}),/Invalid/);await assert.rejects(route({action:'repositories',depth:-1}),/Depth/);
 }finally{await fs.rm(tmp,{recursive:true,force:true});}
});
