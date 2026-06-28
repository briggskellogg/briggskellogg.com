(function() {
    'use strict';

    var BLOB_FILES = {
        logic: '/assets/blobs/build-logic-blob.webp',
        psyche: '/assets/blobs/nest-psyche-blob.webp',
        instinct: '/assets/blobs/slash-instinct-blob.webp'
    };
    var BLOB_KINDS = { logic: 'build', psyche: 'nest', instinct: 'slash' };

    function pad2(n) { return (n < 10 ? '0' : '') + n; }

    function esc(s) {
        var d = document.createElement('div');
        d.textContent = (s == null ? '' : s);
        return d.innerHTML;
    }

    function fmtStatus(status) {
        return (window.formatDispatchVersion || function(s) { return { label: s, slug: s }; })(status);
    }

    // ---------- Essays index (card list) ----------
    (function() {
        var list = (window.DISPATCHES || []).slice();
        var mount = document.getElementById('essay-index');
        if (!mount || !list.length) return;
        // Keep statically rendered cards for crawlers and stable layout.
        if (mount.children.length) return;

        mount.innerHTML = list.map(function(d, i) {
            var num = (typeof d.number === 'number') ? d.number : (list.length - i);
            var ver = fmtStatus(d.status || 'draft');
            var arch = (d.playlist && d.playlist.archetype) || 'logic';
            var last = (i === list.length - 1) ? ' tl-entry--last' : '';
            var thumb = d.image
                ? '<div class="tl-thumb"><img src="' + esc(d.image) + '" alt="Lead photograph for ' + esc(d.title) + '" loading="lazy" decoding="async"></div>'
                : '';
            var excerpt = d.excerpt ? '<p class="tl-excerpt">' + esc(d.excerpt) + '</p>' : '';
            return '<div class="tl-entry tl-entry--' + esc(arch) + last + '">' +
                '<div class="tl-spine">' +
                    '<span class="tl-line"></span>' +
                    '<span class="tl-node"><span class="tl-node-dot"></span></span>' +
                    '<div class="tl-no">no. ' + pad2(num) + '</div>' +
                    '<div class="tl-date">' + esc(d.date) + '</div>' +
                '</div>' +
                '<a class="tl-card" href="' + esc(d.url) + '">' +
                    '<div class="tl-card-inner">' +
                        '<span class="pc pc-tl"></span><span class="pc pc-tr"></span><span class="pc pc-bl"></span><span class="pc pc-br"></span>' +
                        thumb +
                        '<div class="tl-card-body">' +
                            '<h2 class="tl-title">' + esc(d.title) + '</h2>' +
                            excerpt +
                            '<div class="tl-foot">' +
                                '<span class="tl-read">read the essay <span class="arr">&rarr;</span></span>' +
                                '<span class="tl-status" data-status="' + esc(ver.slug || d.status) + '">' + esc(ver.label) + '</span>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</a>' +
            '</div>';
        }).join('');
    })();

    // ---------- Dispatch number + status + playlist blob ----------
    (function() {
        var list = (window.DISPATCHES || []);
        var id = document.body.dataset.essayId;
        if (!id) return;
        var entry = null;
        for (var i = 0; i < list.length; i++) {
            if (list[i].id === id) { entry = list[i]; break; }
        }
        if (!entry) return;

        var numEl = document.querySelector('.essay-number .num');
        if (numEl && typeof entry.number === 'number') {
            numEl.textContent = 'no. ' + pad2(entry.number);
        }

        var badgeEl = document.querySelector('[data-frame-status]');
        var badgeTx = document.querySelector('[data-frame-status-text]');
        if (badgeEl && entry.status) {
            var ver = fmtStatus(entry.status);
            if (badgeTx) badgeTx.textContent = ver.label;
            badgeEl.setAttribute('data-status', ver.slug || entry.status);
            badgeEl.hidden = false;
        }

        var blobLink = document.getElementById('essay-playlist-blob');
        var blobImg = document.getElementById('essay-playlist-blob-img');
        if (blobLink && entry.playlist && entry.playlist.url) {
            var arch = entry.playlist.archetype || 'logic';
            var kind = BLOB_KINDS[arch] || 'build';
            blobLink.href = entry.playlist.url;
            if (blobImg) {
                blobImg.src = BLOB_FILES[arch] || BLOB_FILES.logic;
                blobImg.alt = kind + ' playlist';
            }
            blobLink.setAttribute('aria-label', kind + ' playlist');
            blobLink.setAttribute('title', kind + ' playlist');
            blobLink.hidden = false;
        }
    })();

    // ---------- Essay nav (prev/next dispatches) ----------
    (function() {
        var list = (window.DISPATCHES || []).slice();
        var nav = document.getElementById('essay-nav');
        if (!nav) return;
        function collapse() { nav.classList.add('is-empty'); }
        if (!list.length) { collapse(); return; }
        var id = document.body.dataset.essayId;
        var idx = -1;
        for (var i = 0; i < list.length; i++) {
            if (list[i].id === id) { idx = i; break; }
        }
        if (idx < 0) { collapse(); return; }

        var older = list[idx + 1] || null;
        var newer = list[idx - 1] || null;
        var prevSlot = nav.querySelector('.essay-nav-prev');
        var nextSlot = nav.querySelector('.essay-nav-next');

        function renderSlot(slot, dispatch, labelText) {
            if (dispatch && slot) {
                var a = document.createElement('a');
                a.className = slot.className.replace('essay-nav-empty', '');
                a.href = dispatch.url;
                a.innerHTML = '<span class="essay-nav-label">' + labelText + '</span>' +
                              '<span class="essay-nav-title">' + dispatch.title + '</span>';
                slot.parentNode.replaceChild(a, slot);
            }
        }
        renderSlot(prevSlot, older, '&larr; older');
        renderSlot(nextSlot, newer, 'newer &rarr;');
        if (!nav.querySelector('a')) collapse();
    })();

    // ---------- Featured essay (homepage) ----------
    (function() {
        var list = (window.DISPATCHES || []);
        if (!list.length) return;
        var d = list[0];
        var card = document.getElementById('featured-card');
        if (!card) return;

        if (d.url) card.setAttribute('href', d.url);
        var noEl = card.querySelector('.featured-no');
        if (noEl && typeof d.number === 'number') noEl.textContent = 'no. ' + pad2(d.number);
        var dateEl = card.querySelector('.featured-date');
        if (dateEl && d.date) dateEl.textContent = d.date;
        var titleEl = card.querySelector('.featured-title');
        if (titleEl && d.title) titleEl.textContent = d.title;
        var exEl = card.querySelector('.featured-excerpt');
        if (exEl && d.excerpt) exEl.textContent = d.excerpt;
        var imgEl = card.querySelector('#featured-img');
        if (imgEl && d.image) {
            imgEl.setAttribute('src', d.image);
            if (d.title) imgEl.setAttribute('alt', 'Lead photograph for ' + d.title);
            imgEl.removeAttribute('loading');
            imgEl.setAttribute('fetchpriority', 'high');
        }
        var dotEl = document.getElementById('featured-dot');
        if (dotEl) {
            var arch = (d.playlist && d.playlist.archetype) || 'logic';
            dotEl.className = 'featured-dot featured-dot--' + arch;
        }
        if (d.status) {
            var statusEl = document.getElementById('featured-status');
            if (statusEl) {
                var ver = fmtStatus(d.status);
                statusEl.setAttribute('data-status', ver.slug || d.status);
                var statusTx = statusEl.querySelector('.featured-status-text');
                if (statusTx) statusTx.textContent = ver.label;
            }
        }
        if (window.updateHomeLink) requestAnimationFrame(window.updateHomeLink);
        if (window.preventArchetypeOverlap) requestAnimationFrame(window.preventArchetypeOverlap);
    })();
})();
