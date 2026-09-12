export function preserveCase(original,replacement){
 if(!original||!replacement)return replacement;
 const separators=['-','_'].filter(c=>original.includes(c)&&replacement.includes(c)&&original.split(c).length===replacement.split(c).length);
 if(separators.length===1){const c=separators[0],parts=original.split(c);return replacement.split(c).map((part,i)=>preserveCase(parts[i],part)).join(c);}
 if(original===original.toUpperCase())return replacement.toUpperCase();
 if(original===original.toLowerCase())return replacement.toLowerCase();
 const first=original[0];return (first!==first.toLowerCase()?replacement[0].toUpperCase():first!==first.toUpperCase()?replacement[0].toLowerCase():replacement[0])+replacement.slice(1);
}
