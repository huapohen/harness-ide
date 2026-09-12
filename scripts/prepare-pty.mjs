import {chmodSync,existsSync,rmSync} from 'node:fs';
// node-pty 1.1.0's registry tarball may omit the executable bit on macOS.
if(process.platform==='darwin'){
 // This is a macOS app; Windows prebuilt binaries alone add about 58 MiB.
 for(const arch of ['win32-arm64','win32-x64'])rmSync(new URL('../node_modules/node-pty/prebuilds/'+arch,import.meta.url),{recursive:true,force:true});
 const helper=new URL(`../node_modules/node-pty/prebuilds/darwin-${process.arch}/spawn-helper`,import.meta.url);
 if(existsSync(helper))chmodSync(helper,0o755);
}
