// Animated paper plane in the header logo.
// The plane flies in, then every few seconds dives out of the "O", loops round in perspective
// (in front of the logo on the lower half of the loop, behind it on the upper half) and lands again.
(() => {
  const svg = document.querySelector('.header .logo-fly');
  if (!svg || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const front = svg.querySelector('.logo-plane-front');
  const back = svg.querySelector('.logo-plane-back');
  const HOME = { x: 210, y: 174 };             // resting place inside the "O" (logo image pixels)
  const NOSE = -41.7;                          // direction the drawn nose points, in degrees
  const A = 165, B = 72;                       // loop half-width and half-height
  const TILT = (-14 * Math.PI) / 180;
  const LAPS = 2;
  const ENTRY = 1300, FLIGHT = 4400, PAUSE = 2600;

  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const wrap = (deg) => ((deg + 540) % 360) - 180;

  // theta = PI is the start (inside the O). sin(theta) > 0: lower half, in front; < 0: upper half, behind.
  function loop(theta) {
    const lx = A + A * Math.cos(theta);
    const ly = B * Math.sin(theta);
    return {
      x: HOME.x + lx * Math.cos(TILT) - ly * Math.sin(TILT),
      y: HOME.y + lx * Math.sin(TILT) + ly * Math.cos(TILT),
      depth: Math.sin(theta),
    };
  }

  // squash shortens the plane along its nose, as if it turned towards or away from the viewer.
  function place(x, y, angle, scale, squash, inFront, opacity = 1) {
    const t = `translate(${x} ${y}) rotate(${angle + NOSE}) scale(${scale * squash} ${scale}) rotate(${-NOSE})`;
    front.setAttribute('transform', t);
    back.setAttribute('transform', t);
    front.style.opacity = inFront ? opacity : 0;
    back.style.opacity = inFront ? 0 : opacity;
  }

  let start = null;
  let flightStart = ENTRY + 900;

  function frame(now) {
    if (start === null) start = now;
    const t = now - start;

    if (t < ENTRY) {
      // Fly in from the bottom left on a small arc.
      const p = ease(t / ENTRY);
      place(HOME.x - 320 * (1 - p), HOME.y + 240 * (1 - p) - 90 * Math.sin(p * Math.PI), -25 * (1 - p), 0.4 + 0.6 * p, 1, true, Math.min(1, p * 3));
    } else if (t >= flightStart && t < flightStart + FLIGHT) {
      const p = ease((t - flightStart) / FLIGHT);
      const theta = Math.PI - 2 * Math.PI * LAPS * p;
      const here = loop(theta);
      const ahead = loop(theta - 0.002);
      const heading = (Math.atan2(ahead.y - here.y, ahead.x - here.x) * 180) / Math.PI;
      const edge = Math.min(1, Math.min(p, 1 - p) / 0.06);   // turn smoothly out of / back into the resting pose
      const angle = wrap(heading - NOSE) * edge;
      const squash = 1 - 0.45 * Math.abs(Math.cos(theta)) * edge;
      // Once the plane is back inside the "O" it always flies in front, so it lands on top of the ring.
      const home = Math.hypot(here.x - HOME.x, here.y - HOME.y) < 45;
      place(here.x, here.y, angle, 1 + 0.4 * here.depth, squash, home || here.depth >= 0, home ? 1 : 0.88 + 0.12 * here.depth);
    } else {
      place(HOME.x, HOME.y, 0, 1, 1, true);
      if (t >= flightStart + FLIGHT) flightStart = t + PAUSE;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Hovering the logo while the plane rests sends it off straight away.
  svg.closest('.logo').addEventListener('mouseenter', () => {
    if (start === null) return;
    const t = performance.now() - start;
    if (t > ENTRY && t < flightStart) flightStart = t;
  });
})();
