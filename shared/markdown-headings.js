// Index source headings, excluding fenced code blocks. Line numbers are one-based.
export function markdownHeadings(text){
 const lines=text.split('\n'),headings=[];let fence=null;
 for(let i=0;i<lines.length;i++){
  const line=lines[i],marker=/^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
  if(fence){if(marker&&marker[1][0]===fence.char&&marker[1].length>=fence.length&&!marker[2].trim())fence=null;continue;}
  if(marker){if(marker[1][0]!=='`'||!marker[2].includes('`'))fence={char:marker[1][0],length:marker[1].length};continue;}
  const atx=/^ {0,3}(#{1,6})(?:[ \t]+|$)/.exec(line);
  if(atx){headings.push({line:i+1,level:atx[1].length,text:line});continue;}
  if(i>0&&/^ {0,3}(?:=+|-+)\s*$/.test(line)&&lines[i-1].trim()&&!/^\s*(?:#|>|[-+*]\s|\d+[.)]\s)/.test(lines[i-1])&&!/^ {4}|^\t/.test(lines[i-1])&&!/^ {0,3}(?:`{3,}|~{3,})/.test(lines[i-1]))headings.push({line:i,level:line.trim()[0]==='='?1:2,text:lines[i-1]});
 }
 const stack=[];
 for(const h of headings){while(stack.length&&stack.at(-1).level>=h.level)stack.pop().end=h.line;h.end=lines.length+1;stack.push(h);}
 return headings;
}
export function stickyMarkdownHeadings(headings,firstLine,max=5){
 return headings.filter(h=>h.line<firstLine&&h.end>firstLine).slice(-max);
}
