import {el} from './ui.js';
export function inlineCreate(host,dir,directory,value,submit){
 const parent=dir==='.'?null:[...host.querySelectorAll('.file-row')].find(r=>r.dataset.path===dir);
 const target=parent?.parentElement.querySelector(':scope > .tree-children')||host.querySelector('.tree-root-children');
 if(!target)throw Error('目录尚未展开');
 const row=el('div','file-row explorer-create'),input=el('input','explorer-rename');row.style.paddingLeft=parent?(parseFloat(parent.style.paddingLeft)+10)+'px':'18px';input.value=value;input.setAttribute('aria-label',directory?'Folder name':'File name');row.append(input);target.prepend(row);
 let done=false,busy=false;const cancel=()=>{if(done||busy)return;done=true;input.setCustomValidity('');row.remove();};
 row.onclick=row.ondblclick=row.onpointerdown=e=>e.stopPropagation();
 input.oninput=()=>input.setCustomValidity('');input.onblur=cancel;
 input.onkeydown=async e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();cancel();}if(e.key!=='Enter'||busy||done)return;e.preventDefault();const name=input.value.trim();if(!name||name==='.'||name==='..'||/[\\/\0]/.test(name)){input.setCustomValidity('请输入有效名称');input.reportValidity();return;}busy=true;input.readOnly=true;try{await submit(name);done=true;row.remove();}catch(error){busy=false;input.readOnly=false;input.setCustomValidity(error.message);input.reportValidity();input.focus();}};
 input.focus();input.select();row.scrollIntoView({block:'nearest'});
}
