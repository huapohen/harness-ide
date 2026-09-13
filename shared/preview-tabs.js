// Only Explorer preview tabs may be replaced; dirty and split documents stay open.
export function replacementTab(tabs, incoming) {
 if (!incoming.temporary || incoming.kind !== 'file') return null;
 return [...tabs].reverse().find(t => t.temporary && (t.previewGroup||'primary')===(incoming.previewGroup||'primary') && t.kind === 'file' && !t.pinned && !t.dirty && !t.group) || null;
}
