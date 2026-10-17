import {themePalettes} from '../shared/theme-palettes.js';
export function backgroundKey(theme,mode='dark'){return 'harness-backgrounds-'+theme+(themePalettes.palettes[theme]?'-'+mode:'');}
export const backgroundDefaults={
 'one-dark-pro':{left:'#252930',right:'#252930',editor:'#282c34',terminal:'#282c34'},
 light:{left:'#f5f6f8',right:'#f5f6f8',editor:'#ffffff',terminal:'#ffffff'}
};
export function backgroundColors(theme,storage,mode='dark'){
 const palette=themePalettes.palettes[theme]?.[mode];
 const defaults=palette?{left:palette.bg,right:palette.bg,editor:palette.panel,terminal:palette.panel}:backgroundDefaults[theme]||backgroundDefaults['one-dark-pro'];let saved={};
 try{saved=JSON.parse(storage.getItem(backgroundKey(theme,mode)))||{};}catch{}
 return Object.fromEntries(Object.entries(defaults).map(([key,value])=>[key,/^#[0-9a-f]{6}$/i.test(saved[key])?saved[key]:value]));
}
