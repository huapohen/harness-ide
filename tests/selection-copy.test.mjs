import test from 'node:test';import assert from 'node:assert/strict';
import {selectionCopyEnabled} from '../src/selection-copy.js';
test('editing preserves the clipboard by default while previews copy selections',()=>{const storage={getItem:()=>null};assert.equal(selectionCopyEnabled('edit',storage),false);assert.equal(selectionCopyEnabled('preview',storage),true);});
test('editing and preview preferences are independent',()=>{const values=new Map([['selection-copy-edit','on'],['selection-copy-preview','off']]);const storage={getItem:k=>values.get(k)};assert.equal(selectionCopyEnabled('edit',storage),true);assert.equal(selectionCopyEnabled('preview',storage),false);});
