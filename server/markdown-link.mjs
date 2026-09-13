import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {externalFile} from './external-files.mjs';
export async function markdownLink(w,q){
 const href=String(q.href||'').trim();
 if(/^https?:\/\//i.test(href))return {url:new URL(href).href};
 if(href.startsWith('#'))return {anchor:decodeURIComponent(href.slice(1))};
 if(!href||/^(?!file:)[a-z][\w+.-]*:/i.test(href)||href.startsWith('//'))throw Error('不支持的链接');
 let target=href.startsWith('file:')?fileURLToPath(new URL(href)):decodeURIComponent(href.split(/[?#]/)[0]);
 const remote=w.host&&!q.external;
 if(remote&&path.isAbsolute(target))throw Error('远程文件请使用工作区内相对路径');
 if(target.startsWith('~/')){if(remote)throw Error('远程文件请使用相对路径');target=path.join(os.homedir(),target.slice(2));}
 const full=remote?path.posix.normalize(path.posix.join(path.posix.dirname(q.path),target)):path.resolve(q.external?path.dirname(q.path):path.resolve(w.root,path.dirname(q.path)),target);
 const relative=remote?full:path.relative(w.root,full),external=!remote&&(q.external||relative==='..'||relative.startsWith('../'));
 if(remote&&(relative==='..'||relative.startsWith('../')))throw Error('链接超出工作区');
 const result={path:external?full:relative,external:!!external};
 if(q.image){const mime=({png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',svg:'image/svg+xml',bmp:'image/bmp',ico:'image/x-icon',avif:'image/avif'})[path.extname(full).slice(1).toLowerCase()];if(!mime)throw Error('不是支持的图片');const data=external?await externalFile({action:'read',path:full}):await w.read(relative);return {...result,mime,data:data.data};}
 return result;
}
