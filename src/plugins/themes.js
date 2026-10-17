import {savePreference} from '../preferences.js';
import {backgroundColors,backgroundKey} from '../background-colors.js';
import {builtinThemes,themeChoices,resolveTheme} from '../theme-catalog.js';
export default {id:'themes',requires:['workbench'],activate(ctx,config){
 const wb=ctx.get('workbench'),root=document.documentElement;
 let current=localStorage.getItem('harness-theme')||config.default||'one-dark-pro';
 if(!themeChoices.some(t=>t.id===current))current='one-dark-pro';
 let mode=localStorage.getItem('harness-theme-mode')==='light'?'light':'dark';
 const base=()=>resolveTheme(current,mode),backgrounds=()=>backgroundColors(current,localStorage,base().mode);
 const resolved=()=>({...base(),terminal:{...base().terminal,background:backgrounds().terminal}});
 let applied=[];
 const apply=()=>{
  const theme=base();for(const key of applied)root.style.removeProperty('--'+key);
  applied=Object.keys(theme.colors);for(const [key,value]of Object.entries(theme.colors))root.style.setProperty('--'+key,value);
  for(const [key,value]of Object.entries(backgrounds()))root.style.setProperty('--'+key+'-background',value);
  // Existing syntax, icons and scrollbars use the matching light/dark baseline.
  root.dataset.theme=theme.mode==='light'?'light':'one-dark-pro';root.dataset.palette=builtinThemes[current]?'':current;
  window.webkit?.messageHandlers.windowChrome?.postMessage({action:'theme',light:theme.mode==='light'});
  savePreference('harness-theme',current);savePreference('harness-theme-mode',theme.mode);
  wb.$('#theme-button').textContent=theme.label+(builtinThemes[current]?'':theme.mode==='light'?' · 浅色':' · 深色');
  ctx.emit('theme.changed',resolved());
 };
 const setMode=value=>{if(!['light','dark'].includes(value))return;mode=value;if(builtinThemes[current])current=mode==='light'?'light':'one-dark-pro';apply();};
 ctx.provide('theme',{
  current:resolved,backgrounds,mode:()=>base().mode,setMode,
  setBackground:(key,value)=>{if(!Object.hasOwn(backgrounds(),key)||!/^#[0-9a-f]{6}$/i.test(value))return;savePreference(backgroundKey(current,base().mode),JSON.stringify({...backgrounds(),[key]:value}));apply();},
  resetBackgrounds:()=>{savePreference(backgroundKey(current,base().mode),null);apply();},
  id:()=>current,list:()=>themeChoices,
  select:id=>{if(!themeChoices.some(t=>t.id===id))return;mode=base().mode;current=id;apply();}
 });
 ctx.effect(wb.command('theme.toggle','主题 · 切换浅色 / 深色',()=>setMode(base().mode==='light'?'dark':'light')));
 apply();ctx.effect(()=>{delete root.dataset.theme;delete root.dataset.palette;for(const key of [...applied,...['left','right','editor','terminal'].map(k=>k+'-background')])root.style.removeProperty('--'+key);});
}};
