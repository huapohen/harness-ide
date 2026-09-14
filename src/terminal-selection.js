// Selecting visible last-row text must not start the library's 30px edge timer.
export function installSelectionBoundary(term){
 const selection=term.renderer?.selectionManager;if(!selection)return;
 selection.updateAutoScroll=function(y,height){if(y<0)this.startAutoScroll(-1);else if(y>height)this.startAutoScroll(1);else this.stopAutoScroll();};
}
