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
