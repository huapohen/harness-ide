import {foldService,foldGutter,codeFolding,foldKeymap} from '@codemirror/language';
import {EditorView,keymap,ViewPlugin,Decoration} from '@codemirror/view';
export function foldRange(doc,from){
 const line=doc.lineAt(from),text=line.text,fence=text.match(/^\s*(`{3,}|~{3,})/),heading=text.match(/^(#{1,6})\s/);
 const indent=s=>s.match(/^\s*/)[0].replace(/\t/g,'    ').length;
 let end=line.to;
 for(let n=line.number+1;n<=doc.lines;n++){
  const next=doc.line(n);
  if(fence){if(new RegExp('^\\s*'+fence[1][0]+'{'+fence[1].length+',}\\s*$').test(next.text))return {from:line.to,to:next.to};end=next.to;continue;}
  if(heading){const h=next.text.match(/^(#{1,6})\s/);if(h&&h[1].length<=heading[1].length)break;end=next.to;continue;}
  if(!text.trim())break;
  if(next.text.trim()&&indent(next.text)<=indent(text))break;
  if(next.text.trim())end=next.to;
 }
 return end>line.to?{from:line.to,to:end}:null;
}
const guides=ViewPlugin.fromClass(class{
 constructor(view){this.decorations=this.build(view);}
 update(u){if(u.docChanged||u.viewportChanged)this.decorations=this.build(u.view);}
 build(view){const marks=[];for(const {from,to}of view.visibleRanges){for(let p=from;p<=to;){const line=view.state.doc.lineAt(p),spaces=line.text.match(/^\s*/)[0].replace(/\t/g,'    ').length;if(spaces>=2)marks.push(Decoration.line({attributes:{style:`background-image:repeating-linear-gradient(to right,transparent 0,transparent calc(4ch - 1px),color-mix(in srgb,currentColor 15%,transparent) calc(4ch - 1px),color-mix(in srgb,currentColor 15%,transparent) 4ch);background-size:${spaces}ch 100%;background-repeat:no-repeat;`}}).range(line.from));if(line.to>=to)break;p=line.to+1;}}return Decoration.set(marks,true);}
},{decorations:p=>p.decorations});
export const editorFolding=[foldService.of((state,from)=>foldRange(state.doc,from)),codeFolding(),foldGutter({markerDOM:open=>{const marker=document.createElement('span');marker.className='harness-fold-arrow'+(open?'':' is-folded');marker.setAttribute('aria-label',open?'折叠':'展开');return marker;}}),keymap.of(foldKeymap),guides,EditorView.theme({'.cm-lineNumbers':{order:'0'},'.cm-foldGutter':{order:'1',width:'16px',cursor:'pointer'},'.cm-foldGutter .cm-gutterElement':{padding:'0',textAlign:'center'},'.harness-fold-arrow':{display:'inline-block',width:'6px',height:'6px',borderRight:'1.5px solid currentColor',borderBottom:'1.5px solid currentColor',transform:'rotate(45deg)',verticalAlign:'3px',opacity:'0'},'&:hover .harness-fold-arrow':{opacity:'1'},'.harness-fold-arrow.is-folded':{opacity:'1',transform:'rotate(-45deg)'},'.cm-foldPlaceholder':{backgroundColor:'transparent',border:'1px solid #777',color:'inherit'}})];
