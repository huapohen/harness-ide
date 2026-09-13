import {htmlPath} from '../html-path.js';
export default {id:'html',requires:['documents','api'],activate(ctx){
 const api=ctx.get('api'),pages=new Map();
 const receive=e=>{for(const [id,page] of pages){if(!page.container.isConnected){pages.delete(id);continue;}if(e.source===page.frame.contentWindow&&e.data?.harnessHTML===id&&typeof e.data.href==='string')page.navigate(e.data.href);}};
 window.addEventListener('message',receive);ctx.effect(()=>{window.removeEventListener('message',receive);pages.clear();});
 for(const ext of ['html','htm'])ctx.effect(ctx.get('documents').register(ext,(container,text,location={})=>{
 const frame=document.createElement('iframe');frame.title='HTML 预览';
 // Opaque origin; only the nonce-authorized navigation bridge can run.
 frame.setAttribute('sandbox','allow-scripts');container.append(frame);
 const id=crypto.randomUUID();let current=location.path||'index.html',revision=0;
 const read=async path=>{const result=await api(location.external?'external':'read',{action:'read',path});return new TextDecoder().decode(Uint8Array.from(atob(result.data),c=>c.charCodeAt(0)));};
 async function navigate(href){const request=++revision;try{const next=htmlPath(current,href);const value=await read(next.path);if(request===revision)show(value,next.path,next.hash);}catch(error){let note=container.querySelector('.html-error');if(!note){note=document.createElement('p');note.className='html-error panel-note';container.prepend(note);}note.textContent='页面打开失败：'+error.message;}}
 pages.set(id,{container,frame,navigate});
 function show(source,path,hash=''){
 current=path;container.querySelector('.html-error')?.remove();
 const nonce=crypto.randomUUID();
 const bridge=`document.addEventListener('click',e=>{const a=e.target.closest?.('a[href]');if(!a)return;e.preventDefault();const href=a.getAttribute('href');if(href.startsWith('#')){document.getElementById(decodeURIComponent(href.slice(1)))?.scrollIntoView();return;}parent.postMessage({harnessHTML:${JSON.stringify(id)},href},'*');});document.addEventListener('DOMContentLoaded',()=>{const hash=${JSON.stringify(hash)};if(hash)document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView();});`;
 frame.srcdoc=`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; script-src 'nonce-${nonce}'; form-action 'none'"><script nonce="${nonce}">${bridge}</script>`+source;
 }
 show(text,current);
 }));
}};
