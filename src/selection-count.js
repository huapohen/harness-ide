// CodeMirror offsets are UTF-16; count surrogate pairs as one character.
export function selectedCharacters(state){
 let count=0;
 for(const {from,to} of state.selection.ranges)if(to>from){
  count+=to-from;
  for(const chunk of state.doc.iterRange(from,to))for(let i=0;i+1<chunk.length;i++){
   const c=chunk.charCodeAt(i);if(c>=0xd800&&c<=0xdbff&&chunk.charCodeAt(i+1)>=0xdc00&&chunk.charCodeAt(i+1)<=0xdfff){count--;i++;}
  }
 }
 return count;
}
