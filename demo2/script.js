// On a reload, always start at the top, even if the address still holds a #section from an earlier click.
if (performance.getEntriesByType('navigation')[0]?.type === 'reload') {
  history.scrollRestoration = 'manual';
  history.replaceState(null, '', location.pathname + location.search);
  const toTop = () => window.scrollTo({ top: 0, behavior: 'instant' });
  toTop();
  window.addEventListener('load', toTop);
}

// Kurse and Projekte: a link to one course or project opens the page at the top (the card is outlined via :target).
if (document.querySelector('.topics')) {
  const toTop = () => {
    if (document.querySelector('.topics li:target')) window.scrollTo({ top: 0, behavior: 'instant' });
  };
  toTop();
  window.addEventListener('load', toTop);
  window.addEventListener('hashchange', toTop);
}

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
// Dropdown groups (Nachhilfe, Kurse, Projekte): click or tap opens one, hover also opens on desktop.
const groups = [...navigation.querySelectorAll('.nav-group')];
function closeGroups(except) {
  groups.forEach((group) => {
    if (group === except) return;
    group.classList.remove('is-open');
    group.querySelector('.nav-group-toggle').setAttribute('aria-expanded', 'false');
  });
}
groups.forEach((group) => {
  const toggle = group.querySelector('.nav-group-toggle');
  toggle.addEventListener('click', () => {
    const isOpen = group.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
    closeGroups(group);
  });
});
document.addEventListener('click', (event) => {
  if (!event.target.closest('.nav-group')) closeGroups();
});

navigation.addEventListener('click', (event) => {
  if (event.target.closest('a')) {
    closeGroups();
    closeMenu();
  }
});
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  closeGroups();
  if (navigation.classList.contains('is-open')) {
    closeMenu();
    menuButton.focus();
  }
});
mobile.addEventListener('change', syncMenu);
syncMenu();

// Marquee: duplicate the items once so the loop is seamless.
const track = document.querySelector('.marquee-track');
track?.append(...[...track.children].map((item) => item.cloneNode(true)));

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

// "Coming soon" squares on Kurse and Projekte: light up one by one with a leaf in front, pause when full, start again.
const squares = document.querySelector('.soon-squares');
if (squares && !motion.matches) {
  const boxes = [...squares.querySelectorAll('i')];
  const leaf = document.createElement('b');
  leaf.className = 'soon-leaf';
  squares.append(leaf);
  squares.classList.add('is-running');
  let lit = 0;
  setInterval(() => {
    lit = lit >= boxes.length + 3 ? 0 : lit + 1;   // three extra steps keep all squares lit as a short pause
    const shown = Math.min(lit, boxes.length);
    boxes.forEach((box, i) => box.classList.toggle('on', i < shown));
    // The leaf disappears during the pause, moves back while hidden and reappears with the first square.
    leaf.style.opacity = lit === 0 || lit > boxes.length ? '0' : '1';
    const step = boxes[1].offsetLeft - boxes[0].offsetLeft;   // square width + gap, smaller on phones
    leaf.style.translate = `${shown * step - 2}px 0`;
  }, 380);
}

// Header shadow, reading progress, hero parallax and the leaf on the progress bar.
const header = document.querySelector('.header');
const progress = document.querySelector('.progress');
const heroVisual = document.querySelector('.hero-visual');
const progressLeaf = document.querySelector('.progress-leaf');
let ticking = false;

// Vine on the left (wide screens): leaves along the stem, opened as the stem grows past them.
const vine = document.querySelector('.vine');
const vineLeaves = [];
if (vine) {
  for (let i = 0; i < 11; i++) {
    const at = 0.06 + i * 0.087;            // share of the stem, from the bottom
    const y = 1000 * (1 - at);
    const x = 40 + 18 * Math.sin((y / 1000) * 2 * Math.PI * 2.2);
    const leaf = document.createElement('i');
    leaf.className = 'vine-leaf';
    leaf.style.cssText = `top:${(1 - at) * 100}%;left:${x}px;--r:${i % 2 ? -35 : -75}deg`;
    leaf.dataset.at = at;
    vine.append(leaf);
    vineLeaves.push(leaf);
  }
}

