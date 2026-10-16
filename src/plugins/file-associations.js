import {el,button} from '../ui.js';
import {normalizeExtension} from '../../shared/file-associations.js';
export default {id:'file-associations',requires:['api','settings-sections'],activate(ctx){
 const api=ctx.get('api');
 ctx.effect(ctx.get('settings-sections').register('file-associations','文件后缀与默认应用',container=>{
  let data,editing=null,busy=false,disposed=false,sequence=0;
  const note=el('p','panel-note','保存配置后点击“应用”生效；同类型后缀会一起更改。');
  const tools=el('div','association-toolbar'),search=el('input'),count=el('span','panel-note');search.placeholder='搜索后缀或应用…';search.setAttribute('aria-label','搜索文件后缀');
  const refresh=button('刷新','刷新文件关联',()=>load());tools.append(search,refresh);
  const form=el('form','association-form'),extension=el('input'),app=el('input'),suggestions=el('datalist');suggestions.id='association-app-options';extension.placeholder='例如 yml';extension.setAttribute('aria-label','文件后缀');extension.required=true;app.placeholder='选择应用或输入应用标识';app.setAttribute('aria-label','默认应用标识');app.setAttribute('list',suggestions.id);app.required=true;app.value='Harness IDE';
  const label=(name,input)=>{const node=el('label','settings-field');node.append(el('span','settings-label',name),input);return node;};
  const actions=el('div','association-actions'),save=el('button','','添加配置');save.type='submit';save.setAttribute('aria-label','保存文件关联配置');const reset=button('取消修改','取消修改文件关联',()=>clear());reset.type='button';reset.hidden=true;actions.append(save,reset);
  form.append(label('文件后缀',extension),label('默认应用',app),suggestions,actions);
  const status=el('p','association-status');status.setAttribute('role','status');const list=el('div','association-list');list.setAttribute('aria-label','文件后缀列表');const heading=el('div','association-toolbar');heading.append(count,button('添加后缀','添加后缀',()=>{clear();form.hidden=false;extension.focus();}));form.hidden=true;container.append(note,tools,heading,form,status,list);
  function clear(){form.hidden=true;editing=null;extension.value='';app.value='Harness IDE';save.textContent='添加配置';reset.hidden=true;}
  function appName(id,row){return [...(row?.apps||[]),...(data?.apps||[])].find(a=>a.id.toLowerCase()===id?.toLowerCase())?.name||id||'未设置';}
  function controls(){for(const node of container.querySelectorAll('button,input'))node.disabled=busy;}
  function render(){
   if(disposed||!data)return;list.replaceChildren();const query=search.value.trim().toLowerCase(),actual=new Map(data.rows.map(r=>[r.extension,r]));
   const filtered=data.entries.filter(row=>[row.extension,row.app,actual.get(row.extension)?.current,appName(actual.get(row.extension)?.current,actual.get(row.extension))].join(' ').toLowerCase().includes(query));
   count.textContent=`${filtered.length} / ${data.entries.length} 个后缀`;
   const apps=new Map();for(const row of data.rows)for(const a of row.apps||[])apps.set(a.id,a);for(const a of data.apps)apps.set(a.id,a);suggestions.replaceChildren(...[...apps.values()].map(a=>{const o=el('option','',a.id);o.value=a.name;return o;}));
   for(const row of filtered){
    const current=actual.get(row.extension),card=el('article','association-row');card.dataset.extension=row.extension;const top=el('div','association-row-heading');top.append(el('strong','', '.'+row.extension));
    const matches=current?.current?.toLowerCase()===row.app.toLowerCase();top.append(el('span','association-badge',matches?'已生效':'待应用'));
    card.append(top,el('div','association-current','当前：'+(current?appName(current.current,current):'读取失败')),el('div','association-target','配置：'+appName(row.app,current)));
    if(current?.aliases?.length>1)card.append(el('p','panel-note','共用类型：'+current.aliases.map(x=>'.'+x).join('、')));
    const buttons=el('div','association-actions');buttons.append(button('修改','修改 .'+row.extension,()=>{editing=row.extension;form.hidden=false;extension.value=row.extension;app.value=appName(row.app,current);save.textContent='保存修改';reset.hidden=false;extension.focus();}),button('应用','应用 .'+row.extension,()=>{
     if(!current)throw Error('请先刷新系统关联');
     const aliases=current.aliases?.length?current.aliases:[row.extension];
     if(confirm(`将 ${aliases.map(x=>'.'+x).join('、')} 默认交给 ${appName(row.app,current)} 打开？同一系统类型的后缀会一起更改。`))return change({action:'apply',extension:row.extension,expected:current.current});
    }));
    if(row.managed)buttons.append(button('恢复','恢复 .'+row.extension,()=>{if(confirm('恢复该类型在插件首次更改前的默认应用？'))return change({action:'restore',extension:row.extension});}));
    buttons.append(button('删除','删除 .'+row.extension,()=>{const keepCurrent=!!row.managed&&!row.managed.previous;if(confirm(keepCurrent?'原来没有默认应用。删除配置并保留当前系统关联？':row.managed?'删除配置并恢复原默认应用？外部后来设置的应用将保留。':'从管理列表删除？此前已有的系统关联不会被更改。'))return change({action:'delete',extension:row.extension,keepCurrent});}));card.append(buttons);list.append(card);
   }
   if(!filtered.length)list.append(el('p','panel-note','没有匹配的后缀，可在上方添加。'));controls();
  }
  async function load(){const token=++sequence;status.textContent='正在读取系统默认应用…';try{const result=await api('settings/associations/read');if(disposed||token!==sequence)return;data=result;render();status.textContent=data.error||'';}catch(e){if(!disposed&&token===sequence)status.textContent=e.message;}}
  async function change(patch){if(busy||!data)return;busy=true;controls();status.textContent=patch.action==='apply'||patch.action==='restore'?'正在等待 macOS 应用更改，请查看系统确认框…':'正在保存…';try{const result=await api('settings/associations/write',{...patch,version:data.version});if(disposed)return;data=result;clear();render();status.textContent=data.error||'已保存；列表显示系统实际关联。';}catch(error){if(!disposed){await load();status.textContent=error.message;}}finally{busy=false;if(!disposed)controls();}}
  form.onsubmit=e=>{e.preventDefault();try{const next=normalizeExtension(extension.value);if(!editing&&data?.entries.some(r=>r.extension===next))throw Error('后缀已存在，请使用列表中的“修改”');change({action:'save',extension:editing||next,nextExtension:next,app:[...(data?.apps||[]),...(data?.rows||[]).flatMap(r=>r.apps||[])].find(a=>a.name===app.value.trim())?.id||app.value.trim()});}catch(error){status.textContent=error.message;}};
  search.oninput=render;load();return()=>{disposed=true;sequence++;container.replaceChildren();};
 }));
}};
