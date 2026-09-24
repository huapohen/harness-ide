import {htmlPath} from '../html-path.js';
export default {id:'html',requires:['documents','api'],activate(ctx){
 const api=ctx.get('api'),pages=new Map();
 const receive=e=>{for(const [id,page] of pages){if(!page.container.isConnected){pages.delete(id);continue;}if(e.source!==page.frame.contentWindow||e.data?.harnessHTML!==id)continue;if(typeof e.data.href==='string')page.navigate(e.data.href);else if(document.activeElement===page.frame&&typeof e.data.selection==='string'&&e.data.selection.trim()){const text=e.data.selection,handler=window.webkit?.messageHandlers.clipboard;if(handler)handler.postMessage({id:crypto.randomUUID(),action:'write',text});else navigator.clipboard.writeText(text).catch(()=>{});}}};
 window.addEventListener('message',receive);ctx.effect(()=>{window.removeEventListener('message',receive);pages.clear();});
 for(const ext of ['html','htm'])ctx.effect(ctx.get('documents').register(ext,(container,text,location={})=>{
 container.disposePreview?.();
 for(const [key,page] of pages)if(!page.container.isConnected)pages.delete(key);
 const frame=document.createElement('iframe');frame.title='HTML 预览';
 // Inline page interactions run in an opaque origin without IDE credentials or network access.
 frame.setAttribute('sandbox','allow-scripts allow-downloads allow-modals');const bar=document.createElement('div');bar.className='html-navigation';const back=document.createElement('button');back.textContent='←';back.title='返回上一页';back.setAttribute('aria-label','返回上一页');back.disabled=true;const forward=document.createElement('button');forward.textContent='→';forward.title='前进下一页';forward.setAttribute('aria-label','前进下一页');forward.disabled=true;bar.append(back,forward);container.append(bar,frame);
 const id=crypto.randomUUID();let current=location.path||'index.html',revision=0,disposed=false;const history=[],future=[];let currentSource=text,currentHash='';const snapshot=()=>({source:currentSource,path:current,hash:currentHash});back.onclick=()=>{const previous=history.pop();if(previous){future.push(snapshot());revision++;show(previous.source,previous.path,previous.hash);}};
 forward.onclick=()=>{const next=future.pop();if(next){history.push(snapshot());revision++;show(next.source,next.path,next.hash);}};
 const read=async path=>{const result=await api(location.external?'external':'read',{action:'read',path});return new TextDecoder().decode(Uint8Array.from(atob(result.data),c=>c.charCodeAt(0)));};
 // A failed older request must not obscure a newer successful navigation.
 async function navigate(href){const request=++revision;try{if(/^https?:\/\//i.test(href)){await api('browser/open',{url:href});return;}const next=htmlPath(current,href);const value=await read(next.path);if(!disposed&&request===revision){history.push(snapshot());future.length=0;show(value,next.path,next.hash);}}catch(error){if(disposed||request!==revision||!container.isConnected)return;let note=container.querySelector('.html-error');if(!note){note=document.createElement('p');note.className='html-error panel-note';container.prepend(note);}note.textContent='页面打开失败：'+error.message;}}
 pages.set(id,{container,frame,navigate});container.disposePreview=()=>{disposed=true;revision++;pages.delete(id);history.length=0;future.length=0;currentSource='';frame.srcdoc='';};
 function show(source,path,hash=''){
 current=path;currentSource=source;currentHash=hash;back.disabled=!history.length;forward.disabled=!future.length;container.querySelector('.html-error')?.remove();
 const nonce=crypto.randomUUID();
 const bridge=`(()=>{const copy=()=>{const text=getSelection()?.toString();if(text?.trim())parent.postMessage({harnessHTML:${JSON.stringify(id)},selection:text},'*');};document.addEventListener('mouseup',e=>{if(e.isTrusted&&e.button===0)setTimeout(copy,0);},true);document.addEventListener('keyup',e=>{if(e.isTrusted&&e.shiftKey&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key))setTimeout(copy,0);},true);})();document.addEventListener('click',e=>{const a=e.target.closest?.('a[href]');if(!a)return;const href=a.getAttribute('href');if(href.startsWith('blob:')&&a.hasAttribute('download'))return;e.preventDefault();if(href.startsWith('#')){document.getElementById(decodeURIComponent(href.slice(1)))?.scrollIntoView();return;}parent.postMessage({harnessHTML:${JSON.stringify(id)},href},'*');});document.addEventListener('DOMContentLoaded',()=>{const hash=${JSON.stringify(hash)};if(hash)document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView();});`;
 if(!/\.html?$/i.test(path)){const pre=document.createElement('pre');pre.textContent=source;source='<meta charset="utf-8"><style>body{background:#282c34;color:#abb2bf;font:14px/1.6 monospace}pre{white-space:pre-wrap;overflow-wrap:anywhere}</style>'+pre.outerHTML;}
 frame.srcdoc=`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; script-src 'unsafe-inline'; connect-src blob:; form-action 'none'"><script nonce="${nonce}">${bridge}</script>`+source;
 }
 show(text,current);
 }));
}};
