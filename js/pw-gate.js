/**
 * Password Gate & Protection System for Portfolio
 * Handles protected case studies (Nut Runner, Builderlytics)
 * Supports:
 *  - Direct page loading gate (shields content until unlocked)
 *  - Project dropdown triggers on every page
 *  - Project card triggers on the landing page
 */
(() => {
  const PASSWORDS = {
    builderlytics: '1485',
    nutrunner: '1485'
  };

  const pageKey = document.body ? document.body.getAttribute('data-gate-key') : null;
  const isPageGate = Boolean(pageKey);

  // If this page itself is password-protected, check session unlock status immediately
  if (isPageGate) {
    try {
      if (sessionStorage.getItem('unlocked-' + pageKey) !== '1') {
        document.documentElement.classList.add('is-locked');
      } else {
        document.documentElement.classList.remove('is-locked');
      }
    } catch (e) {
      document.documentElement.classList.add('is-locked');
    }
  }

  // Phones can type Devanagari / full-width digits or add stray spaces; treat them as ASCII digits
  function normalizePw(value) {
    return String(value || '')
      .replace(/[\u0966-\u096F]/g, c => String(c.charCodeAt(0) - 0x0966))
      .replace(/[\uFF10-\uFF19]/g, c => String(c.charCodeAt(0) - 0xFF10))
      .replace(/\s+/g, '');
  }

  function resolveKey(key, redirect) {
    if (PASSWORDS[key]) return key;
    const base = String(redirect || '').split('/').pop().split('#')[0].replace(/\.html.*$/i, '');
    return PASSWORDS[base] ? base : key;
  }

  function init() {
    let pwModal = document.getElementById('pwModal');
    if (!pwModal) {
      pwModal = document.createElement('div');
      pwModal.className = 'pw-modal';
      pwModal.id = 'pwModal';
      pwModal.setAttribute('role', 'dialog');
      pwModal.setAttribute('aria-modal', 'true');
      pwModal.setAttribute('aria-labelledby', 'pwTitle');
      pwModal.innerHTML = `
        <div class="pw-backdrop" id="pwBackdrop"></div>
        <div class="pw-dialog">
          <h3 id="pwTitle">Protected Case Study</h3>
          <p>This case study is password-protected. Enter the last 4 digits of my contact number to gain access.</p>
          <input type="password" id="pwInput" name="pw-gate" placeholder="Enter password" inputmode="numeric" pattern="[0-9]*" enterkeyhint="go" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Password">
          <p class="pw-error" id="pwError">Incorrect password. Please try again.</p>
          <div class="pw-actions">
            <button type="button" class="pw-cancel" id="pwCancel">Cancel</button>
            <button type="button" class="pw-submit" id="pwSubmit">Unlock</button>
          </div>
        </div>
      `;
      document.body.appendChild(pwModal);
    }

    const pwInput = document.getElementById('pwInput');
    const pwError = document.getElementById('pwError');
    const pwSubmit = document.getElementById('pwSubmit');
    const pwCancel = document.getElementById('pwCancel');
    const pwBackdrop = document.getElementById('pwBackdrop');
    const pwDialog = pwModal.querySelector('.pw-dialog');

    let currentTargetKey = pageKey || '';
    let currentRedirect = '';

    function openModal(key, redirect) {
      currentTargetKey = key || pageKey || '';
      currentRedirect = redirect || '';
      if (pwInput) {
        pwInput.value = '';
        pwInput.classList.remove('error');
      }
      if (pwError) pwError.classList.remove('show');
      if (pwDialog) pwDialog.classList.remove('shake');
      pwModal.classList.add('open');
      document.body.classList.add('modal-open');
      setTimeout(() => { if (pwInput) pwInput.focus(); }, 80);
    }

    function closeModal() {
      pwModal.classList.remove('open');
      document.body.classList.remove('modal-open');
      if (isPageGate && sessionStorage.getItem('unlocked-' + pageKey) !== '1') {
        // If user cancelled on a protected page, navigate back to landing page projects
        const fallback = document.body.getAttribute('data-gate-fallback') || '../index.html#projects';
        window.location.href = fallback;
      }
    }

    function submitPassword() {
      const expected = PASSWORDS[currentTargetKey];
      const entered = pwInput ? normalizePw(pwInput.value) : '';

      if (entered && entered === expected) {
        try {
          sessionStorage.setItem('unlocked-' + currentTargetKey, '1');
        } catch (e) {}

        if (isPageGate && currentTargetKey === pageKey) {
          document.documentElement.classList.remove('is-locked');
          pwModal.classList.remove('open');
          document.body.classList.remove('modal-open');
        } else {
          pwModal.classList.remove('open');
          document.body.classList.remove('modal-open');
          if (currentRedirect) {
            window.location.href = currentRedirect;
          }
        }
      } else {
        if (pwError) pwError.classList.add('show');
        if (pwInput) {
          pwInput.classList.add('error');
          pwInput.focus();
        }
        if (pwDialog) {
          pwDialog.classList.remove('shake');
          void pwDialog.offsetWidth;
          pwDialog.classList.add('shake');
        }
      }
    }

    // Attach click listeners to all .pw-trigger elements
    document.querySelectorAll('.pw-trigger').forEach(el => {
      el.addEventListener('click', (e) => {
        const redirect = el.getAttribute('data-redirect') || el.getAttribute('href');
        // data-password should be a project key (nutrunner / builderlytics). If a page put something
        // else there (e.g. the digits themselves), fall back to the project named in the link.
        const key = resolveKey(el.getAttribute('data-password'), redirect);

        try {
          if (sessionStorage.getItem('unlocked-' + key) === '1') {
            // Already unlocked, allow direct navigation
            if (redirect && redirect !== '#' && el.tagName.toLowerCase() !== 'a') {
              window.location.href = redirect;
            }
            return;
          }
        } catch (err) {}

        e.preventDefault();
        openModal(key, redirect);
      });
    });

    if (pwSubmit) pwSubmit.addEventListener('click', submitPassword);
    if (pwCancel) pwCancel.addEventListener('click', closeModal);
    if (pwBackdrop) pwBackdrop.addEventListener('click', closeModal);

    if (pwInput) {
      pwInput.addEventListener('input', () => {
        if (pwError) pwError.classList.remove('show');
        pwInput.classList.remove('error');
      });
      pwInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.keyCode === 13) {
          e.preventDefault();
          submitPassword();
        } else if (e.key === 'Escape') {
          closeModal();
        }
      });
    }

    // If page is locked on load, show modal automatically
    if (isPageGate) {
      try {
        if (sessionStorage.getItem('unlocked-' + pageKey) !== '1') {
          openModal(pageKey);
        } else {
          document.documentElement.classList.remove('is-locked');
        }
      } catch (err) {
        openModal(pageKey);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();