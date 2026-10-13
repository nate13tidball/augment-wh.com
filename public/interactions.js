// Timings recovered from the public Ouros Framer components; see docs/ouros-interactions.md.
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const statement = document.querySelector('.statement');
if (statement && !reducedMotion.matches && 'IntersectionObserver' in window) {
  let index = 0;
  // Preserve the existing emphasis and spaces while animating each word.
  const walker = document.createTreeWalker(statement, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node => {
    const fragment = document.createDocumentFragment();
    node.textContent.split(/(\s+)/).forEach(word => {
      if (!word.trim()) return fragment.append(document.createTextNode(word));
      const span = document.createElement('span');
      span.className = 'reveal-word';
      span.style.setProperty('--word-index', index++);
      span.textContent = word;
      fragment.append(span);
    });
    node.replaceWith(fragment);
  });
  statement.classList.add('words-ready');
}
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0 });
  document.querySelectorAll('[data-reveal], .words-ready').forEach(element => {
    element.classList.add('reveal-ready');
    observer.observe(element);
  });
}

// Native details retain keyboard and no-JavaScript behavior. Animate only the height.
document.querySelectorAll('.scope-item').forEach(item => {
  const summary = item.querySelector('summary');
  let expanded = item.open;
  let animation;
  summary.addEventListener('click', event => {
    event.preventDefault();
    expanded = !expanded;
    const start = item.getBoundingClientRect().height;
    animation?.cancel();
    item.dataset.open = String(expanded);
    if (reducedMotion.matches || !item.animate) {
      item.open = expanded;
      return;
    }
    item.open = true;
    const end = expanded ? item.scrollHeight : summary.offsetHeight;
    animation = item.animate([{ height: `${start}px` }, { height: `${end}px` }], {
      duration: 500, easing: 'cubic-bezier(.44, 0, .56, 1)',
    });
    animation.onfinish = () => {
      item.open = expanded;
      animation = null;
    };
  });
});

const menu = document.querySelector('.menu');
if (menu) {
  menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => { menu.open = false; }));
  document.addEventListener('click', event => {
    if (!menu.contains(event.target)) menu.open = false;
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.open) {
      menu.open = false;
      menu.querySelector('summary').focus();
    }
  });
}
