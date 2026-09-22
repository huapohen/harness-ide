import {EditorSelection, countColumn} from '@codemirror/state';
import {indentMore} from '@codemirror/commands';
export function insertTabStop({state,dispatch}) {
 if(state.readOnly)return false;
 if(state.selection.ranges.some(r=>state.doc.lineAt(r.from).number!==state.doc.lineAt(r.to).number))return indentMore({state,dispatch});
 dispatch(state.update(state.changeByRange(range=>{
  const line=state.doc.lineAt(range.from),column=countColumn(line.text.slice(0,range.from-line.from),state.tabSize);
  const insert=' '.repeat(state.tabSize-column%state.tabSize);
  return {changes:{from:range.from,to:range.to,insert},range:EditorSelection.cursor(range.from+insert.length)};
 }),{scrollIntoView:true,userEvent:'input'}));
 return true;
}
