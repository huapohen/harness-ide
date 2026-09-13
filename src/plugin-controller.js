export async function pluginController(kernel,entries,modules){
 const api=kernel.get('api'),core=new Set(['bridge','workbench','explorer','documents','themes','keybindings','plugin-manager','startup']);
 const version=(await fetch(new URL('hot-manifest.json',location.href)).then(r=>r.json())).version;let catalog=await api('settings/plugins/read',{version}),states=catalog.states,busy=false;
 const load=async id=>(catalog.urls[id]?await import(/* @vite-ignore */ catalog.urls[id]):await modules[`./plugins/${id}.js`]()).default;
 const config=e=>e.id==='plugin-manager'?{entries}:e.config;
 const service={list:()=>entries.map(e=>({id:e.id,state:states[e.id]||'enabled',loaded:kernel.plugins.has(e.id),core:core.has(e.id)})),async change(id,state){
  if(busy)throw Error('A plugin operation is in progress');if(core.has(id))throw Error('This component is required by the IDE');const entry=entries.find(e=>e.id===id);if(!entry)throw Error('Unknown plugin');busy=true;
  const old=states[id]||'enabled',wb=kernel.get('workbench');
  try{
   if(state!=='enabled'&&id==='terminal'&&wb.tabs.some(t=>t.kind==='terminal'))throw Error('Close terminal tabs before disabling this plugin.');
   if(state!=='enabled'&&['markdown','html','pdf'].includes(id)&&wb.tabs.some(t=>t.path&&({markdown:['md','markdown'],html:['html','htm'],pdf:['pdf']}[id].includes(t.path.split('.').pop().toLowerCase()))))throw Error('Close this plugin’s file tabs first.');
   if(state==='enabled'&&old==='uninstalled'){await api('settings/plugins/write',{id,state});catalog=await api('settings/plugins/read',{version});}
   if(state==='enabled'&&!kernel.plugins.has(id))await kernel.mount(await load(id),config(entry));
   if(state!=='enabled'&&kernel.plugins.has(id))await kernel.unmount(id);
   try{states=await api('settings/plugins/write',{id,state});}catch(e){if(old==='enabled'&&!kernel.plugins.has(id))await kernel.mount(await load(id),config(entry));else if(old!=='enabled'&&kernel.plugins.has(id))await kernel.unmount(id);throw e;}
   await wb.showPanel('plugins');
  }catch(error){try{states=await api('settings/plugins/write',{id,state:old});}catch{}throw error;}finally{busy=false;}
 }};
 kernel.services.set('plugin-control',{owner:'plugin-controller',value:service});
 return {load,enabled:e=>core.has(e.id)||(states[e.id]||'enabled')==='enabled',config};
}
