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
        number: 2,
        title: '\u201CThe Students Are Right\u201D',
        date: 'may 2026',
        url: '/essays/the-students-are-right',
        status: 'draft',
        // One-line standfirst used on the essays index + the homepage
        // featured card. Keep it to a sentence or two.
        excerpt: 'This spring, graduates booed the mention of AI at their own commencements. I work in the industry being booed at \u2014 and the students are right.'
    },
    {
        id: 'americans-europeans-and-autism',
        number: 1,
        title: 'Americans, Europeans, and Autism, Oh My!',
        date: 'november 2025',
        url: '/essays/americans-europeans-and-autism',
        status: 'draft',
        excerpt: 'A colleague flagged my writing as AI-generated. It wasn\u2019t \u2014 I\u2019m autistic, and my directness happens to match how much of the world already talks. A case for clarity as kindness.'
    }
];
