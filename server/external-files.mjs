import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
export async function externalFile(q){
 if(typeof q.path!=='string'||!path.isAbsolute(q.path))throw Error('需要文件绝对路径');
 if(q.action==='rename'){
  if(typeof q.name!=='string'||!q.name.trim()||q.name==='.'||q.name==='..'||/[\/\x00]/.test(q.name))throw Error('Invalid file name');
  const destination=path.join(path.dirname(q.path),q.name);await fs.link(q.path,destination);await fs.unlink(q.path);return {path:destination};
 }
 if(q.action==='read'){const stat=await fs.stat(q.path);if(!stat.isFile()||stat.size>16*1024*1024)throw Error('仅支持 16 MB 以内的文件');const bytes=await fs.readFile(q.path);return {data:bytes.toString('base64'),version:hash(bytes)};}
 if(q.action==='write'){
  const bytes=Buffer.from(q.data,'base64');if(bytes.length>16*1024*1024)throw Error('文件超过 16 MB');
  if(q.version===null){await fs.writeFile(q.path,bytes,{flag:'wx'});}else{const old=await fs.readFile(q.path);if(hash(old)!==q.version)throw Error('文件已在磁盘上被修改，请重新打开后保存');await fs.writeFile(q.path,bytes);}
  return {version:hash(bytes)};
 }
 throw Error('未知文件操作');
}
