import {test} from 'node:test';
import assert from 'node:assert/strict';
import {htmlPath} from '../src/html-path.js';
test('HTML links resolve relative to the current page including nested and external files',()=>{
 assert.deepEqual(htmlPath('site/index.html','child/page.html'),{path:'site/child/page.html',hash:''});
 assert.deepEqual(htmlPath('site/child/page.html','../other.html#part'),{path:'site/other.html',hash:'#part'});
 assert.equal(htmlPath('/Users/me/site/index.html','子页面.html').path,'/Users/me/site/子页面.html');
 assert.throws(()=>htmlPath('index.html','javascript:alert(1)'));
});
