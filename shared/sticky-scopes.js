import {markdownHeadings} from './markdown-headings.js';
const python=new Set(['py','pyw','python']);
const hashComments=new Set(['py','pyw','python','sh','bash','zsh','rb','ruby','yaml','yml','toml','ini','conf','sshconfig','dockerfile','r','pl','ps1']);
const braces=new Set(['js','jsx','mjs','cjs','ts','tsx','mts','cts','json','jsonc','jsonl','ndjson','css','scss','less','c','h','cpp','hpp','cc','cxx','cs','java','go','rs','swift','kt','kts','php','dart','scala','groovy','sh','bash','zsh','ps1','toml','py','pyw']);
const indent=text=>{let n=0;for(const c of text){if(c===' ')n++;else if(c==='\t')n+=4-n%4;else break;}return n;};

// Mask literals/comments while retaining columns and newlines. This is a structural
// fallback, not a replacement for language-server symbols or a complete parser.
export function maskScopeText(text,ext){
 const hash=hashComments.has(ext),sql=ext==='sql',py=python.has(ext);let quote='',block='',out='',escape=false;
 for(let i=0;i<text.length;i++){
  const c=text[i],next=text[i+1];
  if(block){if(text.startsWith(block,i)){out+=' '.repeat(block.length);i+=block.length-1;block='';}else out+=c==='\n'?'\n':' ';continue;}
  if(quote){
   if(escape){out+=c==='\n'?'\n':' ';escape=false;continue;}
   if(c==='\\'){out+=' ';escape=true;continue;}
   if(text.startsWith(quote,i)){if(sql&&next===c&&quote.length===1){out+='  ';i++;continue;}out+=' '.repeat(quote.length);i+=quote.length-1;quote='';}
   else{out+=c==='\n'?'\n':' ';if(c==='\n'&&quote.length===1&&quote!=='`'&&!sql)quote='';}continue;
  }
  if(c==='/'&&next==='*'){block='*/';out+='  ';i++;continue;}
  if(text.startsWith('<!--',i)){block='-->';out+='    ';i+=3;continue;}
  if((hash&&c==='#')||(!hash&&c==='/'&&next==='/')||((sql||ext==='lua')&&c==='-'&&next==='-')){while(i<text.length&&text[i]!=='\n'){out+=' ';i++;}if(i<text.length)out+='\n';continue;}
  if(['js','jsx','ts','tsx','mjs','cjs','mts','cts'].includes(ext)&&c==='/'&&next!=='/'&&next!=='*'&&/(?:^|[=(:,!&|?;{}]\s*|\b(?:return|throw|case|yield)\s*)$/.test(out)){
   let j=i+1,escaped=false,inClass=false;for(;j<text.length&&text[j]!=='\n';j++){const r=text[j];if(escaped){escaped=false;continue;}if(r==='\\'){escaped=true;continue;}if(r==='[')inClass=true;else if(r===']')inClass=false;else if(r==='/'&&!inClass)break;}if(text[j]==='/'){out+=' '.repeat(j-i+1);i=j;continue;}
  }
  if(c==='"'||c==="'"||c==='`'){
   // Rust lifetimes are not strings.
   if(ext==='rs'&&c==="'"&&/^'[A-Za-z_]\w*\b(?!')/.test(text.slice(i))){out+=c;continue;}
   quote=py&&text.slice(i,i+3)===c.repeat(3)?c.repeat(3):c;out+=' '.repeat(quote.length);i+=quote.length-1;continue;
  }
  out+=c;
 }
 return out;
}

