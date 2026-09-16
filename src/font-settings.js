export const fonts={overviewWidth:50,size:13,terminalSize:13,sidebarSize:13,family:'Menlo',cursorColor:'#c678dd',treeColor:'#a3aab7',markdownColor:'#b0b0b0',headingColor:'#8abebf'};
export function applyFonts(value={}){
 if(Number.isFinite(value.overviewWidth)&&value.overviewWidth>=20&&value.overviewWidth<=200)fonts.overviewWidth=value.overviewWidth;
 document.documentElement.style.setProperty('--overview-width',fonts.overviewWidth+'px');
 for(const key of ['treeColor','markdownColor','headingColor','cursorColor']){if(/^#[0-9a-f]{6}$/i.test(value[key]||''))fonts[key]=value[key];document.documentElement.style.setProperty('--'+key,fonts[key]);}
 if(Number.isFinite(value.terminalSize)&&value.terminalSize>=8&&value.terminalSize<=40)fonts.terminalSize=value.terminalSize;
 if(Number.isFinite(value.size)&&value.size>=8&&value.size<=40)fonts.size=value.size;
 if(Number.isFinite(value.sidebarSize)&&value.sidebarSize>=8&&value.sidebarSize<=40)fonts.sidebarSize=value.sidebarSize;
 document.documentElement.style.setProperty('--sidebar-font-size',fonts.sidebarSize+'px');
 if(typeof value.family==='string'&&value.family.trim())fonts.family=value.family.trim();
 document.documentElement.style.setProperty('--content-font-size',fonts.size+'px');
 document.documentElement.style.setProperty('--content-font-family',JSON.stringify(fonts.family)+', monospace');
 window.dispatchEvent(new Event('content-font-changed'));
}
