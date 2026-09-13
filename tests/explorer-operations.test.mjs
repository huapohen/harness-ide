import test from 'node:test';import assert from 'node:assert/strict';
import {contextVersion,topLevelPaths,expandAncestors} from '../src/explorer-operations.js';
import {documentIdentity} from '../shared/document-identity.js';
import {inFlight} from '../src/inflight.js';
test('root switches and close invalidate pending modal actions and stale root loads',async()=>{
 const context=contextVersion();let release;const gate=new Promise(r=>release=r),valid=context.capture();let writes=0;
 const pending=(async()=>{await gate;if(valid())writes++;})();context.invalidate();release();await pending;assert.equal(writes,0);
 const latest=context.capture();assert.equal(latest(),true);context.invalidate();assert.equal(latest(),false);
});
test('multi-delete includes selected siblings once and excludes nested children',()=>{
 assert.deepEqual(topLevelPaths(['a','a/child','ab','b','b','b/deep/x']),['a','ab','b']);assert.deepEqual(topLevelPaths(['.']),[]);
});
test('new or pasted nested files reveal all ancestor folders',()=>{
 const expanded=new Set(['other']);expandAncestors(expanded,'a/b/c');assert.deepEqual([...expanded],['other','a/b/c','a/b','a']);
});
test('simultaneous left and right file opens remain separate; same-side opens deduplicate',async()=>{
 const opening=inFlight(),left=documentIdentity('/a',true),right=documentIdentity('/a',true,'right');let reads=0;
 assert.notEqual(left,right);assert.equal(documentIdentity('/a',true,'primary'),left);
 const run=async()=>{reads++;await new Promise(r=>setTimeout(r,5));return reads;};
 const p=opening(left,run),q=opening(right,run);assert.equal(opening(right,run),q);await Promise.all([p,q]);assert.equal(reads,2);
});
