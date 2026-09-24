// CodeMirror 6.43 keeps its mouse gesture until a compatibility mouseup arrives.
// WKWebView taps can omit that event. End the gesture on leaving the editor,
// without clearing the user's selection or changing the document.
export function editorPointerLifecycle(view){
 const doc=view.contentDOM.ownerDocument,win=doc.defaultView;
 const cancel=()=>view.inputState?.mouseSelection?.destroy();
 const finish=e=>{if(e.button===0)view.inputState?.mouseSelection?.up(e);};
 const outside=e=>{if(!view.dom.contains(e.target))cancel();};
 const hidden=()=>{if(doc.hidden)cancel();};
 doc.addEventListener('pointerdown',outside,true);
 doc.addEventListener('pointerup',finish);
 doc.addEventListener('pointercancel',cancel);
 doc.addEventListener('visibilitychange',hidden);
 view.contentDOM.addEventListener('blur',cancel);
 win.addEventListener('blur',cancel);
 return()=>{cancel();doc.removeEventListener('pointerdown',outside,true);doc.removeEventListener('pointerup',finish);doc.removeEventListener('pointercancel',cancel);doc.removeEventListener('visibilitychange',hidden);view.contentDOM.removeEventListener('blur',cancel);win.removeEventListener('blur',cancel);};
}
