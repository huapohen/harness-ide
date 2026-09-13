import {htmlPath} from '../html-path.js';
export default {id:'html',requires:['documents','api'],activate(ctx){
 const api=ctx.get('api');
 for(const ext of ['html','htm'])ctx.effect(ctx.get('documents').register(ext,(container,text,location={})=>{
 const frame=document.createElement('iframe');frame.title='HTML 预览';
 // Same-origin permits the host to route clicks; document scripts remain disabled.
 frame.setAttribute('sandbox','allow-same-origin');container.append(frame);
 let current=location.path||'index.html',revision=0;
 const read=async path=>{const result=await api(location.external?'external':'read',{action:'read',path});return new TextDecoder().decode(Uint8Array.from(atob(result.data),c=>c.charCodeAt(0)));};
 function show(source,path,hash=''){
 current=path;frame.onload=()=>{
 const doc=frame.contentDocument;if(!doc)return;
 doc.addEventListener('click',async e=>{
 const a=e.target.closest?.('a[href]');if(!a)return;e.preventDefault();
 const id=++revision;
 try{const next=htmlPath(current,a.getAttribute('href'));
 if(next.path===current&&next.hash){doc.getElementById(decodeURIComponent(next.hash.slice(1)))?.scrollIntoView();return;}
 const value=await read(next.path);if(id===revision)show(value,next.path,next.hash);
 }catch(error){let note=container.querySelector('.html-error');if(!note){note=document.createElement('p');note.className='html-error panel-note';container.prepend(note);}note.textContent='页面打开失败：'+error.message;}
 });
 if(hash)doc.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView();
 };
 container.querySelector('.html-error')?.remove();
 frame.srcdoc=`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; script-src 'none'; form-action 'none'">`+source;
 }
 show(text,current);
 }));
}};
