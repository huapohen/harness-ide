import {selectionCopyEnabled} from './selection-copy.js';
// Native PDF selections are not DOM ranges. Let WebKit's copy responder read
// them after selection finishes; do not alter the PDF or replace its renderer.
export function installPDFSelectionCopy(frame,host=window){
 let detach=()=>{};
 const load=()=>{
  detach();const doc=frame.contentDocument;if(!doc)return;
  let timer;
  const copy=()=>{
   clearTimeout(timer);timer=setTimeout(()=>{
    if(!selectionCopyEnabled('preview',host.localStorage)||!frame.isConnected||host.document.activeElement!==frame)return;
    const text=doc.getSelection()?.toString();
    const bridge=host.webkit?.messageHandlers.clipboard;
    if(text){if(bridge)bridge.postMessage({id:crypto.randomUUID(),action:'write',text});else host.navigator.clipboard.writeText(text).catch(()=>{});}
    else if(bridge)bridge.postMessage({id:crypto.randomUUID(),action:'copyPdfSelection'});
   },0);
  };
  const up=e=>{if(e.button===0)copy();};
  const key=e=>{if(e.shiftKey&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key))copy();};
  const cancel=()=>{clearTimeout(timer);};
  doc.addEventListener('mouseup',up,true);doc.addEventListener('keyup',key,true);host.addEventListener('blur',cancel);
  detach=()=>{cancel();doc.removeEventListener('mouseup',up,true);doc.removeEventListener('keyup',key,true);host.removeEventListener('blur',cancel);};
 };
 const update=()=>{if(selectionCopyEnabled('preview',host.localStorage))frame.dataset.pdfAutoCopy='true';else delete frame.dataset.pdfAutoCopy;};update();host.addEventListener('selection-copy-changed',update);frame.addEventListener('load',load);
 return()=>{host.removeEventListener('selection-copy-changed',update);delete frame.dataset.pdfAutoCopy;frame.removeEventListener('load',load);detach();};
}
