import {execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
if(process.platform==='darwin'){
 await fs.mkdir('dist/native',{recursive:true});
 execFileSync('swiftc',['-target',`${process.arch==='arm64'?'arm64':'x86_64'}-apple-macosx13.0`,'server/file-associations/helper.swift','-o','dist/native/file-associations'],{stdio:'inherit'});
 execFileSync('codesign',['--force','--sign','-','dist/native/file-associations'],{stdio:'inherit'});
}
