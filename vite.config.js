import {defineConfig} from 'vite';
import {readFileSync} from 'node:fs';
export default defineConfig({plugins:[{name:'ghostty-wasm',generateBundle(){this.emitFile({type:'asset',fileName:'ghostty-vt.wasm',source:readFileSync('node_modules/ghostty-web/dist/ghostty-vt.wasm')});}}],build:{target:'es2022'}});
