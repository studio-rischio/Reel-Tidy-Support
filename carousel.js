/* Screenshot carousel.
 *
 * Progressive enhancement: the markup is a plain stacked list of slides until this
 * runs and adds .is-ready, so a failed or blocked script leaves everything readable.
 *
 * Autoplay is suspended while the pointer is over the carousel, while focus is inside
 * it, while the tab is hidden, and permanently once the visitor uses the arrows, the
 * dots, the arrow keys, or a swipe. Nothing rotates at all under prefers-reduced-motion.
 *
 * INTERVAL must match the dot-fill animation duration in styles.css.
 */
(function () {
  'use strict';

  var INTERVAL = 5000;

  var root = document.querySelector('[data-carousel]');
  if (!root) return;

  var track    = root.querySelector('[data-carousel-track]');
  var slides   = Array.prototype.slice.call(root.querySelectorAll('.carousel__slide'));
  var controls = root.querySelector('[data-carousel-controls]');
  var dotsWrap = root.querySelector('[data-carousel-dots]');
  var prevBtn  = root.querySelector('[data-carousel-prev]');
  var nextBtn  = root.querySelector('[data-carousel-next]');

  if (slides.length < 2) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  var index = 0;
  var timer = null;
  var stoppedByUser = false;   // pause button or an explicit navigation
  var suspended = false;       // hover, focus, or hidden tab — temporary

  /* ---- dots ---- */

  var dots = slides.map(function (slide, i) {
    var label = slide.querySelector('h3');
    var dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'carousel__dot';
    dot.setAttribute('aria-controls', track.id);
    dot.setAttribute('aria-label', label ? label.textContent.trim() : 'Slide ' + (i + 1));
    dot.addEventListener('click', function () {
      goTo(i);
      stopForGood();
    });
    dotsWrap.appendChild(dot);
    return dot;
  });

  /* ---- state ---- */

  function render() {
    slides.forEach(function (slide, i) {
      var current = i === index;
      slide.classList.toggle('is-active', current);
      slide.setAttribute('aria-hidden', current ? 'false' : 'true');
    });
    dots.forEach(function (dot, i) {
      var current = i === index;
      dot.classList.toggle('is-active', current);
      if (current) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
  }

  function goTo(i) {
    index = (i + slides.length) % slides.length;
    render();
    restartDotTimer();
  }

  function next() { goTo(index + 1); }
  function prev() { goTo(index - 1); }

  /* ---- autoplay ---- */

  function canPlay() {
    return !stoppedByUser && !suspended && !reduceMotion.matches;
  }

  function play() {
    stop();
    if (!canPlay()) return;
    timer = window.setInterval(next, INTERVAL);
    root.classList.add('is-playing');
    restartDotTimer();
  }

  function stop() {
    if (timer !== null) {
      window.clearInterval(timer);
      timer = null;
    }
    root.classList.remove('is-playing');
  }

  function stopForGood() {
    stoppedByUser = true;
    stop();
    // Once the visitor is driving, announce changes to screen readers.
    track.setAttribute('aria-live', 'polite');
  }

  function suspend()  { suspended = true;  stop(); }
  function resume()   { suspended = false; play(); }

  /* The active dot fills over one interval as a hint that this thing moves on its
     own. Re-adding the class restarts the CSS animation from zero. */
  function restartDotTimer() {
    var dot = dots[index];
    dot.classList.remove('is-timing');
    void dot.offsetWidth;
    if (canPlay() && timer !== null) dot.classList.add('is-timing');
  }

  /* ---- wiring ---- */

  prevBtn.addEventListener('click', function () { prev(); stopForGood(); });
  nextBtn.addEventListener('click', function () { next(); stopForGood(); });

  root.addEventListener('mouseenter', suspend);
  root.addEventListener('mouseleave', resume);
  root.addEventListener('focusin', suspend);
  root.addEventListener('focusout', function (e) {
    if (!root.contains(e.relatedTarget)) resume();
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) suspend();
    else resume();
  });

  root.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight')      { next(); stopForGood(); }
    else if (e.key === 'ArrowLeft')  { prev(); stopForGood(); }
    else return;
    e.preventDefault();
  });

  /* Horizontal swipe. Ignores mostly-vertical drags so page scrolling still works. */
  var touchX = null, touchY = null;
  track.addEventListener('touchstart', function (e) {
    touchX = e.changedTouches[0].clientX;
    touchY = e.changedTouches[0].clientY;
  }, { passive: true });

  track.addEventListener('touchend', function (e) {
    if (touchX === null) return;
    var dx = e.changedTouches[0].clientX - touchX;
    var dy = e.changedTouches[0].clientY - touchY;
    touchX = touchY = null;
    if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) next(); else prev();
    stopForGood();
  }, { passive: true });

  reduceMotion.addEventListener('change', function () {
    if (reduceMotion.matches) stop();
    else play();
  });

  /* ---- go ---- */

  root.classList.add('is-ready');
  controls.hidden = false;
  render();

  if (reduceMotion.matches) {
    // Nothing rotates, so the arrows and dots are the only way through — say so.
    stoppedByUser = true;
    track.setAttribute('aria-live', 'polite');
  } else {
    play();
  }
})();
