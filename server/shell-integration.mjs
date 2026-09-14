import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {quote} from './workspace.mjs';
// Zsh prompt/preexec markers distinguish even long-running shell builtins.
// Original user startup files are sourced; no user dotfiles are modified.
export async function prepareShell(shell){
 const token=randomBytes(16).toString('hex');
 if(path.basename(shell)!=='zsh')return {args:['-l'],env:{},token:null,dispose:async()=>{}};
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'harness-zsh-'));
 const original=process.env.ZDOTDIR||os.homedir();
 for(const name of ['.zshenv','.zprofile','.zlogin','.zshrc']){
  let text=`[[ -f ${quote(path.join(original,name))} ]] && source ${quote(path.join(original,name))}\n`;
  if(name==='.zshenv')text+=`export ZDOTDIR=${quote(directory)}\n`;
  if(name==='.zshrc')text+=`autoload -Uz add-zsh-hook\n_harness_preexec() { printf '\\033]777;harness;${token};busy\\007'; }\n_harness_precmd() { printf '\\033]777;harness;${token};idle\\007'; }\nadd-zsh-hook preexec _harness_preexec\nadd-zsh-hook precmd _harness_precmd\nautoload -Uz add-zle-hook-widget\n_harness_line_init() { printf '\\033]777;harness;${token};ready\\007'; }\nadd-zle-hook-widget line-init _harness_line_init\n`;
  await fs.writeFile(path.join(directory,name),text);
 }
 return {args:['-l'],env:{ZDOTDIR:directory},token,dispose:()=>fs.rm(directory,{recursive:true,force:true})};
}
export function markerFilter(token,onState){
 if(!token)return data=>data;
 const prefix=`\x1b]777;harness;${token};`;let pending='';
 return data=>{pending+=data;let result='';while(pending){const start=pending.indexOf(prefix);if(start<0){let keep=0;for(let n=1;n<Math.min(prefix.length,pending.length+1);n++)if(pending.endsWith(prefix.slice(0,n)))keep=n;result+=pending.slice(0,pending.length-keep);pending=pending.slice(pending.length-keep);break;}result+=pending.slice(0,start);pending=pending.slice(start);const end=pending.indexOf('\x07');if(end<0)break;const state=pending.slice(prefix.length,end);if(state==='idle'||state==='busy'||state==='ready')onState(state);pending=pending.slice(end+1);}return result;};
}
