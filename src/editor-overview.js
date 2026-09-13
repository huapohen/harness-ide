import {ViewPlugin} from '@codemirror/view';
import {getSearchQuery,searchPanelOpen} from '@codemirror/search';

// Owned by the editor lifecycle, including state restoration and plugin unload.
export const editorOverview=ViewPlugin.fromClass(class {
 constructor(view){
  this.view=view;this.abort=new AbortController();this.dirty=true;
  this.dom=document.createElement('div');this.dom.className='editor-overview';
  this.canvas=document.createElement('canvas');this.canvas.className='overview-map';
  this.large=document.createElement('div');this.large.className='overview-viewport';
  this.small=document.createElement('div');this.small.className='overview-thumb';
  for(const node of [this.large,this.small]){node.setAttribute('role','scrollbar');node.setAttribute('aria-label','Scroll document');node.setAttribute('aria-orientation','vertical');}
  this.dom.append(this.canvas,this.large,this.small);view.dom.append(this.dom);
  const on=(target,type,fn)=>target.addEventListener(type,fn,{signal:this.abort.signal});
  on(view.scrollDOM,'scroll',()=>{this.schedule();if(this.blurred)return;this.dom.classList.add('scrolling');clearTimeout(this.scrollTimer);this.scrollTimer=setTimeout(()=>this.dom.classList.remove('scrolling'),800);});
  on(window,'focus',()=>{this.blurred=false;});
  on(this.dom,'pointerenter',()=>this.dom.classList.add('visible'));
  on(this.dom,'pointerleave',()=>{if(!this.drag)this.dom.classList.remove('visible');});
  on(window,'blur',()=>{this.blurred=true;clearTimeout(this.scrollTimer);this.drag=null;this.dom.classList.remove('visible','dragging','scrolling');});
  on(this.dom,'pointerdown',e=>{
   if(e.button!==0)return;e.preventDefault();const r=this.dom.getBoundingClientRect();
   const thumb=e.target===this.small?this.small:this.large;
   const tr=thumb.getBoundingClientRect();const offset=e.target===thumb?e.clientY-tr.top:tr.height/2;
   this.drag={offset,thumb};this.dom.setPointerCapture(e.pointerId);this.dom.classList.add('visible','dragging');this.move(e);
  });
  on(this.dom,'pointermove',e=>{if(this.drag)this.move(e);});
  on(this.dom,'pointerup',e=>{this.drag=null;this.dom.classList.remove('dragging');if(this.dom.hasPointerCapture(e.pointerId))this.dom.releasePointerCapture(e.pointerId);if(!this.dom.matches(':hover'))this.dom.classList.remove('visible');});
  on(this.dom,'pointercancel',()=>{this.drag=null;this.dom.classList.remove('visible','dragging');});
  this.resize=new ResizeObserver(()=>{this.dirty=true;this.schedule();});this.resize.observe(this.dom);this.resize.observe(view.dom);this.resize.observe(view.scrollDOM);
  this.schedule();
 }
 update(u){if(u.docChanged||getSearchQuery(u.startState)!==getSearchQuery(u.state)||searchPanelOpen(u.startState)!==searchPanelOpen(u.state))this.dirty=true;this.schedule();}
 schedule(){if(!this.frame)this.frame=requestAnimationFrame(()=>{this.frame=0;this.draw();});}
 move(e){const r=this.dom.getBoundingClientRect(),s=this.view.scrollDOM,height=this.drag.thumb.getBoundingClientRect().height;const ratio=Math.max(0,Math.min(1,(e.clientY-r.top-this.drag.offset)/Math.max(1,r.height-height)));s.scrollTop=ratio*(s.scrollHeight-s.clientHeight);}
 draw(){
  const v=this.view,s=v.scrollDOM,r=s.getBoundingClientRect(),vr=v.dom.getBoundingClientRect();
  const h=s.clientHeight,w=this.dom.clientWidth;if(!h||!w)return;
  this.dom.style.top=(r.top-vr.top)/ (vr.height/v.dom.offsetHeight||1)+'px';this.dom.style.height=h+'px';
  const total=Math.max(h,s.scrollHeight),ratio=s.scrollTop/Math.max(1,total-h);
  for(const [node,min] of [[this.large,48],[this.small,24]]){const size=Math.min(h,Math.max(min,h*h/total));node.style.height=size+'px';node.style.top=ratio*(h-size)+'px';node.setAttribute('aria-valuenow',String(Math.round(ratio*100)));node.setAttribute('aria-valuemin','0');node.setAttribute('aria-valuemax','100');}
  if(this.dirty){this.dirty=false;this.matches=[];const q=getSearchQuery(v.state);if(searchPanelOpen(v.state)&&q.search&&q.valid){const cursor=q.getCursor(v.state);for(let item=cursor.next();!item.done&&this.matches.length<10000;item=cursor.next())this.matches.push(item.value.from);}}
  const dpr=window.devicePixelRatio||1;this.canvas.width=w*dpr;this.canvas.height=h*dpr;const c=this.canvas.getContext('2d');c.scale(dpr,dpr);
  // CodeMirror height map accounts for wrapping and offscreen line estimates.
  const y=pos=>Math.max(0,Math.min(h-3,(v.lineBlockAt(pos).top+v.documentPadding.top)/total*h));
  c.fillStyle='#d7a63d';for(const pos of this.matches)c.fillRect(w-12,y(pos),8,3);

  this.dom.dataset.matches=String(this.matches.length);this.dom.dataset.cursor=String(v.state.selection.main.head);
 }
 destroy(){clearTimeout(this.scrollTimer);cancelAnimationFrame(this.frame);this.abort.abort();this.resize.disconnect();this.dom.remove();}
});
