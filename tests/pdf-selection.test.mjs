import test from 'node:test';
import assert from 'node:assert/strict';
import {installPDFSelectionCopy} from '../src/pdf-selection.js';
function events(){const listeners=new Map();return {addEventListener:(n,f)=>listeners.set(n,f),removeEventListener:n=>listeners.delete(n),fire:(n,e)=>listeners.get(n)?.(e)};}
const tick=()=>new Promise(resolve=>setTimeout(resolve,5));
test('PDF copies a finished selection, not a right click or scroll key',async()=>{
 const sent=[],doc={...events(),getSelection:()=>({toString:()=>''})};
 const frame={...events(),dataset:{},isConnected:true,contentDocument:doc};
 const host={...events(),document:{activeElement:frame},webkit:{messageHandlers:{clipboard:{postMessage:x=>sent.push(x)}}}};
 const dispose=installPDFSelectionCopy(frame,host);frame.fire('load');
 doc.fire('mouseup',{button:2,clientX:10,clientY:10,detail:1});doc.fire('keyup',{key:'ArrowDown'});await tick();assert.equal(sent.length,0);
 doc.fire('mousedown',{button:0,clientX:10,clientY:10});doc.fire('mouseup',{button:0,clientX:50,clientY:10,detail:1});await tick();assert.equal(sent[0].action,'copyPdfSelection');
 doc.getSelection=()=>({toString:()=> 'PDF text'});doc.fire('mouseup',{button:0,detail:2});await tick();assert.equal(sent[1].text,'PDF text');
 host.document.activeElement=null;doc.fire('mouseup',{button:0,detail:2});await tick();assert.equal(sent.length,2);
 dispose();doc.fire('mouseup',{button:0,detail:2});await tick();assert.equal(sent.length,2);
});
