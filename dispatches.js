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
//                  'draft'     — initial post, still being shaped (shown as v0)
//                  'patch-N'   — incremental revision N (shown as vN)
//                  'finalized' — locked, no further edits planned
//   playlist — optional Spotify playlist while reading:
//                  archetype — 'logic' | 'psyche' | 'instinct' (picks the icon)
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
    if (status.indexOf('patch-') === 0) {
        var n = status.slice(6);
        return { label: 'v' + n + ' · revision', short: 'v' + n, slug: status };
    }
    return { label: status.replace('-', ' '), short: status, slug: status };
};

window.DISPATCHES = [
    {
        id: 'the-students-are-right',
        number: 5,
        title: '\u201CThe Students Are Right\u201D',
        date: 'may 2026',
        url: '/essays/the-students-are-right/',
        image: '/pexels-tara-winstead-8849288.jpg',
        status: 'draft',
        playlist: {
            archetype: 'psyche',
            url: 'https://open.spotify.com/playlist/3GaaEib2F7gZM9QixCJs8j?si=ca74b8c19fd247ab'
        },
        excerpt: 'This spring, graduates booed the mention of AI at their own commencements. I work in the industry being booed at \u2014 and the students are right.'
    },
    {
        id: 'ship-it',
        number: 4,
        title: 'Ship It',
        date: 'december 2025',
        url: '/essays/ship-it/',
        image: '/pexels-cottonbro-4709285.png',
        status: 'patch-1',
        playlist: {
            archetype: 'logic',
            url: 'https://open.spotify.com/playlist/3duYMOE5MlilW3590dBPXw?si=94176ed853a64e30'
        },
        excerpt: 'I built an automated Slack briefing nobody asked for. Thirty percent of the company now wakes up to it \u2014 and adoption turned out to be the only honest metric.'
    },
    {
        id: 'i-cried-at-work-i-was-also-right',
        number: 3,
        title: 'I Cried at Work. I Was Also Right.',
        date: 'december 2025',
        url: '/essays/i-cried-at-work-i-was-also-right/',
        image: '/pexels-pranavsinh232-5466185.png',
        status: 'patch-1',
        playlist: {
            archetype: 'psyche',
            url: 'https://open.spotify.com/playlist/3GaaEib2F7gZM9QixCJs8j?si=ca74b8c19fd247ab'
        },
        excerpt: 'A product lead corrected me in front of the whole room over a point that wasn\u2019t even right. I cried in the bathroom \u2014 and you can, in fact, agree with a fact.'
    },
    {
        id: 'americans-europeans-and-autism-oh-my',
        number: 2,
        title: 'Americans, Europeans, and Autism, Oh My!',
        date: 'november 2025',
        url: '/essays/americans-europeans-and-autism-oh-my/',
        image: '/pexels-anna-shevchuk-11507617.png',
        status: 'patch-2',
        playlist: {
            archetype: 'logic',
            url: 'https://open.spotify.com/playlist/3duYMOE5MlilW3590dBPXw?si=94176ed853a64e30'
        },
        excerpt: 'A colleague flagged my writing as AI-generated. It wasn\u2019t \u2014 I\u2019m autistic, and my directness happens to match how much of the world already talks. A case for clarity as kindness.'
    },
    {
        id: 'you-might-be-special-but-youre-definitely-predictable',
        number: 1,
        title: 'You Might Be Special, But You\u2019re Definitely Predictable',
        date: 'november 2025',
        url: '/essays/you-might-be-special-but-youre-definitely-predictable/',
        image: '/pexels-cottonbro-6153354.png',
        status: 'draft',
        playlist: {
            archetype: 'instinct',
            url: 'https://open.spotify.com/playlist/1qwoBlF1bzMnW8A4XTrdS7?si=5c8afa7e14d246ec'
        },
        excerpt: 'I searched for a phone case and Mous haunted my YouTube feed for a week. Targeted ads aren\u2019t magic \u2014 just pattern-matching at planetary scale, and a question about what we get back.'
    }
];
