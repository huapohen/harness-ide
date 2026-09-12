// Fit against the visible canvas area, including fractional page zoom geometry.
export function fitVisibleTerminal(term,fit,mount){
 const proposed=fit.proposeDimensions();if(!proposed)return;
 const canvas=mount.querySelector('canvas');const rect=mount.getBoundingClientRect(),drawing=canvas?.getBoundingClientRect();
 if(!drawing?.height||!drawing.width)return;
 const pane=mount.parentElement.getBoundingClientRect();
 const cellHeight=drawing.height/term.rows,cellWidth=drawing.width/term.cols;
 const height=Math.max(0,Math.min(rect.bottom,pane.bottom)-drawing.top-1);
 const width=Math.max(0,Math.min(rect.right,pane.right)-drawing.left-1);
 const rows=Math.min(proposed.rows,Math.floor(height/cellHeight)),cols=Math.min(proposed.cols,Math.floor(width/cellWidth));
 if(rows>0&&cols>0&&(rows!==term.rows||cols!==term.cols))term.resize(cols,rows);
}
