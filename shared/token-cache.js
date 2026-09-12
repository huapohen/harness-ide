// Bounded cache; grammar state is part of the key so multiline edits remain correct.
export class TokenCache {
 constructor(limit=10000){this.limit=limit;this.lines=new Map();}
 clear(){this.lines.clear();}
 tokenize(grammar,number,text,state){const previous=this.lines.get(number);if(previous&&previous.grammar===grammar&&previous.text===text&&previous.state===state)return previous.result;const result=grammar.tokenizeLine2(text,state);this.lines.set(number,{grammar,text,state,result});if(this.lines.size>this.limit)this.lines.delete(this.lines.keys().next().value);return result;}
}
