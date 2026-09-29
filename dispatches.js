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
//   playlist — optional soundtrack playlist while reading:
//                  archetype — 'logic' | 'psyche' | 'instinct' (picks the blob)
//                  url       — playlist link
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
        id: 'by-what-light',
        number: 5,
        title: 'By What Light',
        date: 'September 2026',
        published: '2026-09-29',
        updated: '2026-09-29',
        url: '/essays/by-what-light/?v=101',
        image: '/assets/photos/by-what-light-39360604.jpg',
        imageAlt: 'Blue-toned close-up of a carved stone eye on a classical sculpture.',
        ogImage: '/assets/og/by-what-light.jpg',
        status: 'draft',
        playlist: {
            archetype: 'psyche',
            url: 'https://music.apple.com/us/playlist/labyrinth/pl.u-EdAVY4WuXgko6b'
        },
        excerpt: 'Vibes are sensors, not scales.'
    },
    {
        id: 'primal-intelligence',
        number: 4,
        title: 'Primal Intelligence',
        date: 'September 2026',
        published: '2026-09-20',
        updated: '2026-09-20',
        url: '/essays/primal-intelligence/?v=101',
        image: '/assets/photos/primal-intelligence.jpg?v=1',
        imageAlt: 'An intricately carved horned mask in gold, crossed by dramatic shadows against a green wall.',
        ogImage: '/assets/og/primal-intelligence.jpg?v=1',
        status: 'final-v3',
        playlist: {
            archetype: 'logic',
            url: 'https://music.apple.com/us/playlist/thread/pl.u-06oxNK6IXMk6Zd'
        },
        excerpt: 'What if AI never develops a will of its own—and only inherits, infers, and extrapolates ours?'
    },
    {
        id: 'selection',
        number: 3,
        title: 'Selection',
        date: 'June 2026',
        published: '2026-06',
        updated: '2026-09-26',
        url: '/essays/selection/?v=101',
        image: '/assets/photos/selection-8721321.jpg',
        imageAlt: 'A woman wearing a red-lit VR headset in a blue-lit room surrounded by computer screens, keyboards, and cables.',
        ogImage: '/assets/og/selection.jpg?v=2',
        status: 'final-v1',
        playlist: {
            archetype: 'psyche',
            url: 'https://music.apple.com/us/playlist/labyrinth/pl.u-EdAVY4WuXgko6b'
        },
        excerpt: "A feeling produced between two people can become a verdict about one of them. Hiring gives that verdict consequences."
    },
    {
        id: 'the-students-are-wrong',
        number: 2,
        title: 'The Students Were Wrong',
        titleParts: { prefix: 'The Students Were', removed: 'Right', replacement: 'Wrong' },
        date: 'May 2026',
        published: '2026-05',
        updated: '2026-09-26',
        url: '/essays/the-students-are-wrong/?v=101',
        image: '/assets/photos/the-students-are-right-2119706.jpg',
        imageAlt: 'A mural of a hand drawing back a curtain to reveal colorful graffiti beside a snowy street.',
        ogImage: '/assets/og/the-students-are-right.jpg?v=2',
        status: 'final-v2',
        playlist: {
            archetype: 'logic',
            url: 'https://music.apple.com/us/playlist/thread/pl.u-06oxNK6IXMk6Zd'
        },
        excerpt: "The anger deserves an answer. Blanket rejection of AI is the wrong one."
    },
    {
        id: 'americans-europeans-and-autism-oh-my',
        number: 1,
        title: 'Americans, Europeans, and Autism, Oh My!',
        date: 'November 2025',
        published: '2025-11',
        updated: '2026-06-28',
        url: '/essays/americans-europeans-and-autism-oh-my/?v=101',
        image: '/assets/photos/americans-europeans-and-autism-oh-my-38947258.jpg',
        imageAlt: 'Fluorescent pink, blue, and green liquid layers glowing in a glass beaker under ultraviolet light.',
        ogImage: '/assets/og/americans-europeans-and-autism-oh-my.jpg?v=2',
        status: 'final-v3',
        playlist: {
            archetype: 'instinct',
            url: 'https://music.apple.com/us/playlist/hearth/pl.u-MDAWqJ9I4z17ky'
        },
        excerpt: 'A colleague flagged my writing as AI-generated. It wasn\u2019t \u2014 I\u2019m autistic, and my directness happens to match how much of the world already talks. A case for clarity as kindness.'
    }
];
