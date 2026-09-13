import fs from 'node:fs/promises';
import {linkedWorkspace} from '../linked-workspace.mjs';
import path from 'node:path';
import {exec,Workspace} from '../workspace.mjs';
export default {id:'git',requires:['routes','workspace'],activate(ctx){
 const primary=ctx.get('workspace'),reads=new Map();ctx.effect(()=>{for(const c of reads.values())c.abort();reads.clear();});
 ctx.effect(ctx.get('routes').register('git',async q=>{
  const key=typeof q.channel==='string'?q.channel.slice(0,100):null;
  if(q.action==='cancel'){reads.get(key)?.abort();reads.delete(key);return {};}
  const controller=key&&['repositories','status','branches','diff','staged'].includes(q.action)?new AbortController():null;
  if(controller){reads.get(key)?.abort();reads.set(key,controller);}
  try{
  if(q.sourceRoot!==undefined&&(typeof q.sourceRoot!=='string'||!q.sourceRoot.trim()))throw Error('Invalid scan directory');
  let w=q.sourceRoot&&q.sourceRoot!=='.'?new Workspace(path.resolve(primary.root,q.sourceRoot)):primary;if(w!==primary){w.host=primary.host;if(!w.host)w.root=await fs.realpath(w.root);}w=linkedWorkspace(w);
  const run=async args=>{controller?.signal.throwIfAborted();if(!w.host&&controller)return {output:(await exec('git',['-C',w.root,...args],{signal:controller.signal,maxBuffer:4*1024*1024,timeout:15000})).stdout};return w.git(args);};
  const depth=q.depth??2;if(!Number.isInteger(depth)||depth<0||depth>10)throw Error('Depth must be 0–10');
  if(q.repo!==undefined&&(typeof q.repo!=='string'||q.repo.startsWith('/')||q.repo.split('/').includes('..')))throw Error('Invalid repository path');
  const git=args=>run(q.repo&&q.repo!=='.'?['-C',q.repo,...args]:args);
  if(q.action==='repositories'){const repos=[],seen=new Set();let visited=0;async function scan(dir,level){controller?.signal.throwIfAborted();if(++visited>10000)throw Error('Scan exceeded 10000 directories; reduce depth or narrow the directory');try{const root=(await run(['-C',dir,'rev-parse','--show-toplevel'])).output.trim();if(!seen.has(root)){seen.add(root);repos.push({path:dir,root});}}catch{}if(level<depth)for(const entry of await w.list(dir)){if(entry.directory&&!['.git','node_modules','.venv','venv'].includes(entry.name))await scan(dir==='.'?entry.name:dir+'/'+entry.name,level+1);}}await scan('.',0);return {repositories:repos};}
  const probe=async()=>{try{return (await git(['rev-parse','--show-toplevel'])).output.trim();}catch(e){if(/not a git repository/i.test(e.message))return null;throw e;}};
  if(q.action==='init')return await git(['init']);
  const root=await probe();if(!root){if(q.action==='status')return {repository:false};throw Error('Open a Git repository first.');}
  if(q.action==='status'){
   const output=(await git(['status','--porcelain=v1','-z'])).output,parts=output.split('\0'),files=[];
   for(let i=0;i<parts.length;i++){const entry=parts[i];if(!entry)continue;const x=entry[0],y=entry[1],path=entry.slice(3);let original;if(x==='R'||x==='C'||y==='R'||y==='C')original=parts[++i];files.push({x,y,path,original});}
   let branch;try{branch=(await git(['symbolic-ref','--short','HEAD'])).output.trim();}catch{branch=(await git(['rev-parse','--short','HEAD'])).output.trim();}
   return {repository:true,root,branch,files};
  }
  if(q.action==='branches')return {branches:(await git(['for-each-ref','--format=%(refname:short)','refs/heads'])).output.trim().split('\n').filter(Boolean)};
  if(q.action==='switch'||q.action==='createBranch'){if(typeof q.branch!=='string'||!q.branch||q.branch.startsWith('-'))throw Error('Invalid branch');await git(['check-ref-format','--branch',q.branch]);return await git(q.action==='createBranch'?['switch','-c',q.branch]:['switch',q.branch]);}
  if(q.action==='pull')return await git(['pull','--ff-only']);
  if(q.action==='push')return await git(['push']);
  if(q.path!==undefined&&(typeof q.path!=='string'||q.path.startsWith('/')||q.path.split('/').includes('..')))throw Error('Invalid path');
  const actions={diff:['diff','--no-ext-diff'],staged:['diff','--cached','--no-ext-diff'],stage:['add','--',q.path||'.'],unstage:['reset','--',q.path||'.'],commit:['commit','-m',q.message]};
  if(!actions[q.action])throw Error('Unknown Git action');if(q.action==='commit'&&(!q.message?.trim()||q.message.length>4000))throw Error('Commit message required');
  if(['diff','staged'].includes(q.action)&&q.path)actions[q.action].push('--',q.path);
  return await git(actions[q.action]);
  }finally{if(controller&&reads.get(key)===controller)reads.delete(key);}
 }));
}};
