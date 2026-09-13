export function topTabLayout(items,width,gap=4,mode='free'){
 const sorted=items.map((item,index)=>({...item,index})).sort((a,b)=>(a.x||0)-(b.x||0));let end=0;if(mode!=='free'){const total=sorted.reduce((sum,item)=>sum+item.width,0)+Math.max(0,sorted.length-1)*gap;end=mode==='right'?Math.max(0,width-total):mode==='center'?Math.max(0,(width-total)/2):0;for(const item of sorted){item.left=end;end+=item.width+gap;}return sorted;}
 for(const item of sorted){item.left=Math.max(end,Math.min(Math.max(0,item.x||0),Math.max(0,width-item.width)));end=item.left+item.width+gap;}
 return sorted;
}
