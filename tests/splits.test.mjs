import test from 'node:test';
import assert from 'node:assert/strict';
import {splitLeaf,removeLeaf,leaves} from '../shared/splits.js';
test('nested terminal splits preserve siblings and collapse exited panes',()=>{
 const a={id:'a'},b={id:'b'},c={id:'c'};
 let tree=splitLeaf(a,a,b,'vertical');tree=splitLeaf(tree,b,c,'horizontal');
 assert.deepEqual(leaves(tree),[a,b,c]);assert.equal(tree.children[1].direction,'horizontal');
 tree=removeLeaf(tree,b);assert.deepEqual(leaves(tree),[a,c]);assert.equal(tree.children[1],c);
 tree=removeLeaf(tree,a);assert.equal(tree,c);assert.equal(removeLeaf(tree,c),null);
});
