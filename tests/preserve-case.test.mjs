import test from 'node:test';
import assert from 'node:assert/strict';
import {preserveCase} from '../src/preserve-case.js';
test('preserve replacement case including separated identifiers',()=>{
 for(const [a,b,c] of [['foo','bar','bar'],['FOO','bar','BAR'],['Foo','bar','Bar'],['foo','BAR','bar'],['Foo_BAR','new_name','New_NAME'],['FOO-bar','new-name','NEW-name'],['','bar','bar'],['Foo','','']])assert.equal(preserveCase(a,b),c);
});
