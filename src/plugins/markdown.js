import {highlightCodeBlocks} from '../source-editor.js';
import {marked} from 'marked';
import DOMPurify from 'dompurify';
export default {id:'markdown',requires:['documents'],activate(ctx){ctx.effect(ctx.get('documents').register('md',(container,text)=>{
 const wasOpen=container.dataset.tocOpen==='true';
 container.classList.remove('markdown');container.classList.add('markdown-preview');container.replaceChildren();
 const scroll=document.createElement('div');scroll.className='markdown-scroll';
 const article=document.createElement('article');article.className='markdown';article.innerHTML=DOMPurify.sanitize(marked.parse(text));
 highlightCodeBlocks(article).catch(console.error);
 article.querySelectorAll('a').forEach(a=>{a.onclick=e=>e.preventDefault();a.title='请在浏览器中打开链接';});scroll.append(article);
 const toggle=document.createElement('button');toggle.className='markdown-toc-toggle codicon codicon-list-tree';toggle.title='目录';toggle.setAttribute('aria-label','显示或隐藏目录');
 const nav=document.createElement('nav');nav.className='markdown-toc';nav.setAttribute('aria-label','文档目录');nav.id='toc-'+crypto.randomUUID();toggle.setAttribute('aria-controls',nav.id);
 const headings=[...article.querySelectorAll('h1,h2,h3,h4,h5,h6')],base=Math.min(...headings.map(h=>Number(h.tagName.slice(1))));
 for(const heading of headings){const link=document.createElement('button');link.className='markdown-toc-item';link.textContent=heading.textContent;link.title=heading.textContent;link.style.paddingLeft=(12+(Number(heading.tagName.slice(1))-base)*12)+'px';link.onclick=()=>{scroll.scrollTo({top:heading.getBoundingClientRect().top-scroll.getBoundingClientRect().top+scroll.scrollTop-16,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});nav.querySelectorAll('button').forEach(b=>b.classList.toggle('selected',b===link));};nav.append(link);}
 if(!headings.length){const empty=document.createElement('p');empty.textContent='暂无标题';nav.append(empty);}
 const setOpen=open=>{container.dataset.tocOpen=String(open);nav.hidden=!open;toggle.setAttribute('aria-expanded',String(open));};
 toggle.onclick=()=>setOpen(nav.hidden);nav.onkeydown=e=>{if(e.key==='Escape'){setOpen(false);toggle.focus();e.stopPropagation();}};
 container.append(scroll,toggle,nav);setOpen(wasOpen);
}));}};
