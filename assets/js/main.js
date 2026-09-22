(function () {
    'use strict';

    var app = document.getElementById('app');
    var toastEl = document.getElementById('toast');
    var SKINS = {
        lilac: { name: 'Lilac', dots: ['#DCD0FB', '#FFD866', '#B0124A'] },
        evening: { name: 'Evening', dots: ['#1B1030', '#F7C948', '#FFB4C8'] },
        garden: { name: 'Garden', dots: ['#CDE8D8', '#F4A6B7', '#1F6B45'] }
    };
    var DEFAULT_Q = 'Would you go on a date with me?';
    var TOTAL_STEPS = 8;

    var FOOD = ['Filipino', 'Japanese', 'Korean', 'Italian', 'Chinese', 'Thai', 'Steak and grill', 'Seafood', 'Burgers and pizza', 'Vegetarian', 'Coffee and dessert', 'Street food', 'Surprise me'];
    var PLACES = ['Café', 'Restaurant', 'Picnic in a park', 'Movie theater', 'Museum or gallery', 'Bookstore', 'Arcade or games', 'Sunset spot', 'Night market', 'Cooking at home', 'Nature walk'];
    var WHEN = ['Weekday evening', 'Weekend morning', 'Weekend afternoon', 'Weekend evening', 'Flexible'];
    var BUDGET = ['Keep it easy', 'Comfortable', 'Treat ourselves'];
    var DRINKS = ['Coffee', 'Milk tea', 'Fruit shake', 'Wine', 'Cocktails', 'Beer', 'Water is fine'];
    var DESSERTS = ['Ice cream', 'Cake', 'Halo-halo', 'Chocolate', 'Pastries', 'Fruit', 'Skip dessert'];
    var AFTER = ['Walk around', 'Arcade or games', 'Karaoke', 'Stargazing', 'Take photos', 'Dessert run', 'Movie night at home', 'Go home early', 'Nothing planned'];
    var DRESS = ['Casual', 'Smart casual', 'Dressed up', 'As comfy as possible', 'Surprise me'];
    var GETTING = ['Meet there', 'Pick me up', 'Commute together'];
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
    var VIBES = [
        ['Simple and relaxed', 'Casual, comfy, no pressure'],
        ['Elegant', 'Dress up a little, get a nice table'],
        ['Cozy', 'A quiet corner and something warm'],
        ['Adventurous', 'Try something new together'],
        ['Playful', 'Games, laughs, and silly fun']
    ];

    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    var state = {
        mode: 'create', screen: 'create', preview: false, step: 0,
        draft: { a: '', b: '', m: DEFAULT_Q, s: prefersDark ? 'evening' : 'lilac', d: 0, t: 1, p: '', y: '' },
        invite: null, link: '',
        ans: { food: [], avoid: '', drinks: [], dessert: [], vibe: '', budget: '', places: [], ideas: '', after: [], dress: '', getting: '', when: [], day: '', note: '', flirt: '', flirtOwn: '' },
        reply: ''
    };

    /* ---------- helpers ---------- */
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
                a: j.a.slice(0, 40), b: j.b.slice(0, 40),
                m: (typeof j.m === 'string' && j.m.trim() ? j.m : DEFAULT_Q).slice(0, 160),
                s: SKINS[j.s] ? j.s : 'lilac', d: j.d ? 1 : 0, t: j.t ? 1 : 0,
                p: typeof j.p === 'string' ? j.p.slice(0, 100) : '',
                y: typeof j.y === 'string' ? j.y.slice(0, 100) : ''
            };
        } catch (e) { return null; }
    }
    function setSkin(s) { document.documentElement.setAttribute('data-skin', s); }
    function toast(msg) {
        toastEl.textContent = msg;
        toastEl.classList.add('show');
        clearTimeout(toast._t);
        toast._t = setTimeout(function () { toastEl.classList.remove('show'); }, 2200);
    }
    function copy(text) {
        var done = function () { toast('Copied to your clipboard.'); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(done, fallback);
        } else { fallback(); }
        function fallback() {
            var ta = document.createElement('textarea');
            ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
            document.body.appendChild(ta); ta.select();
            try { document.execCommand('copy'); done(); }
            catch (e) { toast('Could not copy. Select the text and copy it yourself.'); }
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
        } catch (e) { return v; }
    }

    /* ---------- plan + message ---------- */
    function planLines() {
        var A = state.ans, out = [];
        function add(k, v) { if (v && String(v).trim()) out.push([k, String(v).trim()]); }
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
        add('When', [A.when.join(', '), A.day ? fmtDay(A.day) : ''].filter(Boolean).join('; '));
        add('Note', A.note);
        return out;
    }
    function A_flirt() { return state.ans.flirtOwn.trim() || state.ans.flirt; }
    function yesMessage() {
        var inv = state.invite, L = planLines();
        var t = 'Yes! 💌 I\u2019d love to go on a date with you, ' + inv.a + '.';
        if (L.length) {
            t += '\n\nHere\u2019s my plan:\n' + L.map(function (r) { return '\u2022 ' + r[0] + ': ' + r[1]; }).join('\n');
        }
        var line = (A_flirt() || '').trim();
        if (line) t += '\n\n' + line;
        return t + '\n\n\u2014 ' + inv.b;
    }
    function waHref(text) { return 'https://wa.me/?text=' + encodeURIComponent(text); }

    /* ---------- UI builders ---------- */
    function chips(key, list, mode) {
        return '<div class="chips" role="group">' + list.map(function (v) {
            var on = mode === 'multi' ? state.ans[key].indexOf(v) > -1 : state.ans[key] === v;
            return '<button type="button" class="chip" data-chip data-key="' + key + '" data-mode="' + mode + '" data-val="' + esc(v) + '" aria-pressed="' + on + '">' + esc(v) + '</button>';
        }).join('') + '</div>';
    }
    function ideaChips(field, list) {
        return list.map(function (t) {
            return '<button type="button" class="chip small" data-fill="' + field + '" data-text="' + esc(t) + '">' + esc(t) + '</button>';
        }).join('');
    }
    function tiles() {
        return '<div class="tiles" role="group">' + VIBES.map(function (v) {
            var on = state.ans.vibe === v[0];
            return '<button type="button" class="tile" data-chip data-key="vibe" data-mode="single" data-val="' + esc(v[0]) + '" aria-pressed="' + on + '"><b>' + esc(v[0]) + '</b><span>' + esc(v[1]) + '</span></button>';
        }).join('') + '</div>';
    }
    function progress(i) {
        var s = '';
        for (var n = 0; n < TOTAL_STEPS; n++) s += '<span class="' + (n <= i ? 'on' : '') + '"></span>';
        return '<div class="progress" role="img" aria-label="Step ' + (i + 1) + ' of ' + TOTAL_STEPS + '">' + s + '</div><p class="stepno">Step ' + (i + 1) + ' of ' + TOTAL_STEPS + '</p>';
    }
    function footer() {
        if (state.preview) return '';
        return '<p class="foot"><a href="#" data-act="own">Make your own invitation</a></p>';
    }
    function banner() {
        if (!state.preview) return '';
        return '<div class="banner"><span>Previewing what ' + esc(state.invite.b) + ' will see.</span><button type="button" class="btn small" data-act="edit">Back to editing</button></div>';
    }

    /* ---------- screens ---------- */
    function screenCreate() {
        var d = state.draft;
        var skinBtns = Object.keys(SKINS).map(function (k) {
            var s = SKINS[k];
            return '<button type="button" class="skin" data-skin="' + k + '" aria-pressed="' + (d.s === k) + '"><span class="dots">' +
                s.dots.map(function (c) { return '<i style="background:' + c + '"></i>'; }).join('') + '</span>' + s.name + '</button>';
        }).join('');
        var result = '';
        if (state.link) {
            result = '<section class="card" id="result">' +
                '<h2>Your link is ready</h2>' +
                '<p>Send it to ' + esc(d.b.trim()) + '. Nothing is stored on a server, because the invitation lives inside the link.</p>' +
                '<input class="linkbox" type="text" readonly id="linkbox" aria-label="Invitation link" value="' + esc(state.link) + '">' +
                '<div class="row"><button type="button" class="btn primary" data-act="copylink">Copy link</button>' +
                '<button type="button" class="btn" data-act="sharelink">Share</button></div>' +
                '<p class="hint" style="margin-top:1rem">When ' + esc(d.b.trim()) + ' answers, the reply comes back to you as a message they send themselves.</p>' +
                '</section>';
        }
        return '<header class="hero"><h1>Ask someone on a date</h1>' +
            '<p class="lede">Fill this in and send them the link. They can say yes, then help plan the date with you.</p></header>' +
            '<section class="card">' +
            '<div class="field"><label for="f-a">Your name</label><input id="f-a" type="text" data-f="a" maxlength="40" autocomplete="given-name" placeholder="Alex" value="' + esc(d.a) + '"></div>' +
            '<div class="field"><label for="f-b">Their name</label><input id="f-b" type="text" data-f="b" maxlength="40" placeholder="Sam" value="' + esc(d.b) + '"></div>' +
            '<div class="field"><label for="f-m">Your question</label><textarea id="f-m" data-f="m" rows="2" maxlength="160">' + esc(d.m) + '</textarea></div>' +
            '<fieldset><legend>Look</legend><div class="skins">' + skinBtns + '</div></fieldset>' +
            '<label class="check"><input type="checkbox" data-f="t" ' + (d.t ? 'checked' : '') + '><span>Add a \u201CLet me think about it\u201D option</span></label>' +
            '<label class="check"><input type="checkbox" data-f="d" ' + (d.d ? 'checked' : '') + '><span>Make the No button dodge<span class="hint">It stops dodging after a few tries, so a real No always works.</span></span></label>' +
            '<fieldset><legend>Flirty touches (optional)</legend>' +
            '<div class="field"><label for="f-p">A line under your question</label>' +
            '<input id="f-p" type="text" data-f="p" maxlength="100" placeholder="P.S. \u2026" value="' + esc(d.p) + '">' +
            '<div class="ideas">' + ideaChips('p', PS_IDEAS) + '</div></div>' +
            '<div class="field"><label for="f-y">A message they see after saying yes</label>' +
            '<input id="f-y" type="text" data-f="y" maxlength="100" placeholder="Shown before they plan the date" value="' + esc(d.y) + '">' +
            '<div class="ideas">' + ideaChips('y', YES_IDEAS) + '</div></div></fieldset>' +
            '<p class="error" id="err" role="alert"></p>' +
            '<div class="row"><button type="button" class="btn primary" data-act="make">Create invitation link</button>' +
            '<button type="button" class="btn" data-act="preview">Preview</button></div>' +
            '</section>' + result;
    }

    function screenInvite() {
        var inv = state.invite;
        return banner() +
            '<section class="card invite">' +
            '<p class="to">Hi ' + esc(inv.b) + ',</p>' +
            '<h1>' + esc(inv.m) + '</h1>' +
            '<p class="from">From ' + esc(inv.a) + '</p>' +
            (inv.p ? '<p class="ps">' + esc(inv.p) + '</p>' : '') +
            '<div class="stack">' +
            '<button type="button" class="btn primary big" data-act="yes">Yes</button>' +
            '<button type="button" class="btn big" id="nobtn" data-act="no">No</button>' +
            (inv.t ? '<button type="button" class="linkbtn" data-act="maybe">Let me think about it</button>' : '') +
            '</div></section>' + footer();
    }

    function screenReply(kind) {
        var inv = state.invite;
        var title = kind === 'no' ? 'Thanks for being honest.' : 'Take your time.';
        var lead = kind === 'no'
            ? 'A clear answer is kind. Send ' + esc(inv.a) + ' a short message so they hear it from you.'
            : 'No rush. You can let ' + esc(inv.a) + ' know you need a little time.';
        return banner() +
            '<section class="card"><h1>' + title + '</h1><p>' + lead + '</p>' +
            '<div class="field"><label for="reply">Your message</label>' +
            '<textarea id="reply" data-r rows="4">' + esc(state.reply) + '</textarea></div>' +
            '<div class="row"><button type="button" class="btn primary" data-act="sendreply">Send message</button>' +
            '<button type="button" class="btn" data-act="copyreply">Copy message</button></div>' +
            '<div class="row" style="margin-top:.75rem"><a class="btn" id="wa" target="_blank" rel="noopener" href="' + waHref(state.reply) + '">Send on WhatsApp</a></div>' +
            '<div class="stack" style="margin-top:1rem"><button type="button" class="linkbtn" data-act="back-invite">Change my answer</button></div>' +
            '</section>' + footer();
    }

    function screenPlan() {
        var i = state.step, inv = state.invite, A = state.ans, body = '';
        var pick = '<p class="muted">Pick as many as you like.</p>';
        if (i === 0) {
            body = '<h1 class="q">What are you in the mood to eat?</h1><p class="muted">You said yes. Now for the fun part. Pick as many as you like.</p>' +
                chips('food', FOOD, 'multi') +
                '<div class="field" style="margin-top:1.25rem"><label for="avoid">Anything you\u2019d rather avoid?</label>' +
                '<input id="avoid" type="text" data-a="avoid" maxlength="120" placeholder="Allergies, foods you dislike" value="' + esc(A.avoid) + '"></div>';
        } else if (i === 1) {
            body = '<h1 class="q">Drinks and dessert?</h1>' + pick +
                '<div class="group"><h2>What are we drinking?</h2>' + chips('drinks', DRINKS, 'multi') + '</div>' +
                '<div class="group"><h2>And for dessert?</h2>' + chips('dessert', DESSERTS, 'multi') + '</div>';
        } else if (i === 2) {
            body = '<h1 class="q">What kind of date sounds right?</h1><p class="muted">Choose the feeling you\u2019d like.</p>' + tiles() +
                '<h2>What\u2019s the budget feeling?</h2>' + chips('budget', BUDGET, 'single');
        } else if (i === 3) {
            body = '<h1 class="q">Where would you like to go?</h1>' + pick +
                chips('places', PLACES, 'multi') +
                '<div class="field" style="margin-top:1.25rem"><label for="ideas">Have a specific place in mind?</label>' +
                '<input id="ideas" type="text" data-a="ideas" maxlength="120" placeholder="A caf\u00e9 you\u2019ve been wanting to try" value="' + esc(A.ideas) + '"></div>';
        } else if (i === 4) {
            body = '<h1 class="q">What should we do after?</h1>' + pick + chips('after', AFTER, 'multi');
        } else if (i === 5) {
            body = '<h1 class="q">The little details</h1><p class="muted">Pick one for each.</p>' +
                '<div class="group"><h2>What should we wear?</h2>' + chips('dress', DRESS, 'single') + '</div>' +
                '<div class="group"><h2>How do we get there?</h2>' + chips('getting', GETTING, 'single') + '</div>';
        } else if (i === 6) {
            body = '<h1 class="q">When works for you?</h1>' + pick +
                chips('when', WHEN, 'multi') +
                '<div class="field" style="margin-top:1.25rem"><label for="day">A specific day, if you have one</label>' +
                '<input id="day" type="date" data-a="day" value="' + esc(A.day) + '"></div>';
        } else {
            body = '<h1 class="q">Anything else for ' + esc(inv.a) + '?</h1><p class="muted">Both parts are optional.</p>' +
                '<div class="field"><label for="note">A note</label>' +
                '<textarea id="note" data-a="note" rows="3" maxlength="300" placeholder="A song to play, a joke, a request">' + esc(A.note) + '</textarea></div>' +
                '<div class="group"><h2>Add a little something</h2><p class="muted">Pick a line to end your message with, or write your own.</p>' +
                chips('flirt', FLIRT, 'single') +
                '<div class="field" style="margin-top:1rem"><label for="flirtOwn">Or write your own</label>' +
                '<input id="flirtOwn" type="text" data-a="flirtOwn" maxlength="100" value="' + esc(A.flirtOwn) + '"></div></div>';
        }
        return banner() + '<section class="card">' + progress(i) + body +
            '<div class="row"><button type="button" class="btn" data-act="prev">Back</button>' +
            '<button type="button" class="btn primary" data-act="next">' + (i === TOTAL_STEPS - 1 ? 'See my plan' : 'Next') + '</button></div>' +
            '</section>' + footer();
    }

    function screenReveal() {
        var inv = state.invite;
        return banner() +
            '<section class="card invite reveal">' +
            '<p class="to">' + esc(inv.a) + ' says:</p>' +
            '<h1>' + esc(inv.y) + '</h1>' +
            '<div class="stack"><button type="button" class="btn primary big" data-act="startplan">Plan our date</button></div>' +
            '</section>' + footer();
    }

    function screenDone() {
        var inv = state.invite, L = planLines(), msg = yesMessage();
        var rows = L.length ? '<dl>' + L.map(function (r) {
            return '<div class="sum"><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>';
        }).join('') + '</dl>' : '<p class="muted">You didn\u2019t pick any details, so ' + esc(inv.a) + ' will get a simple yes.</p>';
        return banner() +
            '<section class="card"><h1>Your plan is ready</h1>' +
            '<p>Send it to ' + esc(inv.a) + ' and they\u2019ll take it from there.</p>' + rows +
            '<div class="row"><button type="button" class="btn primary" data-act="sendyes">Send to ' + esc(inv.a) + '</button>' +
            '<button type="button" class="btn" data-act="copyyes">Copy message</button></div>' +
            '<div class="row" style="margin-top:.75rem"><a class="btn" target="_blank" rel="noopener" href="' + waHref(msg) + '">Send on WhatsApp</a></div>' +
            '<div class="stack" style="margin-top:1rem"><button type="button" class="linkbtn" data-act="editplan">Edit my answers</button></div>' +
            '</section>' + footer();
    }

    /* ---------- render ---------- */
    function render() {
        var s = state.screen, shapeKey;
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

        var h = app.querySelector('h1');
        if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
        window.scrollTo(0, 0);
        dodges = 0;
    }

    /* ---------- actions ---------- */
    var dodges = 0, lastDodge = 0;
    function dodge(btn) {
        dodges++; lastDodge = Date.now();
        var x = (Math.random() < .5 ? -1 : 1) * (50 + Math.random() * 60);
        var y = (Math.random() < .5 ? -1 : 1) * (30 + Math.random() * 50);
        btn.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    }
    function dodgeOn() { return state.invite && state.invite.d && dodges < 5; }

    function validateDraft() {
        var d = state.draft, err = document.getElementById('err');
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
        return { a: d.a.trim(), b: d.b.trim(), m: (d.m.trim() || DEFAULT_Q), s: d.s, d: d.d ? 1 : 0, t: d.t ? 1 : 0, p: d.p.trim(), y: d.y.trim() };
    }

    function act(name, el, ev) {
        var inv = state.invite;
        switch (name) {
            case 'make':
                if (!validateDraft()) return;
                var payload = draftToInvite();
                state.link = location.href.split('#')[0] + '#i=' + encode(payload);
                render();
                var r = document.getElementById('result');
                if (r) {
                    var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                    r.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
                }
                break;
            case 'preview':
                if (!validateDraft()) return;
                state.invite = draftToInvite(); state.mode = 'invite'; state.preview = true;
                state.screen = 'invite'; state.step = 0;
                render();
                break;
            case 'edit':
                state.mode = 'create'; state.preview = false; state.screen = 'create';
                render();
                break;
            case 'copylink': copy(state.link); break;
            case 'sharelink':
                share(state.draft.a.trim() + ' has a question for you.', state.link);
                break;
            case 'yes':
                state.screen = inv.y ? 'reveal' : 'plan'; state.step = 0; render(); break;
            case 'startplan':
                state.screen = 'plan'; state.step = 0; render(); break;
            case 'no':
                if (dodgeOn() && ev && ev.detail !== 0) { dodge(el); return; }
                state.reply = 'Hi ' + inv.a + ', thank you for asking. I\u2019m going to say no, but I appreciate that you asked.';
                state.screen = 'no'; render(); break;
            case 'maybe':
                state.reply = 'Hi ' + inv.a + ', I\u2019d like a little time to think about it. Can I get back to you soon?';
                state.screen = 'maybe'; render(); break;
            case 'back-invite': state.screen = 'invite'; render(); break;
            case 'sendreply': share(state.reply); break;
            case 'copyreply': copy(state.reply); break;
            case 'prev':
                if (state.step === 0) { state.screen = 'invite'; }
                else { state.step--; }
                render(); break;
            case 'next':
                if (state.step < TOTAL_STEPS - 1) { state.step++; state.screen = 'plan'; }
                else { state.screen = 'done'; }
                render(); break;
            case 'editplan': state.screen = 'plan'; state.step = 0; render(); break;
            case 'sendyes': share(yesMessage()); break;
            case 'copyyes': copy(yesMessage()); break;
            case 'own':
                try { history.replaceState(null, '', location.pathname + location.search); }
                catch (e) { location.hash = ''; }
                init(); break;
        }
    }

    /* ---------- events ---------- */
    document.addEventListener('click', function (e) {
        var chip = e.target.closest('[data-chip]');
        if (chip) {
            var key = chip.dataset.key, val = chip.dataset.val;
            if (chip.dataset.mode === 'multi') {
                var arr = state.ans[key], i = arr.indexOf(val);
                if (i > -1) arr.splice(i, 1); else arr.push(val);
                chip.setAttribute('aria-pressed', String(i === -1));
            } else {
                state.ans[key] = state.ans[key] === val ? '' : val;
                document.querySelectorAll('[data-chip][data-key="' + key + '"]').forEach(function (x) {
                    x.setAttribute('aria-pressed', String(state.ans[key] === x.dataset.val));
                });
            }
            return;
        }
        var fill = e.target.closest('button[data-fill]');
        if (fill) {
            var fk = fill.dataset.fill;
            state.draft[fk] = fill.dataset.text;
            var box = document.getElementById('f-' + fk);
            if (box) { box.value = fill.dataset.text; box.focus(); }
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
        var a = e.target.closest('[data-act]');
        if (a) {
            if (a.tagName === 'A') e.preventDefault();
            act(a.dataset.act, a, e);
        }
    });

    document.addEventListener('pointerover', function (e) {
        var b = e.target.closest && e.target.closest('#nobtn');
        if (b && e.pointerType === 'mouse' && dodgeOn() && Date.now() - lastDodge > 250) dodge(b);
    });

    document.addEventListener('input', function (e) {
        var t = e.target;
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

    window.addEventListener('hashchange', function () { init(); });

    /* ---------- start ---------- */
    function init() {
        var inv = decode(location.hash);
        state.preview = false; state.step = 0; state.link = '';
        if (inv) { state.invite = inv; state.mode = 'invite'; state.screen = 'invite'; }
        else { state.mode = 'create'; state.screen = 'create'; }
        render();
    }
    init();
})();