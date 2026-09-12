// Loaded before each versioned frontend. A failed startup returns to the last UI.
setTimeout(()=>{
 if(window.harnessHotReady)return;
 const raw=sessionStorage.getItem('harness-hot-navigation');if(!raw)return;
 const state=JSON.parse(raw);if(state.rollback)return;
 state.rollback=true;sessionStorage.setItem('harness-hot-navigation',JSON.stringify(state));
 sessionStorage.setItem('harness-hot-failed-version',state.next);
 location.replace(state.previous||'/');
},20000);
