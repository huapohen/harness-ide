import test from 'node:test';
import assert from 'node:assert/strict';
import {editorPointerLifecycle} from '../src/editor-pointer.js';
function target(){const listeners=new Map();return {addEventListener(n,f){listeners.set(n,f);},removeEventListener(n){listeners.delete(n);},fire(n,e={}){listeners.get(n)?.(e);},listeners};}
test('missing compatibility mouseup cannot extend selection after tab switch',()=>{
 const doc=target(),win=target(),content=target(),inside={};doc.defaultView=win;content.ownerDocument=doc;
 const view={contentDOM:content,dom:{contains:t=>t===inside},inputState:{},state:{selection:{anchor:4,head:4}}};let ended=0;
 const arm=()=>{view.inputState.mouseSelection={destroy(){ended++;view.inputState.mouseSelection=null;},up(){this.destroy();}};};
 const dispose=editorPointerLifecycle(view);
 arm();doc.fire('pointerdown',{target:inside});assert.equal(ended,0);
 doc.fire('pointerdown',{target:{}});assert.equal(ended,1);assert.deepEqual(view.state.selection,{anchor:4,head:4});
 for(const [surface,event] of [[doc,'pointerup'],[doc,'pointercancel'],[content,'blur'],[win,'blur']]){arm();surface.fire(event,{button:0});assert.equal(view.inputState.mouseSelection,null);}
 dispose();assert.equal(doc.listeners.size,0);assert.equal(win.listeners.size,0);assert.equal(content.listeners.size,0);
});
