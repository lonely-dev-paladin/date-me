/* =========================================================================
   app.js
   -------------------------------------------------------------------------
     1. CONSTANTS       — fixed lists and text (food options, colors, etc.)
     2. STATE           — one object holding everything currently true
                           about the page (which screen, what's typed in)
     3. HELPERS         — small utility functions (escaping, copy, share)
     4. PLAN + MESSAGE  — turns state.ans into the summary and final text
     5. UI BUILDERS     — small reusable pieces of HTML (chips, tiles...)
     6. SCREENS         — one function per screen, returns that screen's
                           full HTML as a string, built from `state`
     7. RENDER          — decides which screen to show and hands its
                           HTML to the transition engine
     8. ACTIONS         — what happens when a button is clicked
     9. EVENT LISTENERS — clicks / typing on the page are routed to
                           the functions above
    10. START           — reads the URL, sets initial state, renders once

   Visual work (photo backgrounds, screen transitions, staggered chip
   reveals) lives in photos.js and transitions.js — this file only
   decides WHAT to show, never HOW it animates in.
   ========================================================================= */

import { photoBg } from './photos.js';
import { mountScreen, switchScreen } from './transitions.js';

(function () {
    'use strict';

    var app = document.getElementById('app');
    var toastEl = document.getElementById('toast');

    /* =======================================================================
       1. CONSTANTS
       ======================================================================= */

    var SKINS = {
        lilac: { name: 'Lilac', dots: ['#DCD0FB', '#FFD866', '#B0124A'] },
        evening: { name: 'Evening', dots: ['#1B1030', '#F7C948', '#FFB4C8'] },
        garden: { name: 'Garden', dots: ['#CDE8D8', '#F4A6B7', '#1F6B45'] }
    };

    var DEFAULT_Q = 'Would you go on a date with me?';
    var TOTAL_STEPS = 8;

    // Which planner steps get a full-bleed photo background, and which
    // context (see photos.js) each one uses.
    var PHOTO_STEPS = {
        0: 'food', 1: 'drinks', 2: 'vibe', 3: 'places',
        4: 'after', 5: 'details', 6: 'when', 7: 'note'
    };

    var FOOD = [
        'Filipino', 'Japanese', 'Korean', 'Italian', 'Chinese', 'Thai',
        'Steak and grill', 'Seafood', 'Burgers and pizza', 'Vegetarian',
        'Coffee and dessert', 'Street food', 'Surprise me'
    ];
    var PLACES = [
        'Café', 'Restaurant', 'Picnic in a park', 'Movie theater',
        'Museum or gallery', 'Bookstore', 'Arcade or games', 'Sunset spot',
        'Night market', 'Cooking at home', 'Nature walk'
    ];
    var WHEN = [
        'Weekday evening', 'Weekend morning', 'Weekend afternoon',
        'Weekend evening', 'Flexible'
    ];
    var BUDGET = ['Keep it easy', 'Comfortable', 'Treat ourselves'];
    var DRINKS = [
        'Coffee', 'Milk tea', 'Fruit shake', 'Wine', 'Cocktails', 'Beer',
        'Water is fine'
    ];
    var DESSERTS = [
        'Ice cream', 'Cake', 'Halo-halo', 'Chocolate', 'Pastries', 'Fruit',
        'Skip dessert'
    ];
    var AFTER = [
        'Walk around', 'Arcade or games', 'Karaoke', 'Stargazing',
        'Take photos', 'Dessert run', 'Movie night at home', 'Go home early',
        'Nothing planned'
    ];
    var DRESS = [
        'Casual', 'Smart casual', 'Dressed up', 'As comfy as possible',
        'Surprise me'
    ];
    var GETTING = ['Meet there', 'Pick me up', 'Commute together'];

    var VIBES = [
        ['Simple and relaxed', 'Casual, comfy, no pressure', '\u2615'],
        ['Elegant', 'Dress up a little, get a nice table', '\u2728'],
        ['Cozy', 'A quiet corner and something warm', '\uD83D\uDD6F\uFE0F'],
        ['Adventurous', 'Try something new together', '\uD83E\uDDED'],
        ['Playful', 'Games, laughs, and silly fun', '\uD83C\uDFB2']
    ];

    var FLIRT = [
        'Can\u2019t wait to see you.',
        'Fair warning: I\u2019m hard to impress. Good luck.',
        'I\u2019ll save you the best seat.',
        'Bring your appetite and your smile.',
        'Don\u2019t be late. I\u2019m already excited.'
    ];
    var PS_IDEAS = [
        'P.S. Say yes and I\u2019ll pick the restaurant.',
        'P.S. No pressure, but I already cleared my schedule.',
        'P.S. I\u2019ve been rehearsing this for days.',
        'P.S. I promise I\u2019m more fun than this website.'
    ];
    var YES_IDEAS = [
        'Good. I was nervous for a second there.',
        'Best answer I could have hoped for.',
        'Now I have something to look forward to.',
        'You just made my day.'
    ];

    /* =======================================================================
       2. STATE
       ======================================================================= */

    var prefersDark =
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;

    var state = {
        mode: 'create',       // 'create' | 'invite'
        screen: 'create',     // see render() for the full list
        preview: false,
        step: 0,

        draft: {
            a: '', b: '', m: DEFAULT_Q,
            s: prefersDark ? 'evening' : 'lilac',
            d: 0, t: 1, p: '', y: ''
        },

        invite: null,
        link: '',

        ans: {
            food: [], avoid: '',
            drinks: [], dessert: [],
            vibe: '', budget: '',
            places: [], ideas: '',
            after: [],
            dress: '', getting: '',
            when: [], day: '', time: '',
            note: '',
            flirt: '', flirtOwn: ''
        },

        reply: ''
    };

    /* =======================================================================
       3. HELPERS
       ======================================================================= */

    function esc(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function encode(o) {
        return encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(o)))));
    }

    function decode(hash) {
        try {
            var m = hash.match(/^#i=(.+)$/);
            if (!m) return null;

            var j = JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(m[1])))));
            if (!j || typeof j.a !== 'string' || typeof j.b !== 'string') return null;

            return {
                a: j.a.slice(0, 40),
                b: j.b.slice(0, 40),
                m: (typeof j.m === 'string' && j.m.trim() ? j.m : DEFAULT_Q).slice(0, 160),
                s: SKINS[j.s] ? j.s : 'lilac',
                d: j.d ? 1 : 0,
                t: j.t ? 1 : 0,
                p: typeof j.p === 'string' ? j.p.slice(0, 100) : '',
                y: typeof j.y === 'string' ? j.y.slice(0, 100) : ''
            };
        } catch (e) {
            return null;
        }
    }

    function setSkin(s) {
        document.documentElement.setAttribute('data-skin', s);
    }

    // Grows a textarea to fit whatever's typed in it, instead of
    // scrolling or letting the person drag-resize it by hand.
    // Resetting height to 'auto' first is what lets scrollHeight shrink
    // back down again after text is deleted, not just grow.
    function autoGrow(el) {
        el.style.height = 'auto';
        el.style.height = el.scrollHeight + 'px';
    }

    function toast(msg) {
        toastEl.textContent = msg;
        toastEl.classList.add('show');
        clearTimeout(toast._t);
        toast._t = setTimeout(function () {
            toastEl.classList.remove('show');
        }, 2200);
    }

    function copy(text) {
        var done = function () { toast('Copied to your clipboard.'); };

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(done, fallback);
        } else {
            fallback();
        }

        function fallback() {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            try {
                document.execCommand('copy');
                done();
            } catch (e) {
                toast('Could not copy. Select the text and copy it yourself.');
            }
            ta.remove();
        }
    }

    function share(text, url) {
        if (navigator.share) {
            var data = url ? { text: text, url: url } : { text: text };
            navigator.share(data).catch(function (e) {
                if (e && e.name === 'AbortError') return;
                copy(url ? text + ' ' + url : text);
            });
        } else {
            copy(url ? text + ' ' + url : text);
        }
    }

    function fmtDay(v) {
        try {
            var d = new Date(v + 'T00:00:00');
            return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
        } catch (e) {
            return v;
        }
    }

    function fmtTime(v) {
        try {
            var parts = v.split(':');
            var d = new Date(2000, 0, 1, +parts[0], +parts[1]);
            return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
        } catch (e) {
            return v;
        }
    }

    /* =======================================================================
       4. PLAN + MESSAGE
       ======================================================================= */

    function planLines() {
        var A = state.ans;
        var out = [];

        function add(label, value) {
            if (value && String(value).trim()) out.push([label, String(value).trim()]);
        }

        add('Food', A.food.join(', '));
        add('Avoid', A.avoid);
        add('Drinks', A.drinks.join(', '));
        add('Dessert', A.dessert.join(', '));
        add('Vibe', A.vibe);
        add('Budget', A.budget);
        add('Places', A.places.join(', '));
        add('Place ideas', A.ideas);
        add('After', A.after.join(', '));
        add('Dress code', A.dress);
        add('Getting there', A.getting);
        add('When', [
            A.when.join(', '),
            A.day ? fmtDay(A.day) : '',
            A.time ? fmtTime(A.time) : ''
        ].filter(Boolean).join('; '));
        add('Note', A.note);

        return out;
    }

    function flirtLine() {
        return state.ans.flirtOwn.trim() || state.ans.flirt;
    }

    function yesMessage() {
        var inv = state.invite;
        var lines = planLines();

        var msg = 'Yes! \uD83D\uDC8C I\u2019d love to go on a date with you, ' + inv.a + '.';

        if (lines.length) {
            msg += '\n\nHere\u2019s my plan:\n' + lines
                .map(function (row) { return '\u2022 ' + row[0] + ': ' + row[1]; })
                .join('\n');
        }

        var closing = flirtLine().trim();
        if (closing) msg += '\n\n' + closing;

        return msg + '\n\n\u2014 ' + inv.b;
    }

    function waHref(text) {
        return 'https://wa.me/?text=' + encodeURIComponent(text);
    }

    /* =======================================================================
       5. UI BUILDERS
       ======================================================================= */

    // variant: '' (default, ink-outlined) or 'glass' (for photo screens).
    function chips(key, list, mode, variant) {
        var extra = variant === 'glass' ? ' glass' : '';

        var buttons = list.map(function (value) {
            var isOn = mode === 'multi'
                ? state.ans[key].indexOf(value) > -1
                : state.ans[key] === value;

            return (
                '<button type="button" class="chip' + extra + '" data-chip ' +
                'data-key="' + key + '" data-mode="' + mode + '" data-val="' + esc(value) + '" ' +
                'aria-pressed="' + isOn + '">' + esc(value) + '</button>'
            );
        }).join('');

        return '<div class="chips" role="group">' + buttons + '</div>';
    }

    function ideaChips(field, list) {
        return list.map(function (text) {
            return (
                '<button type="button" class="chip small" ' +
                'data-fill="' + field + '" data-text="' + esc(text) + '">' + esc(text) + '</button>'
            );
        }).join('');
    }

    // A custom on/off switch, standing in for a native checkbox. The
    // real <input type="checkbox"> is still there — visually hidden,
    // but present for keyboard use, screen readers, and the existing
    // input-event handling in state.draft — the track and thumb next
    // to it are pure decoration driven by :checked in CSS.
    function toggle(field, isOn, label, hint) {
        return (
            '<label class="toggle">' +
            '<input type="checkbox" class="toggle-input" data-f="' + field + '" ' + (isOn ? 'checked' : '') + '>' +
            '<span class="toggle-track"><span class="toggle-thumb"></span></span>' +
            '<span class="toggle-label">' + esc(label) +
            (hint ? '<span class="hint">' + esc(hint) + '</span>' : '') +
            '</span>' +
            '</label>'
        );
    }

    function tiles() {
        var buttons = VIBES.map(function (v) {
            var title = v[0], subtitle = v[1], icon = v[2];
            var isOn = state.ans.vibe === title;

            return (
                '<button type="button" class="tile" data-chip ' +
                'data-key="vibe" data-mode="single" data-val="' + esc(title) + '" ' +
                'aria-pressed="' + isOn + '">' +
                '<span class="tile-icon" aria-hidden="true">' + icon + '</span>' +
                '<span class="tile-text"><b>' + esc(title) + '</b><span>' + esc(subtitle) + '</span></span>' +
                '</button>'
            );
        }).join('');

        return '<div class="tiles" role="group">' + buttons + '</div>';
    }

    // variant: '' or 'on-photo', to switch the dot/label colors.
    function progress(i, variant) {
        var extra = variant === 'on-photo' ? ' on-photo' : '';
        var dots = '';
        for (var n = 0; n < TOTAL_STEPS; n++) {
            dots += '<span class="' + (n <= i ? 'on' : '') + '"></span>';
        }

        return (
            '<div class="progress' + extra + '" role="img" aria-label="Step ' + (i + 1) + ' of ' + TOTAL_STEPS + '">' +
            dots +
            '</div>' +
            '<p class="stepno' + extra + '">Step ' + (i + 1) + ' of ' + TOTAL_STEPS + '</p>'
        );
    }

    function footer() {
        if (state.preview) return '';
        return '<p class="foot"><a href="#" data-act="own">Make your own invitation</a></p>';
    }

    function banner() {
        if (!state.preview) return '';
        return (
            '<div class="banner">' +
            '<span>Previewing what ' + esc(state.invite.b) + ' will see.</span>' +
            '<button type="button" class="btn small" data-act="edit">Back to editing</button>' +
            '</div>'
        );
    }

    /* =======================================================================
       6. SCREENS
       ======================================================================= */

    function screenCreate() {
        var d = state.draft;

        var skinButtons = Object.keys(SKINS).map(function (key) {
            var skin = SKINS[key];
            var dots = skin.dots.map(function (c) { return '<i style="background:' + c + '"></i>'; }).join('');

            return (
                '<button type="button" class="skin" data-skin="' + key + '" aria-pressed="' + (d.s === key) + '">' +
                '<span class="dots">' + dots + '</span>' + skin.name +
                '</button>'
            );
        }).join('');

        var result = '';
        if (state.link) {
            result =
                '<section class="card" id="result">' +
                '<h2>Your link is ready</h2>' +
                '<p>Send it to ' + esc(d.b.trim()) + '. Nothing is stored on a server, ' +
                'because the invitation lives inside the link.</p>' +
                '<input class="linkbox" type="text" readonly id="linkbox" ' +
                'aria-label="Invitation link" value="' + esc(state.link) + '">' +
                '<div class="row">' +
                '<button type="button" class="btn primary" data-act="copylink">Copy link</button>' +
                '<button type="button" class="btn" data-act="sharelink">Share</button>' +
                '</div>' +
                '<p class="hint" style="margin-top:1rem">When ' + esc(d.b.trim()) +
                ' answers, the reply comes back to you as a message they send themselves.</p>' +
                '</section>';
        }

        return (
            '<section class="create-layout">' +

            '<div class="create-photo">' + photoBg('create') + '</div>' +

            '<div class="create-panel">' +
            '<header class="hero">' +
            '<h1>Ask someone on a date</h1>' +
            '<p class="lede">Fill this in and send them the link. They can say yes, ' +
            'then help plan the date with you.</p>' +
            '</header>' +

            '<div class="field-row two-col">' +
            '<div class="field">' +
            '<label for="f-a">Your name</label>' +
            '<input id="f-a" type="text" data-f="a" maxlength="40" autocomplete="given-name" ' +
            'placeholder="Alex" value="' + esc(d.a) + '">' +
            '</div>' +

            '<div class="field">' +
            '<label for="f-b">Their name</label>' +
            '<input id="f-b" type="text" data-f="b" maxlength="40" placeholder="Sam" value="' + esc(d.b) + '">' +
            '</div>' +
            '</div>' +

            '<div class="field">' +
            '<label for="f-m">Your question</label>' +
            '<textarea id="f-m" data-f="m" rows="2" maxlength="160">' + esc(d.m) + '</textarea>' +
            '</div>' +

            '<fieldset><legend class="kicker">Look</legend><div class="skins">' + skinButtons + '</div></fieldset>' +

            toggle('t', d.t, 'Add a \u201CLet me think about it\u201D option') +
            toggle('d', d.d, 'Make the No button dodge',
                'It stops dodging after a few tries, so a real No always works.') +

            '<fieldset><legend class="kicker">Flirty touches (optional)</legend>' +

            '<div class="field-row two-col">' +
            '<div class="field">' +
            '<label for="f-p">A line under your question</label>' +
            '<input id="f-p" type="text" data-f="p" maxlength="100" placeholder="P.S. \u2026" value="' + esc(d.p) + '">' +
            '<div class="ideas">' + ideaChips('p', PS_IDEAS) + '</div>' +
            '</div>' +

            '<div class="field">' +
            '<label for="f-y">A message they see after saying yes</label>' +
            '<input id="f-y" type="text" data-f="y" maxlength="100" ' +
            'placeholder="Shown before they plan the date" value="' + esc(d.y) + '">' +
            '<div class="ideas">' + ideaChips('y', YES_IDEAS) + '</div>' +
            '</div>' +
            '</div>' +

            '</fieldset>' +

            '<p class="error" id="err" role="alert"></p>' +

            '<div class="row">' +
            '<button type="button" class="btn primary" data-act="make">Create invitation link</button>' +
            '<button type="button" class="btn" data-act="preview">Preview</button>' +
            '</div>' +

            '</div>' +
            '</section>' +
            result
        );
    }

    // The invitation: now a full-bleed photo poster instead of a plain card.
    function screenInvite() {
        var inv = state.invite;

        return (
            banner() +
            '<section class="photo-screen">' +
            photoBg('invite') +
            '<div class="photo-content">' +
            '<p class="to">Hi ' + esc(inv.b) + ',</p>' +
            '<h1>' + esc(inv.m) + '</h1>' +
            '<p class="from">From ' + esc(inv.a) + '</p>' +
            (inv.p ? '<p class="ps">' + esc(inv.p) + '</p>' : '') +
            '<div class="stack">' +
            '<button type="button" class="btn glass primary big" data-act="yes">Yes</button>' +
            '<button type="button" class="btn glass big" id="nobtn" data-act="no">No</button>' +
            (inv.t ? '<button type="button" class="linkbtn on-photo" data-act="maybe">Let me think about it</button>' : '') +
            '</div>' +
            '</div>' +
            '</section>' +
            footer()
        );
    }

    function screenReply(kind) {
        var inv = state.invite;
        var isNo = kind === 'no';

        var title = isNo ? 'Thanks for being honest.' : 'Take your time.';
        var lead = isNo
            ? 'A clear answer is kind. Send ' + esc(inv.a) + ' a short message so they hear it from you.'
            : 'No rush. You can let ' + esc(inv.a) + ' know you need a little time.';

        return (
            banner() +
            '<section class="card">' +
            '<h1>' + title + '</h1>' +
            '<p>' + lead + '</p>' +

            '<div class="field">' +
            '<label for="reply">Your message</label>' +
            '<textarea id="reply" data-r rows="4">' + esc(state.reply) + '</textarea>' +
            '</div>' +

            '<div class="row">' +
            '<button type="button" class="btn primary" data-act="sendreply">Send message</button>' +
            '<button type="button" class="btn" data-act="copyreply">Copy message</button>' +
            '</div>' +

            '<div class="row" style="margin-top:.75rem">' +
            '<a class="btn" id="wa" target="_blank" rel="noopener" href="' + waHref(state.reply) + '">Send on WhatsApp</a>' +
            '</div>' +

            '<div class="stack" style="margin-top:1rem">' +
            '<button type="button" class="linkbtn" data-act="back-invite">Change my answer</button>' +
            '</div>' +

            '</section>' +
            footer()
        );
    }

    // Every planner step is a full-bleed photo screen — see PHOTO_STEPS
    // above for which context each step number uses.
    function screenPlan() {
        return screenPlanPhoto(state.step, PHOTO_STEPS[state.step]);
    }

    function screenPlanPhoto(i, context) {
        var inv = state.invite;
        var A = state.ans;
        var isLastStep = i === TOTAL_STEPS - 1;
        var pickHint = '<p class="muted">Pick as many as you like.</p>';
        var heading, sub, body;

        if (context === 'food') {
            heading = 'What are you in the mood to eat?';
            sub = 'You said yes. Now for the fun part. Pick as many as you like.';
            body =
                chips('food', FOOD, 'multi', 'glass') +
                '<div class="field" style="margin-top:1.25rem">' +
                '<label for="avoid">Anything you\u2019d rather avoid?</label>' +
                '<input id="avoid" type="text" data-a="avoid" maxlength="120" ' +
                'placeholder="Allergies, foods you dislike" value="' + esc(A.avoid) + '">' +
                '</div>';

        } else if (context === 'drinks') {
            heading = 'Drinks and dessert?';
            sub = 'Pick as many as you like.';
            body =
                '<h2>What are we drinking?</h2>' + chips('drinks', DRINKS, 'multi', 'glass') +
                '<h2 style="margin-top:1.5rem">And for dessert?</h2>' + chips('dessert', DESSERTS, 'multi', 'glass');

        } else if (context === 'vibe') {
            heading = 'What kind of date sounds right?';
            sub = 'Choose the feeling you\u2019d like.';
            body =
                tiles() +
                '<h2 style="margin-top:1.5rem">What\u2019s the budget feeling?</h2>' +
                chips('budget', BUDGET, 'single', 'glass');

        } else if (context === 'places') {
            heading = 'Where would you like to go?';
            sub = 'Pick as many as you like.';
            body =
                chips('places', PLACES, 'multi', 'glass') +
                '<div class="field" style="margin-top:1.25rem">' +
                '<label for="ideas">Have a specific place in mind?</label>' +
                '<input id="ideas" type="text" data-a="ideas" maxlength="120" ' +
                'placeholder="A caf\u00e9 you\u2019ve been wanting to try" value="' + esc(A.ideas) + '">' +
                '</div>';

        } else if (context === 'after') {
            heading = 'What should we do after?';
            sub = 'Pick as many as you like.';
            body = chips('after', AFTER, 'multi', 'glass');

        } else if (context === 'details') {
            heading = 'The little details';
            sub = 'Pick one for each.';
            body =
                '<h2>What should we wear?</h2>' + chips('dress', DRESS, 'single', 'glass') +
                '<h2 style="margin-top:1.5rem">How do we get there?</h2>' + chips('getting', GETTING, 'single', 'glass');

        } else if (context === 'when') {
            heading = 'When works for you?';
            sub = 'Pick as many as you like.';
            body =
                chips('when', WHEN, 'multi', 'glass') +
                '<div class="glass-panel">' +
                '<div class="field">' +
                '<label for="day">A specific day, if you have one</label>' +
                '<input id="day" type="date" data-a="day" value="' + esc(A.day) + '">' +
                '</div>' +
                '<div class="field" style="margin-bottom:0">' +
                '<label for="time">A specific time, if you have one</label>' +
                '<input id="time" type="time" data-a="time" value="' + esc(A.time) + '">' +
                '</div>' +
                '</div>';

        } else {
            heading = 'Anything else for ' + esc(inv.a) + '?';
            sub = 'Both parts are optional.';
            body =
                '<div class="glass-panel">' +
                '<div class="field" style="margin-bottom:0">' +
                '<label for="note">A note</label>' +
                '<textarea id="note" data-a="note" rows="3" maxlength="300" ' +
                'placeholder="A song to play, a joke, a request">' + esc(A.note) + '</textarea>' +
                '</div>' +
                '</div>' +
                '<h2 style="margin-top:1.5rem">Add a little something</h2>' +
                '<p class="muted">Pick a line to end your message with, or write your own.</p>' +
                chips('flirt', FLIRT, 'single', 'glass') +
                '<div class="glass-panel">' +
                '<div class="field" style="margin-bottom:0">' +
                '<label for="flirtOwn">Or write your own</label>' +
                '<input id="flirtOwn" type="text" data-a="flirtOwn" maxlength="100" value="' + esc(A.flirtOwn) + '">' +
                '</div>' +
                '</div>';
        }

        return (
            banner() +
            '<section class="photo-screen">' +
            photoBg(context) +
            '<div class="photo-content">' +
            progress(i, 'on-photo') +
            '<h1 class="q">' + heading + '</h1>' +
            '<p class="lede">' + sub + '</p>' +
            body +
            '<div class="row">' +
            '<button type="button" class="btn glass" data-act="prev">Back</button>' +
            '<button type="button" class="btn glass primary" data-act="next">' +
            (isLastStep ? 'See my plan' : 'Next') +
            '</button>' +
            '</div>' +
            '</div>' +
            '</section>' +
            footer()
        );
    }

    function screenReveal() {
        var inv = state.invite;

        return (
            banner() +
            '<section class="photo-screen">' +
            photoBg('reveal') +
            '<div class="photo-content">' +
            '<p class="to">' + esc(inv.a) + ' says:</p>' +
            '<h1>' + esc(inv.y) + '</h1>' +
            '<div class="stack">' +
            '<button type="button" class="btn glass primary big" data-act="startplan">Plan our date</button>' +
            '</div>' +
            '</div>' +
            '</section>' +
            footer()
        );
    }

    function screenDone() {
        var inv = state.invite;
        var lines = planLines();
        var msg = yesMessage();

        var rows = lines.length
            ? '<dl class="dl-sum">' + lines.map(function (row) {
                return '<div class="sum"><dt>' + esc(row[0]) + '</dt><dd>' + esc(row[1]) + '</dd></div>';
            }).join('') + '</dl>'
            : '<p class="muted">You didn\u2019t pick any details, so ' + esc(inv.a) + ' will get a simple yes.</p>';

        return (
            banner() +
            '<section class="card">' +
            '<h1>Your plan is ready</h1>' +
            '<p>Send it to ' + esc(inv.a) + ' and they\u2019ll take it from there.</p>' +
            rows +
            '<div class="row">' +
            '<button type="button" class="btn primary" data-act="sendyes">Send to ' + esc(inv.a) + '</button>' +
            '<button type="button" class="btn" data-act="copyyes">Copy message</button>' +
            '</div>' +
            '<div class="row" style="margin-top:.75rem">' +
            '<a class="btn" target="_blank" rel="noopener" href="' + waHref(msg) + '">Send on WhatsApp</a>' +
            '</div>' +
            '<div class="stack" style="margin-top:1rem">' +
            '<button type="button" class="linkbtn" data-act="editplan">Edit my answers</button>' +
            '</div>' +
            '</section>' +
            footer()
        );
    }

    /* =======================================================================
       7. RENDER
       Decides which screen to show, sets the body's background-shape
       state, and hands the HTML to the transition engine rather than
       writing to innerHTML directly.
       ======================================================================= */

    function isPhotoScreen(s, i) {
        return s === 'create' || s === 'invite' || s === 'reveal' || (s === 'plan' && PHOTO_STEPS[i] !== undefined);
    }

    function afterSwap() {
        document.title = state.mode === 'invite'
            ? state.invite.a + ' has a question for you'
            : 'Ask someone on a date';

        var heading = app.querySelector('h1');
        if (heading) {
            heading.setAttribute('tabindex', '-1');
            heading.focus({ preventScroll: true });
        }
        window.scrollTo(0, 0);

        // A textarea might already hold text on first paint (the default
        // question, an edited note, a No/Maybe reply) — size it correctly
        // right away instead of waiting for the person to type.
        app.querySelectorAll('textarea').forEach(autoGrow);

        dodges = 0;
    }

    function render() {
        var s = state.screen;
        var photoNow = isPhotoScreen(s, state.step);

        // Background shapes only show behind non-photo screens.
        document.body.setAttribute('data-shapes', photoNow ? 'off' : 'on');
        document.body.setAttribute('data-screen', s === 'done' ? 'done' : 'form');

        // The create screen alone gets a wider container on desktop, for
        // its side-by-side split layout — every other screen keeps the
        // narrower, more readable column.
        document.body.classList.toggle('is-create', s === 'create');

        setSkin(state.mode === 'invite' ? state.invite.s : state.draft.s);

        var html;
        if (s === 'create') html = screenCreate();
        else if (s === 'invite') html = screenInvite();
        else if (s === 'reveal') html = screenReveal();
        else if (s === 'no' || s === 'maybe') html = screenReply(s);
        else if (s === 'plan') html = screenPlan();
        else html = screenDone();

        if (app.childElementCount === 0) {
            mountScreen(app, html);
            afterSwap();
        } else {
            switchScreen(app, html, afterSwap);
        }
    }

    /* =======================================================================
       8. ACTIONS
       ======================================================================= */

    var dodges = 0;
    var lastDodge = 0;

    function dodge(btn) {
        dodges++;
        lastDodge = Date.now();
        var x = (Math.random() < 0.5 ? -1 : 1) * (50 + Math.random() * 60);
        var y = (Math.random() < 0.5 ? -1 : 1) * (30 + Math.random() * 50);
        btn.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    }

    function dodgeOn() {
        return state.invite && state.invite.d && dodges < 5;
    }

    // A brief, spring-like scale pop whenever a chip or tile is selected —
    // removed automatically once the animation finishes, so it can play
    // again the next time the same element is picked.
    function popIn(el) {
        el.classList.remove('pop');
        void el.offsetWidth; // reflow, lets the animation restart if it's still mid-way
        el.classList.add('pop');
    }

    function validateDraft() {
        var d = state.draft;
        var err = document.getElementById('err');

        if (!d.a.trim() || !d.b.trim()) {
            err.textContent = 'Add both names so the invitation feels personal.';
            var target = document.getElementById(!d.a.trim() ? 'f-a' : 'f-b');
            if (target) target.focus();
            return false;
        }

        err.textContent = '';
        return true;
    }

    function draftToInvite() {
        var d = state.draft;
        return {
            a: d.a.trim(),
            b: d.b.trim(),
            m: d.m.trim() || DEFAULT_Q,
            s: d.s,
            d: d.d ? 1 : 0,
            t: d.t ? 1 : 0,
            p: d.p.trim(),
            y: d.y.trim()
        };
    }

    function act(name, el, ev) {
        var inv = state.invite;

        switch (name) {

            case 'make':
                if (!validateDraft()) return;
                state.link = location.href.split('#')[0] + '#i=' + encode(draftToInvite());
                render();

                var result = document.getElementById('result');
                if (result) {
                    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                    result.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
                }
                break;

            case 'preview':
                if (!validateDraft()) return;
                state.invite = draftToInvite();
                state.mode = 'invite';
                state.preview = true;
                state.screen = 'invite';
                state.step = 0;
                render();
                break;

            case 'edit':
                state.mode = 'create';
                state.preview = false;
                state.screen = 'create';
                render();
                break;

            case 'copylink':
                copy(state.link);
                break;

            case 'sharelink':
                share(state.draft.a.trim() + ' has a question for you.', state.link);
                break;

            case 'yes':
                state.screen = inv.y ? 'reveal' : 'plan';
                state.step = 0;
                render();
                break;

            case 'startplan':
                state.screen = 'plan';
                state.step = 0;
                render();
                break;

            case 'no':
                if (dodgeOn() && ev && ev.detail !== 0) {
                    dodge(el);
                    return;
                }
                state.reply = 'Hi ' + inv.a + ', thank you for asking. I\u2019m going to say no, but I appreciate that you asked.';
                state.screen = 'no';
                render();
                break;

            case 'maybe':
                state.reply = 'Hi ' + inv.a + ', I\u2019d like a little time to think about it. Can I get back to you soon?';
                state.screen = 'maybe';
                render();
                break;

            case 'back-invite':
                state.screen = 'invite';
                render();
                break;

            case 'sendreply':
                share(state.reply);
                break;

            case 'copyreply':
                copy(state.reply);
                break;

            case 'prev':
                if (state.step === 0) state.screen = 'invite';
                else state.step--;
                render();
                break;

            case 'next':
                if (state.step < TOTAL_STEPS - 1) {
                    state.step++;
                    state.screen = 'plan';
                } else {
                    state.screen = 'done';
                }
                render();
                break;

            case 'editplan':
                state.screen = 'plan';
                state.step = 0;
                render();
                break;

            case 'sendyes':
                share(yesMessage());
                break;

            case 'copyyes':
                copy(yesMessage());
                break;

            case 'own':
                try {
                    history.replaceState(null, '', location.pathname + location.search);
                } catch (e) {
                    location.hash = '';
                }
                init();
                break;
        }
    }

    /* =======================================================================
       9. EVENT LISTENERS
       ======================================================================= */

    document.addEventListener('click', function (e) {

        var chip = e.target.closest('[data-chip]');
        if (chip) {
            var key = chip.dataset.key;
            var val = chip.dataset.val;

            if (chip.dataset.mode === 'multi') {
                var arr = state.ans[key];
                var idx = arr.indexOf(val);
                if (idx > -1) {
                    arr.splice(idx, 1);
                } else {
                    arr.push(val);
                    popIn(chip);
                }
                chip.setAttribute('aria-pressed', String(idx === -1));
            } else {
                var turningOn = state.ans[key] !== val;
                state.ans[key] = turningOn ? val : '';
                document.querySelectorAll('[data-chip][data-key="' + key + '"]').forEach(function (x) {
                    x.setAttribute('aria-pressed', String(state.ans[key] === x.dataset.val));
                });
                if (turningOn) popIn(chip);
            }
            return;
        }

        var fill = e.target.closest('button[data-fill]');
        if (fill) {
            var field = fill.dataset.fill;
            state.draft[field] = fill.dataset.text;
            var box = document.getElementById('f-' + field);
            // Fill the value without focusing the field — the person tapped
            // a suggestion specifically to avoid typing, so pulling up the
            // on-screen keyboard right after would defeat the point.
            if (box) box.value = fill.dataset.text;
            return;
        }

        var skin = e.target.closest('button.skin');
        if (skin) {
            state.draft.s = skin.dataset.skin;
            setSkin(state.draft.s);
            document.querySelectorAll('.skin').forEach(function (x) {
                x.setAttribute('aria-pressed', String(x.dataset.skin === state.draft.s));
            });
            return;
        }

        var actionEl = e.target.closest('[data-act]');
        if (actionEl) {
            if (actionEl.tagName === 'A') e.preventDefault();
            act(actionEl.dataset.act, actionEl, e);
        }
    });

    document.addEventListener('pointerover', function (e) {
        var btn = e.target.closest && e.target.closest('#nobtn');
        if (btn && e.pointerType === 'mouse' && dodgeOn() && Date.now() - lastDodge > 250) {
            dodge(btn);
        }
    });

    document.addEventListener('input', function (e) {
        var t = e.target;

        if (t.tagName === 'TEXTAREA') autoGrow(t);

        if (t.dataset.f) {
            state.draft[t.dataset.f] = t.type === 'checkbox' ? (t.checked ? 1 : 0) : t.value;
        } else if (t.dataset.a) {
            state.ans[t.dataset.a] = t.value;
        } else if (t.dataset.r !== undefined) {
            state.reply = t.value;
            var wa = document.getElementById('wa');
            if (wa) wa.href = waHref(state.reply);
        }
    });

    document.addEventListener('focusin', function (e) {
        if (e.target.id === 'linkbox') e.target.select();
    });

    window.addEventListener('hashchange', function () {
        init();
    });

    /* =======================================================================
       10. START
       ======================================================================= */

    function init() {
        var invite = decode(location.hash);

        state.preview = false;
        state.step = 0;
        state.link = '';

        if (invite) {
            state.invite = invite;
            state.mode = 'invite';
            state.screen = 'invite';
        } else {
            state.mode = 'create';
            state.screen = 'create';
        }

        render();
    }

    init();
})();