// Live tabs keep their identity. Replaced preview tabs keep only a path, never editor buffers.
export function tabVisits(){
 const items=[];
 function visit(tab){if(!tab)return;forget(tab);items.push({tab});}
 function forget(tab){const i=items.findIndex(x=>x.tab===tab);if(i>=0)items.splice(i,1);}
 function replaced(tab){const entry=items.find(x=>x.tab===tab);if(!entry||!tab.path)return;delete entry.tab;entry.file={path:tab.path,external:tab.external,previewGroup:tab.previewGroup};const previews=items.filter(x=>x.file);if(previews.length>50)items.splice(items.indexOf(previews[0]),1);}
 return {visit,forget,replaced,clear:()=>items.splice(0),last:()=>items.at(-1),takeFile:()=>items.pop().file};
}
