export function addSearchFolder(value,root,folder){
 const base=root.replace(/\/+$/,'');const chosen=folder.replace(/\/+$/,'');
 if(chosen!==base&&!chosen.startsWith(base+'/'))throw Error('请选择当前工作区内的文件夹');
 const relative=chosen===base?'':chosen.slice(base.length+1);
 if(/[,\*]/.test(relative))throw Error('该目录名含通配符或逗号，请手动设置搜索条件');
 const pattern=relative?relative+'/**':'**';
 const entries=value.split(',').map(s=>s.trim()).filter(Boolean);if(!entries.includes(pattern))entries.push(pattern);return entries.join(', ');
}
