const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
const mobile = window.matchMedia('(max-width: 1250px)');
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');

function closeMenu() {
  navigation.classList.remove('is-open');
  menuButton.setAttribute('aria-expanded', 'false');
}

function syncMenu() {
  menuButton.hidden = !mobile.matches;
  navigation.classList.toggle('collapsible', mobile.matches);
  closeMenu();
}

menuButton.addEventListener('click', () => {
  const isOpen = navigation.classList.toggle('is-open');
  menuButton.setAttribute('aria-expanded', String(isOpen));
});
navigation.addEventListener('click', (event) => {
  if (event.target.closest('a')) closeMenu();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && navigation.classList.contains('is-open')) {
    closeMenu();
    menuButton.focus();
  }
});
mobile.addEventListener('change', syncMenu);
syncMenu();

// Marquee: duplicate the items once so the loop is seamless.
const track = document.querySelector('.marquee-track');
track.append(...[...track.children].map((item) => item.cloneNode(true)));

// Subjects: language rows show the next phrase in their speech bubble each time they open.
const subjectRows = [...document.querySelectorAll('.subject-row')];
const nextPhrase = new Map();
subjectRows.forEach((row) => {
  const bubble = row.querySelector('.bubble');
  if (!bubble) return;
  const phrases = bubble.dataset.phrases.split('|');
  let index = 0;
  nextPhrase.set(row, () => { bubble.textContent = phrases[index++ % phrases.length]; });
  row.addEventListener('mouseenter', nextPhrase.get(row));
});

// Phones have no hover: the row passing the middle of the screen opens instead.
if (window.matchMedia('(hover: none)').matches && 'IntersectionObserver' in window) {
  const centerObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting || entry.target.classList.contains('is-active')) return;
      subjectRows.forEach((row) => row.classList.toggle('is-active', row === entry.target));
      nextPhrase.get(entry.target)?.();
    });
  }, { rootMargin: '-45% 0px -45% 0px' });
  subjectRows.forEach((row) => centerObserver.observe(row));
}

// Header shadow, reading progress, hero parallax and the plane on the progress bar.
const header = document.querySelector('.header');
const progress = document.querySelector('.progress');
const heroVisual = document.querySelector('.hero-visual');
const progressPlane = document.querySelector('.progress-plane');
let ticking = false;

function onScroll() {
  const y = window.scrollY;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const ratio = max > 0 ? Math.min(1, y / max) : 0;
  header.classList.toggle('scrolled', y > 20);
  progress.style.transform = `scaleX(${ratio})`;
  heroVisual.style.translate = motion.matches ? '' : `0 ${Math.min(y, 900) * 0.1}px`;
  progressPlane.style.left = `${ratio * 100}%`;
  progressPlane.style.opacity = ratio > 0.01 ? '1' : '0';
  ticking = false;
}
window.addEventListener('scroll', () => {
  if (!ticking) {
    ticking = true;
    requestAnimationFrame(onScroll);
  }
}, { passive: true });
onScroll();

if (!motion.matches && 'IntersectionObserver' in window) {
  const elements = document.querySelectorAll('.section-top, .subject-row, .feature, .price-card, .learning-option, .approach-photo, .closing-grid, .contact-copy, .contact-form, .faq-item, .info-card');
  const staggered = '.subject-row, .feature, .price-card, .learning-option, .faq-item, .info-card';
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  elements.forEach((element) => {
    const siblings = [...element.parentElement.children].filter((child) => child.matches(staggered));
    element.style.setProperty('--reveal-delay', `${Math.max(0, siblings.indexOf(element)) * 0.09}s`);
    element.classList.add('reveal');
    observer.observe(element);
  });
  motion.addEventListener('change', () => {
    if (motion.matches) {
      observer.disconnect();
      elements.forEach((element) => element.classList.add('visible'));
    }
  });

  // Count "3–13" up from 3 when it comes into view.
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      counterObserver.unobserve(entry.target);
      const end = Number(entry.target.dataset.count);
      let value = 3;
      entry.target.textContent = '3–3';
      const timer = setInterval(() => {
        entry.target.textContent = `3–${++value}`;
        if (value >= end) clearInterval(timer);
      }, 80);
    });
  }, { threshold: 0.6 });
  document.querySelectorAll('[data-count]').forEach((element) => counterObserver.observe(element));

  // Subtle 3D tilt that follows the pointer on price cards.
  if (window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.price-card').forEach((card) => {
      card.addEventListener('pointermove', (event) => {
        const box = card.getBoundingClientRect();
        card.style.setProperty('--rx', `${((event.clientY - box.top) / box.height - 0.5) * -10}deg`);
        card.style.setProperty('--ry', `${((event.clientX - box.left) / box.width - 0.5) * 10}deg`);
      });
      card.addEventListener('pointerleave', () => {
        card.style.removeProperty('--rx');
        card.style.removeProperty('--ry');
      });
    });
  }
}

// Contact form via Formspree. It stays a preview until the placeholder form ID
// in the form's action is replaced with a real one.
const form = document.querySelector('.contact-form');
const submitButton = form.querySelector('button[type="submit"]');
const formStatus = form.querySelector('.form-status');
const configured = !form.action.includes('DEINE-FORM-ID');

if (configured) {
  submitButton.disabled = false;
  form.querySelector('.form-note').textContent = 'Wir melden uns so schnell wie möglich bei dir.';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!configured) return;

  // Join repeated fields (several subjects) into one readable value.
  const data = {};
  new FormData(form).forEach((value, key) => {
    data[key] = data[key] ? `${data[key]}, ${value}` : value;
  });

  submitButton.disabled = true;
  formStatus.textContent = 'Wird gesendet …';
  try {
    const response = await fetch(form.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(response.statusText);
    form.reset();
    formStatus.textContent = 'Vielen Dank! Deine Anfrage ist bei uns angekommen.';
  } catch {
    // Keep the entered details so nothing has to be typed again.
    formStatus.textContent = 'Das hat leider nicht geklappt. Bitte versuche es später erneut oder schreib uns eine E-Mail.';
  } finally {
    submitButton.disabled = false;
  }
});
