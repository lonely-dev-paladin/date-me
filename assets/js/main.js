/* =========================================================================
   Will you go on a date with me? — main.js
   -------------------------------------------------------------------------
   No framework, no build step. Just:

     1. CONSTANTS       — fixed lists and text (food options, colors, etc.)
     2. STATE           — one object holding everything currently true
                           about the page (which screen, what's typed in)
     3. HELPERS         — small utility functions (escaping, copy, share)
     4. PLAN + MESSAGE  — turns state.ans into the summary and final text
     5. UI BUILDERS     — small reusable pieces of HTML (chips, tiles...)
     6. SCREENS         — one function per screen, returns that screen's
                           full HTML as a string, built from `state`
     7. RENDER          — decides which screen to show and injects its
                           HTML into the page
     8. ACTIONS         — what happens when a button is clicked
                           (name -> update state -> call render() again)
     9. EVENT LISTENERS — clicks / typing on the page are routed to
                           the functions above
    10. START           — reads the URL, sets initial state, renders once

   The loop is always the same:
     something happens -> update `state` -> render() -> page rebuilds
   ========================================================================= */
(function () {
    'use strict';

    var app = document.getElementById('app');
    var toastEl = document.getElementById('toast');

    /* =======================================================================
       1. CONSTANTS
       ======================================================================= */

    // The three color looks a person can pick when creating an invite.
    var SKINS = {
        lilac: { name: 'Lilac', dots: ['#DCD0FB', '#FFD866', '#B0124A'] },
        evening: { name: 'Evening', dots: ['#1B1030', '#F7C948', '#FFB4C8'] },
        garden: { name: 'Garden', dots: ['#CDE8D8', '#F4A6B7', '#1F6B45'] }
    };

    var DEFAULT_Q = 'Would you go on a date with me?';
    var TOTAL_STEPS = 8; // how many steps are in the "plan the date" flow

    // Option lists shown as chips on the planning screens.
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

    // [title, subtitle] pairs shown as bigger "tiles" for the date's vibe.
    var VIBES = [
        ['Simple and relaxed', 'Casual, comfy, no pressure'],
        ['Elegant', 'Dress up a little, get a nice table'],
        ['Cozy', 'A quiet corner and something warm'],
        ['Adventurous', 'Try something new together'],
        ['Playful', 'Games, laughs, and silly fun']
    ];

    // Optional "flirty touch" text. FLIRT = closing line the invitee can
    // pick for their reply. PS_IDEAS / YES_IDEAS = quick-fill suggestions
    // for the asker's own optional messages.
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
       One object holds everything true about the page right now.
       Nothing is read from anywhere else — every screen is built from this.
       ======================================================================= */

    var prefersDark =
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;

    var state = {
        // Are we the person CREATING an invite, or the person ANSWERING one?
        mode: 'create',

        // Which screen is currently shown. One of:
        // 'create' | 'invite' | 'reveal' | 'no' | 'maybe' | 'plan' | 'done'
        screen: 'create',

        // True while the asker is previewing what the invitee will see.
        preview: false,

        // Which step (0-based) of the 8-step planner we're on.
        step: 0,

        // The invitation as the ASKER is currently filling it in.
        draft: {
            a: '',                                  // asker's name
            b: '',                                  // invitee's name
            m: DEFAULT_Q,                           // the question itself
            s: prefersDark ? 'evening' : 'lilac',   // color look
            d: 0,                                   // 1 = "No" button dodges
            t: 1,                                   // 1 = show "let me think" option
            p: '',                                  // optional P.S. line
            y: ''                                   // optional "after they say yes" message
        },

        // The decoded invitation, once someone opens an invite link.
        invite: null,

        // The generated invite link, shown after the asker clicks "Create".
        link: '',

        // The invitee's answers while planning the date.
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

        // The invitee's free-text reply on a No / Maybe answer.
        reply: ''
    };

    /* =======================================================================
       3. HELPERS
       Small, general-purpose functions used all over the file.
       ======================================================================= */

    // Escape text before dropping it into HTML, so a name like "Sam & Jo"
    // (or something malicious) can't break the page.
    function esc(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    // Pack the invitation into a compact string that can live inside a URL,
    // e.g. "#i=eyJhIjoiQWxleCJ9". This is how the site works with no backend:
    // the invitation IS the link.
    function encode(o) {
        return encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(o)))));
    }

    // The reverse of encode(): read the invitation out of the current URL
    // hash. Returns null if there's nothing there, or it's malformed.
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

    // Small "toast" message at the bottom of the screen, e.g. "Copied!".
    function toast(msg) {
        toastEl.textContent = msg;
        toastEl.classList.add('show');
        clearTimeout(toast._t);
        toast._t = setTimeout(function () {
            toastEl.classList.remove('show');
        }, 2200);
    }

    // Copy text to the clipboard, with a fallback for older browsers.
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

    // Use the device's native share sheet if there is one, otherwise
    // just copy the text so the person can paste it themselves.
    function share(text, url) {
        if (navigator.share) {
            var data = url ? { text: text, url: url } : { text: text };
            navigator.share(data).catch(function (e) {
                if (e && e.name === 'AbortError') return; // person cancelled, do nothing
                copy(url ? text + ' ' + url : text);
            });
        } else {
            copy(url ? text + ' ' + url : text);
        }
    }

    // "2026-10-03" -> "Saturday, October 3"
    function fmtDay(v) {
        try {
            var d = new Date(v + 'T00:00:00');
            return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
        } catch (e) {
            return v;
        }
    }

    // "18:30" -> "6:30 PM"
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
       Turns state.ans into the summary list and the final message text.
       ======================================================================= */

    // Build the [label, value] rows shown on the summary screen, skipping
    // anything the invitee left blank.
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

    // The invitee's own written line wins over the picked chip, if they
    // wrote one.
    function flirtLine() {
        return state.ans.flirtOwn.trim() || state.ans.flirt;
    }

    // The full "Yes!" message the invitee sends back to the asker.
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
       Small, reusable pieces of HTML shared across more than one screen.
       ======================================================================= */

    // A row of pill-shaped option buttons ("chips") for one field in
    // state.ans. mode is 'multi' (toggle on/off, any number) or 'single'
    // (only one selected at a time).
    function chips(key, list, mode) {
        var buttons = list.map(function (value) {
            var isOn = mode === 'multi'
                ? state.ans[key].indexOf(value) > -1
                : state.ans[key] === value;

            return (
                '<button type="button" class="chip" data-chip ' +
                'data-key="' + key + '" data-mode="' + mode + '" data-val="' + esc(value) + '" ' +
                'aria-pressed="' + isOn + '">' + esc(value) + '</button>'
            );
        }).join('');

        return '<div class="chips" role="group">' + buttons + '</div>';
    }

    // Small suggestion chips that fill a text field with a preset line
    // when clicked (used for the P.S. / "after yes" fields).
    function ideaChips(field, list) {
        return list.map(function (text) {
            return (
                '<button type="button" class="chip small" ' +
                'data-fill="' + field + '" data-text="' + esc(text) + '">' + esc(text) + '</button>'
            );
        }).join('');
    }

    // The bigger "vibe" tiles (title + subtitle), single-select.
    function tiles() {
        var buttons = VIBES.map(function (v) {
            var title = v[0], subtitle = v[1];
            var isOn = state.ans.vibe === title;

            return (
                '<button type="button" class="tile" data-chip ' +
                'data-key="vibe" data-mode="single" data-val="' + esc(title) + '" ' +
                'aria-pressed="' + isOn + '">' +
                '<b>' + esc(title) + '</b><span>' + esc(subtitle) + '</span>' +
                '</button>'
            );
        }).join('');

        return '<div class="tiles" role="group">' + buttons + '</div>';
    }

    // The dot progress bar + "Step X of Y" label at the top of the planner.
    function progress(i) {
        var dots = '';
        for (var n = 0; n < TOTAL_STEPS; n++) {
            dots += '<span class="' + (n <= i ? 'on' : '') + '"></span>';
        }

        return (
            '<div class="progress" role="img" aria-label="Step ' + (i + 1) + ' of ' + TOTAL_STEPS + '">' +
            dots +
            '</div>' +
            '<p class="stepno">Step ' + (i + 1) + ' of ' + TOTAL_STEPS + '</p>'
        );
    }

    // "Make your own invitation" link, shown at the bottom of every screen
    // EXCEPT while the asker is previewing their own draft.
    function footer() {
        if (state.preview) return '';
        return '<p class="foot"><a href="#" data-act="own">Make your own invitation</a></p>';
    }

    // The "Previewing what X will see" bar, shown only in preview mode.
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
       One function per screen. Each returns that screen's full HTML,
       built entirely from `state`. render() decides which one to call.
       ======================================================================= */

    // The asker's form: names, question, look, and optional flirty touches.
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

        // The "here's your link" box only shows up once a link has been made.
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
            '<header class="hero">' +
            '<h1>Ask someone on a date</h1>' +
            '<p class="lede">Fill this in and send them the link. They can say yes, ' +
            'then help plan the date with you.</p>' +
            '</header>' +

            '<section class="card">' +

            '<div class="field">' +
            '<label for="f-a">Your name</label>' +
            '<input id="f-a" type="text" data-f="a" maxlength="40" autocomplete="given-name" ' +
            'placeholder="Alex" value="' + esc(d.a) + '">' +
            '</div>' +

            '<div class="field">' +
            '<label for="f-b">Their name</label>' +
            '<input id="f-b" type="text" data-f="b" maxlength="40" placeholder="Sam" value="' + esc(d.b) + '">' +
            '</div>' +

            '<div class="field">' +
            '<label for="f-m">Your question</label>' +
            '<textarea id="f-m" data-f="m" rows="2" maxlength="160">' + esc(d.m) + '</textarea>' +
            '</div>' +

            '<fieldset><legend>Look</legend><div class="skins">' + skinButtons + '</div></fieldset>' +

            '<label class="check">' +
            '<input type="checkbox" data-f="t" ' + (d.t ? 'checked' : '') + '>' +
            '<span>Add a \u201CLet me think about it\u201D option</span>' +
            '</label>' +

            '<label class="check">' +
            '<input type="checkbox" data-f="d" ' + (d.d ? 'checked' : '') + '>' +
            '<span>Make the No button dodge' +
            '<span class="hint">It stops dodging after a few tries, so a real No always works.</span>' +
            '</span>' +
            '</label>' +

            '<fieldset><legend>Flirty touches (optional)</legend>' +

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

            '</fieldset>' +

            '<p class="error" id="err" role="alert"></p>' +

            '<div class="row">' +
            '<button type="button" class="btn primary" data-act="make">Create invitation link</button>' +
            '<button type="button" class="btn" data-act="preview">Preview</button>' +
            '</div>' +

            '</section>' +
            result
        );
    }

    // The invitation itself: the question, and the Yes / No / Maybe buttons.
    function screenInvite() {
        var inv = state.invite;

        return (
            banner() +
            '<section class="card invite">' +
            '<p class="to">Hi ' + esc(inv.b) + ',</p>' +
            '<h1>' + esc(inv.m) + '</h1>' +
            '<p class="from">From ' + esc(inv.a) + '</p>' +
            (inv.p ? '<p class="ps">' + esc(inv.p) + '</p>' : '') +
            '<div class="stack">' +
            '<button type="button" class="btn primary big" data-act="yes">Yes</button>' +
            '<button type="button" class="btn big" id="nobtn" data-act="no">No</button>' +
            (inv.t ? '<button type="button" class="linkbtn" data-act="maybe">Let me think about it</button>' : '') +
            '</div>' +
            '</section>' +
            footer()
        );
    }

    // Shown after a No or a Maybe: lets the invitee send a kind reply.
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

    // The 8-step "plan the date" flow. One `if` block per step, all
    // sharing the same Back / Next footer.
    function screenPlan() {
        var i = state.step;
        var inv = state.invite;
        var A = state.ans;
        var body = '';
        var pickHint = '<p class="muted">Pick as many as you like.</p>';

        if (i === 0) {
            body =
                '<h1 class="q">What are you in the mood to eat?</h1>' +
                '<p class="muted">You said yes. Now for the fun part. Pick as many as you like.</p>' +
                chips('food', FOOD, 'multi') +
                '<div class="field" style="margin-top:1.25rem">' +
                '<label for="avoid">Anything you\u2019d rather avoid?</label>' +
                '<input id="avoid" type="text" data-a="avoid" maxlength="120" ' +
                'placeholder="Allergies, foods you dislike" value="' + esc(A.avoid) + '">' +
                '</div>';

        } else if (i === 1) {
            body =
                '<h1 class="q">Drinks and dessert?</h1>' + pickHint +
                '<div class="group"><h2>What are we drinking?</h2>' + chips('drinks', DRINKS, 'multi') + '</div>' +
                '<div class="group"><h2>And for dessert?</h2>' + chips('dessert', DESSERTS, 'multi') + '</div>';

        } else if (i === 2) {
            body =
                '<h1 class="q">What kind of date sounds right?</h1>' +
                '<p class="muted">Choose the feeling you\u2019d like.</p>' +
                tiles() +
                '<h2>What\u2019s the budget feeling?</h2>' +
                chips('budget', BUDGET, 'single');

        } else if (i === 3) {
            body =
                '<h1 class="q">Where would you like to go?</h1>' + pickHint +
                chips('places', PLACES, 'multi') +
                '<div class="field" style="margin-top:1.25rem">' +
                '<label for="ideas">Have a specific place in mind?</label>' +
                '<input id="ideas" type="text" data-a="ideas" maxlength="120" ' +
                'placeholder="A caf\u00e9 you\u2019ve been wanting to try" value="' + esc(A.ideas) + '">' +
                '</div>';

        } else if (i === 4) {
            body =
                '<h1 class="q">What should we do after?</h1>' + pickHint +
                chips('after', AFTER, 'multi');

        } else if (i === 5) {
            body =
                '<h1 class="q">The little details</h1>' +
                '<p class="muted">Pick one for each.</p>' +
                '<div class="group"><h2>What should we wear?</h2>' + chips('dress', DRESS, 'single') + '</div>' +
                '<div class="group"><h2>How do we get there?</h2>' + chips('getting', GETTING, 'single') + '</div>';

        } else if (i === 6) {
            body =
                '<h1 class="q">When works for you?</h1>' + pickHint +
                chips('when', WHEN, 'multi') +
                '<div class="field" style="margin-top:1.25rem">' +
                '<label for="day">A specific day, if you have one</label>' +
                '<input id="day" type="date" data-a="day" value="' + esc(A.day) + '">' +
                '</div>' +
                '<div class="field">' +
                '<label for="time">A specific time, if you have one</label>' +
                '<input id="time" type="time" data-a="time" value="' + esc(A.time) + '">' +
                '</div>';

        } else {
            body =
                '<h1 class="q">Anything else for ' + esc(inv.a) + '?</h1>' +
                '<p class="muted">Both parts are optional.</p>' +
                '<div class="field">' +
                '<label for="note">A note</label>' +
                '<textarea id="note" data-a="note" rows="3" maxlength="300" ' +
                'placeholder="A song to play, a joke, a request">' + esc(A.note) + '</textarea>' +
                '</div>' +
                '<div class="group">' +
                '<h2>Add a little something</h2>' +
                '<p class="muted">Pick a line to end your message with, or write your own.</p>' +
                chips('flirt', FLIRT, 'single') +
                '<div class="field" style="margin-top:1rem">' +
                '<label for="flirtOwn">Or write your own</label>' +
                '<input id="flirtOwn" type="text" data-a="flirtOwn" maxlength="100" value="' + esc(A.flirtOwn) + '">' +
                '</div>' +
                '</div>';
        }

        var isLastStep = i === TOTAL_STEPS - 1;

        return (
            banner() +
            '<section class="card">' +
            progress(i) +
            body +
            '<div class="row">' +
            '<button type="button" class="btn" data-act="prev">Back</button>' +
            '<button type="button" class="btn primary" data-act="next">' +
            (isLastStep ? 'See my plan' : 'Next') +
            '</button>' +
            '</div>' +
            '</section>' +
            footer()
        );
    }

    // The optional "after they say Yes" reveal, before the planner starts.
    function screenReveal() {
        var inv = state.invite;

        return (
            banner() +
            '<section class="card invite reveal">' +
            '<p class="to">' + esc(inv.a) + ' says:</p>' +
            '<h1>' + esc(inv.y) + '</h1>' +
            '<div class="stack">' +
            '<button type="button" class="btn primary big" data-act="startplan">Plan our date</button>' +
            '</div>' +
            '</section>' +
            footer()
        );
    }

    // The final summary screen: what the invitee picked, and buttons to
    // send it all back to the asker.
    function screenDone() {
        var inv = state.invite;
        var lines = planLines();
        var msg = yesMessage();

        var rows = lines.length
            ? '<dl>' + lines.map(function (row) {
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
       Looks at state.screen, calls the matching screen function, and
       drops the resulting HTML into the page.
       ======================================================================= */

    function render() {
        var s = state.screen;

        // Which set of background shapes to animate to. 'reveal', 'no' and
        // 'maybe' all use the same shape layout as the invite screen.
        var shapeKey;
        if (s === 'create') shapeKey = 'create';
        else if (s === 'plan') shapeKey = 'plan';
        else if (s === 'done') shapeKey = 'done';
        else shapeKey = 'invite';

        document.body.setAttribute('data-screen', shapeKey);
        setSkin(state.mode === 'invite' ? state.invite.s : state.draft.s);

        var html;
        if (s === 'create') html = screenCreate();
        else if (s === 'invite') html = screenInvite();
        else if (s === 'reveal') html = screenReveal();
        else if (s === 'no' || s === 'maybe') html = screenReply(s);
        else if (s === 'plan') html = screenPlan();
        else html = screenDone();

        app.innerHTML = html;

        document.title = state.mode === 'invite'
            ? state.invite.a + ' has a question for you'
            : 'Ask someone on a date';

        // Move keyboard focus to the new heading, for accessibility, and
        // scroll back to the top of the page.
        var heading = app.querySelector('h1');
        if (heading) {
            heading.setAttribute('tabindex', '-1');
            heading.focus({ preventScroll: true });
        }
        window.scrollTo(0, 0);

        dodges = 0; // reset the "No button" dodge counter on every new screen
    }

    /* =======================================================================
       8. ACTIONS
       What happens when a button is clicked. Each case updates `state`
       and then calls render() to redraw the page from it.
       ======================================================================= */

    var dodges = 0;
    var lastDodge = 0;

    // Nudge the No button to a random nearby spot.
    function dodge(btn) {
        dodges++;
        lastDodge = Date.now();
        var x = (Math.random() < 0.5 ? -1 : 1) * (50 + Math.random() * 60);
        var y = (Math.random() < 0.5 ? -1 : 1) * (30 + Math.random() * 50);
        btn.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    }

    // Only dodge if the asker turned it on, and only for the first few
    // tries — a real "No" always has to work eventually.
    function dodgeOn() {
        return state.invite && state.invite.d && dodges < 5;
    }

    // Both names are required before an invite can be created or previewed.
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

    // Turn the (mutable) draft into the small, fixed shape that gets
    // encoded into the link.
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
                // Show the optional "after yes" reveal first, if the asker set one.
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
                // A real click has ev.detail > 0 (keyboard "click" is 0),
                // so keyboard users never get stuck dodging the button.
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
                // Clear the invitation out of the URL and start fresh as an asker.
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
       One listener per event type on the whole document. Buttons are
       matched by their data-* attributes rather than individual handlers.
       ======================================================================= */

    document.addEventListener('click', function (e) {

        // Option chips (food, places, vibe tiles, etc.)
        var chip = e.target.closest('[data-chip]');
        if (chip) {
            var key = chip.dataset.key;
            var val = chip.dataset.val;

            if (chip.dataset.mode === 'multi') {
                var arr = state.ans[key];
                var idx = arr.indexOf(val);
                if (idx > -1) arr.splice(idx, 1);
                else arr.push(val);
                chip.setAttribute('aria-pressed', String(idx === -1));
            } else {
                state.ans[key] = state.ans[key] === val ? '' : val;
                document.querySelectorAll('[data-chip][data-key="' + key + '"]').forEach(function (x) {
                    x.setAttribute('aria-pressed', String(state.ans[key] === x.dataset.val));
                });
            }
            return;
        }

        // Suggestion chips that fill a text field (P.S. / "after yes" ideas).
        var fill = e.target.closest('button[data-fill]');
        if (fill) {
            var field = fill.dataset.fill;
            state.draft[field] = fill.dataset.text;
            var box = document.getElementById('f-' + field);
            if (box) {
                box.value = fill.dataset.text;
                box.focus();
            }
            return;
        }

        // Color-look buttons on the create screen.
        var skin = e.target.closest('button.skin');
        if (skin) {
            state.draft.s = skin.dataset.skin;
            setSkin(state.draft.s);
            document.querySelectorAll('.skin').forEach(function (x) {
                x.setAttribute('aria-pressed', String(x.dataset.skin === state.draft.s));
            });
            return;
        }

        // Everything else: buttons with a data-act, routed to act().
        var actionEl = e.target.closest('[data-act]');
        if (actionEl) {
            if (actionEl.tagName === 'A') e.preventDefault();
            act(actionEl.dataset.act, actionEl, e);
        }
    });

    // Mouse-only: make the No button dodge on hover too, not just on click.
    document.addEventListener('pointerover', function (e) {
        var btn = e.target.closest && e.target.closest('#nobtn');
        if (btn && e.pointerType === 'mouse' && dodgeOn() && Date.now() - lastDodge > 250) {
            dodge(btn);
        }
    });

    // Typing into any text input / textarea updates the matching bit of state.
    document.addEventListener('input', function (e) {
        var t = e.target;

        if (t.dataset.f) {
            // A field on the create screen (state.draft).
            state.draft[t.dataset.f] = t.type === 'checkbox' ? (t.checked ? 1 : 0) : t.value;

        } else if (t.dataset.a) {
            // A field on a planner step (state.ans).
            state.ans[t.dataset.a] = t.value;

        } else if (t.dataset.r !== undefined) {
            // The No / Maybe reply textarea.
            state.reply = t.value;
            var wa = document.getElementById('wa');
            if (wa) wa.href = waHref(state.reply);
        }
    });

    // Select the whole invite link when it gets focus, so it's easy to copy.
    document.addEventListener('focusin', function (e) {
        if (e.target.id === 'linkbox') e.target.select();
    });

    // Re-run init() whenever the URL hash changes, e.g. after "own" clears it.
    window.addEventListener('hashchange', function () {
        init();
    });

    /* =======================================================================
       10. START
       Read the URL once, decide whether we're an asker or an invitee,
       and render the first screen.
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