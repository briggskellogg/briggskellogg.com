// Ordered most-recent first. Add new dispatches to the top of the array.
// Each entry:
//   id      — slug matched against <body data-essay-id="...">
//   number  — 1-based dispatch number (used for "no. 01" display)
//   title   — human-readable title (curly quotes ok)
//   date    — initial publication month/year ("may 2026")
//   url     — path on the site
//   status  — version state. One of:
//               'draft'     — initial post, still being shaped
//               'patch-N'   — incremental revision N (e.g. 'patch-1', 'patch-2')
//               'finalized' — locked, no further edits planned
//             The essay page reads this and shows it inline next to the
//             dispatch number; the landing dispatch card surfaces it too.
window.DISPATCHES = [
    {
        id: 'the-students-are-right',
        number: 5,
        title: '\u201CThe Students Are Right\u201D',
        date: 'may 2026',
        url: '/essays/the-students-are-right',
        status: 'draft',
        // One-line standfirst used on the essays index + the homepage
        // featured card. Keep it to a sentence or two.
        excerpt: 'This spring, graduates booed the mention of AI at their own commencements. I work in the industry being booed at \u2014 and the students are right.'
    },
    {
        id: 'ship-it',
        number: 4,
        title: 'Ship It',
        date: 'december 2025',
        url: '/essays/ship-it/',
        status: 'draft',
        excerpt: 'I built an automated Slack briefing nobody asked for. Thirty percent of the company now wakes up to it \u2014 and adoption turned out to be the only honest metric.'
    },
    {
        id: 'i-cried-at-work-i-was-also-right',
        number: 3,
        title: 'I Cried at Work. I Was Also Right.',
        date: 'december 2025',
        url: '/essays/i-cried-at-work-i-was-also-right/',
        status: 'draft',
        excerpt: 'A product lead corrected me in front of the whole room over a point that wasn\u2019t even right. I cried in the bathroom \u2014 and you can, in fact, agree with a fact.'
    },
    {
        id: 'americans-europeans-and-autism-oh-my',
        number: 2,
        title: 'Americans, Europeans, and Autism, Oh My!',
        date: 'november 2025',
        url: '/essays/americans-europeans-and-autism-oh-my/',
        status: 'draft',
        excerpt: 'A colleague flagged my writing as AI-generated. It wasn\u2019t \u2014 I\u2019m autistic, and my directness happens to match how much of the world already talks. A case for clarity as kindness.'
    },
    {
        id: 'you-might-be-special-but-youre-definitely-predictable',
        number: 1,
        title: 'You Might Be Special, But You\u2019re Definitely Predictable',
        date: 'november 2025',
        url: '/essays/you-might-be-special-but-youre-definitely-predictable/',
        status: 'draft',
        excerpt: 'I searched for a phone case and Mous haunted my YouTube feed for a week. Targeted ads aren\u2019t magic \u2014 just pattern-matching at planetary scale, and a question about what we get back.'
    }
];
