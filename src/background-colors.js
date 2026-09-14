export const backgroundDefaults={
 'one-dark-pro':{left:'#2b3038',right:'#2b3038',editor:'#282c34',terminal:'#282c34'},
 light:{left:'#f5f6f8',right:'#f5f6f8',editor:'#ffffff',terminal:'#ffffff'}
};
export function backgroundColors(theme,storage){
 const defaults=backgroundDefaults[theme]||backgroundDefaults['one-dark-pro'];let saved={};
 try{saved=JSON.parse(storage.getItem('harness-backgrounds-'+theme))||{};}catch{}
 return Object.fromEntries(Object.entries(defaults).map(([key,value])=>[key,/^#[0-9a-f]{6}$/i.test(saved[key])?saved[key]:value]));
}
