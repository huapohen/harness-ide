import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile);
export function inspectProcesses(output,pid,shellName){
 const rows=output.trim().split('\n').map(line=>{const m=line.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s+(-?\d+)\s+(\S+)\s+(.+)$/);return m?{pid:+m[1],ppid:+m[2],pgid:+m[3],tpgid:+m[4],stat:m[5],name:m[6].split('/').at(-1)}:null;}).filter(Boolean);
 const root=rows.find(p=>p.pid===pid);if(!root)return {busy:true,reason:'终端进程状态尚未确认'};
 const descendants=new Set([pid]);let changed=true;while(changed){changed=false;for(const p of rows)if(descendants.has(p.ppid)&&!descendants.has(p.pid)){descendants.add(p.pid);changed=true;}}
 const jobs=rows.filter(p=>p.pid!==pid&&descendants.has(p.pid)&&!p.stat.includes('Z'));
 if(jobs.length)return {busy:true,reason:'仍有任务：'+[...new Set(jobs.map(p=>p.name))].slice(0,3).join(', ')};
 if(root.name.replace(/^-/,'')!==shellName)return {busy:true,reason:'Shell 已被运行中的程序替代'};
 if(root.stat.includes('R')||(root.tpgid>0&&root.tpgid!==root.pgid))return {busy:true,reason:'终端正在执行命令'};
 return {busy:false,reason:'空闲'};
}
export async function checkProcessState(pid,shellName){try{return inspectProcesses((await exec('/bin/ps',['-axo','pid=,ppid=,pgid=,tpgid=,stat=,comm='],{timeout:2000,maxBuffer:4*1024*1024})).stdout,pid,shellName);}catch{return {busy:true,reason:'无法确认进程状态，保留终端'};}}
