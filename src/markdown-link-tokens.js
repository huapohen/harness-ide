import {marked} from 'marked';
export function markdownLinks(text){
 const out=[],tokens=marked.lexer(text);let offset=0;
 const visit=(items,start)=>{let cursor=start;for(const t of items||[]){if(!t.raw)continue;const from=text.indexOf(t.raw,cursor);if(from<0)continue;const to=from+t.raw.length;cursor=to;if(t.type==='link'||t.type==='image')out.push({from,to,href:t.href});else if(t.type==='codespan'&&/^(?:\.{0,2}\/|~\/|file:|https?:)/.test(t.text))out.push({from,to,href:t.text});else if(t.type!=='code'){if(t.tokens)visit(t.tokens,from);if(t.items)visit(t.items,from);if(t.type==='table'){for(const cell of [...t.header,...t.rows.flat()])visit(cell.tokens,from);}}}};
 visit(tokens,offset);return out;
}
export const isImageLink=href=>/\.(png|jpe?g|gif|webp|svg|bmp|ico|avif)(?:[?#].*)?$/i.test(href);
