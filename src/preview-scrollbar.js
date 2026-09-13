// Match the source editor: show during scrolling and near the scrollbar, then fade.
export function previewScrollbar(scroll){
 let near=false,moving=false,timer;
 const paint=()=>scroll.classList.toggle('scrollbar-visible',near||moving);
 scroll.onscroll=()=>{moving=true;paint();clearTimeout(timer);timer=setTimeout(()=>{moving=false;paint();},800);};
 scroll.onpointermove=e=>{const r=scroll.getBoundingClientRect();near=e.clientX>=r.right-16||e.clientY>=r.bottom-14;paint();};
 scroll.onpointerleave=()=>{near=false;paint();};
 return()=>{clearTimeout(timer);scroll.onscroll=scroll.onpointermove=scroll.onpointerleave=null;scroll.classList.remove('scrollbar-visible');};
}
