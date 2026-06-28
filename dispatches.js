// Ordered most-recent first. Add new dispatches to the top of the array.
// Each entry:
//   id       — slug matched against <body data-essay-id="...">
//   number   — 1-based dispatch number (used for "no. 01" display)
//   title    — human-readable title (curly quotes ok)
//   date     — initial publication month/year ("may 2026")
//   url      — path on the site
//   image    — root-relative lead photo for preview cards
//   ogImage  — optional root-relative 1200×630 center-cropped image for link
//                  previews (defaults to /assets/og/{id}.jpg when present)
//   status   — version state. One of:
//                  'draft'       — initial post, still being shaped (shown as v0 · draft)
//                  'draft-vN'    — draft at revision N (shown as vN · draft)
//                  'patch-N'     — incremental revision N (shown as vN · revision)
//                  'final-vN'    — locked at revision N (shown as vN · final)
//                  'finalized'   — locked, no version number (shown as final · locked)
//   playlist — optional Spotify playlist while reading:
//                  archetype — 'logic' | 'psyche' | 'instinct' (picks the blob)
//                  url       — Spotify playlist link
//   audio    — optional root-relative path to the essay audio version
//                  (e.g. '/audio/the-students-are-right.mp3')
//   excerpt  — one-line standfirst for index + homepage featured card
window.formatDispatchVersion = function(status) {
    if (!status || status === 'draft') {
        return { label: 'v0 · draft', short: 'v0', slug: 'draft' };
    }
    if (status === 'finalized') {
        return { label: 'final · locked', short: 'final', slug: 'finalized' };
    }
    var finalMatch = status.match(/^final-v(\d+)$/);
    if (finalMatch) {
        var fn = finalMatch[1];
        return { label: 'v' + fn + ' · final', short: 'v' + fn, slug: 'finalized' };
    }
    var draftMatch = status.match(/^draft-v(\d+)$/);
    if (draftMatch) {
        var dn = draftMatch[1];
        return { label: 'v' + dn + ' · draft', short: 'v' + dn, slug: 'draft' };
    }
    if (status.indexOf('patch-') === 0) {
        var n = status.slice(6);
        return { label: 'v' + n + ' · revision', short: 'v' + n, slug: status };
    }
    return { label: status.replace('-', ' '), short: status, slug: status };
};

window.DISPATCHES = [
    {
        id: 'selection',
        number: 3,
        title: 'Selection',
        date: 'june 2026',
        url: '/essays/selection/',
        image: '/pexels-cottonbro-8721341.png',
        status: 'draft',
        playlist: {
            archetype: 'logic',
            url: 'https://open.spotify.com/playlist/3duYMOE5MlilW3590dBPXw?si=94176ed853a64e30'
        },
        excerpt: 'The most honest word in any hiring debrief is \u201Cbet\u201D \u2014 a wager about which arm of a K-shaped economy a person will land on, dressed up as merit.'
    },
    {
        id: 'the-students-are-right',
        number: 2,
        title: 'The Students Are Right',
        date: 'may 2026',
        url: '/essays/the-students-are-right/',
        image: '/pexels-tara-winstead-8849288.jpg',
        status: 'draft-v1',
        playlist: {
            archetype: 'psyche',
            url: 'https://open.spotify.com/playlist/3GaaEib2F7gZM9QixCJs8j?si=ca74b8c19fd247ab'
        },
        excerpt: 'This spring, graduates booed the mention of AI at their own commencements. I work in the industry being booed at \u2014 and the students are right.'
    },
    {
        id: 'americans-europeans-and-autism-oh-my',
        number: 1,
        title: 'Americans, Europeans, and Autism, Oh My!',
        date: 'november 2025',
        url: '/essays/americans-europeans-and-autism-oh-my/',
        image: '/pexels-anna-shevchuk-11507617.png',
        status: 'final-v3',
        playlist: {
            archetype: 'instinct',
            url: 'https://open.spotify.com/playlist/1qwoBlF1bzMnW8A4XTrdS7?si=5c8afa7e14d246ec'
        },
        excerpt: 'A colleague flagged my writing as AI-generated. It wasn\u2019t \u2014 I\u2019m autistic, and my directness happens to match how much of the world already talks. A case for clarity as kindness.'
    }
];
