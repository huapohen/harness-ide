import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaults,validateBindings,normalizeKey,eventKey,evaluateWhen,resolveBinding} from '../shared/keybindings.js';
import {lineRange} from '../src/plugins/editing.js';
import {inspectProcesses} from '../server/terminal-state.mjs';
import {markerFilter} from '../server/shell-integration.mjs';
test('keybinding normalization, context precedence, chords and strict JSON validation',()=>{
 const values=validateBindings(defaults);
 assert.equal(normalizeKey('Command+Shift+E'),'cmd+shift+e');assert.equal(normalizeKey('command+k control+s'),'cmd+k ctrl+s');
 assert.equal(eventKey({code:'Digit3',key:'#',metaKey:true,shiftKey:true}),'cmd+shift+3');
 assert.equal(resolveBinding(values,'cmd+backspace',{explorerFocus:true})?.command,'explorer.delete');
 assert.equal(resolveBinding(values,'cmd+backspace',{editorTextFocus:true}),undefined);
 assert.equal(resolveBinding(values,'ctrl+d',{editorTextFocus:true})?.command,'editor.duplicateLine');
 assert.equal(resolveBinding(values,'ctrl+d',{terminalFocus:true})?.command,'terminal.eof');
 assert.equal(resolveBinding(values,'ctrl+c',{terminalFocus:true,terminalHasSelection:false}),undefined);
 assert.equal(resolveBinding(values,'ctrl+c',{terminalFocus:true,terminalHasSelection:true})?.command,'edit.copy');
 assert.equal(resolveBinding(values,'shift+d',{editorTextFocus:true})?.command,'editor.deleteLine');
 assert.equal(resolveBinding(values,'shift+d',{terminalFocus:true}),undefined);
 assert.equal(resolveBinding(values,'cmd+w',{dialogFocus:true}),undefined);
 assert.equal(evaluateWhen('!terminalFocus && (editorTextFocus || dialogFocus)',{editorTextFocus:true}),true);
 assert.throws(()=>evaluateWhen('window.alert(1)'));assert.throws(()=>validateBindings([{key:'cmd+e',command:'terminal.new',when:'unknown'}]));assert.throws(()=>validateBindings({}));
 const override=[...values,{key:'cmd+e',command:'tabs.next',when:'!dialogFocus'}];assert.equal(resolveBinding(override,'cmd+e',{}).command,'tabs.next');
});
test('line ranges handle empty first line and selection ending at next line',()=>{
 assert.deepEqual(lineRange('\nhello',0),{from:0,to:0});assert.deepEqual(lineRange('a\nb\nc',0,2),{from:0,to:1});assert.deepEqual(lineRange('a\nb\nc',2),{from:2,to:3});
});
test('terminal state detects silent, background, suspended, exec and unknown processes',()=>{
 const root='100 1 100 100 Ss /bin/zsh';
 assert.equal(inspectProcesses(root,100,'zsh').busy,false);
 for(const child of ['101 100 101 101 S /bin/sleep','101 100 101 100 T /bin/sleep'])assert.equal(inspectProcesses(root+'\n'+child,100,'zsh').busy,true);
 assert.equal(inspectProcesses('100 1 100 100 S /usr/bin/python3',100,'zsh').busy,true);
 assert.equal(inspectProcesses('100 1 100 100 R /bin/zsh',100,'zsh').busy,true);
 assert.equal(inspectProcesses('',100,'zsh').busy,true);
});
test('prompt integration strips split control markers without losing normal output',()=>{
 const states=[];const filter=markerFilter('test',s=>states.push(s));
 const chunks=['hello\x1b]777;har','ness;test;bu','sy\x07world\x1b]777;harness;test;idle\x07!'];
 assert.equal(chunks.map(filter).join(''),'helloworld!');assert.deepEqual(states,['busy','idle']);
});
