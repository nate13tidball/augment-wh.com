// State checks for the native disclosure enhancement; no dependencies or browser required.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const script = readFileSync(new URL('./public/interactions.js', import.meta.url), 'utf8');
for (const reduced of [false, true]) {
  let click, currentAnimation, focused = false;
  const summary = {offsetHeight:100, addEventListener:(_,fn)=>{click=fn;}};
  const item = {
    open:false, dataset:{}, scrollHeight:240,
    querySelector:()=>summary,
    getBoundingClientRect:()=>({height:item.open?240:100}),
    animate:(frames,options)=>{
      assert.equal(options.duration,500);
      assert.equal(frames.length,2);
      return currentAnimation={cancelled:false,cancel(){this.cancelled=true;}};
    },
  };
  const handlers = {};
  let linkClick;
  const menu = {open:true,contains:()=>false,querySelector:()=>({focus:()=>{focused=true;}}),querySelectorAll:()=>[{addEventListener:(_,fn)=>{linkClick=fn;}}]};
  runInNewContext(script, {
    matchMedia:()=>({matches:reduced}), window:{},
    document:{
      querySelector:selector=>selector==='.menu'?menu:null,
      querySelectorAll:()=>[item],
      addEventListener:(name,fn)=>{handlers[name]=fn;},
    },
  });
  const activate=()=>click({preventDefault(){}});
  activate();
  assert.equal(item.open,true);
  if(!reduced) currentAnimation.onfinish();
  assert.equal(item.dataset.open,'true');
  activate();
  if(!reduced) currentAnimation.onfinish();
  assert.equal(item.open,false);
  if(!reduced){
    activate();const previous=currentAnimation;activate();
    assert.equal(previous.cancelled,true);
    currentAnimation.onfinish();assert.equal(item.open,false);
  }
  handlers.keydown({key:'Escape'});assert.equal(menu.open,false);assert.equal(focused,true);
  menu.open=true;linkClick();assert.equal(menu.open,false);
  menu.open=true;handlers.click({target:{}});assert.equal(menu.open,false);
}
console.log('Accordion open/close, interrupted animation, reduced motion, and menu dismissal passed.');
