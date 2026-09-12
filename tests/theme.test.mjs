import {test} from 'node:test';
import assert from 'node:assert/strict';
import {installThemeAdapter} from '../src/ghostty-theme.js';
test('theme adapter recolors viewport without changing terminal state',()=>{
 const cell={fg_r:171,fg_g:178,fg_b:191,bg_r:40,bg_g:44,bg_b:52};let received;
 const terminal={element:{style:{}},renderer:{setTheme(){},render(buffer,force){received={line:buffer.getLine(0),force};}}};
 const dark={foreground:'#abb2bf',background:'#282c34'},light={foreground:'#383a42',background:'#ffffff'};
 const set=installThemeAdapter(terminal,dark);set(light);terminal.renderer.render({getLine:()=>[cell]},false);
 assert.equal(received.line[0].bg_r,255);assert.equal(received.line[0].fg_r,56);assert.equal(received.force,true);assert.equal(cell.bg_r,40);
 set(dark);terminal.renderer.render({getLine:()=>[cell]},false);assert.equal(received.line[0].bg_r,40);
});
test('inactive panes hide the rendered cursor and force repaint on focus changes',()=>{
 let focused=true,received;const originalDocument=globalThis.document;globalThis.document={activeElement:{}};
 try{
 const terminal={element:{style:{},contains:()=>focused},renderer:{setTheme(){},render(buffer,force){received={cursor:buffer.getCursor(),force};}}};
 installThemeAdapter(terminal,{background:'#282c34'});
 const cursor={x:1,y:2,visible:true},buffer={getCursor:()=>cursor,getLine:()=>[]};
 terminal.renderer.render(buffer,false);assert.equal(received.cursor.visible,true);
 focused=false;terminal.renderer.render(buffer,false);assert.equal(received.cursor.visible,false);assert.equal(received.force,true);assert.equal(cursor.visible,true);
 terminal.renderer.render(buffer,false);assert.equal(received.force,false);
 focused=true;terminal.renderer.render(buffer,false);assert.equal(received.cursor.visible,true);assert.equal(received.force,true);
 }finally{if(originalDocument===undefined)delete globalThis.document;else globalThis.document=originalDocument;}
});
