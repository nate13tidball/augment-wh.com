import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const pages = readdirSync(new URL('./public/', import.meta.url), { recursive: true }).filter(path => path.endsWith('.html'));
for (const path of pages) {
  const html = read(`./public/${path}`);
  assert.equal((html.match(/id="site-menu"/g) || []).length, 1, path);
  assert.equal((html.match(/class="wh-header"/g) || []).length, 1, path);
  for (const asset of ['site.css', 'site.js', 'theme.js']) {
    assert.equal(html.split(`/assets/site/${asset}`).length - 1, 1, `${path}: ${asset}`);
  }
  assert(html.indexOf('src="/assets/site/theme.js"') < html.indexOf('</head>'), path);
  const header = html.split('<!-- shared-header:start -->')[1].split('<!-- shared-header:end -->')[0];
  for (const theme of ['light','dark','system']) assert(header.includes(`value="${theme}"`), path);
  assert(header.includes('<summary aria-label="Open site menu">'), path);
  assert(header.includes('aria-label="Main navigation"'), path);
  assert(header.includes('class="site-header frame"'), path);
  assert(header.includes('class="brand brand-lockup"'), path);
  assert(header.includes('class="menu contents-menu"'), path);
  assert(header.includes('class="menu-icon"'), path);
  assert(!header.includes('class="wh-brand"'), path);
  assert(header.includes('<a href="/solution-explained/">View Technical Solution</a>'), path);
  assert.equal(header.split('href="/modeling-demos/"').length - 1, 1, path);
  assert(header.includes('View Modeling Demo'), path);
  if (!path.startsWith('dev/')) {
    for (const [, href] of header.matchAll(/href="(\/dev\/[^"]*)"/g)) assert.equal(href, '/modeling-demos/', path);
  }
  for (const [, id] of header.matchAll(/href="#([^"]+)"/g)) assert(html.includes(`id="${id}"`), `${path}: ${id}`);
}
function target() {
  return { handlers: {}, addEventListener(type, fn) { (this.handlers[type] ??= []).push(fn); },
    dispatchEvent(event) { for (const fn of this.handlers[event.type] || []) fn(event); } };
}
function environment({ saved, systemDark = false, storageFails = false } = {}) {
  const memory = new Map(saved ? [['augment-theme',saved]] : []);
  const window = Object.assign(target(), {scrollY: 0}), document = target();
  const classes = new Set();
  document.documentElement = { dataset: {}, style: {}, classList: { toggle(name,on) { on ? classes.add(name) : classes.delete(name); } } };
  const media = Object.assign(target(), { matches: systemDark });
  const summary = Object.assign(target(), { attrs:{}, setAttribute(k,v){this.attrs[k]=v;}, focus(){this.focused=true;} });
  const motion = Object.assign(target(), { attrs:{}, setAttribute(k,v){this.attrs[k]=v;} });
  const radios = ['light','dark','system'].map(value=>Object.assign(target(),{value}));
  const links = [target(),target()];
  const menu = Object.assign(target(), { open:false,
    contains(item){return [menu,summary,motion,...radios,...links].includes(item);},
    querySelector(selector){return {'summary':summary,'.wh-motion-toggle':motion,'.wh-menu-panel':{append(){}}}[selector];},
    querySelectorAll(selector){return selector==='a'?links:radios;}
  });
  const header = Object.assign(target(), {
    style: { setProperty(name,value){this[name]=value;} },
    contains(item){return item === summary || item === menu;},
    getBoundingClientRect(){return {height:131};},
  });
  const meta={};
  document.querySelector=selector=>selector==='#site-menu'?menu:selector==='.wh-header'?header:meta;
  document.querySelectorAll=()=>[];
  const context = { window,document,matchMedia:query=>query.includes('color-scheme')?media:{matches:false},
    CustomEvent:class {constructor(type,options){this.type=type;this.detail=options.detail;}},
    localStorage:{getItem(key){if(storageFails)throw Error('blocked');return memory.get(key)||null;},setItem(key,value){if(storageFails)throw Error('blocked');memory.set(key,value);}} };
  runInNewContext(read('./public/assets/site/theme.js'),context);
  return {context,window,document,media,memory,menu,summary,motion,radios,links,classes,header};
}
const env=environment({saved:'dark'});
assert.equal(env.document.documentElement.dataset.theme,'dark');
runInNewContext(read('./public/assets/site/site.js'),env.context);
assert.equal(env.radios[1].checked,true);
env.radios[0].dispatchEvent({type:'change'});
assert.equal(env.document.documentElement.dataset.theme,'light');
assert.equal(env.memory.get('augment-theme'),'light');
assert.equal(environment({saved:env.memory.get('augment-theme'),systemDark:true}).document.documentElement.dataset.theme,'light');
env.window.setSiteTheme('system');env.media.matches=true;env.media.dispatchEvent({type:'change'});
assert.equal(env.document.documentElement.dataset.theme,'dark');
env.window.dispatchEvent({type:'storage',key:'augment-theme',newValue:'light'});
assert.equal(env.document.documentElement.dataset.theme,'light');
assert.equal(env.radios[0].checked,true);
assert.equal(environment({saved:'invalid',systemDark:true}).document.documentElement.dataset.themePreference,'light');
const blocked=environment({storageFails:true});blocked.window.setSiteTheme('dark');
assert.equal(blocked.document.documentElement.dataset.theme,'dark');
env.menu.open=true;env.document.dispatchEvent({type:'keydown',key:'Escape',preventDefault(){}});
assert.equal(env.menu.open,false);assert.equal(env.summary.focused,true);
env.menu.open=true;env.document.dispatchEvent({type:'click',target:{}});assert.equal(env.menu.open,false);
env.menu.open=true;env.document.dispatchEvent({type:'focusin',target:{}});assert.equal(env.menu.open,false);
env.menu.open=true;env.links[0].dispatchEvent({type:'click'});assert.equal(env.menu.open,false);
env.motion.dispatchEvent({type:'click'});assert(env.classes.has('sweep-paused'));assert(env.classes.has('wh-motion-paused'));assert.equal(env.memory.get('augment-motion'),'paused');
const scrollTo = y => {env.window.scrollY=y;env.window.dispatchEvent({type:'scroll'});};
const offset = () => parseFloat(env.header.style['--wh-header-offset'] || '0');
scrollTo(100);assert.equal(offset(),0);
scrollTo(400);assert.equal(offset(),-100);
scrollTo(397);assert.equal(offset(),-100); // Tiny reversals do not reveal the header.
scrollTo(350);const firstReveal=offset();assert(firstReveal>-100 && firstReveal<-50);
scrollTo(350);assert.equal(offset(),firstReveal); // Pausing preserves partial visibility.
scrollTo(300);assert(offset()>firstReveal && offset()<0);
scrollTo(160);assert.equal(offset(),0); // Sustained upward scrolling reveals it fully.
scrollTo(400);assert.equal(offset(),-100);
scrollTo(350);const partialReveal=offset();
scrollTo(355);assert.equal(offset(),partialReveal); // Downward jitter is ignored too.
scrollTo(390);assert(offset()<partialReveal); // Reversal hides progressively.
env.menu.open=true;env.menu.dispatchEvent({type:'toggle'});assert.equal(offset(),0);
scrollTo(500);assert.equal(offset(),0);
env.menu.open=false;scrollTo(750);assert.equal(offset(),-100);
env.header.dispatchEvent({type:'focusin'});assert.equal(offset(),0);
env.document.activeElement=env.summary;env.summary.matches=()=>true;
scrollTo(800);assert.equal(offset(),0);
env.document.activeElement=null;scrollTo(1050);assert.equal(offset(),-100);
scrollTo(0);assert.equal(offset(),0);
console.log('PASS: progressive header reveal, partial visibility, reversal jitter, open-menu visibility and keyboard focus.');
console.log(`PASS: ${pages.length} shared headers; theme persistence, system changes, cross-tab sync, storage failure, menu dismissal and animation preference.`);

