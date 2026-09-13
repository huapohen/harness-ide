import {marked} from 'marked';
// Keep source line numbers outside user HTML so sanitization cannot forge the map.
export function markdownBlocks(text){
 const tokens=marked.lexer(text);let line=1;
 return tokens.map(token=>{const list=[token];list.links=tokens.links;const block={line,html:marked.parser(list)};line+=(token.raw.match(/\n/g)||[]).length;return block;});
}
export function interpolatePosition(value,points,from,to){
 if(!points.length)return 0;
 for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];if(value<=b[from]){const fraction=Math.max(0,Math.min(1,(value-a[from])/Math.max(0.0001,b[from]-a[from])));return a[to]+fraction*(b[to]-a[to]);}}
 return points.at(-1)[to];
}
export function markdownReadingPosition(source,preview){
 const view=source.cmEditor.view,scroll=preview.querySelector('.markdown-scroll');
 const points=()=>{const rect=scroll.getBoundingClientRect();return [...preview.querySelectorAll('[data-md-source-line]')].map(node=>({line:Number(node.dataset.mdSourceLine),y:node.getBoundingClientRect().top-rect.top+scroll.scrollTop})).filter((p,i,all)=>!i||p.line>all[i-1].line);};
 return {
  sourceLine(){const rect=view.scrollDOM.getBoundingClientRect(),height=Math.max(0,rect.top-view.documentTop);const block=view.lineBlockAtHeight(height);return view.state.doc.lineAt(block.from).number+Math.max(0,Math.min(0.9999,(height-block.top)/Math.max(1,block.height)));},
  previewLine(){return scroll?interpolatePosition(scroll.scrollTop,points(),'y','line'):1;},
  restoreSource(line){const pos=view.state.doc.line(Math.max(1,Math.min(view.state.doc.lines,Math.floor(line)))).from;view.requestMeasure({read:()=>{const block=view.lineBlockAt(pos);return block.top+(line-Math.floor(line))*block.height;},write:top=>view.scrollDOM.scrollTop=top});},
  restorePreview(line){if(scroll)scroll.scrollTop=interpolatePosition(line,points(),'line','y');}
 };
}
