/* =========================================================================
   confetti.js
   -------------------------------------------------------------------------
   A small, dependency-free confetti and hearts burst, drawn on a
   temporary full-screen canvas. Used for the "Yes" moment in app.js.

   The canvas is added to <body> (not #app), so it keeps playing while
   the screen transition swaps the content underneath it, and it removes
   itself when the animation is done.
   ========================================================================= */

var COLORS = ['#C9A15A', '#FFD866', '#B0124A', '#FFB4C8', '#7FD6B0', '#FFFFFF', '#E8955C'];
var DURATION_MS = 3200;

function rand(min, max) {
    return min + Math.random() * (max - min);
}

function drawHeart(ctx, size) {
    var s = size / 2;
    ctx.beginPath();
    ctx.moveTo(0, s * 0.9);
    ctx.bezierCurveTo(-s * 1.6, -s * 0.2, -s * 0.7, -s * 1.3, 0, -s * 0.5);
    ctx.bezierCurveTo(s * 0.7, -s * 1.3, s * 1.6, -s * 0.2, 0, s * 0.9);
    ctx.fill();
}

/**
 * Fires a burst of confetti and hearts from a point on the screen.
 * Does nothing if the person prefers reduced motion.
 *
 * @param {number} originX - viewport x (px) the burst comes from
 * @param {number} originY - viewport y (px) the burst comes from
 */
export function burst(originX, originY) {
    var reduceMotion =
        window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = window.innerWidth;
    var h = window.innerHeight;

    var canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText =
        'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:50;';
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    document.body.appendChild(canvas);

    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    var particles = [];

    function spawn(count) {
        for (var i = 0; i < count; i++) {
            // A wide fan pointing upward, so it feels like a pop, not a spray.
            var angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.35;
            var speed = rand(6, 17);
            var roll = Math.random();

            particles.push({
                x: originX,
                y: originY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: rand(7, 13),
                rot: rand(0, Math.PI * 2),
                rotSpeed: rand(-0.25, 0.25),
                color: COLORS[Math.floor(Math.random() * COLORS.length)],
                shape: roll < 0.3 ? 'heart' : roll < 0.6 ? 'circle' : 'rect',
                wobble: rand(0, Math.PI * 2)
            });
        }
    }

    spawn(80);
    setTimeout(function () { spawn(45); }, 220);

    var start = performance.now();
    var last = start;

    function frame(now) {
        var elapsed = now - start;
        // Frame-rate independent: 1 unit = one 60fps frame.
        var dt = Math.min((now - last) / 16.67, 3);
        last = now;

        ctx.clearRect(0, 0, w, h);

        // Fade everything out over the last 35% of the animation.
        var fadeStart = DURATION_MS * 0.65;
        var alpha = elapsed > fadeStart ? Math.max(0, 1 - (elapsed - fadeStart) / (DURATION_MS - fadeStart)) : 1;

        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];

            p.vx *= Math.pow(0.985, dt);
            p.vy = p.vy * Math.pow(0.985, dt) + 0.3 * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.rot += p.rotSpeed * dt;
            p.wobble += 0.12 * dt;

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.fillStyle = p.color;

            if (p.shape === 'heart') {
                drawHeart(ctx, p.size * 1.3);
            } else if (p.shape === 'circle') {
                ctx.beginPath();
                ctx.arc(0, 0, p.size / 2.4, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Squashing the height with a sine makes the rectangles
                // look like they're flipping in the air.
                ctx.fillRect(-p.size / 2, (-p.size / 4) * Math.abs(Math.sin(p.wobble)), p.size, (p.size / 2) * Math.abs(Math.sin(p.wobble)) + 1);
            }

            ctx.restore();
        }

        if (elapsed < DURATION_MS) {
            requestAnimationFrame(frame);
        } else {
            canvas.remove();
        }
    }

    requestAnimationFrame(frame);
}