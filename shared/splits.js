export function splitLeaf(tree,target,added,direction){
 if(tree===target)return {direction,children:[target,added]};
 if(!tree?.children)return tree;
 return {...tree,children:tree.children.map(child=>splitLeaf(child,target,added,direction))};
}
export function removeLeaf(tree,target){
 if(tree===target)return null;
 if(!tree?.children)return tree;
 const children=tree.children.map(child=>removeLeaf(child,target)).filter(Boolean);
 return children.length===1?children[0]:children.length?{...tree,children}:null;
}
export function leaves(tree){return tree?.children?tree.children.flatMap(leaves):tree?[tree]:[];}
