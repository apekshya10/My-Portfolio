/**
 * Apekshya — Product Designer Portfolio
 * Main JavaScript Interactions
 *
 * Performance notes:
 *  - ONE scroll pipeline (progress bar, header, stacked cards, reveal, back-to-top).
 *  - All layout reads happen first, all style writes after (no layout thrashing).
 *  - Stacked cards only animate transform + an overlay's opacity (GPU friendly);
 *    the old per-frame `filter: brightness()` and transform transition were the lag.
 *  - Smooth scrolling via Lenis (loaded in index.html). Falls back to native scroll.
 */
(function () {
  'use strict';
  window.__portfolioReady = true;

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ==========================================================================
     0. Smooth scroll (Lenis) & Tactile Micro-interactions
     ========================================================================== */
  let lenis = null;
  function setupLenis() {
    if (lenis || reduceMotion || !window.Lenis) return;
    try {
      lenis = new window.Lenis({
        duration: 1.2,
        easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 0.95,
        touchMultiplier: 1.5,
        syncTouch: false
      });
      window.__lenis = lenis;
      const raf = time => {
        lenis.raf(time);
        requestAnimationFrame(raf);
      };
      requestAnimationFrame(raf);
      if (typeof request === 'function') {
        lenis.on('scroll', request);
      }
    } catch (err) {
      console.warn('Lenis scroll unavailable, falling back to native smooth scrolling.', err);
      lenis = null;
    }
  }
  setupLenis();
  window.addEventListener('load', setupLenis);

  const lockScroll = () => { if (lenis) lenis.stop(); };
  const unlockScroll = () => { if (lenis) lenis.start(); };

  // In-page anchor links with smooth glide
  document.addEventListener('click', e => {
    if (e.defaultPrevented) return;
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (!id || id.length < 2) return;
    const target = $(id);
    if (!target) return;
    e.preventDefault();
    if (lenis) {
      lenis.scrollTo(id === '#home' ? 0 : target, {
        offset: id === '#home' ? 0 : -84,
        duration: 1.25,
        easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t))
      });
    } else {
      target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    }
  });

  // Tactile click ripple micro-interaction
  document.addEventListener('pointerdown', e => {
    const btn = e.target.closest('.btn-black, .btn-primary, .btn-outline, .btn-teal, .icon-circle, .back-to-top, .pw-trigger, .tool-pill, .nav-pill a');
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.2;
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    const ripple = document.createElement('span');
    ripple.className = 'ripple-wave';
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';

    const prevPos = window.getComputedStyle(btn).position;
    if (prevPos === 'static') btn.style.position = 'relative';

    btn.appendChild(ripple);
    setTimeout(() => { ripple.remove(); }, 600);
  });

  /* ==========================================================================
     1. Navigation & Mobile Menu
     ========================================================================== */
  const menuToggle = $('#menuToggle');
  const navPill = $('#navPill');
  const dropdown = $('.nav-dropdown');
  const dropdownToggle = $('.nav-dropdown-toggle');

  if (menuToggle && navPill) {
    menuToggle.addEventListener('click', () => {
      const isOpen = navPill.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }

  function closeMobileNav() {
    if (navPill) navPill.classList.remove('open');
    if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
    if (dropdown) dropdown.classList.remove('open');
    if (dropdownToggle) dropdownToggle.setAttribute('aria-expanded', 'false');
  }

  $$('[data-nav]').forEach(link => {
    link.addEventListener('click', () => {
      $$('[data-nav]').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      // On phones the "Projects" link only expands its submenu, so the menu must
      // stay open (closing it hid the Nut Runner / Builderlytics links entirely).
      const opensSubmenuOnly = link === dropdownToggle && window.innerWidth <= 760;
      if (!opensSubmenuOnly && navPill && navPill.classList.contains('open')) {
        navPill.classList.remove('open');
        if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
      }
    });
  });

  if (dropdownToggle && dropdown) {
    dropdownToggle.addEventListener('click', e => {
      if (window.innerWidth <= 760) {
        e.preventDefault();
        const isOpen = dropdown.classList.toggle('open');
        dropdownToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      }
    });
  }

  // Picking a project from the submenu (including the password-protected ones) closes the menu
  $$('.nav-dropdown-menu a').forEach(a => {
    a.addEventListener('click', closeMobileNav);
  });

  // LinkedIn, Email and Resume live in the mobile menu; close the menu behind them
  $$('.nav-linkedin, .nav-email, .nav-resume').forEach(a => a.addEventListener('click', closeMobileNav));

  document.addEventListener('click', e => {
    if (dropdown && !dropdown.contains(e.target)) dropdown.classList.remove('open');
    // tap outside the open mobile menu to dismiss it
    if (navPill && navPill.classList.contains('open') &&
        !navPill.contains(e.target) && !(menuToggle && menuToggle.contains(e.target))) {
      closeMobileNav();
    }
  });

  /* ==========================================================================
     2. Section Spy / Active Nav + Hero pause when offscreen
     ========================================================================== */
  const spySections = [
    { id: 'home', link: $('[data-nav][href="#home"]') },
    { id: 'projects', link: $('.nav-dropdown-toggle') },
    { id: 'contact', link: $('[data-nav][href="#contact"]') }
  ];

  const navObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const match = spySections.find(s => s.id === entry.target.id);
      if (match && match.link) {
        $$('[data-nav]').forEach(l => l.classList.remove('active'));
        match.link.classList.add('active');
      }
    });
  }, { rootMargin: '-40% 0px -40% 0px' });

  spySections.forEach(s => {
    const el = document.getElementById(s.id);
    if (el) navObserver.observe(el);
  });

  const heroEl = $('.hero');
  if (heroEl) {
    new IntersectionObserver(entries => {
      entries.forEach(en => heroEl.classList.toggle('is-offscreen', !en.isIntersecting));
    }).observe(heroEl);
  }

  /* ==========================================================================
     3. Reveal on scroll
     ========================================================================== */
  let pending = $$('.reveal');
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  pending.forEach(el => revealObserver.observe(el));

  /* ==========================================================================
     4. One scroll pipeline
     ========================================================================== */
  const header = $('#siteHeader');
  const progress = $('#scrollProgress');
  const backToTop = $('#backToTop');
  const stackCards = $$('.project-card');

  let docMax = 0;
  let stackMeta = [];
  let stackReset = false;
  let lastProgress = -1;

  function measure() {
    docMax = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    stackMeta = stackCards.map((c, i) => ({
      top: parseFloat(getComputedStyle(c).top) || 100,
      h: c.offsetHeight,
      s: -1,
      d: -1
    }));
  }

  function frame() {
    const y = window.scrollY || window.pageYOffset || 0;
    const desktopStack = window.innerWidth > 760 && stackCards.length > 0;

    /* ---- READS ---- */
    const cardTops = desktopStack ? stackCards.map(c => c.getBoundingClientRect().top) : null;
    const pendingTops = pending.length ? pending.map(el => el.getBoundingClientRect().top) : null;
    const vh = window.innerHeight;

    /* ---- WRITES ---- */
    // progress bar
    if (progress) {
      const p = docMax ? Math.min(1, Math.max(0, y / docMax)) : 0;
      if (Math.abs(p - lastProgress) > 0.0005) {
        progress.style.transform = 'scaleX(' + p.toFixed(4) + ')';
        lastProgress = p;
      }
    }

    // header + back to top
    if (header) header.classList.toggle('is-scrolled', y > 12);
    if (backToTop) backToTop.classList.toggle('visible', y > 400);

    // stacked project cards — continuous, no steps
    if (desktopStack && stackMeta.length === stackCards.length) {
      stackReset = false;
      const n = stackCards.length;
      const p = new Array(n).fill(0);
      for (let j = 1; j < n; j++) {
        const prev = stackMeta[j - 1];
        const cur = stackMeta[j];
        const start = prev.top + prev.h;      // card j starts overlapping card j-1
        const end = cur.top;                  // card j is fully stuck
        const t = (start - cardTops[j]) / Math.max(1, start - end);
        p[j] = Math.min(1, Math.max(0, t));
      }
      for (let i = 0; i < n; i++) {
        let sum = 0;
        for (let j = i + 1; j < n; j++) sum += p[j];
        const s = Math.max(0.94, 1 - sum * 0.02);
        const d = Math.min(0.18, sum * 0.05);
        const m = stackMeta[i];
        if (Math.abs(s - m.s) > 0.0004) {
          stackCards[i].style.transform = 'scale(' + s.toFixed(4) + ') translateZ(0)';
          m.s = s;
        }
        if (Math.abs(d - m.d) > 0.002) {
          stackCards[i].style.setProperty('--dim', d.toFixed(3));
          m.d = d;
        }
      }
    } else if (!desktopStack && !stackReset) {
      stackCards.forEach(c => {
        c.style.transform = '';
        c.style.removeProperty('--dim');
      });
      stackMeta.forEach(m => { m.s = -1; m.d = -1; });
      stackReset = true;
    }

    // safety net for fast scrolls / anchor jumps
    if (pendingTops) {
      const still = [];
      pending.forEach((el, i) => {
        if (pendingTops[i] < vh - 40) {
          el.classList.add('visible');
          revealObserver.unobserve(el);
        } else {
          still.push(el);
        }
      });
      pending = still;
    }
  }

  let ticking = false;
  function request() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      frame();
    });
  }

  // Window scroll as base, plus Lenis on-scroll connection
  window.addEventListener('scroll', request, { passive: true });
  if (lenis) {
    lenis.on('scroll', request);
  }

  let resizeTimer = null;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      // clear cached values so transforms are recomputed
      stackCards.forEach(c => { c.style.transform = ''; });
      measure();
      request();
    }, 80);
  }
  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('load', () => { measure(); request(); });
  if ('ResizeObserver' in window) {
    let roTimer = null;
    new ResizeObserver(() => {
      clearTimeout(roTimer);
      roTimer = setTimeout(() => { measure(); request(); }, 120);
    }).observe(document.body);
  }

  measure();
  frame();

  if (backToTop) {
    backToTop.addEventListener('click', () => {
      if (lenis) {
        lenis.scrollTo(0, {
          duration: 1.25,
          easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t))
        });
      } else {
        window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      }
    });
  }

  /* ==========================================================================
     5. Beyond UI/UX stacked cards & gallery modal
     ========================================================================== */
  const order = ['logo', 'illustration', 'social'];
  let current = 0;
  const cards = $$('.stack-card');
  const dots = $$('#dots button');
  const galleryModal = $('#galleryModal');
  const galleryClose = $('#galleryClose');
  const galleryBackdrop = $('#galleryBackdrop');
  const stackArea = $('#stackArea');
  let lastFocusedElement = null;

  const galleryData = {
    logo: {
      title: 'Logo / Icon Design',
      mode: 'logo-mode',
      items: [
        { src: 'assets/logos/crimson.png', label: 'Crimson Tech' },
        { src: 'assets/logos/builderlytics.png', label: 'Builderlytics' },
        { src: 'assets/logos/Health Foundation.png', label: 'Health Promotion Foundation' },
        { src: 'assets/logos/revitize.png', label: 'Revitize Education' },
        { src: 'assets/logos/CTgarud.png', label: 'CT Garud' },
        { src: 'assets/logos/nimto.png', label: 'Nimto Kithcen' },
        { src: 'assets/logos/skillx.png', label: 'SkillX' },
        { src: 'assets/logos/kalika youth club.png', label: 'Kalika Youth Club' },
        { src: 'assets/logos/futuregenic logo.png', label: 'Futurgenic.' },
        { src: 'assets/logos/ocr.png', label: 'OCR' }
      ]
    },
    illustration: {
      title: 'Illustration Work',
      mode: 'ill-mode',
      items: [
        { src: 'assets/illustrations/Anya.png', label: 'Extra Illustration 1' },
        { src: 'assets/illustrations/setsukoo.png', label: 'Couple' },
        { src: 'assets/illustrations/Naruto.png', label: 'Couple' },
        { src: 'assets/illustrations/Fake mask - Copy.png', label: 'Papercut' },
        { src: 'assets/illustrations/cartoonboy.png', label: 'Extra Illustration 1' },
        { src: 'assets/illustrations/kumari.png', label: 'Couple' },
        { src: 'assets/illustrations/1234.png', label: 'Couple' },
        { src: 'assets/illustrations/234.png', label: 'Explorer Boy' },
        { src: 'assets/illustrations/couple.png', label: 'Anime Girl' },
        { src: 'assets/illustrations/night illustration.png', label: 'Extra Illustration 1' }
      ]
    },
    social: {
      title: 'Social Media & Marketing',
      mode: 'post-mode',
      items: [
        { src: 'assets/posts/machine vision.jpg', label: 'Machine Vision Products' },
        { src: 'assets/posts/omr.jpg', label: 'OMR' },
        { src: 'assets/posts/nakayoshi.jpg', label: 'Nakayoshi' },
        { src: 'assets/posts/cosmo.jpg', label: 'Cosmo' },
        { src: 'assets/posts/bestPTE1.jpg', label: 'PTE' },
        { src: 'assets/posts/ieltspristine.jpg', label: 'PTE' },
        { src: 'assets/posts/nakayoshi1.jpg', label: 'Cover', wide: true }
      ]
    }
  };

  function renderStack() {
    order.forEach((key, i) => {
      const pos = (i - current + order.length) % order.length;
      const el = $('.stack-card[data-key="' + key + '"]');
      if (el) el.setAttribute('data-pos', pos);
    });
    dots.forEach((d, i) => d.classList.toggle('active', i === current));
  }

  // Autoplay: one interval, skipped while hovering, offscreen, hidden tab, or a modal is open
  let stackVisible = false;
  let stackHover = false;
  let modalOpen = false;
  setInterval(() => {
    if (document.hidden || !stackVisible || stackHover || modalOpen || reduceMotion) return;
    current = (current + 1) % order.length;
    renderStack();
  }, 3600);

  if (stackArea) {
    new IntersectionObserver(entries => {
      entries.forEach(en => { stackVisible = en.isIntersecting; });
    }, { threshold: 0.2 }).observe(stackArea);
    stackArea.addEventListener('mouseenter', () => { stackHover = true; });
    stackArea.addEventListener('mouseleave', () => { stackHover = false; });
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function openGallery(key) {
    const data = galleryData[key];
    if (!data) return;

    modalOpen = true;
    lastFocusedElement = document.activeElement;

    $('#galleryTitle').textContent = data.title;
    const grid = $('#galleryGrid');
    grid.className = 'gallery-grid ' + data.mode;
    grid.innerHTML = data.items.map((item, i) => (
      '<div class="gallery-item" style="--i:' + i + '">' +
        '<img src="' + item.src + '" alt="' + escapeHtml(item.label) + '" loading="lazy" decoding="async" ' +
        'onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">' +
        '<div class="gallery-placeholder-thumb" style="display:none;">' + escapeHtml(item.label) + '</div>' +
      '</div>'
    )).join('');

    galleryModal.classList.add('open');
    document.body.classList.add('modal-open');
    lockScroll();
    if (galleryClose) galleryClose.focus();
  }

  function closeGallery() {
    galleryModal.classList.remove('open');
    document.body.classList.remove('modal-open');
    modalOpen = false;
    unlockScroll();
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') lastFocusedElement.focus();
  }

  cards.forEach(card => {
    card.addEventListener('click', () => {
      current = order.indexOf(card.getAttribute('data-key'));
      renderStack();
      openGallery(card.getAttribute('data-key'));
    });
  });

  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      current = +dot.getAttribute('data-idx');
      renderStack();
    });
  });

  if (galleryClose) galleryClose.addEventListener('click', closeGallery);
  if (galleryBackdrop) galleryBackdrop.addEventListener('click', closeGallery);

  // Touch swipe for the carousel
  if (stackArea) {
    let touchStartX = 0;
    let touchStartY = 0;
    stackArea.addEventListener('touchstart', e => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });
    stackArea.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].screenX - touchStartX;
      const dy = e.changedTouches[0].screenY - touchStartY;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
        current = dx < 0 ? (current + 1) % order.length : (current - 1 + order.length) % order.length;
        renderStack();
      }
    }, { passive: true });
  }

  /* ==========================================================================
     6. Password gate modal
     ========================================================================== */
  const PASSWORDS = {
    builderlytics: '1485',
    nutrunner: '1485'
  };

  let pwRedirect = '';
  const pwModal = $('#pwModal');
  const pwInput = $('#pwInput');
  const pwError = $('#pwError');
  const pwSubmit = $('#pwSubmit');
  const pwCancel = $('#pwCancel');
  const pwBackdrop = $('#pwBackdrop');
  const pwDialog = pwModal ? $('.pw-dialog', pwModal) : null;

  function openPwModal(key, redirect) {
    modalOpen = true;
    lastFocusedElement = document.activeElement;
    pwRedirect = redirect || '';
    if (pwInput) { pwInput.value = ''; pwInput.classList.remove('error'); }
    if (pwError) pwError.classList.remove('show');
    if (pwDialog) pwDialog.classList.remove('shake');
    if (pwModal) pwModal.classList.add('open');
    document.body.classList.add('modal-open');
    lockScroll();
    setTimeout(() => { if (pwInput) pwInput.focus(); }, 60);
  }

  function closePwModal() {
    if (pwModal) pwModal.classList.remove('open');
    document.body.classList.remove('modal-open');
    modalOpen = false;
    pwRedirect = '';
    unlockScroll();
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') lastFocusedElement.focus();
  }

  // Phones can type Devanagari / full-width digits or add stray spaces; treat them as the ASCII digits
  function normalizePw(value) {
    return String(value || '')
      .replace(/[०-९]/g, c => String(c.charCodeAt(0) - 0x0966))
      .replace(/[０-９]/g, c => String(c.charCodeAt(0) - 0xFF10))
      .replace(/\s+/g, '');
  }

  function submitPw() {
    const key = pwModal ? pwModal.dataset.key || '' : '';
    const expected = PASSWORDS[key];
    const entered = pwInput ? normalizePw(pwInput.value) : '';

    if (entered && entered === expected) {
      try { sessionStorage.setItem('unlocked-' + key, '1'); } catch (e) { /* storage unavailable */ }
      const dest = pwRedirect;
      closePwModal();
      if (dest) window.location.href = dest;
    } else {
      if (pwError) pwError.classList.add('show');
      if (pwInput) { pwInput.classList.add('error'); pwInput.focus(); }
      if (pwDialog) {
        pwDialog.classList.remove('shake');
        void pwDialog.offsetWidth;
        pwDialog.classList.add('shake');
      }
    }
  }

  $$('.pw-trigger').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const key = btn.getAttribute('data-password');
      const redirect = btn.getAttribute('data-redirect') || btn.getAttribute('href');
      try {
        if (sessionStorage.getItem('unlocked-' + key) === '1') {
          if (redirect && redirect !== '#') window.location.href = redirect;
          return;
        }
      } catch (err) {}
      e.preventDefault();
      if (pwModal) pwModal.dataset.key = key;
      openPwModal(key, redirect);
    });
  });

  if (pwSubmit) pwSubmit.addEventListener('click', submitPw);
  if (pwCancel) pwCancel.addEventListener('click', closePwModal);
  if (pwBackdrop) pwBackdrop.addEventListener('click', closePwModal);

  if (pwInput) {
    pwInput.addEventListener('input', () => {
      if (pwError) pwError.classList.remove('show');
      pwInput.classList.remove('error');
    });
    pwInput.addEventListener('keydown', e => {
      // some Android keyboards report the "Go" key as keyCode 13 without key === 'Enter'
      if (e.key === 'Enter' || e.keyCode === 13) {
        e.preventDefault();
        submitPw();
      }
    });
  }

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (galleryModal && galleryModal.classList.contains('open')) closeGallery();
    if (pwModal && pwModal.classList.contains('open')) closePwModal();
  });

  /* ==========================================================================
     7. Hero role rotator
     ========================================================================== */
  try {
    const roleEl = $('#roleText');
    if (roleEl) {
      const roles = ['Product Designer', 'UI/UX Designer', 'Graphic Designer'];
      roleEl.textContent = roles[0];

      if (!reduceMotion) {
        let idx = 0;
        const INITIAL_HOLD = 2400;
        const HOLD_TIME = 1800;
        const TRANSITION_TIME = 500;

        const step = function () {
          roleEl.classList.add('is-leaving');
          setTimeout(function () {
            idx = (idx + 1) % roles.length;
            roleEl.textContent = roles[idx];
            roleEl.classList.remove('is-leaving');
            roleEl.classList.add('is-entering');
            void roleEl.offsetWidth; // reflow
            roleEl.classList.remove('is-entering');
          }, TRANSITION_TIME);
          setTimeout(step, HOLD_TIME + TRANSITION_TIME);
        };
        setTimeout(step, INITIAL_HOLD);
      }
    }
  } catch (err) {
    console.error('Role rotator error:', err);
  }
})();