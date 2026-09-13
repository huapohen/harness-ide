// Range endpoints follow visible order; collapsed descendants are excluded by callers.
export function selectRange(items,anchor,target,current=[],additive=false){
 const end=items.indexOf(target),start=items.indexOf(anchor);
 if(end<0)return new Set(current);
 return new Set([...(additive?current:[]),...items.slice(Math.min(start<0?end:start,end),Math.max(start<0?end:start,end)+1)]);
}
