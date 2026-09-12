import theme from './file-icons.json';
const suffixes=Object.keys(theme.extensions).sort((a,b)=>b.length-a.length);
export function fileIcon(name){
 const lower=name.toLowerCase();const suffix=suffixes.find(ext=>lower.endsWith('.'+ext.toLowerCase()));
 const key=theme.names[name]||theme.names[lower]||theme.extensions[suffix]||theme.default;
 const icon=theme.definitions[key]||theme.definitions[theme.default],lightKey=theme.light.fileNames?.[name]||theme.light.fileExtensions?.[suffix]||(key===theme.default?theme.light.file:null)||key;
 const light=theme.definitions[lightKey]||icon;
 return {character:String.fromCodePoint(parseInt(icon.fontCharacter.replace(/\\/g,''),16)),dark:icon.fontColor||'#abb2bf',light:light.fontColor||'#383a42'};
}
