import {test} from 'node:test';
import assert from 'node:assert/strict';
import {selectRange} from '../shared/range-selection.js';
import {EditorState} from '@codemirror/state';
import {indentUnit} from '@codemirror/language';
import {indentMore,indentLess} from '@codemirror/commands';
import {defaults,resolveBinding} from '../shared/keybindings.js';
test('ranges support reverse selection, union and missing anchors',()=>{
 const items=['a','b','c','d'];
 assert.deepEqual([...selectRange(items,'d','b')],['b','c','d']);
 assert.deepEqual([...selectRange(items,'c','d',['a'],true)],['a','c','d']);
 assert.deepEqual([...selectRange(items,'gone','b')],['b']);
});
test('four-space indentation and reverse indentation roundtrip',()=>{
 let state=EditorState.create({doc:'hello',extensions:[EditorState.tabSize.of(4),indentUnit.of('    ')]});
 const target={get state(){return state;},dispatch(tr){state=tr.state;}};
 indentMore(target);assert.equal(state.doc.toString(),'    hello');
 indentLess(target);assert.equal(state.doc.toString(),'hello');
});
test('command arrows move lines only in editor',()=>{
 for(const direction of ['up','down']){
 assert.equal(resolveBinding(defaults,'cmd+'+direction,{editorTextFocus:true}).command,resolveBinding(defaults,'alt+'+direction,{editorTextFocus:true}).command);
 assert.equal(resolveBinding(defaults,'cmd+'+direction,{terminalFocus:true}),undefined);
 }
});
