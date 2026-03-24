// ========== SUPABASE CONFIG ==========
const SUPABASE_URL = 'https://livbrrqqxnvnxhggguig.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpdmJycnFxeG52bnhoZ2dndWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0Njc1MzYsImV4cCI6MjA4NzA0MzUzNn0.MkOKc7MWq5zoR3OY7wZgOsPwvjjKSij0ln1nF6inxP0';

// ========== UTM CAPTURE ==========
const utmParams = {};
const urlParams = new URLSearchParams(window.location.search);
['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(key => {
  const val = urlParams.get(key);
  if (val) utmParams[key] = val;
});

// ========== FORM SUBMISSION ==========
window._blogSignupComplete = false;

async function submitBlogSignup(email, successEl, formEl) {
  const source = formEl.getAttribute('data-source') || 'blog_unknown';
  try {
    const body = { email, source_page: source, ...utmParams };
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/beta_signups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(body)
    });
    if (resp.status === 409) {
      successEl.textContent = "You're already signed up! We'll be in touch.";
    } else if (!resp.ok) {
      throw new Error('Signup failed');
    } else {
      successEl.textContent = "You're in! Check your inbox in the next few hours \u2014 I'll personally send you a link to set up your 20-minute onboarding call.";
    }
    formEl.style.display = 'none';
    successEl.style.display = 'block';
    window._blogSignupComplete = true;

    // Track signup in Mixpanel
    if (window.mixpanel) {
      mixpanel.track('blog_signup', {
        source: source,
        cta_type: formEl.getAttribute('data-cta-type') || 'unknown'
      });
    }
  } catch (err) {
    console.error('Signup error:', err);
    successEl.textContent = 'Something went wrong \u2014 please try again.';
    successEl.style.display = 'block';
  }
}

function setupBlogForms() {
  document.querySelectorAll('.blog-signup-form').forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = form.querySelector('input[type="email"]').value;
      const successEl = form.parentElement.querySelector('.blog-success-message');
      if (successEl) submitBlogSignup(email, successEl, form);
    });
  });
}

// ========== STICKY MOBILE BANNER ==========
function setupStickyBar() {
  const bar = document.querySelector('.blog-sticky-bar');
  const bottomCta = document.querySelector('.blog-cta-bottom');
  if (!bar) return;

  const slug = document.body.dataset.blogSlug || 'blog';
  const dismissKey = `sticky_dismissed_${slug}`;

  if (sessionStorage.getItem(dismissKey)) return;

  let shown = false;

  function showBar() {
    if (shown || sessionStorage.getItem(dismissKey)) return;
    bar.style.display = 'flex';
    shown = true;
  }

  // Show after 3s
  setTimeout(showBar, 3000);

  // Show at 15% scroll
  window.addEventListener('scroll', function onScroll() {
    const scrollPct = window.scrollY / (document.body.scrollHeight - window.innerHeight);
    if (scrollPct >= 0.15) {
      showBar();
      window.removeEventListener('scroll', onScroll);
    }
  });

  // Hide when bottom CTA is visible
  if (bottomCta) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (bar.style.display === 'flex') {
          bar.style.display = entry.isIntersecting ? 'none' : 'flex';
        }
      });
    }, { threshold: 0.1 });
    observer.observe(bottomCta);
  }

  // Dismiss button
  const dismissBtn = bar.querySelector('.blog-sticky-dismiss');
  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => {
      bar.style.display = 'none';
      sessionStorage.setItem(dismissKey, '1');
    });
  }

  // Scroll-to-bottom-CTA on click
  const scrollBtn = bar.querySelector('.blog-sticky-btn');
  if (scrollBtn && bottomCta) {
    scrollBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (window.mixpanel) mixpanel.track('sticky_bar_click', { blog_slug: slug });
      bottomCta.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
}

// ========== EXIT-INTENT POPUP (desktop only) ==========
function setupExitIntent() {
  const modal = document.querySelector('.blog-exit-modal');
  if (!modal) return;

  const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (isMobile) return;

  const sessionKey = 'exit_intent_shown';
  if (sessionStorage.getItem(sessionKey)) return;

  function onMouseLeave(e) {
    if (e.clientY > 10) return;
    if (window._blogSignupComplete) return;
    if (sessionStorage.getItem(sessionKey)) return;

    modal.style.display = 'block';
    sessionStorage.setItem(sessionKey, '1');
    document.removeEventListener('mouseleave', onMouseLeave);
    if (window.mixpanel) mixpanel.track('exit_intent_shown', { blog_slug: document.body.dataset.blogSlug });
  }

  // Delay activation by 5 seconds so it doesn't fire immediately
  setTimeout(() => {
    document.addEventListener('mouseleave', onMouseLeave);
  }, 5000);

  // Close handlers
  const overlay = modal.querySelector('.blog-exit-overlay');
  const closeBtn = modal.querySelector('.blog-exit-close');

  function dismissModal() {
    modal.style.display = 'none';
    if (window.mixpanel) mixpanel.track('exit_intent_dismissed', { blog_slug: document.body.dataset.blogSlug });
  }
  if (overlay) overlay.addEventListener('click', dismissModal);
  if (closeBtn) closeBtn.addEventListener('click', dismissModal);
}

// ========== SCROLL DEPTH TRACKING ==========
function setupScrollTracking() {
  if (!window.mixpanel) return;
  const slug = document.body.dataset.blogSlug || 'blog';
  const milestones = [25, 50, 75, 100];
  const fired = new Set();

  window.addEventListener('scroll', () => {
    const scrollPct = Math.round(
      (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
    );
    milestones.forEach(m => {
      if (scrollPct >= m && !fired.has(m)) {
        fired.add(m);
        mixpanel.track('blog_scroll_depth', { depth: m, blog_slug: slug });
      }
    });
  });
}

// ========== CTA VIEW TRACKING ==========
function setupCtaViewTracking() {
  if (!window.mixpanel) return;
  const slug = document.body.dataset.blogSlug || 'blog';

  document.querySelectorAll('.blog-cta-inline, .blog-cta-bottom').forEach(el => {
    const ctaType = el.classList.contains('blog-cta-inline') ? 'inline' : 'bottom';
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          mixpanel.track('blog_cta_view', { cta_type: ctaType, blog_slug: slug });
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    observer.observe(el);
  });
}

// ========== FADE-IN OBSERVER ==========
function setupFadeIn() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
}

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', () => {
  setupBlogForms();
  setupStickyBar();
  setupExitIntent();
  setupFadeIn();
  setupScrollTracking();
  setupCtaViewTracking();
});
