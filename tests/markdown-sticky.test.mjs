import test from 'node:test';
import assert from 'node:assert/strict';
import {markdownHeadings,stickyMarkdownHeadings} from '../shared/markdown-headings.js';
test('sticky heading hierarchy ends at peer or ancestor, including skipped levels',()=>{
 const h=markdownHeadings('# A\nbody\n### B\nbody\n## C\nbody\n# D\nbody');
 assert.deepEqual(stickyMarkdownHeadings(h,4).map(h=>h.text),['# A','### B']);
 assert.deepEqual(stickyMarkdownHeadings(h,6).map(h=>h.text),['# A','## C']);
 assert.deepEqual(stickyMarkdownHeadings(h,7),[]);
 assert.deepEqual(stickyMarkdownHeadings(h,8).map(h=>h.text),['# D']);
});
test('fenced examples do not become headings; supports tilde fences and setext',()=>{
 const h=markdownHeadings('# A\n```md\n# example\n```\n~~~\n## example\n~~~\nTitle\n=====\ntext');
 assert.deepEqual(h.map(h=>[h.line,h.level,h.text]),[[1,1,'# A'],[8,1,'Title']]);
 assert.deepEqual(stickyMarkdownHeadings(h,1),[]);
});
