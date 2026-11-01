/**
 * Scroll rover for the About section.
 * A small mobile robot drives along the top of the About tags while you scroll from Home to About.
 * Each tag lights up when the rover's arm reaches it; the arm dips down to "tap" the tag it is over.
 * Scroll back up and it drives back, switching the tags off again.
 */
(function () {
  var track = document.getElementById('rover-track');
  var rover = document.getElementById('rover');
  var tagsEl = document.getElementById('about-tags');
  var scroller = document.getElementById('rover-scroll');
  var userScrollUntil = 0;
  if (!track || !rover || !tagsEl) return;

  var tags = Array.prototype.slice.call(tagsEl.children);
  var upper = rover.querySelector('.rv-upper');
  var fore = rover.querySelector('.rv-fore');
  var wheels = rover.querySelectorAll('.rv-wheel');
  var eyes = rover.querySelector('.rv-eyes');
  var body = rover.querySelector('.rv-body-group');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var SCALE = 0.75;          // svg units -> px (viewBox 96 wide shown at 72px)
  var TIP = 60;              // px from rover's left edge to the arm tip when it taps
  var x = 0, target = 0, v = 0, dist = 0, wheelAngle = 0, blinkT = 3;

  function geometry() {
    var t = track.getBoundingClientRect();
    return tags.map(function (el) {
      var r = el.getBoundingClientRect();
      return { left: r.left - t.left, right: r.right - t.left, center: (r.left + r.right) / 2 - t.left };
    });
  }

  function endX(g) { return Math.max(0, g[g.length - 1].right - TIP - 6); }

  function scrollTarget(g) {
    var r = tagsEl.getBoundingClientRect(), vh = window.innerHeight;
    // 0 when the tags first appear near the bottom of the screen, 1 when they reach the upper half
    var p = (vh * 0.95 - r.top) / (vh * 0.5);
    p = Math.max(0, Math.min(1, p));
    return p * endX(g);
  }

  function pose(g) {
    var tip = x + TIP;
    var reach = 0, active = -1;
    g.forEach(function (tg, i) {
      var half = (tg.right - tg.left) / 2;
      var d = Math.abs(tip - tg.center) / half;
      var k = Math.max(0, 1 - d);
      if (k > reach) { reach = k; active = i; }
      tags[i].classList.toggle('lit', tip >= tg.center - half * 0.1);
    });
    tags.forEach(function (el, i) { el.classList.toggle('active', i === active && reach > 0.35); });

    // arm: resting = raised and pointing forward; reaching = dipping down onto the tag
    var s = reach * reach * (3 - 2 * reach);
    var a1 = -38 + 78 * s, a2 = 48 - 18 * s;
    upper.setAttribute('transform', 'rotate(' + a1.toFixed(1) + ')');
    fore.setAttribute('transform', 'translate(18 0) rotate(' + a2.toFixed(1) + ')');
  }

  function frame(dt) {
    var g = geometry();
    target = scrollTarget(g);
    // critically damped follow, so the rover accelerates and brakes smoothly
    var k = 10, acc = k * k * (target - x) - 2 * k * v;
    v += acc * dt; var dx = v * dt; x += dx; dist += Math.abs(dx);

    wheelAngle += (dx / (9 * SCALE)) * 180 / Math.PI;
    wheels.forEach(function (w) {
      var tx = w === wheels[0] ? 24 : 50;
      w.setAttribute('transform', 'translate(' + tx + ' 60) rotate(' + wheelAngle.toFixed(1) + ')');
    });

    var speed = Math.min(1, Math.abs(v) / 300);
    var bounce = Math.sin(dist * 0.25) * 1.6 * speed;
    var tilt = Math.max(-8, Math.min(8, -acc / 600));
    body.setAttribute('transform', 'translate(0 ' + (-Math.abs(bounce)).toFixed(2) + ') rotate(' + tilt.toFixed(2) + ' 36 52)');

    // eyes look where it's going, and blink now and then
    blinkT -= dt;
    var look = Math.max(-2.5, Math.min(2.5, v / 80));
    var blink = blinkT < 0.12 ? 0.15 : 1;
    if (blinkT < 0) blinkT = 2.5 + Math.random() * 3;
    eyes.setAttribute('transform', 'translate(' + look.toFixed(2) + ' 36) scale(1 ' + blink + ') translate(0 -36)');

    rover.style.transform = 'translateX(' + x.toFixed(1) + 'px)';
    pose(g);

    // narrow screens: the tag strip scrolls sideways, keep the rover in view
    if (scroller && scroller.scrollWidth > scroller.clientWidth + 2 && performance.now() > userScrollUntil) {
      var want = Math.max(0, x + TIP - scroller.clientWidth * 0.5);
      scroller.scrollLeft += (want - scroller.scrollLeft) * 0.12;
    }
  }

  if (scroller) ['touchstart', 'wheel', 'pointerdown'].forEach(function (ev) {
    scroller.addEventListener(ev, function () { userScrollUntil = performance.now() + 1500; }, { passive: true });
  });

  if (reduce) {
    var g0 = geometry(); x = endX(g0);
    rover.style.transform = 'translateX(' + x + 'px)';
    tags.forEach(function (el) { el.classList.add('lit'); });
    upper.setAttribute('transform', 'rotate(-38)');
    return;
  }

  var last = 0;
  function loop(ts) {
    var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016; last = ts;
    var r = track.getBoundingClientRect();
    if (r.bottom > -200 && r.top < window.innerHeight + 200) frame(dt);
    requestAnimationFrame(loop);
  }
  x = target = scrollTarget(geometry());
  requestAnimationFrame(loop);
})();
