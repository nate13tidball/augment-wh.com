// Technical solution: the slide list becomes a slideshow. It opens on the cover slide (data-cover); the first
// interaction restarts it at slide 1 and plays. Pause/Play, Back, Next, the slide track, a click on the slide, or
// the arrow keys work after that; moving by hand pauses autoplay. Autoplay runs only while the deck is in view.
(() => {
  const deck = document.querySelector('.solution-deck');
  if (!deck) return;
  const slides = [...deck.querySelectorAll('.deck-slide')];
  const controls = deck.querySelector('.deck-controls');
  const cover = deck.querySelector('.deck-cover');
  const play = controls.querySelector('.deck-play');
  const playLabel = play.querySelector('.deck-play-label');
  const prev = controls.querySelector('.deck-prev');
  const next = controls.querySelector('.deck-next');
  const count = controls.querySelector('.deck-count');
  const track = controls.querySelector('.deck-track');
  const coverIndex = Math.min(slides.length, Math.max(1, Number(deck.dataset.cover) || 1)) - 1;
  let index = 0;
  let started = false;
  let playing = false;
  let visible = false;
  let elapsed = 0;
  let last = null;

  deck.classList.add('is-live');
  controls.hidden = false;
  cover.hidden = false;
  const segments = slides.map((slide, i) => {
    const seg = document.createElement('button');
    seg.type = 'button';
    seg.className = 'deck-segment';
    seg.setAttribute('aria-label', `Go to slide ${i + 1}`);
    seg.append(document.createElement('span'));
    seg.addEventListener('click', () => { started = true; manual(i); });
    track.append(seg);
    slide.querySelector('img').addEventListener('click', () => (started ? manual(index + 1) : start()));
    return seg;
  });

  function show(i) {
    index = (i + slides.length) % slides.length;
    slides.forEach((s, j) => s.classList.toggle('is-current', j === index));
    slides[index].querySelector('img').after(cover, controls);  // overlay and controls sit with the current slide
    segments.forEach((seg, j) => {
      const done = started && j < index;  // the cover shows no progress until the deck starts
      seg.setAttribute('aria-current', String(j === index));
      seg.firstChild.style.width = done ? '100%' : '0%';
    });
    count.textContent = `${index + 1} / ${slides.length}`;
    slides[(index + 1) % slides.length].querySelector('img').loading = 'eager';  // fetch the next slide early
    elapsed = 0;
  }

  function setPlaying(on) {
    playing = on;
    deck.classList.toggle('is-playing', on);
    playLabel.textContent = on ? 'Pause' : 'Play';
    play.setAttribute('aria-label', on ? 'Pause slideshow' : 'Play slideshow');
    deck.setAttribute('aria-live', on ? 'off' : 'polite');
    last = null;
  }

  function start() {
    started = true;
    deck.classList.add('is-started');
    show(0);
    setPlaying(true);
  }

  function manual(i) {
    deck.classList.add('is-started');
    setPlaying(false);
    show(i);
  }

  function tick(now) {
    if (playing && visible && !document.hidden) {
      if (last !== null) elapsed += now - last;
      last = now;
      const dwell = Number(slides[index].dataset.dwell) || 7000;
      segments[index].firstChild.style.width = `${Math.min(100, (elapsed / dwell) * 100)}%`;
      if (elapsed >= dwell) {
        if (index === slides.length - 1) setPlaying(false);  // stop on the last slide
        else show(index + 1);
      }
    } else {
      last = null;
    }
    requestAnimationFrame(tick);
  }

  cover.addEventListener('click', start);
  play.addEventListener('click', () => (started ? setPlaying(!playing) : start()));
  prev.addEventListener('click', () => (started ? manual(index - 1) : start()));
  next.addEventListener('click', () => (started ? manual(index + 1) : start()));
  deck.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    if (!started) start();
    else manual(index + (e.key === 'ArrowRight' ? 1 : -1));
  });
  let x0 = null;
  const list = deck.querySelector('.deck-slides');
  list.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  list.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    x0 = null;
    if (Math.abs(dx) < 40) return;
    if (!started) start();
    else manual(index + (dx < 0 ? 1 : -1));
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; }, { threshold: 0.4 }).observe(deck);
  } else {
    visible = true;
  }

  setPlaying(false);
  show(coverIndex);
  requestAnimationFrame(tick);
})();
