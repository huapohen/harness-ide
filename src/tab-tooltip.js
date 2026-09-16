let tooltip,timer;
function hide(){clearTimeout(timer);tooltip?.remove();tooltip=null;}
export function tabTooltip(tab,text){
 tab.addEventListener('mouseenter',()=>{hide();const configured=Number(localStorage.getItem('tab-tooltip-delay')??300);timer=setTimeout(()=>{if(!tab.isConnected)return;tooltip=document.createElement('div');tooltip.className='tab-name-tooltip';tooltip.role='tooltip';tooltip.textContent=text;document.body.append(tooltip);const r=tab.getBoundingClientRect();tooltip.style.left=Math.max(4,Math.min(r.left,innerWidth-tooltip.offsetWidth-4))+'px';tooltip.style.top=(r.bottom+5)+'px';},Number.isFinite(configured)?configured:300);});
 for(const event of ['mouseleave','mousedown','blur'])tab.addEventListener(event,hide);
}
