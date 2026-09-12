import {HotUpdates} from './hot-updates.mjs';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes} from 'node:crypto';
import {Kernel} from '../src/kernel.js';
import config from './plugins.config.mjs';
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

const token=process.env.HARNESS_TOKEN || randomBytes(32).toString('hex');
const routes=new Map(),upgrades=new Map();
const kernel=new Kernel();
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.svg':'image/svg+xml','.pdf':'application/pdf'};
const hot=await new HotUpdates(base,kernel).init();routes.set('hot/status',()=>hot.status());
let origin;
const server=http.createServer(async(req,res)=>{
 try {
  if(req.headers.host!==new URL(origin).host) {res.writeHead(403).end();return;}
  const url=new URL(req.url,origin);
  if(url.pathname.startsWith('/api/')) {
   if(req.headers.authorization!==`Bearer ${token}` || (req.headers.origin && req.headers.origin!==origin)) {res.writeHead(403).end();return;}
   if(req.method!=='POST') {res.writeHead(405).end();return;}
   let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>24*1024*1024)throw new Error('Request too large');}
   const q=JSON.parse(raw || '{}');let result;
   const handler=routes.get(url.pathname.slice(5));
   if(!handler){res.writeHead(404).end();return;}
   result=await handler(q);
   res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify(result));return;
  }
  if(url.pathname==='/hot-guard.js'){res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'}).end(await fs.readFile(path.join(base,'server/hot-guard.js')));return;}
  const hotFile=await hot.resolve(url);if(hotFile){let bytes=await fs.readFile(hotFile.file);if(hotFile.file.endsWith('index.html'))bytes=Buffer.from(bytes.toString().replaceAll('/assets/','/__hot/'+hotFile.version+'/assets/').replace('<head>','<head><script src="/hot-guard.js"></script>'));res.writeHead(200,{'Content-Type':mime[path.extname(hotFile.file)]||'application/octet-stream','Cache-Control':'no-store'}).end(bytes);return;}
  const rel=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1));const file=path.resolve(hot.initial||path.join(base,'dist'),rel);
  if(!file.startsWith((hot.initial||path.join(base,'dist'))+path.sep))throw new Error('Invalid path');
  const bytes=await fs.readFile(file);
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; frame-src blob:; connect-src 'self'; object-src blob:; font-src 'self' data:"}).end(bytes);
 }catch(e){res.writeHead(400,{'Content-Type':'application/json'}).end(JSON.stringify({error:e.message}));}
});
server.on('upgrade',(req,socket,head)=>{
 const url=new URL(req.url,origin);const handler=upgrades.get(url.pathname);
 if(req.headers.origin!==origin || req.headers.host!==new URL(origin).host || url.searchParams.get('token')!==token || !handler){socket.destroy();return;}
 handler(req,socket,head);
});
await kernel.mount({id:'transport',activate(ctx){
 ctx.provide('routes',{register(name,fn){if(routes.has(name))throw new Error('Duplicate route');routes.set(name,fn);return()=>routes.delete(name);}});
 ctx.provide('transport',{upgrade(name,fn){upgrades.set(name,fn);return()=>upgrades.delete(name);}});
}});
for(const entry of config){if(entry.enabled===false)continue;await kernel.mount((await import(`./plugins/${entry.id}.mjs`)).default,{base,...entry.config});}
server.listen(Number(process.env.PORT || 0),'127.0.0.1',()=>{origin=`http://127.0.0.1:${server.address().port}`;console.log(`${origin}/#${token}`);});
async function stop(){await kernel.dispose();server.close(()=>process.exit());setTimeout(()=>process.exit(),1000).unref();}
process.on('SIGTERM',stop);process.on('SIGINT',stop);
if(process.env.HARNESS_PARENT) setInterval(()=>{try{process.kill(Number(process.env.HARNESS_PARENT),0);}catch{stop();}},2000).unref();