function onScroll() {
  const y = window.scrollY;
  header.classList.toggle('scrolled', y > 20);
  ticking = false;
  if (!progress) return;   // sub pages have no progress bar or hero
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const ratio = max > 0 ? Math.min(1, y / max) : 0;
  progress.style.transform = `scaleX(${ratio})`;
  heroVisual.style.translate = motion.matches ? '' : `0 ${Math.min(y, 900) * 0.1}px`;
  progressLeaf.style.left = `${ratio * 100}%`;
  if (vine) {
    vine.style.setProperty('--grow', ratio);
    vineLeaves.forEach((leaf) => leaf.classList.toggle('on', ratio >= leaf.dataset.at));
  }
  progressLeaf.style.opacity = ratio > 0.01 ? '1' : '0';
}
window.addEventListener('scroll', () => {
  if (!ticking) {
    ticking = true;
    requestAnimationFrame(onScroll);
  }
}, { passive: true });
onScroll();

if (!motion.matches && 'IntersectionObserver' in window) {
  const elements = document.querySelectorAll('.section-top, .support-main, .support-card, .subject-row, .feature, .price-card, .learning-option, .approach-photo, .closing-grid, .contact-copy, .contact-form, .faq-item, .info-card');
  const staggered = '.support-main, .support-card, .subject-row, .feature, .price-card, .learning-option, .faq-item, .info-card';
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

  // Headings: split into words that slide up line by line when the heading comes into view.
  const headingObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('lines-in');
      headingObserver.unobserve(entry.target);
    });
  }, { threshold: 0.3 });
  document.querySelectorAll('main h2:not(.topics h2), .about h1, .topics-page h1').forEach((heading) => {
    heading.classList.add('split');   // before splitting, so the words start hidden instead of sliding down first
    const texts = [];
    const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) texts.push(walker.currentNode);
    texts.forEach((node) => {
      const words = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (!part.trim()) { words.append(' '); return; }
        const word = document.createElement('i');
        const inner = document.createElement('i');
        word.className = 'w';
        inner.textContent = part;
        word.append(inner);
        words.append(word);
      });
      node.replaceWith(words);
    });
    // Words on the same line share a delay, so the heading opens line by line.
    let line = -1;
    let top = null;
    heading.querySelectorAll('.w').forEach((word) => {
      if (top === null || Math.abs(word.offsetTop - top) > 4) { line++; top = word.offsetTop; }
      word.style.setProperty('--d', `${line * 0.12}s`);
    });
    headingObserver.observe(heading);
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
if (form) {
  const say = {
    de: { ready: 'Wir melden uns so schnell wie möglich bei dir.', sending: 'Wird gesendet …', sent: 'Vielen Dank! Deine Anfrage ist bei uns angekommen.', failed: 'Das hat leider nicht geklappt. Bitte versuche es später erneut oder schreib uns eine E-Mail.' },
    tr: { ready: 'En kısa sürede sana dönüş yapacağız.', sending: 'Gönderiliyor …', sent: 'Teşekkürler! Talebin bize ulaştı.', failed: 'Maalesef olmadı. Lütfen daha sonra tekrar dene ya da bize e-posta yaz.' },
    en: { ready: 'We’ll get back to you as soon as possible.', sending: 'Sending …', sent: 'Thank you! We have received your request.', failed: 'Sorry, that didn’t work. Please try again later or send us an email.' },
  }[document.documentElement.lang] ?? {};
  const submitButton = form.querySelector('button[type="submit"]');
  const formStatus = form.querySelector('.form-status');
  const configured = !form.action.includes('DEINE-FORM-ID');

  if (configured) {
    submitButton.disabled = false;
    form.querySelector('.form-note').textContent = say.ready;
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
    formStatus.textContent = say.sending;
    try {
      const response = await fetch(form.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(response.statusText);
      form.reset();
      formStatus.textContent = say.sent;
    } catch {
      // Keep the entered details so nothing has to be typed again.
      formStatus.textContent = say.failed;
    } finally {
      submitButton.disabled = false;
    }
  });
}
