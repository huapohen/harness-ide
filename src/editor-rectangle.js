import {EditorSelection,countColumn,findColumn} from '@codemirror/state';
import {EditorView} from '@codemirror/view';
export function rectangleFromAnchor(state,anchor,head){
 const a=state.doc.lineAt(anchor),b=state.doc.lineAt(head);
 const ac=countColumn(a.text,state.tabSize,anchor-a.from),bc=countColumn(b.text,state.tabSize,head-b.from);
 const ranges=[];
 for(let n=Math.min(a.number,b.number);n<=Math.max(a.number,b.number);n++){
  const line=state.doc.line(n);ranges.push(EditorSelection.range(line.from+findColumn(line.text,ac,state.tabSize),line.from+findColumn(line.text,bc,state.tabSize)));
 }
 return EditorSelection.create(ranges,b.number<a.number?0:ranges.length-1);
}
// Shift+Option extends from the existing caret, even when it is off screen.
// Keep that corner through subsequent clicks instead of anchoring at the last row.
export function rectangularClickSelection(){
 const anchors=new WeakMap();
 return EditorView.mouseSelectionStyle.of((view,event)=>{
  if(event.button!==0||!event.shiftKey||!event.altKey)return null;
  const previous=anchors.get(view);let anchor=previous?.selection===view.state.selection?previous.anchor:view.state.selection.main.anchor;
  return {update(update){anchor=update.changes.mapPos(anchor);},get(event){const head=view.posAtCoords({x:event.clientX,y:event.clientY},false);if(head==null)return view.state.selection;const selection=rectangleFromAnchor(view.state,anchor,head);anchors.set(view,{anchor,selection});return selection;}};
 });
}