function normalize(ranges,lines){
 const unique=new Map();
 for(const r of ranges){if(r.end<=r.line+1||!lines[r.line-1]?.trim())continue;const old=unique.get(r.line);if(!old||r.end>old.end)unique.set(r.line,{...r,text:lines[r.line-1]});}
 return [...unique.values()].sort((a,b)=>a.line-b.line||b.end-a.end);
}
export function sourceScopes(text,extension='txt'){
 const ext=extension.toLowerCase(),lines=text.split('\n');
 if(ext==='md'||ext==='markdown')return markdownHeadings(text);
 const code=maskScopeText(text,ext).split('\n'),ranges=[];
 const add=(line,end)=>ranges.push({line,end});
 // Logical lines prevent wrapped function arguments from masquerading as blocks.
 const logical=[];let pending=null,depth=0;
 for(let i=0;i<code.length;i++){
  const s=code[i];if(!s.trim())continue;
  if(!pending)pending={line:i+1,indent:indent(lines[i]),text:s,end:i+1};else{pending.text+=' '+s.trim();pending.end=i+1;}
  for(const c of s){if(c==='('||c==='[')depth++;else if(c===')'||c===']')depth=Math.max(0,depth-1);}
  if(!depth&&!/\\\s*$/.test(s)){logical.push(pending);pending=null;}
 }
 if(pending)logical.push(pending);
 const stack=[];
 for(let i=0;i<logical.length;i++){
  const row=logical[i];while(stack.length&&row.indent<=stack.at(-1).indent)add(stack.pop().line,row.line);
  const next=logical[i+1];if(next&&next.indent>row.indent&&(!python.has(ext)||/:\s*$/.test(row.text)))stack.push(row);
 }
 while(stack.length)add(stack.pop().line,lines.length+1);
 // Bracket ranges work even when source has not been indented.
 if(braces.has(ext)){
  const stack=[];let previous=0;
  for(let i=0;i<code.length;i++){
   for(const c of code[i]){
    if(c==='{'||c==='['){let line=i+1;if(c==='{'&&/^\s*\{\s*$/.test(code[i])&&previous&& !/[;{}]\s*$/.test(code[previous-1]))line=previous;stack.push({char:c,line});}
    else if(c==='}'||c===']'){const expected=c==='}'?'{':'[';if(stack.at(-1)?.char===expected)add(stack.pop().line,i+1);}
   }
   if(code[i].trim())previous=i+1;
  }
  while(stack.length)add(stack.pop().line,lines.length+1);
 }
 // Tag nesting, including unindented HTML/XML and JSX/TSX source.
 if(['html','htm','xml','svg','vue','svelte','jsx','tsx'].includes(ext)){
  const stack=[],joined=code.join('\n'),pattern=/<\/?([A-Za-z][\w:.-]*)\b[^>]*>/g;let match,line=1,offset=0;
  while((match=pattern.exec(joined))){for(;offset<match.index;offset++)if(joined[offset]==='\n')line++;const tag=match[1].toLowerCase();
   if(match[0][1]==='/'){const at=stack.findLastIndex(x=>x.tag===tag);if(at>=0){add(stack[at].line,line);stack.splice(at);}}
   else if(!/\/\s*>$/.test(match[0])&&!new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']).has(tag))stack.push({tag,line});
  }
  for(const row of stack)add(row.line,lines.length+1);
 }
 // Language-defined keyword blocks, independent of indentation.
 if(['sh','bash','zsh','rb','ruby','sql','lua'].includes(ext)){
  const stack=[];for(let i=0;i<code.length;i++){
   const s=code[i].trim();if(!s)continue;
   const shell=['sh','bash','zsh'].includes(ext),ruby=['rb','ruby'].includes(ext);
   const close=shell?/^(?:fi|done|esac)\b/:/^end\b/i;
   if(close.test(s)){if(stack.length)add(stack.pop(),i+1);continue;}
   const open=shell?/^(?:if|for|while|until|case|select)\b/:ruby?/^(?:class|module|def|if|unless|case|while|until|for|begin)\b|\bdo(?:\s*\|.*\|)?\s*$/:/^(?:begin|case|if|loop|for|while|function)\b/i;
   if(open.test(s)&&!(shell?/\b(?:fi|done|esac)\s*;?\s*$/:/\bend\s*;?\s*$/i).test(s))stack.push(i+1);
  }while(stack.length)add(stack.pop(),lines.length+1);
 }
 // Flat sectioned configuration formats.
 if(['ini','toml','conf','sshconfig'].includes(ext)){
  let section=0;for(let i=0;i<lines.length;i++)if((ext==='sshconfig'?/^\s*(?:Host|Match)\s+\S/i:/^\s*\[.+\]\s*(?:[#;].*)?$/).test(lines[i])){if(section)add(section,i+1);section=i+1;}if(section)add(section,lines.length+1);
 }
 // Explicit regions are supported regardless of the file extension.
 const regions=[];for(let i=0;i<lines.length;i++){if(/^\s*(?:\/\/|#|\/\*|<!--|--|;)\s*#?endregion\b/i.test(lines[i])){if(regions.length)add(regions.pop(),i+1);}else if(/^\s*(?:\/\/|#|\/\*|<!--|--|;)\s*#?region\b/i.test(lines[i]))regions.push(i+1);}while(regions.length)add(regions.pop(),lines.length+1);
 return normalize(ranges,lines);
}
export function activeScopes(scopes,line,max=5){
 const result=[];for(const scope of scopes){if(scope.line>=line)break;if(scope.end<=line)continue;while(result.length&&scope.end>result.at(-1).end)result.pop();result.push(scope);}return result.slice(-max);
}
