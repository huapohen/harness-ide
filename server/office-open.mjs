import fs from 'node:fs/promises';
import path from 'node:path';
import {linkedPath} from './linked-workspace.mjs';
import {exec} from './workspace.mjs';
export const officeExtensions=['doc','docx','ppt','pptx','xls','xlsx','odt','odp','ods','rtf'];
export async function openOffice(workspace,q,launch=exec){
 if(typeof q.path!=='string'||!officeExtensions.includes(path.extname(q.path).slice(1).toLowerCase()))throw Error('Unsupported Office file');
 if(!q.external&&workspace.host)throw Error('系统应用只能打开本地文件，请先下载远程文件');
 if(q.external&&!path.isAbsolute(q.path))throw Error('Absolute path required');
 const file=q.external?q.path:await linkedPath(workspace.root,q.path);
 if(!(await fs.stat(file)).isFile())throw Error('Not a file');
 await launch('/usr/bin/open',[file]);return {};
}
