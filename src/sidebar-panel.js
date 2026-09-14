// Detach each old render target so delayed panel work cannot overwrite a new panel.
export function replaceSidebarBody(previous,deferred=false){
 const body=previous.ownerDocument.createElement('div');body.id=previous.id;
 body.onpointermove=e=>body.classList.toggle('scrollbar-near',body.getBoundingClientRect().right-e.clientX<22);
 body.onpointerleave=()=>body.classList.remove('scrollbar-near');
 if(!deferred)previous.replaceWith(body);return body;
}
