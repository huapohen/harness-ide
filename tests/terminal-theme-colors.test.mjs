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

test('shell startup cursor stays hidden even after preliminary cursor movement',()=>{
 let shown,forced;const term={startupReady:false,element:{style:{}},renderer:{render(buffer,force){shown=buffer.getCursor().visible;forced=force;},setTheme(){}}};
 installThemeAdapter(term,{background:'#282c34',foreground:'#abb2bf'});
 const buffer={getCursor:()=>({x:30,y:0,visible:true})};
 term.renderer.render(buffer);assert.equal(shown,false);
 term.startupReady=true;term.renderer.render(buffer);assert.equal(shown,true);assert.equal(forced,true);
});

test('OMP flat text follows both themes and flat borders disappear without hiding herdr blue borders',()=>{
 let cells,active=false,forced;const term={element:{style:{}},renderer:{render(buffer,force){cells=buffer.getLine(0);forced=force;},setTheme(){}}};
 const dark={background:'#282c34',foreground:'#abb2bf'},light={background:'#ffffff',foreground:'#383a42'};
 const apply=installThemeAdapter(term,light,{flatOmp:()=>active});
 const cell=(fg,codepoint=0x2500)=>({codepoint,fg_r:fg[0],fg_g:fg[1],fg_b:fg[2],bg_r:255,bg_g:255,bg_b:255});
 const original=[cell([228,228,228],0x4e2d),cell([229,229,231]),cell([38,38,38]),cell([36,39,46]),cell([137,180,250]),cell([28,28,28],0x2503),cell([29,31,35],0x2503),cell([38,38,38],0x61)];
 const buffer={getLine:()=>original};
 term.renderer.render(buffer,false);assert.deepEqual(cells,original);
 active=true;term.renderer.render(buffer,false);assert.equal(forced,true);
 assert.equal(cells[0].fg_r,56);assert.equal(cells[1].fg_r,56);assert.equal(cells[2].codepoint,32);assert.equal(cells[3].codepoint,32);assert.equal(cells[5].codepoint,32);assert.equal(cells[6].codepoint,32);assert.equal(cells[7].codepoint,0x61);assert.equal(cells[4].fg_r,137);
 apply(dark);term.renderer.render(buffer,false);assert.equal(cells[0].fg_r,171);assert.equal(cells[2].codepoint,32);assert.equal(cells[2].bg_r,40);assert.equal(cells[4].fg_r,137);
 apply(light);term.renderer.render(buffer,false);assert.equal(cells[0].fg_r,56);assert.equal(cells[2].codepoint,32);
 active=false;term.renderer.render(buffer,false);assert.deepEqual(cells,original);assert.equal(original[0].fg_r,228);
});

test('OMP status background and powerline caps follow theme without recoloring its accent text',()=>{
 let cells,active=true;const term={element:{style:{}},renderer:{render(buffer){cells=buffer.getLine(0);},setTheme(){}}};
 const dark={background:'#282c34',foreground:'#abb2bf'},light={background:'#ffffff',foreground:'#383a42'};
 const apply=installThemeAdapter(term,dark,{flatOmp:()=>active});
 const cell=(codepoint,fg,bg)=>({codepoint,fg_r:fg[0],fg_g:fg[1],fg_b:fg[2],bg_r:bg[0],bg_g:bg[1],bg_b:bg[2]});
 const original=[cell(113,[0,175,255],[18,18,18]),cell(113,[0,175,255],[15,18,22]),cell(0x25b6,[18,18,18],[40,44,52]),cell(0xe0b0,[15,18,22],[40,44,52]),cell(97,[18,18,18],[40,44,52])];
 const buffer={getLine:()=>original};
 for(const theme of [light,dark,{...dark,background:'#334455'}]){
  apply(theme);term.renderer.render(buffer);
  const bg=[1,3,5].map(i=>parseInt(theme.background.slice(i,i+2),16));
  for(const c of cells.slice(0,4))assert.deepEqual([c.bg_r,c.bg_g,c.bg_b],bg);
  for(const c of cells.slice(2,4))assert.deepEqual([c.fg_r,c.fg_g,c.fg_b],bg);
  assert.deepEqual([cells[0].fg_r,cells[0].fg_g,cells[0].fg_b],[0,175,255]);
  assert.equal(cells[4].fg_r,18);
 }
 apply(dark);active=false;term.renderer.render(buffer);assert.deepEqual(cells,original);
});
