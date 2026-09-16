import {savePreference} from '../preferences.js';
import {assetURL} from '../asset-url.js';
import {fonts,applyFonts} from '../font-settings.js';
import {sourceEditor} from '../source-editor.js';
import {defaults,eventKey,validateBindings,resolveBinding,evaluateWhen} from '../../shared/keybindings.js';
import {el,button,logMessage} from '../ui.js';
export default {id:'keybindings',requires:['api','workbench'],async activate(ctx){
 const api=ctx.get('api'),wb=ctx.get('workbench');let record,bindings=defaults,settingsTab,jsonTab,prefix='',prefixTimer,lastError='',polling=false;
 const context=()=>{const focused=document.activeElement,t=wb.current(),terminalFocus=!!(t?.kind==='terminal'&&t.element.contains(focused));return {previewFileActive:t?.kind==='file'&&/\.(md|markdown|html|htm)$/i.test(t.path||t.title||''),imageFocus:!!focused?.closest('.image-editor'),explorerFocus:!!focused?.closest('.sidebar[data-panel="explorer"]')&&!focused?.matches('input,textarea'),terminalFocus,terminalHasSelection:terminalFocus&&!!t.terminal.getSelection(),editorTextFocus:!!focused?.classList?.contains('source-editor')||!!focused?.closest('.cm-content'),findInputFocus:!!focused?.closest('.find-widget'),textInputFocus:focused instanceof HTMLTextAreaElement||focused instanceof HTMLInputElement||!!focused?.closest('.cm-content'),fileTabActive:t?.kind==='file',tabActive:!!t,dialogFocus:!!document.querySelector('dialog[open]')};};
 function resetChord(){prefix='';clearTimeout(prefixTimer);wb.$('#shortcut-state').textContent='';}
 function dispatch(stroke){
  if(document.querySelector('.key-capture[open]'))return false;
  if(stroke==='escape'&&prefix){resetChord();return true;}
  const state=context();const full=prefix?prefix+' '+stroke:stroke;
  if(prefix){const match=resolveBinding(bindings,full,state);resetChord();if(match){execute(match);return true;}logMessage('组合键没有匹配的命令');return true;}
  if(bindings.some(b=>b.key.startsWith(stroke+' ')&&evaluateWhen(b.when,state))){prefix=stroke;wb.$('#shortcut-state').textContent=`${stroke} …`;prefixTimer=setTimeout(resetChord,1800);return true;}
  const match=resolveBinding(bindings,stroke,state);if(!match)return false;execute(match);return true;
 }
 function execute(binding){Promise.resolve().then(()=>wb.run(binding.command,binding.args)).catch(logMessage);}
 const keydown=e=>{if(e.isComposing||e.keyCode===229)return;const key=eventKey(e);if(key&&dispatch(key)){e.preventDefault();e.stopImmediatePropagation();}};
 document.addEventListener('keydown',keydown,true);ctx.effect(()=>document.removeEventListener('keydown',keydown,true));
 window.harnessDispatchShortcut=dispatch;
 function nativeKeys(){window.webkit?.messageHandlers?.shortcuts?.postMessage([...new Set(bindings.flatMap(b=>b.key.split(' ')).concat('escape'))]);}
 function apply(next){record=next;if(next.error){if(lastError!==next.error){logMessage('快捷键 JSON 无效，保留上次配置：'+next.error);lastError=next.error;}}else{bindings=next.bindings;lastError='';resetChord();nativeKeys();}renderPanel();}
 async function load(){apply(await api('settings/read'));}
 async function write(text,version=record.version){const value=validateBindings(JSON.parse(text));for(const b of value)if(!wb.commands.has(b.command))throw new Error(`未知命令：${b.command}`);const next=await api('settings/write',{text,version});apply(next);return next;}
 function renderPanel(){if(!settingsTab)return;const element=settingsTab.element;const query=element.querySelector('.key-search')?.value||'';const body=element.querySelector('.key-rows');if(!body)return;body.replaceChildren();element.querySelector('.key-path').textContent=record?.path||'';element.querySelector('.key-error').textContent=record?.error?'JSON 错误：'+record.error:'';
  for(const [id,command]of wb.commands){const assigned=bindings.map((b,index)=>({...b,index})).filter(b=>b.command===id);const rows=assigned.length?assigned:[{command:id,key:'',when:'',index:-1}];
   for(const binding of rows){if(![id,command.label,binding.key,binding.when].join(' ').toLowerCase().includes(query.toLowerCase()))continue;const row=el('div','key-row');row.append(el('div','key-command',command.label),el('code','key-key',binding.key||'未绑定'),el('code','key-when',binding.when||'始终'));
    const controls=el('div','key-controls');controls.append(button('修改','修改 '+command.label,()=>edit(binding)));if(binding.index>=0)controls.append(button('×','移除 '+binding.key,()=>saveBindings(bindings.filter((_,i)=>i!==binding.index))));
    row.append(controls);row.title=id;const other=bindings.filter(b=>b.key===binding.key&&b.command!==id);if(other.length){row.classList.add('key-conflict');row.title+='\n同键还用于：'+other.map(b=>b.command+' ('+b.when+')').join(', ')+'；按 when 区分，后面的条目优先。';}body.append(row);
   }
  }
 }
 const saveBindings=value=>write(JSON.stringify(value,null,2)+'\n');
 async function edit(binding){
  const dialog=el('dialog','dialog key-capture');dialog.append(el('h2','','修改快捷键'),el('p','',binding.command));
  const keyLabel=el('label','','快捷键（例如 cmd+e，组合键 cmd+k cmd+s）'),keyInput=el('input');keyInput.value=binding.key;keyInput.setAttribute('aria-label','快捷键');keyLabel.append(keyInput);
  const whenLabel=el('label','','生效条件 when'),whenInput=el('input');whenInput.value=binding.when||'!dialogFocus';whenInput.setAttribute('aria-label','生效条件');whenLabel.append(whenInput);
  let recording=false;const recordButton=button('录制按键','录制按键',()=>{recording=!recording;recordButton.textContent=recording?'请按快捷键…':'录制按键';});
  dialog.addEventListener('keydown',e=>{if(!recording||e.isComposing)return;if(['Meta','Control','Alt','Shift'].includes(e.key))return;e.preventDefault();e.stopPropagation();keyInput.value=eventKey(e);recording=false;recordButton.textContent='录制按键';},true);
  const error=el('p','key-error'),actions=el('div','actions');actions.append(button('取消','取消',()=>dialog.close()),button('保存','保存快捷键',async()=>{try{const next=[...bindings],value={key:keyInput.value,command:binding.command,when:whenInput.value};if(binding.index<0)next.push(value);else next[binding.index]=value;await saveBindings(next);dialog.close();}catch(e){error.textContent=e.message;}},'primary'));
  dialog.append(keyLabel,recordButton,whenLabel,el('p','panel-note','可用条件：editorTextFocus、terminalFocus、terminalHasSelection、textInputFocus、fileTabActive、tabActive、dialogFocus。支持 !、&&、||。'),error,actions);dialog.onclose=()=>dialog.remove();document.body.append(dialog);dialog.showModal();
 }
 function openSettings(){
  if(settingsTab&&wb.tabs.includes(settingsTab)){wb.open(settingsTab);return;}
  const element=el('section','settings-page tab-content'),head=el('div','settings-heading');head.append(el('h1','','键盘快捷键'),button('打开 JSON','打开快捷键 JSON',openJSON),button('恢复默认','恢复默认快捷键',async()=>{if(confirm('恢复全部默认快捷键？'))await saveBindings(defaults);}));
  const search=el('input','key-search');search.placeholder='搜索命令、快捷键或条件…';search.setAttribute('aria-label','搜索快捷键');search.oninput=renderPanel;
  element.append(head,el('p','settings-description','按功能查看和修改。同一按键按生效条件区分，JSON 中靠后的条目优先。Shift+D 已设为删行，会占用编辑区的大写 D 输入，可自行改绑。'),el('code','key-path'),el('p','key-error'),search);
  const titles=el('div','key-row key-header');for(const text of ['命令','快捷键','生效条件','操作'])titles.append(el('span','',text));element.append(titles,el('div','key-rows'));
  settingsTab={id:'settings:keybindings',title:'键盘快捷键',kind:'settings',icon:'⚙',element};wb.open(settingsTab);renderPanel();
 }
 function openJSON(){
  if(jsonTab&&wb.tabs.includes(jsonTab)){wb.open(jsonTab);return;}
  const element=el('section','document tab-content'),toolbar=el('div','document-toolbar'),editor=el('textarea','source-editor');editor.spellcheck=false;editor.value=record.text;editor.setAttribute('aria-label','快捷键 JSON');let version=record.version,saved=record.text;
  toolbar.append(el('span','','KEYBINDINGS.JSON'),button('重新读取','重新读取快捷键 JSON',async()=>{if(jsonTab.dirty&&!confirm('丢弃未保存的 JSON 修改？'))return;await load();version=record.version;saved=record.text;editor.value=record.text;jsonTab.dirty=false;wb.render();}),button('保存并应用','保存快捷键 JSON',()=>jsonTab.save()));const source=sourceEditor(editor,'json');element.append(source.element);
  jsonTab={id:'settings:keybindings-json',title:'keybindings.json',kind:'file',path:record.path,icon:'{}',element,editor,external:true,dispose:()=>source.dispose(),resize:()=>source.refresh(),focus:()=>editor.focus(),save:async()=>{if(!jsonTab.dirty)return;const text=editor.value;const next=await write(text,version);version=next.version;saved=text;jsonTab.dirty=editor.value!==saved;wb.render();logMessage('快捷键已保存并生效');}};
  jsonTab.hotSnapshot=()=>({version,saved,editor:editor.cmEditor.snapshot()});jsonTab.hotRestore=state=>{version=state.version;saved=state.saved;editor.cmEditor.restore(state.editor);jsonTab.dirty=editor.value!==saved;};
  editor.oninput=()=>{jsonTab.dirty=editor.value!==saved;wb.render();};wb.open(jsonTab);
 }
 ctx.effect(wb.command('settings.keybindings','设置 · 键盘快捷键',openSettings));ctx.effect(wb.command('settings.keybindingsJSON','设置 · 打开快捷键 JSON',openJSON));
 ctx.effect(wb.panel('settings','Settings','⚙',container=>{
  container.classList.add('settings-panel');
  const group=(title)=>{const details=el('details','settings-group');details.append(el('summary','',title));const body=el('div','settings-group-body');details.append(body);container.append(details);return body;};
  const row=(parent,label,control)=>{const field=el('label','settings-field');field.append(el('span','settings-label',label),control);parent.append(field);return control;};
  const select=(label,choices,value,change)=>{const input=el('select');input.setAttribute('aria-label',label);for(const [v,text] of choices){const option=el('option','',text);option.value=v;input.append(option);}input.value=value;input.onchange=()=>change(input.value);return input;};
  let pending=Promise.resolve();const saveFont=patch=>{applyFonts(patch);const font={...fonts};pending=pending.catch(()=>{}).then(()=>api('settings/layout/write',{font})).catch(logMessage);};
  const type=group('字体与字号');
  for(const [key,label] of [['size','文件字号'],['sidebarSize','侧栏字号'],['terminalSize','终端字号']]){const input=el('input');input.type='number';input.min='8';input.max='40';input.step='1';input.value=fonts[key];input.setAttribute('aria-label',label);input.onchange=()=>{if(input.value&&input.reportValidity())saveFont({[key]:Number(input.value)});};row(type,label,input);}
  const family=select('字体',[[fonts.family,fonts.family]],fonts.family,value=>saveFont({family:value}));row(type,'字体',family);
  fetch(assetURL('/font-families.json')).then(r=>r.json()).then(names=>{family.replaceChildren();for(const name of new Set([fonts.family,...names])){const option=el('option','',name);option.value=name;family.append(option);}family.value=fonts.family;}).catch(()=>{});
  const appearance=group('主题与颜色'),theme=ctx.get('theme');const themeSelect=select('主题',theme.list().map(t=>[t.id,t.label]),theme.id(),v=>theme.select(v));themeSelect.id='settings-theme-select';row(appearance,'主题',themeSelect);
  for(const [key,label]of [['left','左侧栏背景'],['right','右侧栏背景'],['editor','文件区域背景'],['terminal','终端背景']]){const control=el('div','background-control'),picker=el('input'),input=el('input');picker.type='color';input.type='text';input.placeholder='#RRGGBB';input.pattern='#[0-9a-fA-F]{6}';for(const node of [picker,input]){node.dataset.backgroundKey=key;node.value=theme.backgrounds()[key];}picker.setAttribute('aria-label',label+'选色');input.setAttribute('aria-label',label);picker.oninput=()=>{input.setCustomValidity('');theme.setBackground(key,picker.value);};input.oninput=()=>input.setCustomValidity('');input.onchange=()=>{const value=input.value.trim();if(!/^#[0-9a-f]{6}$/i.test(value)){input.setCustomValidity('请输入 #RRGGBB');input.reportValidity();return;}theme.setBackground(key,value);};control.append(picker,input);row(appearance,label,control);}
  appearance.append(button('恢复背景默认值','恢复当前主题的背景默认值',()=>theme.resetBackgrounds()));
  for(const [key,label]of [['treeColor','左右侧栏前景色'],['markdownColor','Markdown 正文'],['headingColor','Markdown 标题']]){const input=el('input');input.value=fonts[key];input.placeholder='#RRGGBB 或 0–255';input.setAttribute('aria-label',label.endsWith('色')?label:label+'颜色');input.oninput=()=>input.setCustomValidity('');input.onchange=()=>{let value=input.value.trim();if(/^\d{1,3}$/.test(value)&&Number(value)<=255)value='#'+Number(value).toString(16).padStart(2,'0').repeat(3);if(!/^#[0-9a-f]{6}$/i.test(value)){input.setCustomValidity('请输入 #RRGGBB 或 0–255 灰度值');input.reportValidity();return;}input.setCustomValidity('');input.value=value;saveFont({[key]:value});};row(appearance,label,input);}
  const office=group('Office 文件');row(office,'打开方式',select('Office 打开方式',[['system','跟随系统默认应用（默认）'],['preview','IDE 内只读预览（需要已有 LibreOffice）']],localStorage.getItem('office-open-mode')||'system',v=>savePreference('office-open-mode',v)));
  const terminal=group('终端'),presets=[['#c678dd','粉色（默认）'],['#abb2bf','灰色'],['#61afef','蓝色'],['#98c379','绿色'],['#e5c07b','黄色'],['#e5e9f0','白色'],['','自定义']];
  row(terminal,'显示环境、用户名和主机名（新终端生效）',select('显示终端身份信息',[['off','关闭（默认）'],['on','开启']],localStorage.getItem('terminal-show-identity')||'off',v=>savePreference('terminal-show-identity',v)));
  const custom=el('input');custom.value=fonts.cursorColor;custom.placeholder='#RRGGBB';custom.setAttribute('aria-label','终端光标自定义颜色');const preset=select('终端光标预置颜色',presets,presets.some(([v])=>v===fonts.cursorColor)?fonts.cursorColor:'',v=>{if(v){custom.value=v;custom.setCustomValidity('');saveFont({cursorColor:v});}else custom.focus();});custom.oninput=()=>custom.setCustomValidity('');custom.onchange=()=>{const v=custom.value.trim();if(!/^#[0-9a-f]{6}$/i.test(v)){custom.setCustomValidity('请输入 #RRGGBB');custom.reportValidity();return;}preset.value=presets.some(([value])=>value===v)?v:'';saveFont({cursorColor:v});};row(terminal,'预置颜色',preset);row(terminal,'自定义颜色',custom);
  const editor=group('编辑器');const overview=el('input');overview.type='number';overview.min='20';overview.max='200';overview.step='1';overview.value=fonts.overviewWidth;overview.setAttribute('aria-label','大滑块宽度');overview.onchange=()=>{if(overview.value&&overview.reportValidity())saveFont({overviewWidth:Number(overview.value)});};row(editor,'大滑块宽度（px，20–200）',overview);row(editor,'自动换行',select('编辑器换行',[['on','开启'],['off','关闭']],localStorage.getItem('editor-word-wrap')||'off',v=>{savePreference('editor-word-wrap',v);window.dispatchEvent(new Event('editor-word-wrap-changed'));}));
  const shortcuts=group('快捷键与命令');shortcuts.append(button('键盘快捷键','键盘快捷键',openSettings),button('命令面板','命令面板',()=>wb.run('workbench.palette')));
 }));
 ctx.on('theme.changed',()=>{const select=wb.$('#settings-theme-select');if(select)select.value=ctx.get('theme').id();const colors=ctx.get('theme').backgrounds();for(const input of document.querySelectorAll('[data-background-key]')){input.value=colors[input.dataset.backgroundKey];input.setCustomValidity('');}});
 await load();
 const poll=setInterval(async()=>{if(polling)return;polling=true;try{const next=await api('settings/read');if(next.version!==record.version)apply(next);}catch{}finally{polling=false;}},2000);
 ctx.effect(()=>{clearInterval(poll);resetChord();delete window.harnessDispatchShortcut;});
 ctx.provide('keybindings',{bindings:()=>bindings,context,dispatch});
}};
