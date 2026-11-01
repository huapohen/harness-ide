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
export const editorFolding=[foldService.of((state,from)=>foldRange(state.doc,from)),codeFolding(),foldGutter(),keymap.of(foldKeymap),guides,EditorView.theme({'.cm-foldGutter':{width:'14px',cursor:'pointer'},'.cm-foldPlaceholder':{backgroundColor:'transparent',border:'1px solid #777',color:'inherit'}})];
