import {randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import fs from 'node:fs/promises';
const exec=promisify(execFile);
import {WebSocketServer} from 'ws';
import pty from 'node-pty';
import path from 'node:path';
import {quote} from '../workspace.mjs';
import {checkProcessState} from '../terminal-state.mjs';
import {prepareShell,markerFilter} from '../shell-integration.mjs';
export default {id:'terminal',requires:['transport','workspace'],activate(ctx){
 const workspace=ctx.get('workspace'),sessions=new Set(),resumable=new Map();
 const wss=new WebSocketServer({noServer:true,maxPayload:1024*1024});
 ctx.effect(ctx.get('transport').upgrade('/terminal',(req,socket,head)=>{if(sessions.size>=16&&!new URL(req.url,'http://localhost').searchParams.has('resume')){socket.destroy();return;}wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));}));
 wss.on('connection',async (ws,req)=>{
  const resume=new URL(req.url,'http://localhost').searchParams.get('resume');
  if(resume){const attach=resumable.get(resume);if(attach){attach(ws);return;}ws.send(JSON.stringify({type:'error',message:'Terminal resume session unavailable'}));ws.close();return;}

  sessions.add(ws);let terminal,integration,exited=false,checking=false,closing=false,lastSubmit=0,shellState='unknown';
  let queuedInput='',detached=false,expiry;const resumeId=randomUUID(),output=[];let outputBytes=0;const maxReplay=16*1024*1024;let replayOverflow=false;
  const remote=workspace.host,root=workspace.root,shell=process.env.SHELL||'/bin/zsh';
  const send=m=>{if(m.type==='data'){output.push(m.data);outputBytes+=Buffer.byteLength(m.data);while(outputBytes>maxReplay&&output.length){outputBytes-=Buffer.byteLength(output.shift());replayOverflow=true;}}if(ws.readyState===1)ws.send(JSON.stringify(m));};
  const state=async()=>{
   if(exited)return {busy:false,reason:'已退出'};
   if(!terminal)return {busy:true,reason:'终端正在启动'};
   if(remote)return {busy:true,reason:'无法可靠确认远端任务状态，请先在远端 Shell 输入 exit 或 Control+D'};
   const processes=await checkProcessState(terminal.pid,path.basename(shell));
   if(processes.busy)return processes;
   if(!integration?.token)return {busy:true,reason:'此 Shell 未提供任务状态，请使用 exit 或 Control+D 退出'};
   if(integration?.token&&shellState!=='idle')return {busy:true,reason:shellState==='busy'?'命令尚未结束':'等待 Shell 提示符'};
   if(Date.now()-lastSubmit<350)return {busy:true,reason:'正在确认刚提交的命令'};
   return processes;
  };
  const timer=setInterval(async()=>{if(checking||exited||ws.readyState!==1)return;checking=true;try{send({type:'state',...await state()});}finally{checking=false;}},700);
  const cleanup=()=>{sessions.delete(ws);resumable.delete(resumeId);clearInterval(timer);clearTimeout(expiry);terminal?.kill();integration?.dispose().catch(()=>{});};
  const onClose=()=>{if(detached){expiry=setTimeout(cleanup,120000);return;}cleanup();};
  const onMessage=async raw=>{try{
   const m=JSON.parse(raw);
   if(m.type==='detach'){if(replayOverflow){send({type:'detachResult',requestId:m.requestId,error:'Terminal replay buffer is full; hot update deferred'});return;}detached=true;send({type:'detachResult',requestId:m.requestId,resumeId});}
   if(m.type==='cancelDetach'||m.type==='commitUpdate')detached=false;
   if(m.type==='cwd'){
    try{
     if(remote)throw new Error('无法读取远端终端当前目录');
     if(!terminal||exited)throw new Error('终端尚未就绪或已退出');
     const cwd=process.platform==='darwin'?(await exec('/usr/sbin/lsof',['-a','-p',String(terminal.pid),'-d','cwd','-Fn'],{timeout:2000})).stdout.split('\n').find(line=>line.startsWith('n/'))?.slice(1):await fs.readlink(`/proc/${terminal.pid}/cwd`);
     if(!cwd?.startsWith('/'))throw new Error('无法读取终端当前目录');
     send({type:'cwdResult',requestId:m.requestId,cwd,relative:path.relative(root,cwd)||'.'});
    }catch(e){send({type:'cwdResult',requestId:m.requestId,error:e.message});}
   }
   if(m.type==='close'||m.type==='checkClose'){
    if(closing)return;closing=true;
    const status=await state();send({type:'closeResult',requestId:m.requestId,...status});
    if(!status.busy&&m.type==='close'){terminal?.kill();}else closing=false;
   }
   if(m.type==='data'&&typeof m.data==='string'&&!closing){if(/[\r\n]/.test(m.data))lastSubmit=Date.now();if(terminal)terminal.write(m.data);else queuedInput+=m.data;}
   if(m.type==='resize'&&Number.isInteger(m.cols)&&Number.isInteger(m.rows)&&m.cols>0&&m.cols<1000&&m.rows>0&&m.rows<500)terminal?.resize(m.cols,m.rows);
  }catch(e){send({type:'error',message:e.message});}};
  ws.on('close',onClose);ws.on('message',onMessage);
  resumable.set(resumeId,next=>{if(!detached||exited){next.send(JSON.stringify({type:'error',message:'Terminal is not detached'}));next.close();return;}clearTimeout(expiry);ws.removeListener('close',onClose);ws.removeListener('message',onMessage);const previous=ws;sessions.delete(previous);ws=next;sessions.add(ws);previous.close();ws.on('close',onClose);ws.on('message',onMessage);if(output.length)ws.send(JSON.stringify({type:'data',data:output.join('')}));send({type:'ready',resumeId,resumed:true});});
  try{
   integration=remote?{token:null,dispose:async()=>{}}:await prepareShell(shell);
   if(ws.readyState!==1){await integration.dispose();return;}
   terminal=remote?pty.spawn('/usr/bin/ssh',['-tt','-o','ConnectTimeout=8','--',remote,`cd ${quote(root)} && exec "$SHELL" -l`],{name:'xterm-256color',cols:100,rows:28,env:process.env}):pty.spawn(shell,integration.args,{name:'xterm-256color',cols:100,rows:28,cwd:root,env:{...process.env,...integration.env,TERM:'xterm-256color'}});
   const filter=markerFilter(integration.token,value=>{shellState=value;});
   terminal.onData(data=>{const visible=filter(data);if(visible)send({type:'data',data:visible});});
   terminal.onExit(({exitCode})=>{exited=true;send({type:'exit',exitCode});ws.close();});
   send({type:'ready',resumeId});if(queuedInput)terminal.write(queuedInput);
  }catch(e){send({type:'error',message:e.message});ws.close();}
 });
 ctx.on('workspace.changed',()=>{for(const s of sessions)s.close();});
 ctx.effect(()=>{for(const s of sessions)s.close();wss.close();});
}};
