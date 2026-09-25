// Match VS Code's macOS terminal input sequences. Handle these before
// ghostty-web's legacy encoder drops Command or treats Option as plain arrows.
export function terminalKeyOverride(event,send,term){
 if(event.isComposing||event.keyCode===229)return false;
 if(event.key==='Tab'&&event.shiftKey&&!event.ctrlKey&&!event.altKey&&!event.metaKey){send('\x1b[Z');return true;}
 if(event.shiftKey||event.ctrlKey||event.altKey&&event.metaKey)return false;
 if(event.altKey){
  const data={ArrowLeft:'\x1bb',ArrowRight:'\x1bf',ArrowUp:'\x1b[1;3A',ArrowDown:'\x1b[1;3B'}[event.key];
  if(data){send(data);return true;}
 }
 if(event.metaKey){
  const data={ArrowLeft:'\x01',ArrowRight:'\x05'}[event.key];
  if(data){send(data);return true;}
  // Without shell-integration command marks, VS Code falls back to the
  // scrollback boundaries. Never send these navigation keys to the shell.
  if(term&&event.key==='ArrowUp'){term.scrollToTop();return true;}
  if(term&&event.key==='ArrowDown'){term.scrollToBottom();return true;}
 }
 return false;
}
