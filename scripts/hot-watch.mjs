import {watch} from 'node:fs';
import {spawn} from 'node:child_process';
let running=false,again=false,timer;
function build(){if(running){again=true;return;}running=true;const child=spawn('npm',['run','hot'],{stdio:'inherit'});child.on('exit',()=>{running=false;if(again){again=false;build();}});}
for(const p of ['src','server','shared','public','plugins.config.js','package.json','native','scripts'])watch(p,{recursive:true},()=>{clearTimeout(timer);timer=setTimeout(build,300);});
console.log('Watching plugin sources. Successful builds publish atomically.');build();
