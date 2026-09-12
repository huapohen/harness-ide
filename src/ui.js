export function el(tag, cls='', text='') {const e=document.createElement(tag);e.className=cls;e.textContent=text;return e;}
export function button(text,title,fn,cls='') {const e=el('button',cls,text);e.title=title;e.setAttribute('aria-label',title);e.onclick=()=>Promise.resolve().then(fn).catch(logMessage);return e;}
export function logMessage(error) { console.debug('[Harness]', error?.message || String(error)); }
export function form(title,fields,submit='确认',options={}) {return new Promise(resolve=>{
 const d=el('dialog','dialog'+(options.compact?' compact-dialog':''));d.setAttribute('aria-label',options.ariaLabel||title||'Create');const f=el('form');if(title)f.append(el('h2','',title));const inputs={};
 for(const field of fields){const label=el('label','',field.label);const input=el('input');input.setAttribute('aria-label',field.ariaLabel||field.label||field.name);input.value=field.value||'';input.placeholder=field.placeholder||'';input.required=field.required!==false;inputs[field.name]=input;label.append(input);f.append(label);}
 const actions=el('div','actions');const cancel=button('取消','取消',()=>d.close());cancel.type='button';const ok=el('button','primary',submit);ok.type='submit';actions.append(cancel,ok);f.append(actions);d.append(f);document.body.append(d);
 f.onsubmit=e=>{e.preventDefault();resolve(Object.fromEntries(Object.entries(inputs).map(([k,v])=>[k,v.value])));d.close();};d.onclose=()=>{resolve(null);d.remove();};d.showModal();
 });}
export function saveDecision(title) { return new Promise(resolve=>{
 const dialog=el('dialog','dialog');dialog.append(el('h2','',`保存对“${title}”的修改？`),el('p','','关闭前可以保存修改，或丢弃本次修改。'));
 let answer='cancel';const actions=el('div','actions');
 for(const [label,value,cls] of [['取消','cancel',''],['不保存','discard',''],['保存','save','primary']])actions.append(button(label,label,()=>{answer=value;dialog.close();},cls));
 dialog.append(actions);dialog.onclose=()=>{resolve(answer);dialog.remove();};document.body.append(dialog);dialog.showModal();
 });}

export function menuAt(x,y,items){
 document.querySelector('.context-menu')?.remove();const menu=el('div','context-menu');menu.role='menu';
 const controller=new AbortController();const close=()=>{controller.abort();menu.remove();};
 for(const item of items){if(!item){menu.append(el('hr'));continue;}const b=button((item.checked===undefined?'':item.checked?'✓  ':'   ')+item.label,item.label,()=>{close();return item.run();});b.disabled=!!item.disabled;b.role=item.checked===undefined?'menuitem':'menuitemcheckbox';if(item.checked!==undefined)b.setAttribute('aria-checked',String(item.checked));menu.append(b);}
 document.body.append(menu);menu.style.left=Math.max(4,Math.min(x,innerWidth-menu.offsetWidth-4))+'px';menu.style.top=Math.max(4,Math.min(y,innerHeight-menu.offsetHeight-4))+'px';menu.tabIndex=-1;menu.focus();
 document.addEventListener('pointerdown',e=>{if(!menu.contains(e.target))close();},{signal:controller.signal});document.addEventListener('keydown',e=>{if(e.key==='Escape')close();if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();const buttons=[...menu.querySelectorAll('button:not(:disabled)')],i=buttons.indexOf(document.activeElement);buttons[(i+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();}},{signal:controller.signal});return menu;
}
