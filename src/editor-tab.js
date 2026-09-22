import {EditorSelection} from '@codemirror/state';
import {indentMore} from '@codemirror/commands';
const graphemes=new Intl.Segmenter(undefined,{granularity:'grapheme'});
export function visualColumn(text,tabSize){
 let column=0;
 for(const {segment} of graphemes.segment(text)){
  const c=segment.codePointAt(0);
  const wide=(c>=11904&&c<=55215)||(c>=63744&&c<=64255)||(c>=65281&&c<=65374)||(c>=65504&&c<=65510)||/\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(segment);
  column+=segment==='\t'?tabSize-column%tabSize:wide?2:1;
 }
 return column;
}
export function insertTabStop({state,dispatch}) {
 if(state.readOnly)return false;
 if(state.selection.ranges.some(r=>state.doc.lineAt(r.from).number!==state.doc.lineAt(r.to).number))return indentMore({state,dispatch});
 dispatch(state.update(state.changeByRange(range=>{
  const line=state.doc.lineAt(range.from),column=visualColumn(line.text.slice(0,range.from-line.from),state.tabSize);
  const insert=' '.repeat(state.tabSize-column%state.tabSize);
  return {changes:{from:range.from,to:range.to,insert},range:EditorSelection.cursor(range.from+insert.length)};
 }),{scrollIntoView:true,userEvent:'input'}));
 return true;
}
