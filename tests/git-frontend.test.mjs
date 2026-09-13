import test from 'node:test';import assert from 'node:assert/strict';import plugin from '../src/plugins/git.js';
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.isConnected=true;this.classList={add(){}};this.value='';}
 setAttribute(k,v){this[k]=v;}append(...items){this.children.push(...items);}replaceChildren(...items){this.children=items;}
}
const find=(node,fn)=>fn(node)?node:node.children.map(n=>find(n,fn)).find(Boolean);
test('Git draft survives refresh and staging, and remains separate per repository',async()=>{
 const old=globalThis.document;globalThis.document={createElement:tag=>new Element(tag)};
 try{let render,repo='/workspace/one',staged=false,container;const branch={},calls=[];
 const wb={$:()=>branch,panel:(id,label,icon,fn)=>{render=fn;return()=>{};},command:()=>()=>{},showPanel:async()=>{if(container)container.isConnected=false;container=new Element('div');await render(container);}};
 const request=async(name,q)=>{calls.push(q);if(q.action==='repositories')return{repositories:[{path:'.',root:repo}]};if(q.action==='status')return{repository:true,root:repo,branch:'main',files:[{path:'a.txt',x:staged?'A':'?',y:staged?' ':'?'}]};if(q.action==='stage')staged=true;return{};};
 plugin.activate({get:n=>n==='api'?request:n==='workspace'?{info:()=>({root:'/workspace',host:null})}:wb,effect(){},on(){}});await wb.showPanel();
 let input=find(container,n=>n['aria-label']==='Commit message');input.value='Preserve my draft';input.oninput();
 await wb.showPanel();assert.equal(find(container,n=>n['aria-label']==='Commit message').value,'Preserve my draft');
 find(container,n=>n['aria-label']==='Stage').onclick();await new Promise(r=>setImmediate(r));
 assert.equal(find(container,n=>n['aria-label']==='Commit message').value,'Preserve my draft');assert.equal(find(container,n=>n['aria-label']==='Commit staged changes').disabled,false);
 repo='/workspace/two';await wb.showPanel();assert.equal(find(container,n=>n['aria-label']==='Commit message').value,'');
 repo='/workspace/one';await wb.showPanel();assert.equal(find(container,n=>n['aria-label']==='Commit message').value,'Preserve my draft');assert.equal(calls.some(q=>q.action==='commit'),false);
 }finally{globalThis.document=old;}
});
