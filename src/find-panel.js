import {preserveCase} from './preserve-case.js';
import {SearchQuery,getSearchQuery,setSearchQuery,findNext,findPrevious,replaceNext,replaceAll,closeSearchPanel,selectMatches} from '@codemirror/search';
import {el,button} from './ui.js';
export function createFindPanel(view){
 const dom=el('div','find-widget'),first=el('div','find-row'),second=el('div','find-row find-replace-row');
 const input=el('input','find-input');input.placeholder='Find';input.setAttribute('aria-label','查找');input.setAttribute('main-field','true');
 const replacement=el('input','find-input');replacement.placeholder='Replace';replacement.setAttribute('aria-label','替换为');
 const counter=el('span','find-count');let sensitive=false,word=false,regex=false,keepCase=false,scope=null,expanded=!!view.harnessReplace;
 const toggle=button('›','展开 / 收起替换',()=>showReplace(!expanded),'replace-toggle');
 const controls=[['Aa','区分大小写',()=>sensitive=!sensitive],['ab','全字匹配',()=>word=!word],['.*','使用正则表达式',()=>regex=!regex]].map(([label,title,run])=>button(label,title,()=>{run();commit();},'find-option'));
 const scoped=button('≡','仅在选区查找',()=>{scope=scope?null:view.state.selection.ranges.filter(r=>!r.empty).map(r=>({from:r.from,to:r.to}));if(!scope?.length)scope=null;commit();},'find-option');
 const all=button('','全选匹配',()=>{selectMatches(view);view.focus();},'find-icon find-select-all');
 all.innerHTML='<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 5V2h3M11 2h3v3M14 11v3h-3M5 14H2v-3M5 5h6v6H5z"/></svg>';
 const searchBox=el('div','find-search-box'),searchOptions=el('div','find-search-options');searchOptions.append(...controls);searchBox.append(input,searchOptions);
 first.append(toggle,searchBox,all,counter,button('↑','上一个匹配',()=>findPrevious(view)),button('↓','下一个匹配',()=>findNext(view)),scoped,button('×','关闭查找',()=>{closeSearchPanel(view);view.focus();}));
 const replaceIcon=(title,run,multiple)=>{const b=button('',title,run,'find-icon');b.innerHTML='<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 3h6M2 6h4M3 9h9m-3-3 3 3-3 3'+(multiple?'M3 14h10':'')+'"/></svg>';return b;};
 const keep=button('AB','Preserve Case · 保留大小写',()=>{keepCase=!keepCase;keep.classList.toggle('on',keepCase);keep.setAttribute('aria-pressed',String(keepCase));},'find-option preserve-case');keep.setAttribute('aria-pressed','false');
 function replaceWithCase(every){
  if(!keepCase)return (every?replaceAll:replaceNext)(view);
  if(view.state.readOnly)return false;
  const q=getSearchQuery(view.state);if(!q.valid)return false;
  const cursor=q.getCursor(view.state),matches=[];for(let item=cursor.next();!item.done;item=cursor.next())matches.push(item.value);
  if(!every){const selection=view.state.selection.main,match=matches.find(m=>m.from===selection.from&&m.to===selection.to);if(!match)return findNext(view);matches.splice(0,matches.length,match);}
  // Use the pinned CodeMirror replacement parser to retain regex capture expansion.
  const parser=q.create();const changes=matches.map(m=>({from:m.from,to:m.to,insert:preserveCase(view.state.sliceDoc(m.from,m.to),parser.getReplacement(m))}));
  if(changes.length)view.dispatch({changes,userEvent:'input.replace'});if(!every)findNext(view);return !!changes.length;
 }
 const replaceActions=el('div','find-replace-actions');replaceActions.append(replaceIcon('替换当前匹配',()=>replaceWithCase(false),false),replaceIcon('全部替换',()=>replaceWithCase(true),true));
 const replacementBox=el('div','replacement-box');replacementBox.append(replacement,keep);second.append(replacementBox,replaceActions);
 dom.append(first,second);
 function showReplace(value){expanded=value;second.hidden=!value;toggle.textContent=value?'⌄':'›';toggle.setAttribute('aria-expanded',String(value));view.harnessReplace=value;}
 function commit(){view.dispatch({effects:setSearchQuery.of(new SearchQuery({search:input.value,replace:replacement.value,caseSensitive:sensitive,wholeWord:word,regexp:regex,literal:!regex,test:scope?(_,state,from,to)=>scope.some(r=>from>=r.from&&to<=r.to):undefined}))});}
 function draw(){const query=getSearchQuery(view.state);if(input.value!==query.search)input.value=query.search;if(replacement.value!==query.replace)replacement.value=query.replace;sensitive=query.caseSensitive;word=query.wholeWord;regex=query.regexp;[sensitive,word,regex].forEach((active,i)=>{controls[i].classList.toggle('on',active);controls[i].setAttribute('aria-pressed',String(active));});scoped.classList.toggle('on',!!scope);
  let count=0,index=0;const cursor=query.valid?query.getCursor(view.state):null;if(cursor)for(let next=cursor.next();!next.done&&count<10000;next=cursor.next()){count++;if(next.value.from===view.state.selection.main.from)index=count;}
  all.disabled=!count;counter.textContent=!query.search?'':!query.valid?'无效正则':count?`${index||'–'} / ${count}${count===10000?'+':''}`:'No results';input.setAttribute('aria-invalid',String(!!query.search&&!query.valid));
 }
 input.oninput=commit;replacement.oninput=commit;
 dom.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();closeSearchPanel(view);view.focus();}else if(e.key==='Enter'){e.preventDefault();if(e.altKey){selectMatches(view);view.focus();}else if(e.target===replacement)replaceWithCase(false);else(e.shiftKey?findPrevious:findNext)(view);}};
 showReplace(expanded);draw();view.harnessFindPanel={showReplace};
 return {dom,top:true,mount(){input.focus();input.select();},update(update){if(scope&&update.docChanged)scope=scope.map(r=>({from:update.changes.mapPos(r.from,1),to:update.changes.mapPos(r.to,-1)}));draw();},destroy(){delete view.harnessFindPanel;}};
}
