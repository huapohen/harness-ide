import test from 'node:test';
import assert from 'node:assert/strict';
import {fitVisibleTerminal} from '../src/terminal-fit.js';
test('fit clamps the last row to visible pane bounds at multiple zoom factors',()=>{
 for(const zoom of [0.8,1,1.1,1.5,2]){
  let resized;
  const term={rows:40,cols:80,resize:(cols,rows)=>{resized={cols,rows};}};
  const mount={getBoundingClientRect:()=>({bottom:620*zoom,right:820*zoom}),parentElement:{getBoundingClientRect:()=>({bottom:610*zoom,right:820*zoom})},querySelector:()=>({getBoundingClientRect:()=>({top:15*zoom,left:10*zoom,height:600*zoom,width:800*zoom})})};
  fitVisibleTerminal(term,{proposeDimensions:()=>({rows:40,cols:80})},mount);
  assert.equal(resized.rows,39);assert.ok(15*zoom+resized.rows*15*zoom<=610*zoom);
 }
});
