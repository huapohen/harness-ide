// Shared, dependency-free validation and matching. No eval of user configuration.
export const defaults = [
 ['cmd+q','markdown.togglePreview','previewFileActive && !dialogFocus && !terminalFocus'],
 ['cmd+shift+2','markdown.togglePreview','!dialogFocus'],
 ['cmd+shift+e','workbench.sidebar','!dialogFocus'],
 ['cmd+alt+b','view.secondary','!dialogFocus'],
 ['shift+u','editor.selectGroupForward','editorTextFocus'],
 ["shift+z", "editor.cursorPageUp", "editorTextFocus"],
 ["shift+x", "editor.cursorLineUp", "editorTextFocus"],
 ["shift+c", "editor.cursorLineDown", "editorTextFocus"],
 ["shift+v", "editor.cursorPageDown", "editorTextFocus"],
 ["shift+n", "editor.cursorCharLeft", "editorTextFocus"],
 ["shift+m", "editor.cursorCharRight", "editorTextFocus"],
 ["shift+y", "editor.selectGroupBackward", "editorTextFocus"],
 ["shift+h", "editor.cursorLineStart", "editorTextFocus"],
 ["shift+j", "editor.cursorGroupBackward", "editorTextFocus"],
 ["shift+k", "editor.cursorGroupForward", "editorTextFocus"],
 ["shift+l", "editor.cursorLineEnd", "editorTextFocus"],
 ["shift+i", "editor.deleteCharBackward", "editorTextFocus"],
 ["shift+p", "editor.deleteCharForward", "editorTextFocus"],
 ["shift+o", "editor.insertNewlineAndIndent", "editorTextFocus"],
 ["shift+f", "editor.insertLineBelow", "editorTextFocus"],

 ['ctrl+z','edit.undo','textInputFocus || imageFocus'],['ctrl+shift+z','edit.redo','textInputFocus || imageFocus'],['ctrl+s','files.save'],['alt+shift+w','tabs.closeAll'],
 ['cmd+backspace','explorer.delete','explorerFocus && !dialogFocus'],
 ['cmd+-','workbench.zoomOut','true'], ['cmd+=','workbench.zoomIn','true'], ['cmd+shift+=','workbench.zoomIn','true'], ['cmd+0','workbench.zoomReset','true'],
 ['cmd+n','file.newText'], ['cmd+o','file.openDialog'], ['cmd+e','terminal.new'], ['cmd+d','markdown.togglePreview'], ['cmd+w','tabs.close'], ['cmd+shift+w','tabs.closeAll'],
 ['cmd+3','tabs.pin'], ['cmd+1','tabs.previous'], ['cmd+2','tabs.next'],
 ['cmd+s','files.save'], ['cmd+shift+s','files.saveAll'],
 ['cmd+,','settings.keybindings'], ['cmd+k cmd+s','settings.keybindings'],
 ['cmd+shift+p','workbench.palette'], ['cmd+b','workbench.sidebar'],
 ['cmd+c','edit.copy','true'], ['ctrl+c','edit.copy','!terminalFocus || terminalHasSelection'],
 ['cmd+v','edit.paste','true'], ['ctrl+v','edit.paste','true'], ['cmd+x','edit.cut','true'], ['ctrl+x','edit.cut','true'],
 ['cmd+a','terminal.dock'], ['ctrl+a','edit.selectAll','true'], ['cmd+z','edit.undo','textInputFocus || imageFocus'],
 ['cmd+shift+z','terminal.toggleMaximize'], ['cmd+y','edit.redo','textInputFocus || imageFocus'],
 ['ctrl+d','editor.duplicateLine','editorTextFocus'],
 ['cmd+shift+k','editor.deleteLine','editorTextFocus'], ['shift+d','editor.deleteLine','editorTextFocus'],
 ['ctrl+d','terminal.eof','terminalFocus'],
 ['cmd+f','editor.find','fileTabActive && !dialogFocus'], ['cmd+shift+f','search.workspace'], ['alt+enter','editor.selectAllMatches','editorTextFocus || findInputFocus'], ['cmd+shift+l','editor.selectAllMatches','editorTextFocus'], ['cmd+alt+f','editor.replace','fileTabActive && !dialogFocus'],
 ['cmd+l','editor.selectLine','editorTextFocus'], ['cmd+/','editor.toggleComment','editorTextFocus'],
 ['cmd+up','editor.moveLineUp','editorTextFocus'], ['cmd+down','editor.moveLineDown','editorTextFocus'],
 ['alt+up','editor.moveLineUp','editorTextFocus'], ['alt+down','editor.moveLineDown','editorTextFocus'],
 ['shift+alt+down','editor.duplicateLine','editorTextFocus'],
 ['cmd+enter','editor.insertLineBelow','editorTextFocus'], ['cmd+shift+enter','editor.insertLineAbove','editorTextFocus'],
].map(([key,command,when='!dialogFocus'])=>({key,command,when}));
export const contexts = new Set(['previewFileActive','imageFocus','explorerFocus','findInputFocus','terminalFocus','terminalHasSelection','editorTextFocus','textInputFocus','fileTabActive','tabActive','dialogFocus','true','false']);
export function normalizeKey(text) {
 if(typeof text!=='string'||text.length>160)throw new Error('快捷键必须是字符串');
 return text.trim().toLowerCase().split(/\s+/).map(stroke=>{
  const aliases={command:'cmd',meta:'cmd',control:'ctrl',option:'alt',return:'enter',esc:'escape'};
  const pieces=stroke.split('+').map(p=>aliases[p]||p);const key=pieces.pop();
  if(!key || !/^(?:[a-z0-9,./;\[\]\\'`=\-]|f(?:[1-9]|1[0-9]|2[0-4])|enter|escape|tab|space|backspace|delete|up|down|left|right|home|end|pageup|pagedown)$/.test(key))throw new Error(`不支持的按键：${key}`);
  if(pieces.some(p=>!['cmd','ctrl','alt','shift'].includes(p))||new Set(pieces).size!==pieces.length)throw new Error('修饰键只能是 cmd / ctrl / alt / shift');
  return ['cmd','ctrl','alt','shift'].filter(p=>pieces.includes(p)).concat(key).join('+');
 }).join(' ');
}
export function eventKey(e) {
 const names={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',' ':'space',Escape:'escape'};
 const physical=/^Key[A-Z]$/.test(e.code||'')?e.code.slice(3).toLowerCase():/^Digit[0-9]$/.test(e.code||'')?e.code.slice(5):null;
 const key=physical||({Equal:'=',Minus:'-',NumpadAdd:'=',NumpadSubtract:'-'})[e.code]||names[e.key]||e.key?.toLowerCase();
 if(!key || ['shift','control','alt','meta','capslock','dead','process'].includes(key))return '';
 return [e.metaKey&&'cmd',e.ctrlKey&&'ctrl',e.altKey&&'alt',e.shiftKey&&'shift',key].filter(Boolean).join('+');
}
export function evaluateWhen(expression='',context={}) {
 if(!expression.trim())return true;
 const tokens=expression.match(/&&|\|\||!|\(|\)|[A-Za-z][A-Za-z0-9]*/g)||[];
 if(tokens.join('')!==expression.replace(/\s/g,''))throw new Error('when 仅支持上下文名称、!、&&、||、括号');
 let i=0;
 function primary(){const t=tokens[i++];if(t==='!')return !primary();if(t==='('){const v=or();if(tokens[i++]!==')')throw new Error('when 括号不匹配');return v;}if(!contexts.has(t))throw new Error(`未知上下文：${t}`);return t==='true'||(t!=='false'&&!!context[t]);}
 function and(){let v=primary();while(tokens[i]==='&&'){i++;const r=primary();v=v&&r;}return v;}
 function or(){let v=and();while(tokens[i]==='||'){i++;const r=and();v=v||r;}return v;}
 const value=or();if(i!==tokens.length)throw new Error('when 表达式无效');return value;
}
export function validateBindings(value) {
 if(!Array.isArray(value)||value.length>500)throw new Error('JSON 必须是最多 500 条记录的数组');
 return value.map((item,i)=>{
  if(!item||typeof item.command!=='string'||!/^[a-zA-Z][\w.-]*$/.test(item.command))throw new Error(`第 ${i+1} 条缺少有效 command`);
  const key=normalizeKey(item.key);if(key.split(' ').length>2)throw new Error('最多支持两段组合键');
  const when=item.when??'';if(typeof when!=='string'||when.length>250)throw new Error('when 过长');evaluateWhen(when);
  if(item.args!==undefined && JSON.stringify(item.args).length>4000)throw new Error('args 过长');
  return {key,command:item.command,when,...(item.args===undefined?{}:{args:item.args})};
 });
}
export function resolveBinding(bindings,key,context) {
 return [...bindings].reverse().find(b=>b.key===key&&evaluateWhen(b.when,context));
}
