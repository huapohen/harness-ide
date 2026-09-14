const keys=['office-open-mode','terminal-show-identity','editor-word-wrap','ide-zoom','harness-theme','harness-backgrounds-one-dark-pro','harness-backgrounds-light'];
let api,pending=Promise.resolve();
export async function loadPreferences(call){
 api=call;const saved=(await api('settings/layout/read')).preferences||{},migration={};
 for(const key of keys){if(Object.hasOwn(saved,key)){if(saved[key]===null)localStorage.removeItem(key);else localStorage.setItem(key,saved[key]);}else if(localStorage.getItem(key)!==null)migration[key]=localStorage.getItem(key);}
 if(Object.keys(migration).length)await api('settings/layout/write',{preferences:migration});
}
export function savePreference(key,value){
 if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value);
 pending=pending.catch(()=>{}).then(()=>api('settings/layout/write',{preferences:{[key]:value}})).catch(error=>console.debug('Unable to save preference',error));
}
