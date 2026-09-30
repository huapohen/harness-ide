export const selectionCopyKeys={edit:'selection-copy-edit',preview:'selection-copy-preview'};
export function selectionCopyEnabled(mode,storage=globalThis.localStorage){
 return storage?.getItem(selectionCopyKeys[mode])===(mode==='edit'?'on':'off')?mode==='edit':mode==='preview';
}
