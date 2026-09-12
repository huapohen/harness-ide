export default {id:'startup',requires:['workbench','workspace'],async activate(ctx){
 if(sessionStorage.getItem('harness-hot-snapshot'))return;
 const wb=ctx.get('workbench');
 if(wb.commands.has('terminal.new'))await wb.run('terminal.new');
 const info=ctx.get('workspace').info();
 if(info.name==='example' && wb.commands.has('file.open')) {
  await wb.run('file.open')('welcome.md');
  if(wb.commands.has('terminal.new'))await wb.run('terminal.new');
  await wb.run('file.open')('notes.md');
  wb.open(wb.tabs.find(t=>t.path==='welcome.md'));if(wb.commands.has('terminal.new'))wb.dock();
 }
}};
