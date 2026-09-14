import {test} from 'node:test';
import assert from 'node:assert/strict';
import {installThemeAdapter} from '../src/ghostty-theme.js';
test('shared ANSI colors do not override terminal default foreground and background',()=>{
 let cells;const term={element:{style:{}},renderer:{render(buffer){cells=buffer.getLine(0);},setTheme(){}}};
 const initial={background:'#282c34',foreground:'#abb2bf',black:'#282c34',white:'#abb2bf'};
 const apply=installThemeAdapter(term,initial);
 const buffer={getLine:()=>[{fg_r:171,fg_g:178,fg_b:191,bg_r:40,bg_g:44,bg_b:52}]};
 apply({background:'#ffffff',foreground:'#383a42',black:'#383a42',white:'#fafafa'});term.renderer.render(buffer);
 assert.deepEqual(cells[0],{fg_r:56,fg_g:58,fg_b:66,bg_r:255,bg_g:255,bg_b:255});
 apply(initial);term.renderer.render(buffer);assert.deepEqual(cells,buffer.getLine(0));
});
test('startup cursor stays hidden at origin but can return there after positioning',()=>{
 let cursor={x:0,y:0,visible:true},shown;const term={element:{style:{}},renderer:{render(buffer){shown=buffer.getCursor().visible;},setTheme(){}}};
 installThemeAdapter(term,{background:'#282c34',foreground:'#abb2bf'});const buffer={getCursor:()=>cursor};
 term.renderer.render(buffer);assert.equal(shown,false);
 cursor={x:24,y:0,visible:true};term.renderer.render(buffer);assert.equal(shown,true);
 cursor={x:0,y:0,visible:true};term.renderer.render(buffer);assert.equal(shown,true);
});
