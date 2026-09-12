import * as prettier from 'prettier';
import {parseAllDocuments,isMap,isSeq,isScalar} from 'yaml';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
function order(node){if(isMap(node)){for(const pair of node.items)order(pair.value);if(node.items.some(p=>!isScalar(p.key)))throw Error('Sort Keys only supports scalar mapping keys');node.items.sort((a,b)=>{const x=String(a.key.value),y=String(b.key.value);return x<y?-1:x>y?1:0;});}else if(isSeq(node))node.items.forEach(order);}
function json(node){if(isMap(node))return '{'+node.items.map(p=>JSON.stringify(String(p.key.value))+':'+json(p.value)).join(',')+'}';if(isSeq(node))return '['+node.items.map(json).join(',')+']';if(node===null)return 'null';if(!isScalar(node))throw Error('Unsupported JSON value');return typeof node.value==='number'||typeof node.value==='bigint'?node.source:JSON.stringify(node.value);}
async function python(text){
 const candidates=[...(process.env.PATH||'').split(path.delimiter).map(p=>path.join(p,'black')),path.join(os.homedir(),'anaconda3/bin/black'),'/opt/homebrew/bin/black'];let binary;
 for(const p of candidates)try{await fs.access(p,fs.constants.X_OK);binary=p;break;}catch{}
 if(!binary)throw Error('Python formatter Black is not installed');
 return new Promise((resolve,reject)=>{const child=spawn(binary,['--quiet','-'],{stdio:['pipe','pipe','pipe']});let out='',err='';const timer=setTimeout(()=>{child.kill();reject(Error('Python formatting timed out'));},10000);child.stdout.on('data',b=>out+=b);child.stderr.on('data',b=>err+=b);child.on('error',e=>{clearTimeout(timer);reject(e);});child.on('close',code=>{clearTimeout(timer);code===0?resolve(out):reject(Error(err||'Invalid Python selection'));});child.stdin.on('error',()=>{});child.stdin.end(text);});
}
export async function formatText({text,language,action}){
 if(typeof text!=='string'||text.length>2*1024*1024)throw Error('Formatting supports up to 2 MB');
 if(!['format','sortKeys'].includes(action))throw Error('Unknown format action');
 const lang={yml:'yaml',pyw:'py'}[language]||language;
 if(!['json','yaml','py'].includes(lang))throw Error('Supported formats: Python, JSON, YAML');
 if(action==='sortKeys'){
  if(lang==='py')throw Error('Sort Keys is available for JSON and YAML');
  if(lang==='json')JSON.parse(text);
  const docs=parseAllDocuments(text,{intAsBigInt:true});for(const d of docs){if(d.errors.length)throw Error(d.errors[0].message);order(d.contents);}
  const sorted=lang==='json'?json(docs[0].contents):docs.map(d=>d.toString()).join('');
  if(lang==='yaml')for(const d of parseAllDocuments(sorted)){if(d.errors.length)throw d.errors[0];d.toJS();}
  return {text:await prettier.format(sorted,{parser:lang==='json'?'json':'yaml',tabWidth:2})};
 }
 return {text:lang==='py'?await python(text):await prettier.format(text,{parser:lang,tabWidth:2})};
}
