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
        number: 1,
        title: '\u201CThe Students Are Right\u201D',
        date: 'may 2026',
        url: 'essays.html',
        status: 'draft'
    }
];
