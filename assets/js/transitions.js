/* =========================================================================
   transitions.js
   -------------------------------------------------------------------------
   The one place that touches animation timing. app.js never sets a
   CSS animation directly — it calls mountScreen() or switchScreen(),
   and this file handles the rest.

     - mountScreen()  first paint: no exit, just fade the new screen in
     - switchScreen() every screen change after that: fade the old
                      screen out, swap the HTML, fade the new one in
     - tagStagger()   marks a container's direct children so
                      transitions.css can reveal them one after another
   ========================================================================= */

var EXIT_MS = 180; // must match --dur-fast in tokens.css

/**
 * Mark every direct child of `container` that should animate in with
 * a staggered delay. Called after new HTML is injected, before the
 * enter animation plays.
 *
 * @param {Element} container - usually the whole #app, or one section
 * @param {string} selector   - which children to stagger, e.g. '.chip'
 */
export function tagStagger(container, selector) {
    var items = container.querySelectorAll(selector);
    items.forEach(function (el, i) {
        el.setAttribute('data-stagger', '');
        el.style.setProperty('--stagger-i', String(i));
    });
}

/**
 * First paint of the page: just fade the initial screen in, no exit
 * animation needed since there's nothing on screen yet.
 *
 * @param {Element} app  - the #app container
 * @param {string} html  - the new screen's HTML
 */
export function mountScreen(app, html) {
    app.innerHTML = html;
    app.classList.remove('screen-exit');
    // Force reflow so the browser registers the class removal before
    // screen-enter is added, or the animation can fail to restart.
    void app.offsetWidth;
    app.classList.add('screen-enter');
    tagStagger(app, '.chip, .tile, .skin');
}

/**
 * Every screen change after the first: animate the current content
 * out, then swap in the new HTML and animate it in.
 *
 * @param {Element} app  - the #app container
 * @param {string} html  - the new screen's HTML
 * @param {Function} [onSwapped] - called right after the HTML swap,
 *                                 before the enter animation starts
 *                                 (used to scroll to top / move focus)
 */
export function switchScreen(app, html, onSwapped) {
    var reduceMotion =
        window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion) {
        app.innerHTML = html;
        if (onSwapped) onSwapped();
        tagStagger(app, '.chip, .tile, .skin');
        return;
    }

    app.classList.remove('screen-enter');
    app.classList.add('screen-exit');

    window.setTimeout(function () {
        app.innerHTML = html;
        if (onSwapped) onSwapped();

        app.classList.remove('screen-exit');
        void app.offsetWidth; // reflow, see mountScreen()
        app.classList.add('screen-enter');
        tagStagger(app, '.chip, .tile, .skin');
    }, EXIT_MS);
}