// Chart colors follow the shared preference without changing the selected year or data.
const chartData=JSON.parse(read('./public/modeling-demos/data.json'));
const chartElements={};
const element=id=>chartElements[id]??=Object.assign(target(),{id,value:'10',style:{}});
const chartWindow=target(), chartRoot={dataset:{theme:'dark'}}, plots={};
const Plotly={
  async newPlot(el,traces,layout){plots[el.id]={traces,layout};},
  async restyle(el,updates,indices){for(const [key,value] of Object.entries(updates)) indices.forEach((i,j)=>{plots[el.id].traces[i][key]=Array.isArray(value)?value[j]:value;});},
  async relayout(el,updates){Object.assign(plots[el.id].layout,updates);},
};
chartWindow.Plotly=Plotly;
runInNewContext(read('./public/modeling-demos/demo.js'),{
  window:chartWindow,Plotly,document:{documentElement:chartRoot,getElementById:element,querySelector:element},
  fetch:async()=>({ok:true,json:async()=>chartData}),
});
await new Promise(setImmediate);
assert.equal(plots.histogram.layout.paper_bgcolor,'#19211c');
assert.equal(plots['degradation-curve'].layout.shapes[0].line.color,'#edf3ed');
chartRoot.dataset.theme='light';chartWindow.dispatchEvent({type:'site-theme-change'});
await new Promise(setImmediate);
assert.equal(plots.histogram.layout.paper_bgcolor,'#fff');
assert.equal(plots['degradation-curve'].layout.shapes[0].line.color,'#202220');
assert.equal(plots['degradation-curve'].layout.shapes[0].x0,10);
element('service-year').value='25';element('service-year').dispatchEvent({type:'input'});
await new Promise(setImmediate);
assert.equal(plots['degradation-curve'].layout.shapes[0].x0,25);
assert.equal(plots.histogram.traces[0].y.reduce((a,b)=>a+b,0).toFixed(8),'1.00000000');
console.log('PASS: chart theme switching preserves simulation data and year-slider behavior.');

const capacityBins=chartData.year_slider_histograms.bin_edges;
assert.equal(plots.histogram.layout.xaxis.title.text,'Capacity degraded (%)');
assert(plots.histogram.layout.xaxis.range[0]<plots.histogram.layout.xaxis.range[1]);
for (let i=0;i<capacityBins.length-1;i++) {
  assert.equal(plots.histogram.traces[0].x[i],100-(capacityBins[i]+capacityBins[i+1])/2);
}
for (const year of chartData.year_slider_histograms.years) {
  element('service-year').value=String(year);element('service-year').dispatchEvent({type:'input'});
  await new Promise(setImmediate);
  for (const [i,scenario] of ['central','conservative'].entries()) {
    const source=chartData.year_slider_histograms.scenarios[scenario];
    assert.equal(plots.histogram.layout.shapes[i].x0,100-source.medians[year-3]);
    assert.deepEqual(Array.from(plots.histogram.traces[i].y),source.counts[year-3].map(n=>n/source.draw_count));
  }
}
assert.equal(plots['degradation-curve'].layout.yaxis.title.text,'Capacity retained (%)');
console.log('PASS: degradation bin coordinates, increasing axis, all median markers and unchanged counts across 23 years.');
