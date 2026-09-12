// Small scoped plugin runtime inspired by Harness / Cordis. No product features here.
export class Kernel {
  services = new Map(); plugins = new Map(); events = new Map();
  get(name) { if (!this.services.has(name)) throw new Error(`Missing service: ${name}`); return this.services.get(name).value; }
  emit(name, data) { for (const fn of this.events.get(name) || []) fn(data); }
  async mount(plugin, config = {}) {
    if (this.plugins.has(plugin.id)) throw new Error(`Duplicate plugin: ${plugin.id}`);
    for (const dep of plugin.requires || []) this.get(dep);
    const effects = [];
    const ctx = { get: n => this.get(n), emit: (n,d) => this.emit(n,d),
      effect: fn => effects.push(fn),
      provide: (name, value) => { if(this.services.has(name)) throw new Error(`Duplicate service: ${name}`); this.services.set(name,{value,owner:plugin.id}); effects.push(()=>this.services.delete(name)); },
      on: (name, fn) => { if(!this.events.has(name)) this.events.set(name,new Set()); this.events.get(name).add(fn); effects.push(()=>this.events.get(name).delete(fn)); }
    };
    try { const dispose = await plugin.activate(ctx,config); if(dispose) effects.push(dispose); this.plugins.set(plugin.id,{plugin,effects,config}); }
    catch(e) { for(const dispose of [...effects].reverse()) await dispose(); throw e; }
  }
  async unmount(id) {
    const entry = this.plugins.get(id); if(!entry) return;
    const owned = [...this.services].filter(([,s])=>s.owner===id).map(([n])=>n);
    for(const [other,{plugin}] of this.plugins) if(other!==id && plugin.requires?.some(n=>owned.includes(n))) throw new Error(`${other} depends on ${id}`);
    for(const dispose of [...entry.effects].reverse()) await dispose(); this.plugins.delete(id);
  }
  async replace(plugin,config){
    const previous=this.plugins.get(plugin.id);if(!previous)return this.mount(plugin,config||{});
    await this.unmount(plugin.id);
    try{await this.mount(plugin,config??previous.config);}catch(error){try{await this.mount(previous.plugin,previous.config);}catch(rollback){throw new AggregateError([error,rollback],'Plugin update and rollback failed');}throw error;}
  }
  async dispose() { for(const id of [...this.plugins.keys()].reverse()) await this.unmount(id); }
}
