import test from 'node:test';import assert from 'node:assert/strict';import {terminalKeyOverride} from '../src/terminal-keyboard.js';
test('Shift+Tab sends exactly one backtab while ordinary Tab and IME stay untouched',()=>{const output=[],send=s=>output.push(s);assert.equal(terminalKeyOverride({key:'Tab',shiftKey:true},send),true);assert.deepEqual(output,['\x1b[Z']);for(const event of [{key:'Tab'},{key:'Tab',shiftKey:true,isComposing:true},{key:'Tab',shiftKey:true,keyCode:229},{key:'Tab',shiftKey:true,ctrlKey:true},{key:'a',shiftKey:true}])assert.equal(terminalKeyOverride(event,send),false);assert.equal(output.length,1);});
test('macOS word and line navigation preserves VS Code terminal sequences',()=>{
 const output=[],send=x=>output.push(x);
 for(const [key,modifier]of [['ArrowLeft','altKey'],['ArrowRight','altKey'],['ArrowUp','altKey'],['ArrowDown','altKey'],['ArrowLeft','metaKey'],['ArrowRight','metaKey']])assert.equal(terminalKeyOverride({key,[modifier]:true},send),true);
 assert.deepEqual(output,['\x1bb','\x1bf','\x1b[1;3A','\x1b[1;3B','\x01','\x05']);
});
test('Command vertical arrows navigate scrollback without changing shell input',()=>{
 const actions=[],term={scrollToTop:()=>actions.push('top'),scrollToBottom:()=>actions.push('bottom')};
 const send=()=>assert.fail('must not send data');
 for(const key of ['ArrowUp','ArrowDown'])assert.equal(terminalKeyOverride({key,metaKey:true},send,term),true);
 assert.deepEqual(actions,['top','bottom']);
 for(const extra of [{isComposing:true},{keyCode:229},{shiftKey:true},{ctrlKey:true},{altKey:true}])assert.equal(terminalKeyOverride({key:'ArrowLeft',metaKey:true,...extra},send,term),false);
});
