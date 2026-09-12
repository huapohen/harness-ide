import {startFileSessions} from './file-session.js';
import {pluginController} from './plugin-controller.js';
import {startHotUpdates} from './hot-client.js';
import './style.css';
import {Kernel} from './kernel.js';
import entries from '../plugins.config.js';
import {logMessage} from './ui.js';
const modules=import.meta.glob('./plugins/*.js');
const kernel=new Kernel();
try {
 await kernel.mount((await modules['./plugins/bridge.js']()).default);
 const control=await pluginController(kernel,entries,modules);
 for(const entry of entries){if(entry.id==='bridge'||!control.enabled(entry))continue;if(entry.enabled===false)continue;const load=modules[`./plugins/${entry.id}.js`];if(!load)throw new Error(`Unknown plugin ${entry.id}`);await kernel.mount(await control.load(entry.id),entry.id==='plugin-manager'?{entries}:entry.config);}

}catch(e){window.harnessSessionRestoreFailed=true;logMessage(e);console.error(e);}
try{await startHotUpdates(kernel);}catch(e){window.harnessSessionRestoreFailed=true;logMessage('Hot update restore failed: '+e.message);console.error(e);}
try{await startFileSessions(kernel);}catch(e){logMessage('Session backup failed: '+e.message);}
window.harnessHasUnsavedChanges=()=>kernel.services.has('workbench')&&kernel.get('workbench').tabs.some(t=>t.dirty);
window.addEventListener('beforeunload',e=>{if(!window.harnessHotUpdating&&kernel.services.has('workbench')&&kernel.get('workbench').tabs.some(t=>t.dirty)){e.preventDefault();e.returnValue='';}});
