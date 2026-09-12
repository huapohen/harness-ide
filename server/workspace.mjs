import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
export const exec = promisify(execFile);
export const quote = s => "'" + String(s).replaceAll("'", "'\\''") + "'";
export function validateHost(host) { if(!/^[a-zA-Z0-9_][a-zA-Z0-9_.@-]{0,200}$/.test(host)) throw new Error('Use an SSH config alias or user@host'); return host; }
export async function safePath(root, rel='.') {
  if(typeof rel !== 'string' || path.isAbsolute(rel)) throw new Error('Relative path required');
  const full=path.resolve(root,rel); if(full!==root && !full.startsWith(root+path.sep)) throw new Error('Path outside workspace');
  const real=await fs.realpath(full); if(real!==root && !real.startsWith(root+path.sep)) throw new Error('Symlink outside workspace'); return real;
}
const remoteScript = `import sys,json,os,base64,subprocess,hashlib,shutil,uuid
q=json.load(sys.stdin)
root=os.path.realpath(os.path.expanduser(q['root']))
p=os.path.realpath(os.path.join(root,q.get('path','.')))
if os.path.commonpath([root,p])!=root: raise Exception('Path outside workspace')
op=q['op']
if op=='info':
 if not os.path.isdir(root): raise Exception('Directory does not exist')
 out={'root':root}
elif op=='list':
 out=[{'name':e.name,'directory':e.is_dir(follow_symlinks=False)} for e in os.scandir(p) if e.name not in ['.git','node_modules','.DS_Store']]
elif op=='read':
 if os.path.getsize(p)>16*1024*1024: raise Exception('File exceeds 16 MB')
 data=open(p,'rb').read(); out={'data':base64.b64encode(data).decode(),'version':hashlib.sha256(data).hexdigest()}
elif op=='write':
 old=open(p,'rb').read()
 if hashlib.sha256(old).hexdigest()!=q['version']: raise Exception('File changed on disk; reopen before saving')
 data=base64.b64decode(q['data']); open(p,'wb').write(data); out={'version':hashlib.sha256(data).hexdigest()}
elif op=='manage':
 action=q['action']; out={}
 if action=='absolute': out={'path':p}
 elif action in ['timeline','compare']:
  args=['git','-C',root,'log','-30','--date=iso','--format=%h %ad %s','--',q['path']]
  if action=='compare':
   other=os.path.realpath(os.path.join(root,q['other']))
   if os.path.commonpath([root,other])!=root: raise Exception('Path outside workspace')
   args=['git','diff','--no-index','--',other,p]
  r=subprocess.run(args,capture_output=True)
  if r.returncode not in ([0,1] if action=='compare' else [0]): raise Exception(r.stderr.decode())
  out={'output':r.stdout.decode()}
 elif action=='create':
  if os.path.exists(p): raise Exception('目标已存在')
  if q.get('directory'): os.mkdir(p)
  else: open(p,'xb').close()
 elif action in ['rename','copy','move']:
  dest=os.path.realpath(os.path.join(root,q['destination']))
  if p==root or os.path.commonpath([root,dest])!=root or dest.startswith(p+os.sep): raise Exception('Invalid destination')
  if os.path.lexists(dest): raise Exception('目标已存在')
  if action=='copy':
   if os.path.isdir(p): shutil.copytree(p,dest,symlinks=True)
   else: shutil.copy2(p,dest)
  else: os.rename(p,dest)
 elif action=='delete':
  if p==root: raise Exception('Cannot delete workspace')
  trash=os.path.join(root,'.harness-trash');os.makedirs(trash,exist_ok=True)
  os.rename(p,os.path.join(trash,os.path.basename(p)+'-'+str(uuid.uuid4())))
 else: raise Exception('Action unavailable remotely')
elif op=='git':
 r=subprocess.run(['git','-C',root]+q['args'],capture_output=True)
 if r.returncode: raise Exception(r.stderr.decode())
 out={'output':r.stdout.decode()}
print(json.dumps(out))`;
export class Workspace {
  constructor(root) { this.root=root; this.host=null; }
  async remote(query, host=this.host, root=this.root) {
    const child = execFile('ssh',['-o','BatchMode=yes','-o','ConnectTimeout=8','--',validateHost(host),`python3 -c ${quote(remoteScript)}`],{timeout:20000,maxBuffer:24*1024*1024});
    child.stdin.end(JSON.stringify({...query,root}));
    return await new Promise((resolve,reject)=>{let out='',err='';child.stdout.on('data',d=>out+=d);child.stderr.on('data',d=>err+=d);child.on('error',reject);child.on('close',code=>{try {if(code) throw new Error(err || 'SSH failed');resolve(JSON.parse(out));}catch(e){reject(e);}});});
  }
  async connect(root,host) {
    if(host) { const data=await this.remote({op:'info'},host,root); this.root=data.root;this.host=host; }
    else {const real=await fs.realpath(root);if(!(await fs.stat(real)).isDirectory()) throw new Error('Not a directory');this.root=real;this.host=null;}
    return this.info();
  }
  info() {return {root:this.root,host:this.host,name:path.basename(this.root)};}
  async list(rel='.') { if(this.host)return this.remote({op:'list',path:rel}); const p=await safePath(this.root,rel);return (await fs.readdir(p,{withFileTypes:true})).filter(e=>!['.git','node_modules','.DS_Store'].includes(e.name)).map(e=>({name:e.name,directory:e.isDirectory()})); }
  async read(rel) {if(this.host)return this.remote({op:'read',path:rel}); const p=await safePath(this.root,rel);if((await fs.stat(p)).size>16*1024*1024)throw new Error('File exceeds 16 MB');const data=await fs.readFile(p);return {data:data.toString('base64'),version:hash(data)};}
  async write(rel,data,version) {if(this.host)return this.remote({op:'write',path:rel,data,version});const p=await safePath(this.root,rel);if(hash(await fs.readFile(p))!==version)throw new Error('File changed on disk; reopen before saving');const bytes=Buffer.from(data,'base64');await fs.writeFile(p,bytes);return {version:hash(bytes)};}
  async git(args) {if(this.host)return this.remote({op:'git',args});return {output:(await exec('git',['-C',this.root,...args],{maxBuffer:4*1024*1024,timeout:15000})).stdout};}
}
import {createHash} from 'node:crypto';
const hash = data=>createHash('sha256').update(data).digest('hex');
