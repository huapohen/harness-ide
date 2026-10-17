import {test} from 'node:test';
import assert from 'node:assert/strict';
import {themePalettes} from '../shared/theme-palettes.js';
import {preferenceKeys} from '../shared/preferences.js';
import {themeChoices,resolveTheme} from '../src/theme-catalog.js';
import {backgroundColors,backgroundKey} from '../src/background-colors.js';
test('all 150 palettes expose both modes with readable text and persisted background keys',()=>{
 assert.equal(themeChoices.length,73);assert.equal(new Set(themeChoices.map(t=>t.id)).size,73);
 const luminance=hex=>{const c=hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;};
 for(const {id}of themePalettes.themes)for(const mode of ['light','dark']){
  const t=resolveTheme(id,mode);assert.equal(t.mode,mode);assert.ok(preferenceKeys.includes(backgroundKey(id,mode)));
  for(const color of Object.values(t.colors))assert.match(color,/^#[0-9a-f]{6}$/i);
  const a=luminance(t.terminal.background),b=luminance(t.terminal.foreground);assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5,id+' '+mode);
 }
});
test('custom backgrounds are isolated by palette and mode and invalid colors use defaults',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k)};
 const dark=backgroundColors('jade',storage,'dark'),light=backgroundColors('jade',storage,'light');
 values.set(backgroundKey('jade','dark'),JSON.stringify({editor:'#123456',terminal:'invalid'}));
 assert.equal(backgroundColors('jade',storage,'dark').editor,'#123456');assert.equal(backgroundColors('jade',storage,'dark').terminal,dark.terminal);
 assert.deepEqual(backgroundColors('jade',storage,'light'),light);assert.notEqual(backgroundColors('forest',storage,'dark').editor,'#123456');
 assert.equal(backgroundKey('one-dark-pro'),'harness-backgrounds-one-dark-pro');assert.equal(resolveTheme('light').mode,'light');assert.equal(resolveTheme('unknown').label,'One Dark Pro');
});
