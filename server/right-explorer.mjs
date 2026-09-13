import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {Workspace} from './workspace.mjs';
import {linkedWorkspace} from './linked-workspace.mjs';
import {fileAction} from './file-actions.mjs';
import {LocalHistory} from './history.mjs';

// Each request gets its own local root, never mutating the primary workspace.
export async function rightExplorer(q,primary){
 const root=q.root||(primary.host?os.homedir():primary.root);
 if(typeof root!=='string'||!path.isAbsolute(root))throw Error('请选择本地文件夹的绝对路径');
 const resolved=await fs.realpath(root);if(!(await fs.stat(resolved)).isDirectory())throw Error('请选择文件夹');
 const workspace=linkedWorkspace(new Workspace(resolved));
 if(q.action==='info')return workspace.info();
 if(q.action==='list')return workspace.list(q.path||'.');
 if(q.action==='manage'){
  if(!['create','rename','delete','copy','move','reveal','absolute','import'].includes(q.operation))throw Error('Unsupported file action');
  const history=new LocalHistory(workspace);
  if(['rename','move','delete'].includes(q.operation))await history.captureTree(q.path,q.operation==='delete'?'Before Delete':'Before Rename');
  return fileAction(workspace,{...q,action:q.operation});
 }
 throw Error('Unknown right Explorer action');
}
