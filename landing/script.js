/* ── script.js ── */

// ── Navbar scroll effect ──
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 20);
});

// ── Mobile hamburger ──
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobile-menu');
hamburger.addEventListener('click', () => {
  mobileMenu.classList.toggle('open');
});
document.querySelectorAll('.mobile-menu a').forEach(link => {
  link.addEventListener('click', () => mobileMenu.classList.remove('open'));
});

// ── Intersection Observer for reveal animations ──
const revealEls = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
revealEls.forEach(el => revealObserver.observe(el));

// ── Animate holding bars on reveal ──
const holdingFills = document.querySelectorAll('.holding-fill');
holdingFills.forEach(fill => {
  const w = fill.getAttribute('data-w');
  setTimeout(() => { fill.style.width = w + '%'; }, 100);
});

// ── Counter animation for stats ──
function animateCounter(el, target, duration = 1800) {
  let start = null;
  const step = (timestamp) => {
    if (!start) start = timestamp;
    const progress = Math.min((timestamp - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    el.textContent = Math.floor(eased * target).toLocaleString('en-IN');
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

const counterEls = document.querySelectorAll('.stat-num[data-count]');
const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el = entry.target;
      const target = parseInt(el.getAttribute('data-count'));
      animateCounter(el, target);
      counterObserver.unobserve(el);
    }
  });
}, { threshold: 0.5 });
counterEls.forEach(el => counterObserver.observe(el));

// ── Parallax on hero blobs ──
window.addEventListener('mousemove', (e) => {
  const { clientX: x, clientY: y } = e;
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  const dx = (x - cx) / cx;
  const dy = (y - cy) / cy;

  const blob1 = document.querySelector('.blob-1');
  const blob2 = document.querySelector('.blob-2');
  const blob3 = document.querySelector('.blob-3');
  if (blob1) blob1.style.transform = `translate(${dx * 25}px, ${dy * 20}px)`;
  if (blob2) blob2.style.transform = `translate(${-dx * 20}px, ${-dy * 15}px)`;
  if (blob3) blob3.style.transform = `translate(${dx * 15}px, ${dy * 25}px)`;
});

// ── CTA Button click pulse effect ──
document.querySelectorAll('.btn-primary').forEach(btn => {
  btn.addEventListener('click', function(e) {
    const ripple = document.createElement('span');
    ripple.style.cssText = `
      position:absolute;
      border-radius:50%;
      background:rgba(255,255,255,0.4);
      transform:scale(0);
      animation:rippleAnim 0.6s linear;
      pointer-events:none;
      width:100px; height:100px;
      left:${e.offsetX - 50}px;
      top:${e.offsetY - 50}px;
    `;
    this.style.position = 'relative';
    this.style.overflow = 'hidden';
    this.appendChild(ripple);
    setTimeout(() => ripple.remove(), 700);
  });
});

// Inject ripple keyframe
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes rippleAnim {
    to { transform: scale(4); opacity: 0; }
  }
`;
document.head.appendChild(styleSheet);

// ── Smooth anchor scrolling ──
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});
