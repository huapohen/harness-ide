import {EditorView,ViewPlugin} from '@codemirror/view';
import {sourceScopes,activeScopes} from '../shared/sticky-scopes.js';

// Reserve a viewport below the final line, allowing for the sticky scope header.
export const scrollPastEnd=ext=>{
 const plugin=ViewPlugin.fromClass(class{
  constructor(view){this.view=view;this.refreshScopes();this.measure();}
  refreshScopes(){const doc=this.view.state.doc;this.rows=activeScopes(sourceScopes(doc.toString(),ext),doc.lines).length;}
  update(u){if(u.docChanged)this.refreshScopes();if(u.geometryChanged||u.docChanged)this.measure();}
  measure(){this.view.requestMeasure({key:this,read:v=>Math.max(0,v.scrollDOM.clientHeight-v.defaultLineHeight*(this.rows+1)-v.documentPadding.top-1),write:height=>{this.view.dom.style.setProperty('--scroll-past-end',height+'px');}});}
 });
 return [plugin,EditorView.contentAttributes.of({style:'padding-bottom:var(--scroll-past-end,0px)'})];
};
