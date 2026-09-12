import {chmodSync,existsSync} from 'node:fs';
// node-pty 1.1.0's registry tarball may omit the executable bit on macOS.
if(process.platform==='darwin'){
 const helper=new URL(`../node_modules/node-pty/prebuilds/darwin-${process.arch}/spawn-helper`,import.meta.url);
 if(existsSync(helper))chmodSync(helper,0o755);
}
