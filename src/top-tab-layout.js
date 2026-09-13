export function topTabLayout(items,width,gap=4){
 const sorted=items.map((item,index)=>({...item,index})).sort((a,b)=>(a.x||0)-(b.x||0));let end=0;
 for(const item of sorted){item.left=Math.max(end,Math.min(Math.max(0,item.x||0),Math.max(0,width-item.width)));end=item.left+item.width+gap;}
 return sorted;
}
