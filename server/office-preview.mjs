import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile);
export async function officePreview({data,ext}){
 if(!['doc','docx','ppt','pptx','xls','xlsx','odt','odp','ods','rtf'].includes(ext))throw Error('Unsupported office format');
 if(typeof data!=='string'||data.length>90_000_000)throw Error('File too large');
 const candidates=[process.env.HARNESS_SOFFICE,'/Applications/LibreOffice.app/Contents/MacOS/soffice',path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/native/libreoffice-headless/libreoffice/LibreOfficeDev.app/Contents/MacOS/soffice')].filter(Boolean);
 let executable;for(const c of candidates){try{await fs.access(c);executable=c;break;}catch{}}
 if(!executable)throw Error('需要安装 LibreOffice 以预览 Office 文件');
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'harness-office-'));
 try{const input=path.join(temp,'document.'+ext);await fs.writeFile(input,Buffer.from(data,'base64'));await exec(executable,['-env:UserInstallation='+new URL('file://'+temp+'/profile').href,'--headless','--convert-to','pdf','--outdir',temp,input],{timeout:60000,maxBuffer:1024*1024});return {data:(await fs.readFile(path.join(temp,'document.pdf'))).toString('base64')};}finally{await fs.rm(temp,{recursive:true,force:true});}
}
