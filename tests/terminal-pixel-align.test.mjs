import test from 'node:test';import assert from 'node:assert/strict';
import {pixelOffset,alignTerminalPixels} from '../src/terminal-pixel-align.js';
test('fractional dock origins snap to physical pixels at Retina and zoom scales',()=>{
 for(const scale of [1,1.6,2,2.2,3])for(const top of [0,510.25,833.333])assert.ok(Math.abs((top+pixelOffset(top,scale))*scale-Math.round(top*scale))<1e-9);
});
test('repeated alignment does not drift',()=>{
 const mount={dataset:{},style:{},querySelector:()=>({getBoundingClientRect:()=>({left:10.1+(Number(mount.dataset.pixelX)||0),top:510.3+(Number(mount.dataset.pixelY)||0),width:800,height:200})})};
 alignTerminalPixels(mount,2);const before={...mount.dataset};alignTerminalPixels(mount,2);assert.deepEqual(mount.dataset,before);
});
