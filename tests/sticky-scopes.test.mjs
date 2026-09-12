import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceScopes,activeScopes,maskScopeText} from '../shared/sticky-scopes.js';
const at=(text,ext,line)=>activeScopes(sourceScopes(text,ext),line).map(r=>r.line);
test('Python class, async multiline function and nested control flow track dedent',()=>{
 const source=['class Client:','    async def fetch(','        self, url,','    ):','        if url:','            result = run(url)','            return result','    def close(self):','        stop()','        return None','print("done")'].join('\n');
 assert.deepEqual(at(source,'py',7),[1,2,5]);
 assert.deepEqual(at(source,'py',10),[1,8]);
 assert.deepEqual(at(source,'py',11),[]);
});
test('Python multiline strings, comments and blank lines do not create scopes',()=>{
 const source='def run():\n    text = """\nclass Fake:\n    def nope():\n        pass\n"""\n    # end\n    return text\n\nnext_call()';
 assert.deepEqual(at(source,'py',8),[1]);
 assert.deepEqual(at(source,'py',10),[]);
});
for(const ext of ['js','jsx','ts','tsx','mjs','cjs','java','c','cpp','cs','go','rs','swift','kt','php','dart','css','scss','json','jsonc'])test(`${ext}: bracket scopes work without indentation and ignore string/comment braces`,()=>{
 const source='outer {\ninner {\n"}"\n/* } */\nwork\n}\n}';
 assert.deepEqual(at(source,ext,5),[1,2]);
 assert.deepEqual(at(source,ext,6),[1]);
 assert.deepEqual(at(source,ext,7),[]);
});
test('Allman opening braces show declaration instead of isolated brace',()=>{
 assert.deepEqual(at('class Example\n{\nvoid work()\n{\nrun();\n}\n}', 'cpp',5),[1,3]);
});
for(const ext of ['html','xml','vue','svelte','jsx','tsx'])test(`${ext}: nested tags, quoted attributes and void tags`,()=>{
 assert.deepEqual(at('<main title="a > b">\n<section>\n<br/>\n<!-- <fake> -->\ntext\n</section>\n</main>',ext,5),[1,2]);
});
for(const ext of ['yaml','yml','txt','unknown'])test(`${ext}: indentation fallback`,()=>{
 assert.deepEqual(at('root:\n  child:\n    item\n    value\nnext',ext,4),[1,2]);
 assert.deepEqual(at('root:\n  child:\n    item\n    value\nnext',ext,5),[]);
});
for(const ext of ['sh','bash','zsh'])test(`${ext}: keyword blocks without indentation`,()=>{
 assert.deepEqual(at('if test -f x; then\nfor x in a b; do\necho "$x"\necho done\ndone\nfi',ext,4),[1,2]);
});
test('Ruby and SQL explicit blocks',()=>{
 assert.deepEqual(at('class Client\ndef run\nputs "end"\nputs 2\nend\nend','rb',4),[1,2]);
 assert.deepEqual(at('BEGIN\nIF ok THEN\nSELECT 1;\nSELECT 2;\nEND IF;\nEND;','sql',4),[1,2]);
});
test('SSH and INI sections and arbitrary-language regions',()=>{
 assert.deepEqual(at('Host one\n HostName local\n User dev\nHost two\n HostName other\n User dev','sshconfig',3),[1]);
 assert.deepEqual(at('[one]\nx=1\ny=2\n[two]\nx=3','ini',3),[1]);
 assert.deepEqual(at('// #region setup\na\nb\n// #endregion','txt',3),[1]);
});
test('Markdown retains headings and skips fenced code',()=>{
 assert.deepEqual(at('# Main\n## Sub\n```py\nclass Fake:\n    pass\n```\nbody','md',7),[1,2]);
});
test('masking preserves geometry and max count bounds sticky rows',()=>{
 const s='const s="{ hi }";\n/* comment\n} */\n';assert.equal(maskScopeText(s,'js').length,s.length);assert.equal(maskScopeText(s,'js').split('\n').length,s.split('\n').length);
 const source=Array.from({length:8},(_,i)=>' '.repeat(i)+'block:').join('\n')+'\n        content';assert.equal(activeScopes(sourceScopes(source,'txt'),9).length,5);
});
test('JavaScript regex braces are not structural scopes',()=>{
 const s='function run() {\nconst regex = /[{}]/;\nconst other = /\\{/;\nreturn regex;\n}';
 assert.deepEqual(at(s,'js',4),[1]);
});
