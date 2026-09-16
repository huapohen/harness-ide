// ghostty-web 0.4 treats Shift+Tab as plain Tab in its legacy key fast path.
export function terminalKeyOverride(event,send){
 if(event.key!=='Tab'||!event.shiftKey||event.ctrlKey||event.altKey||event.metaKey||event.isComposing||event.keyCode===229)return false;
 send('\x1b[Z');return true;
}
