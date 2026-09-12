import {ViewPlugin,EditorView} from '@codemirror/view';
import {sourceScopes,activeScopes} from '../shared/sticky-scopes.js';

export const sourceSticky=(ext)=>ViewPlugin.fromClass(class{
 constructor(view){
  this.view=view;this.headings=sourceScopes(view.state.doc.toString(),ext);this.dom=document.createElement('div');this.dom.className='markdown-sticky';this.dom.setAttribute('aria-label','当前代码作用域');this.dom.hidden=true;view.dom.append(this.dom);
  this.schedule=()=>view.requestMeasure({key:this,read:()=>this.measure(),write:data=>this.render(data)});
  view.scrollDOM.addEventListener('scroll',this.schedule,{passive:true});this.schedule();
 }
 update(update){if(update.docChanged)this.headings=sourceScopes(update.state.doc.toString(),ext);this.schedule();}
 measure(){
  const view=this.view,rect=view.scrollDOM.getBoundingClientRect();
  if(!rect.height)return {rows:[]};
  const top=Math.max(0,rect.top-view.documentTop),block=view.lineBlockAtHeight(top),first=view.state.doc.lineAt(block.from).number;
  const rows=activeScopes(this.headings,first),gutter=view.dom.querySelector('.cm-gutters');
  return {rows:rows.map(h=>({...h,spans:view.harnessHighlightLine?.(h.line)||[{text:h.text}]})),lineHeight:view.defaultLineHeight,gutter:gutter?.getBoundingClientRect().width||48,left:view.scrollDOM.scrollLeft,width:rect.width,top:rect.top-view.dom.getBoundingClientRect().top};
 }
 render(data){
  if(this.destroyed)return;this.dom.hidden=!data.rows.length;
  this.dom.style.top=(data.top||0)+'px';this.dom.style.width=(data.width||0)+'px';
  this.dom.replaceChildren(...data.rows.map(h=>{
   const row=document.createElement('button');row.className='markdown-sticky-row';row.type='button';row.title='跳转到第 '+h.line+' 行';row.style.height=data.lineHeight+'px';
   const number=document.createElement('span');number.className='markdown-sticky-number';number.textContent=h.line;number.style.width=data.gutter+'px';
   const text=document.createElement('span');text.className='markdown-sticky-text';for(const token of h.spans){const span=document.createElement('span');span.textContent=token.text;if(token.color)span.style.color=token.color;text.append(span);}text.style.transform='translateX('+(-data.left)+'px)';
   const content=document.createElement('span');content.className='markdown-sticky-content';content.append(text);row.append(number,content);
   row.onclick=()=>{const line=this.view.state.doc.line(h.line);this.view.dispatch({selection:{anchor:line.from},effects:EditorView.scrollIntoView(line.from,{y:'start',yMargin:0})});this.view.focus();};return row;
  }));
 }
 destroy(){this.destroyed=true;this.view.scrollDOM.removeEventListener('scroll',this.schedule);this.dom.remove();}
});
