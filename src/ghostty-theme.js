// ghostty-web 0.4 exposes CanvasRenderer but its options.theme setter is a no-op.
// Adapt its public render interfaces; the WASM state and PTY remain untouched.
// RGB values matching the original palette follow the theme (including explicit
// true-color values that happen to equal a palette entry).
export function installThemeAdapter(term,initial){
 const renderer=term.renderer,render=renderer.render.bind(renderer);let mapping=new Map(),dirty=false,lastFocused;
 const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
 const key=(c,p)=>`${c[p+'_r']},${c[p+'_g']},${c[p+'_b']}`;
 const mapLine=line=>line?.map(cell=>{const fg=mapping.get(key(cell,'fg')),bg=mapping.get(key(cell,'bg'));if(!fg&&!bg)return cell;return {...cell,...(fg?{fg_r:fg[0],fg_g:fg[1],fg_b:fg[2]}:{}),...(bg?{bg_r:bg[0],bg_g:bg[1],bg_b:bg[2]}:{})};});
 const wrap= (target,method)=>new Proxy(target,{get(obj,prop){if(prop==='getCursor'&&method==='getLine')return ()=>{const cursor=obj.getCursor();return {...cursor,visible:cursor.visible&&(typeof document==='undefined'||term.element.contains(document.activeElement))};};if(prop===method)return i=>mapLine(obj[method](i));const value=Reflect.get(obj,prop);return typeof value==='function'?value.bind(obj):value;}});
 renderer.render=(buffer,force,viewport,scrollback,opacity)=>{const focused=typeof document==='undefined'||term.element.contains(document.activeElement);const focusChanged=focused!==lastFocused;lastFocused=focused;render(wrap(buffer,'getLine'),force||dirty||focusChanged,viewport,scrollback?wrap(scrollback,'getScrollbackLine'):undefined,opacity);dirty=false;};
 return colors=>{mapping=new Map();for(const name of Object.keys(initial)){if(name==='cursor')continue;if(colors[name]&&initial[name]!==colors[name])mapping.set(rgb(initial[name]).join(','),rgb(colors[name]));}renderer.setTheme(colors);term.element.style.backgroundColor=colors.background;dirty=true;};
}
