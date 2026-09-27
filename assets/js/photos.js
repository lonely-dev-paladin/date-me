/* =========================================================================
   photos.js
   -------------------------------------------------------------------------
   Builds the full-bleed photo background for a screen.

   No real photos are wired in yet — each context shows a themed
   gradient (defined in css/photo-screens.css) until one is added. To
   use a real photo later, set the matching CSS variable in your own
   stylesheet (loaded after css/photo-screens.css), for example:

     :root {
       --photo-food:   url('images/food.jpg');
       --photo-drinks: url('images/drinks.jpg');
       --photo-places: url('images/places.jpg');
       --photo-invite: url('images/invite.jpg');
       --photo-reveal: url('images/reveal.jpg');
     }

   Nothing else needs to change — photoBg() below keeps working exactly
   the same either way.
   ========================================================================= */

// Escape helper, kept local so this file has no dependency on app.js.
function escText(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
}

/**
 * Returns the HTML for a full-bleed photo background: the image/gradient
 * layer plus the dark readability overlay on top of it.
 *
 * @param {string} context - which gradient/photo to use, e.g. 'food'
 *                            (see the data-photo selectors in
 *                            css/photo-screens.css for the full list)
 */
export function photoBg(context) {
    return (
        '<div class="photo-bg" data-photo="' + escText(context) + '"></div>' +
        '<div class="photo-overlay"></div>'
    );
}