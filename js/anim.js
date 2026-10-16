/**
 * anim.js — Shared scroll-reveal animations for case study pages
 * Strategy:
 *  - Pure IntersectionObserver, no scroll listeners (no jank)
 *  - Only animates opacity + translateY (compositor-only, GPU, no layout)
 *  - Respects prefers-reduced-motion
 *  - Stagger via CSS custom property --i on each child
 */
(function () {
  'use strict';

  const reduceMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduceMotion) return; // respect system preference — skip all animation

  // Mark JS available so CSS can hide pre-reveal state
  document.documentElement.classList.add('js-anim');

  /* ── 1. Reveal elements with class="cs-reveal" ── */
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -48px 0px' }
  );

  document.querySelectorAll('.cs-reveal').forEach((el) => revealObserver.observe(el));

  /* ── 2. Stagger child items inside ".cs-stagger" parents ── */
  const staggerObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const children = Array.from(entry.target.children);
          children.forEach((child, i) => {
            child.style.setProperty('--i', i);
            child.classList.add('is-visible');
          });
          staggerObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
  );

  document.querySelectorAll('.cs-stagger').forEach((el) => staggerObserver.observe(el));

  /* ── 3. Scroll-progress bar (if present on page) ── */
  const bar = document.getElementById('csScrollBar');
  if (bar) {
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max <= 0) return;
      bar.style.transform = 'scaleX(' + (window.scrollY / max) + ')';
    };
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  /* ── 4. Sticky header compact on scroll ── */
  const header = document.querySelector('.site-header');
  if (header) {
    const onScroll = () => {
      header.classList.toggle('is-scrolled', window.scrollY > 40);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

})();
