import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState,EditorSelection} from '@codemirror/state';
import {insertTabStop,visualColumn} from '../src/editor-tab.js';
test('Tab inserts at Chinese text boundary and line end, with undoable input transaction',()=>{
 const doc='声云智能 17681530096';
 for(const [pos,expected] of [[4,'声云智能     17681530096'],[16,doc+'    '],[5,'声云智能    17681530096']]){
 const state=EditorState.create({doc,selection:{anchor:pos},extensions:EditorState.tabSize.of(4)});
 let result;insertTabStop({state,dispatch:t=>result=t});assert.equal(result.state.doc.toString(),expected);assert.ok(result.isUserEvent('input'));
 }
});
test('Tab supports multiple cursors and protects read-only files',()=>{
 const state=EditorState.create({doc:'a\nb',selection:EditorSelection.create([EditorSelection.cursor(1),EditorSelection.cursor(3)]),extensions:EditorState.allowMultipleSelections.of(true)});
 let result;insertTabStop({state,dispatch:t=>result=t});assert.equal(result.state.doc.toString(),'a   \nb   ');
 assert.equal(insertTabStop({state:EditorState.create({extensions:EditorState.readOnly.of(true)}),dispatch:()=>assert.fail()}),false);
});

test('Tab uses rendered columns for Chinese, fullwidth text, emoji and existing tabs',()=>{
 assert.equal(visualColumn('声',4),2);
 assert.equal(visualColumn('声云智',4),6);
 assert.equal(visualColumn('Ａa',4),3);
 assert.equal(visualColumn('声\ta',4),5);
 assert.equal(visualColumn('👩‍💻',4),2);
 for(const pos of [1,3]){
  const state=EditorState.create({doc:'声云智能',selection:{anchor:pos}});
  let result;insertTabStop({state,dispatch:t=>result=t});
  assert.equal(result.state.doc.toString(),'声云智能'.slice(0,pos)+'  '+'声云智能'.slice(pos));
 }
});
