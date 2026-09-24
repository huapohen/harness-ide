import test from 'node:test';
import assert from 'node:assert/strict';
import {editorPointerLifecycle,preserveEditorFocusScroll} from '../src/editor-pointer.js';
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

test('native focus cannot change the viewport between the two mouse hit tests',()=>{
 const scrollDOM={scrollTop:23624,scrollLeft:80};
 const selection={anchor:0,head:0};let received;
 const content={focus(options){received=options;scrollDOM.scrollTop=0;scrollDOM.scrollLeft=0;}};
 const original=content.focus,dispose=preserveEditorFocusScroll({contentDOM:content,scrollDOM});
 const hitTest=()=>scrollDOM.scrollTop===23624?32141:210;
 const anchor=hitTest();content.focus({preventScroll:true});const head=hitTest();
 assert.equal(anchor,head);assert.deepEqual(scrollDOM,{scrollTop:23624,scrollLeft:80});
 assert.deepEqual(received,{preventScroll:true});assert.deepEqual(selection,{anchor:0,head:0});
 dispose();assert.equal(content.focus,original);
});
test('focus preserves short-file scroll and restores inherited native method',()=>{
 const scrollDOM={scrollTop:30,scrollLeft:0};
 const proto={focus(){scrollDOM.scrollTop=0;}};const content=Object.create(proto);
 const dispose=preserveEditorFocusScroll({contentDOM:content,scrollDOM});
 content.focus();assert.equal(scrollDOM.scrollTop,30);
 dispose();assert.equal(Object.hasOwn(content,'focus'),false);assert.equal(content.focus,proto.focus);
});
