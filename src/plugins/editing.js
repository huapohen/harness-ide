import {explorerClipboardCommand} from '../explorer-transfer.js';
import {form,logMessage} from '../ui.js';
export function lineRange(value,start,end=start){const from=start===0?0:value.lastIndexOf('\n',start-1)+1;let to=value.indexOf('\n',end>start&&value[end-1]==='\n'?end-1:end);if(to<0)to=value.length;return {from,to};}
export default {id:'editing',requires:['workbench'],activate(ctx){
 const wb=ctx.get('workbench'),histories=new WeakMap();let lastEditable=null;
 const snap=e=>({value:e.value,start:e.selectionStart,end:e.selectionEnd});
 function history(e){if(!histories.has(e))histories.set(e,{undo:[],redo:[],last:snap(e),replaying:false});return histories.get(e);}
 const isInput=e=>e instanceof HTMLTextAreaElement||e instanceof HTMLInputElement;
 const focus=e=>{if(isInput(e.target)){lastEditable=e.target;if(e.target.classList.contains('source-editor'))history(e.target);}};
 const before=e=>{if(e.target.classList?.contains('source-editor'))history(e.target).before=snap(e.target);};
 const input=e=>{const t=e.target;if(!t.classList?.contains('source-editor')||t.cmEditor)return;const h=history(t);if(!h.replaying&&h.last.value!==t.value){h.undo.push(h.before||h.last);if(h.undo.length>200)h.undo.shift();h.redo=[];}h.before=null;h.last=snap(t);};
 document.addEventListener('focusin',focus);document.addEventListener('beforeinput',before);document.addEventListener('input',input);
 ctx.effect(()=>{document.removeEventListener('focusin',focus);document.removeEventListener('beforeinput',before);document.removeEventListener('input',input);});
 const target=()=>isInput(document.activeElement)?document.activeElement:document.activeElement?.closest('.cm-content')?.harnessSource||null;
 const editor=()=>{const e=target()||wb.current()?.editor;return e?.classList.contains('source-editor')?e:null;};
 const mutate=(e,text,start,end,selection)=>{const h=history(e);h.before=snap(e);e.setRangeText(text,start,end,'end');if(selection)e.setSelectionRange(...selection);e.dispatchEvent(new Event('input',{bubbles:true}));e.focus();};
 async function nativeClipboard(action,text){const handler=window.webkit?.messageHandlers?.clipboard;if(handler){const id=crypto.randomUUID();return new Promise((resolve,reject)=>{window.__clipboardPending ||= new Map();const timer=setTimeout(()=>{window.__clipboardPending.delete(id);reject(new Error('剪贴板操作超时'));},3000);window.__clipboardPending.set(id,{resolve:value=>{clearTimeout(timer);resolve(value);},reject});handler.postMessage({id,action,text:text||''});});}if(action==='read')return navigator.clipboard.readText();return navigator.clipboard.writeText(text);}
 window.harnessClipboardResult=(id,text)=>{const p=window.__clipboardPending?.get(id);if(p){window.__clipboardPending.delete(id);p.resolve(text);}};
 let mouseFile=null;
 const mouseDown=e=>{mouseFile=e.button===0?e.target.closest('.document,.keybindings-json'):null;};
 const mouseUp=e=>{const file=mouseFile;mouseFile=null;if(e.button!==0||!file)return;setTimeout(()=>{const input=target();let text='';if(input&&file.contains(input))text=input.cmEditor?input.cmEditor.selectedText():input.value.slice(input.selectionStart,input.selectionEnd);else{const selection=window.getSelection();if(selection&&file.contains(selection.anchorNode)&&file.contains(selection.focusNode))text=selection.toString();}if(text)nativeClipboard('write',text).catch(logMessage);},0);};
 document.addEventListener('mousedown',mouseDown);document.addEventListener('mouseup',mouseUp);ctx.effect(()=>{document.removeEventListener('mousedown',mouseDown);document.removeEventListener('mouseup',mouseUp);});
 async function copy(cut=false){
  if(explorerClipboardCommand(cut?'x':'c'))return;
  const t=wb.current();if(t?.kind==='terminal'&&t.element.contains(document.activeElement)){const selection=t.terminal.getSelection();if(selection)await nativeClipboard('write',selection);return;}
  const e=target();if(e?.cmEditor&&e.cmEditor.view.state.selection.ranges.length>1){const text=e.cmEditor.selectedText();if(text){await nativeClipboard('write',text);if(cut)e.cmEditor.replaceSelections('');}return;}if(e){let start=e.selectionStart,end=e.selectionEnd;if(start===end&&e.classList.contains('source-editor')){const line=lineRange(e.value,start);start=line.from;end=Math.min(e.value.length,line.to+1);}const text=e.value.slice(start,end);if(text){await nativeClipboard('write',text);if(cut&&!e.readOnly&&!e.disabled)mutate(e,'',start,end);}}
  else{const selected=window.getSelection()?.toString();if(selected)await nativeClipboard('write',selected);}
 }
 async function paste(){if(explorerClipboardCommand('v'))return;const t=wb.current(),e=target();const data=await nativeClipboard('read');if(t?.kind==='terminal'&&t.element.contains(document.activeElement))t.terminal.paste(data);else if(e?.cmEditor)e.cmEditor.replaceSelections(data);else if(e&&!e.readOnly&&!e.disabled)mutate(e,data,e.selectionStart,e.selectionEnd);}
 function undo(redo=false){if(wb.current()?.imageEditor)return wb.current().imageEditor.undo(redo);const e=editor();if(e?.cmEditor){e.cmEditor.run(redo?'redo':'undo');e.focus();return;}if(!e){document.execCommand(redo?'redo':'undo');return;}const h=history(e),from=redo?h.redo:h.undo,to=redo?h.undo:h.redo;if(!from.length)return;const value=from.pop();to.push(snap(e));h.replaying=true;e.value=value.value;e.setSelectionRange(value.start,value.end);e.dispatchEvent(new Event('input',{bubbles:true}));h.replaying=false;e.focus();}
 function lineAction(action){const e=editor();if(!e)return;if(e.cmEditor){const mapped={duplicate:'copyLineDown',delete:'deleteLine',select:'selectLine',up:'moveLineUp',down:'moveLineDown',below:'insertBlankLine'};if(mapped[action]){e.cmEditor.run(mapped[action]);e.focus();return;}}const {from,to}=lineRange(e.value,e.selectionStart,e.selectionEnd),text=e.value.slice(from,to),start=e.selectionStart,end=e.selectionEnd;
  if(action==='duplicate')mutate(e,'\n'+text,to,to,[to+1+(start-from),to+1+(end-from)]);
  if(action==='delete'){const a=to===e.value.length&&from>0?from-1:from,b=to<e.value.length?to+1:to;mutate(e,'',a,b,[a,a]);}
  if(action==='select'){e.focus();e.setSelectionRange(from,Math.min(e.value.length,to+1));}
  if(action==='below')mutate(e,'\n',to,to);
  if(action==='above')mutate(e,'\n',from,from,[from,from]);
  if(action==='comment'){const lines=text.split('\n'),remove=lines.every(l=>/^\s*\/\//.test(l));const replacement=lines.map(l=>remove?l.replace(/^(\s*)\/\/ ?/,'$1'):'// '+l).join('\n');mutate(e,replacement,from,to,[from,from+replacement.length]);}
  if(action==='up'&&from>0){const prev=e.value.lastIndexOf('\n',from-2)+1,previous=e.value.slice(prev,from-1);mutate(e,text+'\n'+previous,prev,to,[prev+start-from,prev+end-from]);}
  if(action==='down'&&to<e.value.length){let next=e.value.indexOf('\n',to+1);if(next<0)next=e.value.length;const following=e.value.slice(to+1,next);mutate(e,following+'\n'+text,from,next,[from+following.length+1+start-from,from+following.length+1+end-from]);}
 }
 async function find(replace=false){const t=wb.current();if(t?.editor?.cmEditor){t.showMode?.('source');t.editor.cmEditor.openSearch(replace);return;}const e=editor();if(!e)return;const result=await form(replace?'查找与替换':'查找',[{name:'find',label:'查找文本',value:e.value.slice(e.selectionStart,e.selectionEnd)},...(replace?[{name:'replacement',label:'替换为',required:false}]:[])],replace?'全部替换':'查找下一处');if(!result)return;if(replace){const count=e.value.split(result.find).length-1;if(!count){logMessage('未找到匹配文本');return;}mutate(e,e.value.split(result.find).join(result.replacement),0,e.value.length);logMessage(`已替换 ${count} 处`);}else{let index=e.value.indexOf(result.find,e.selectionEnd);if(index<0)index=e.value.indexOf(result.find);if(index<0){logMessage('未找到匹配文本');return;}e.focus();e.setSelectionRange(index,index+result.find.length);}}
 async function format(action){const t=wb.current(),e=t?.editor;if(!e?.cmEditor)throw Error('Open an editable file first');const language=(t.path||t.title).split('.').at(-1).toLowerCase();const from=e.selectionStart,to=e.selectionEnd,selected=to>from,original=e.value;let text=selected?original.slice(from,to):original;let indent='';if(selected){const lines=text.split('\n'),nonempty=lines.filter(l=>l.trim());indent=nonempty.length?nonempty.map(l=>l.match(/^[ \t]*/)[0]).reduce((a,b)=>a.length<b.length?a:b):'';if(indent)text=lines.map(l=>l.startsWith(indent)?l.slice(indent.length):l).join('\n');}const result=await ctx.get('api')('format',{text,language,action});if(e.value!==original)throw Error('File changed during formatting; retry');let output=result.text;if(selected){if(!text.endsWith('\n'))output=output.replace(/\n$/,'');if(indent)output=output.split('\n').map((l,i,a)=>l||i<a.length-1?indent+l:l).join('\n');}t.showMode?.('source');e.setRangeText(output,selected?from:0,selected?to:original.length,'select');e.focus();}
 const commands={
  'editor.format':['Format Document / Selection · 格式化',()=>format('format')],
  'editor.sortKeys':['Sort Keys · JSON / YAML',()=>format('sortKeys')],
  'edit.copy':['编辑 · 复制（无选区时复制当前行）',()=>copy()], 'edit.cut':['编辑 · 剪切（无选区时剪切当前行）',()=>copy(true)], 'edit.paste':['编辑 · 粘贴',paste],
  'edit.selectAll':['编辑 · 全选',()=>{const e=target(),t=wb.current();if(t?.kind==='terminal'&&t.element?.contains(document.activeElement))t.terminal.selectAll();else if(e)e.select();else if(t?.element){const selection=window.getSelection(),range=document.createRange();range.selectNodeContents(t.element.querySelector('.document-content')||t.element);selection.removeAllRanges();selection.addRange(range);}else document.execCommand('selectAll');}],
  'edit.undo':['编辑 · 撤销',()=>undo()], 'edit.redo':['编辑 · 重做',()=>undo(true)],
  'editor.duplicateLine':['编辑 · 复制当前行到下一行',()=>lineAction('duplicate')], 'editor.deleteLine':['编辑 · 删除当前行',()=>lineAction('delete')],
  'editor.selectLine':['编辑 · 选择当前行',()=>lineAction('select')], 'editor.moveLineUp':['编辑 · 上移当前行',()=>lineAction('up')], 'editor.moveLineDown':['编辑 · 下移当前行',()=>lineAction('down')],
  'editor.insertLineAbove':['编辑 · 在上方插入空行',()=>lineAction('above')], 'editor.insertLineBelow':['编辑 · 在下方插入空行',()=>lineAction('below')],
  'editor.selectAllMatches':['编辑 · 选中所有匹配项',()=>wb.current()?.editor?.cmEditor?.selectMatches()],
  'editor.toggleComment':['编辑 · 切换 // 行注释',()=>lineAction('comment')], 'editor.find':['编辑 · 查找',()=>find()], 'editor.replace':['编辑 · 查找与替换',()=>find(true)],
 };
 for(const name of ["selectGroupForward","cursorPageUp", "cursorLineUp", "cursorLineDown", "cursorPageDown", "cursorCharLeft", "cursorCharRight", "selectGroupBackward", "cursorLineStart", "cursorGroupBackward", "cursorGroupForward", "cursorLineEnd", "deleteCharBackward", "deleteCharForward", "insertNewlineAndIndent"])commands['editor.'+name]=['编辑 · '+name,()=>{const e=editor();if(e?.cmEditor){e.cmEditor.run(name);e.focus();}}];
 for(const [id,[label,run]]of Object.entries(commands))ctx.effect(wb.command(id,label,run));
 ctx.effect(()=>delete window.harnessClipboardResult);
}};
