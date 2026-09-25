/* =========================================================================
   photos.js
   -------------------------------------------------------------------------
   Builds the full-bleed photo background for a screen.

   No real photos are wired in yet — each context shows a themed
   gradient with a small "photo placeholder" caption instead. To use a
   real photo later, set the matching CSS variable in your own stylesheet
   (loaded after css/photo-screens.css), for example:

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

// One label per context, shown in the small caption over the gradient.
var PHOTO_LABELS = {
    invite: 'invite photo',
    reveal: 'reveal photo',
    create: 'landing photo',
    food: 'food photo',
    drinks: 'drinks photo',
    places: 'place photo',
    vibe: 'vibe photo',
    after: 'after-date photo',
    details: 'outfit photo',
    when: 'evening photo',
    note: 'candlelight photo'
};

// A small camera icon used in the placeholder caption.
var CAMERA_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
    'stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M4 8h3l2-2h6l2 2h3v11H4z"/><circle cx="12" cy="13.5" r="3.2"/>' +
    '</svg>';

// Escape helper, kept local so this file has no dependency on app.js.
function escText(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
}

/**
 * Returns the HTML for a full-bleed photo background: the image/gradient
 * layer, the readability overlay, and (while no real photo is set) a
 * small caption naming what belongs there.
 *
 * @param {string} context - one of the keys in PHOTO_LABELS
 */
export function photoBg(context) {
    var label = PHOTO_LABELS[context] || context;

    return (
        '<div class="photo-bg" data-photo="' + escText(context) + '"></div>' +
        '<div class="photo-overlay"></div>' +
        '<div class="photo-caption" data-placeholder-caption="' + escText(context) + '">' +
        CAMERA_ICON + '<span>' + escText(label) + '</span>' +
        '</div>'
    );
}