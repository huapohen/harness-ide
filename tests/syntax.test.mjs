import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{Registry,parseRawGrammar}=require('vscode-textmate'),{loadWASM,OnigScanner,OnigString}=require('vscode-oniguruma');
test('VS Code Markdown grammar applies real One Dark Pro and Light+ token colors',async()=>{
 const bytes=await fs.readFile(new URL('../public/syntax/onig.wasm',import.meta.url));await loadWASM(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
 const scopes=JSON.parse(await fs.readFile(new URL('../public/syntax/grammars.json',import.meta.url),'utf8'));
 for(const theme of ['one-dark-pro','light']){
 const raw=JSON.parse(await fs.readFile(new URL('../public/syntax/'+theme+'.json',import.meta.url),'utf8'));
 const registry=new Registry({theme:{settings:raw.tokenColors},onigLib:Promise.resolve({createOnigScanner:p=>new OnigScanner(p),createOnigString:s=>new OnigString(s)}),loadGrammar:async scope=>scopes[scope]?parseRawGrammar(await fs.readFile(new URL('../public/syntax/'+scopes[scope],import.meta.url),'utf8'),scopes[scope]):null});
 const grammar=await registry.loadGrammar('text.html.markdown');assert.ok(grammar);
 const result=grammar.tokenizeLine2('普通文字 `inline code` <details>more</details>',null);const colors=new Set();for(let i=1;i<result.tokens.length;i+=2)colors.add((result.tokens[i]>>>15)&511);assert.ok(colors.size>=2,'inline code / HTML should have distinct colors');
 let state=grammar.tokenizeLine2('```sh',null).ruleStack;const fenced=grammar.tokenizeLine2('echo "hello"',state);assert.ok(fenced.tokens.length>=4,'embedded shell tokens');registry.dispose();
 }
});
