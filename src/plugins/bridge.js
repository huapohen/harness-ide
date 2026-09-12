export default {id:'bridge',activate(ctx){
 const token=location.hash.slice(1) || sessionStorage.getItem('harness-token');sessionStorage.setItem('harness-token',token);history.replaceState(null,'',location.pathname);
 ctx.provide('api',async(name,data={})=>{const r=await fetch(`/api/${name}`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(data)});const result=await r.json();if(!r.ok)throw new Error(result.error || 'Connection refused');return result;});
 ctx.provide('terminal.connect',(resume)=>new WebSocket(`${location.origin.replace('http','ws')}/terminal?token=${encodeURIComponent(token)}${resume?'&resume='+encodeURIComponent(resume):''}`));
}};
