/**
 * anim.js — Shared scroll animations for case study pages (v2, playful)
 *
 * Strategy (unchanged): IntersectionObserver for reveals, compositor-only
 * properties (opacity + translate/scale/rotate), respects reduced motion.
 *
 * Markup you can use (all optional):
 *   .cs-reveal                      fade + rise            (data-anim="left|right|zoom|tilt|blur|mask")
 *   [data-delay="150"]              extra delay in ms
 *   .cs-stagger                     children animate in one after another
 *   [data-split]                    headline words rise out of a mask
 *   [data-count="200"]              number counts up  (+ data-prefix / data-suffix / data-decimals)
 *   [data-parallax="0.15"]          image drifts while scrolling (put it in an overflow:hidden wrapper)
 *   [data-tilt]                     card tilts toward the cursor (mouse only)
 *   [data-magnetic]                 button follows the cursor a little (buttons get it automatically)
 *   #csScrollBar                    scroll progress bar
 */
(function () {
  'use strict';

  const reduceMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  const root = document.documentElement;
  root.classList.add('js-anim');

  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const passedOrSeen = en => en.isIntersecting || en.boundingClientRect.top < 0;

  /* Optional smooth scroll if Lenis is on the page and nobody started it yet */
  if (window.Lenis && !window.__lenis) {
    try {
      const lenis = new window.Lenis({ duration: 1.2, smoothWheel: true, wheelMultiplier: 0.95 });
      window.__lenis = lenis;
      const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    } catch (e) { /* native scrolling is fine */ }
  }

  /* ── 1. Reveal ── */
  $$('[data-delay]').forEach(el => { el.style.transitionDelay = (parseInt(el.dataset.delay, 10) || 0) + 'ms'; });

  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!passedOrSeen(entry)) return;
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -48px 0px' });
  $$('.cs-reveal').forEach(el => revealObserver.observe(el));

  /* ── 2. Stagger children ── */
  const staggerObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!passedOrSeen(entry)) return;
      Array.from(entry.target.children).forEach((child, i) => {
        child.style.setProperty('--i', i);
        child.classList.add('is-visible');
      });
      staggerObserver.unobserve(entry.target);
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
  $$('.cs-stagger').forEach(el => staggerObserver.observe(el));

  /* ── 3. Split headlines ── */
  function splitWords(el) {
    if (el.dataset.splitDone) return;
    el.dataset.splitDone = '1';
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    let wi = 0;
    (function walk(node) {
      Array.from(node.childNodes).forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(p => {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span');
            w.className = 'sw';
            w.setAttribute('aria-hidden', 'true');
            const inner = document.createElement('span');
            inner.textContent = p;
            inner.style.setProperty('--wi', wi++);
            w.appendChild(inner);
            frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') {
          walk(n);
        }
      });
    })(el);
  }
  const splitObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!passedOrSeen(entry)) return;
      entry.target.classList.add('sw-in');
      splitObserver.unobserve(entry.target);
    });
  }, { threshold: 0.3 });
  $$('[data-split]').forEach(el => { splitWords(el); splitObserver.observe(el); });

  /* ── 4. Count-up numbers ── */
  function countUp(el) {
    const target = parseFloat(el.dataset.count);
    if (isNaN(target)) return;
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    const dur = 1500;
    const start = performance.now();
    const ease = t => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
    (function tick(now) {
      const t = Math.min(1, (now - start) / dur);
      el.textContent = prefix + (target * ease(t)).toFixed(decimals) + suffix;
      if (t < 1) requestAnimationFrame(tick);
    })(start);
  }
  const countObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      countUp(entry.target);
      countObserver.unobserve(entry.target);
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach(el => countObserver.observe(el));

  /* ── 5. Parallax images (only the ones on screen are updated) ── */
  const parallaxVisible = new Set();
  const parallaxObserver = new IntersectionObserver(entries => {
    entries.forEach(en => { en.isIntersecting ? parallaxVisible.add(en.target) : parallaxVisible.delete(en.target); });
    requestParallax();
  }, { rootMargin: '120px 0px' });
  $$('[data-parallax]').forEach(el => parallaxObserver.observe(el));

  let pTick = false;
  function requestParallax() {
    if (pTick || !parallaxVisible.size) return;
    pTick = true;
    requestAnimationFrame(() => {
      pTick = false;
      const vh = window.innerHeight;
      const reads = Array.from(parallaxVisible).map(el => [el, el.getBoundingClientRect()]);
      reads.forEach(([el, r]) => {
        const speed = parseFloat(el.dataset.parallax) || 0.12;
        const offset = r.top + r.height / 2 - vh / 2;
        el.style.translate = '0 ' + (-offset * speed).toFixed(1) + 'px';
      });
    });
  }

  /* ── 6. Scroll progress + sticky header (one passive listener, rAF-throttled) ── */
  const bar = document.getElementById('csScrollBar');
  const header = document.querySelector('.site-header');
  let sTick = false;
  function onScroll() {
    if (sTick) return;
    sTick = true;
    requestAnimationFrame(() => {
      sTick = false;
      const y = window.scrollY || 0;
      if (bar) {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        if (max > 0) bar.style.transform = 'scaleX(' + Math.min(1, y / max).toFixed(4) + ')';
      }
      if (header) header.classList.toggle('is-scrolled', y > 40);
      requestParallax();
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ── 7. Mouse-only extras: magnetic buttons + card tilt ── */
  if (finePointer) {
    $$('[data-magnetic], .btn-primary, .btn-black, .btn-outline').forEach(el => {
      el.addEventListener('pointermove', e => {
        if (e.pointerType !== 'mouse') return;
        const r = el.getBoundingClientRect();
        el.style.translate =
          ((e.clientX - (r.left + r.width / 2)) * 0.28).toFixed(1) + 'px ' +
          ((e.clientY - (r.top + r.height / 2)) * 0.4).toFixed(1) + 'px';
      });
      el.addEventListener('pointerleave', () => {
        const from = el.style.translate || '0px 0px';
        el.style.translate = '';
        el.animate([{ translate: from }, { translate: '0px 0px' }], { duration: 550, easing: 'cubic-bezier(.34,1.56,.64,1)' });
      });
    });

    $$('[data-tilt]').forEach(el => {
      el.addEventListener('pointermove', e => {
        if (e.pointerType !== 'mouse') return;
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = 'perspective(900px) rotateX(' + (-py * 7).toFixed(2) + 'deg) rotateY(' + (px * 9).toFixed(2) + 'deg) translateZ(0)';
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }
})();