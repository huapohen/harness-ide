import test from 'node:test';import assert from 'node:assert/strict';
import {EditorState,EditorSelection} from '@codemirror/state';
import {selectedCharacters} from '../src/selection-count.js';
import {tabVisits} from '../src/tab-visits.js';
test('selection totals disjoint ranges including emoji and newline, excluding gaps',()=>{
 const state=EditorState.create({doc:'你😀好\nabc',extensions:[EditorState.allowMultipleSelections.of(true)],selection:EditorSelection.create([EditorSelection.range(0,3),EditorSelection.range(4,6)])});assert.equal(selectedCharacters(state),4);assert.equal(selectedCharacters(EditorState.create({doc:'abc'})),0);
});
test('closing follows visits across file and terminal, including replaced previews',()=>{
 const h=tabVisits(),t={},a={path:'A'},b={path:'B'};h.visit(t);h.visit(a);h.replaced(a);h.visit(b);h.visit(t);h.visit(b);h.forget(b);assert.equal(h.last().tab,t);h.forget(t);assert.equal(h.takeFile().path,'A');assert.equal(h.last(),undefined);
});
