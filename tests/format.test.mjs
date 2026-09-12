import test from 'node:test';
import assert from 'node:assert/strict';
import {formatText} from '../server/format.mjs';
test('sort keys preserves large JSON integers and array order',async()=>{
 const r=await formatText({language:'json',action:'sortKeys',text:'{"z":[3,1],"a":{"z":9007199254740993,"a":2}}'});
 assert.ok(r.text.includes('9007199254740993'));assert.ok(r.text.indexOf('"a"')<r.text.indexOf('"z"'));assert.deepEqual(JSON.parse(r.text).z,[3,1]);
});
test('YAML key sorting retains comments and rejects duplicate keys',async()=>{
 const r=await formatText({language:'yaml',action:'sortKeys',text:'# retained\nz: 1\na: 2\n'});assert.ok(r.text.includes('# retained'));assert.ok(r.text.indexOf('a:')<r.text.indexOf('z:'));
 await assert.rejects(formatText({language:'yaml',action:'sortKeys',text:'a: 1\na: 2'}));
});
