export function htmlPath(current,href){
 const base=new URL('https://harness.invalid/'+current.split('/').map(encodeURIComponent).join('/').replace(/^\//,''));
 const url=new URL(href,base);
 if(url.origin!==base.origin)throw Error('此预览仅支持本地页面链接');
 const path=decodeURIComponent(url.pathname.slice(1));
 return {path:current.startsWith('/')?'/'+path:path,hash:url.hash};
}
