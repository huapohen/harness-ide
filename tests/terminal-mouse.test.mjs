import test from 'node:test';
import assert from 'node:assert/strict';
import {mouseReport,installTerminalMouse} from '../src/terminal-mouse.js';
test('mouse reports honor pane coordinates, scaling, SGR release and modifiers',()=>{
 const term={cols:80,rows:24,element:{querySelector:()=>({getBoundingClientRect:()=>({left:100,top:50,width:800,height:480})})},getMode:()=>true};
 assert.equal(mouseReport(term,{clientX:115,clientY:75},0),'\x1b[<0;2;2M');
 assert.equal(mouseReport(term,{clientX:115,clientY:75,ctrlKey:true},0,true),'\x1b[<16;2;2m');
 term.getMode=()=>false;
 assert.equal(mouseReport(term,{clientX:115,clientY:75},0,true),'\x1b[M'+String.fromCharCode(35,34,34));
});

test('Herdr receives native right-click reports; ordinary terminals keep IDE menus',()=>{
 const listeners=new Map(),sent=[];let herdr=false;
 const mount={addEventListener:(n,f)=>listeners.set(n,f),removeEventListener:n=>listeners.delete(n)};
 const term={cols:80,rows:24,element:{querySelector:()=>({getBoundingClientRect:()=>({left:0,top:0,width:800,height:480})})},getMode:()=>true,hasMouseTracking:()=>true,focus(){}};
 const dispose=installTerminalMouse(term,mount,s=>sent.push(s),()=>herdr);
 const event={button:2,clientX:5,clientY:5,preventDefault(){},stopImmediatePropagation(){}};
 listeners.get('mousedown')(event);assert.equal(sent.length,0);
 herdr=true;listeners.get('mousedown')(event);listeners.get('mouseup')(event);
 assert.deepEqual(sent,['\x1b[<2;1;1M','\x1b[<2;1;1m']);
 listeners.get('mousedown')({...event,shiftKey:true});assert.equal(sent.length,2);dispose();assert.equal(listeners.size,0);
});
