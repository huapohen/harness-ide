import test from 'node:test';
import assert from 'node:assert/strict';
import {replacementTab} from '../shared/preview-tabs.js';
const preview = {kind:'file',temporary:true};
test('Explorer reuses its last temporary slot',()=>{
 const first={...preview}, last={...preview};
 assert.equal(replacementTab([first,last],preview),last);
});
test('retained, pinned, dirty, split and terminal tabs survive browsing',()=>{
 for(const extra of [{temporary:false},{pinned:true},{dirty:true},{group:{}},{kind:'terminal'}])
  assert.equal(replacementTab([{...preview,...extra}],preview),null);
});
test('explicit opens never replace a temporary slot',()=>{
 assert.equal(replacementTab([preview],{kind:'file'}),null);
});
