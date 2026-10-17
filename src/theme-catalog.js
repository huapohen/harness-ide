import {themePalettes} from '../shared/theme-palettes.js';
export const builtinThemes={
 'one-dark-pro':{label:'One Dark Pro',terminal:{background:'#282c34',foreground:'#abb2bf',cursor:'#c678dd',black:'#282c34',red:'#e06c75',green:'#98c379',yellow:'#e5c07b',blue:'#61afef',magenta:'#c678dd',cyan:'#56b6c2',white:'#abb2bf'}},
 light:{label:'Light',terminal:{background:'#ffffff',foreground:'#383a42',cursor:'#c678dd',black:'#383a42',red:'#e45649',green:'#50a14f',yellow:'#986801',blue:'#4078f2',magenta:'#a626a4',cyan:'#0184bc',white:'#fafafa'}}};
export const themeChoices=[...Object.entries(builtinThemes).map(([id,t])=>({id,label:t.label})),...themePalettes.themes.map(({id,name})=>({id,label:name}))];
export function resolveTheme(id,mode='dark'){
 if(builtinThemes[id])return {...builtinThemes[id],mode:id==='light'?'light':'dark',colors:{}};
 const palette=themePalettes.palettes[id]?.[mode];if(!palette)return resolveTheme('one-dark-pro');
 const base=builtinThemes[mode==='light'?'light':'one-dark-pro'];
 return {label:themeChoices.find(t=>t.id===id).label,mode,colors:{bg:palette.panel,sidebar:palette.bg,chrome:palette.bg,fg:palette.ink,strong:palette.ink,muted:palette.muted,border:palette.border,accent:palette.accent,hover:palette.soft,selected:palette.soft,code:palette.bg,blue:palette.accent},terminal:{...base.terminal,background:palette.panel,foreground:palette.ink,cursor:palette.accent}};
}
