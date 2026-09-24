(function() {
    'use strict';

    function blob(arch) { return '/assets/blobs/' + ({instinct:'slash-instinct',logic:'build-logic',psyche:'nest-psyche'}[arch] || 'build-logic') + '-charm.webp'; }

    function pad2(n) { return (n < 10 ? '0' : '') + n; }

    function esc(s) {
        var d = document.createElement('div');
        d.textContent = (s == null ? '' : s);
        return d.innerHTML;
    }

    function fmtStatus(status) {
        return (window.formatDispatchVersion || function(s) { return { label: s, slug: s }; })(status);
    }

    function updatedDate(value) {
        // Parse components directly: calendar dates must not shift with timezone.
        var parts = (value || '').split('-');
        var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        if (parts.length === 2) return months[Number(parts[1]) - 1] + ' ' + parts[0];
        if (parts.length !== 3) return value || '';
        return months[Number(parts[1]) - 1] + ' ' + parts[0];
    }

    // Archive metadata follows essay publication and revision dates, never site styling changes.
    (function() {
        var count = document.querySelector('[data-essay-count]');
        var since = document.querySelector('[data-index-since]');
        var list = window.DISPATCHES || [];
        if (!count || !since || !list.length) return;
        count.textContent = list.length + (list.length === 1 ? ' ESSAY' : ' ESSAYS');
        var dates = list.map(function(d) { return d.published; }).filter(Boolean);
        dates.sort();
        var earliest = dates[0];
        if (earliest) { since.dateTime = earliest; since.textContent = updatedDate(earliest).toUpperCase(); }
    })();

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
                ? '<div class="tl-thumb"><img src="' + esc(d.image) + '" alt="' + esc(d.imageAlt || ('Lead photograph for ' + d.title)) + '" loading="lazy" decoding="async"></div>'
                : '';
            var excerpt = d.excerpt ? '<p class="tl-excerpt">' + esc(d.excerpt) + '</p>' : '';
            return '<div class="tl-entry tl-entry--' + esc(arch) + last + '">' +
                '<div class="tl-spine">' +
                    '<span class="tl-line"></span>' +
                    '<span class="tl-node"><span class="tl-node-dot"></span></span>' +
                    '<div class="tl-no"><span class="essay-id-tag">NO. ' + pad2(num) + '</span></div>' +
                    '<div class="tl-date" aria-label="Publication history"><time class="tl-published" datetime="' + esc(d.published || '') + '" aria-label="Published ' + esc(d.date) + '">' + esc(d.date) + '</time>' + '</div>' +
                '</div>' +
                '<a class="tl-card" href="' + esc(d.url) + '" aria-label="Read ' + esc(d.title) + '">' +
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

    // ---------- Dispatch number + status + title color ----------
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
            numEl.textContent = 'Essay ' + pad2(entry.number);
        }

        var badgeEl = document.querySelector('[data-frame-status]');
        var badgeTx = document.querySelector('[data-frame-status-text]');
        if (badgeEl && entry.status) {
            var ver = fmtStatus(entry.status);
            if (badgeTx) badgeTx.textContent = ver.label;
            badgeEl.setAttribute('data-status', ver.slug || entry.status);
            badgeEl.hidden = false;
        }

        document.body.dataset.archetype = (entry.playlist && entry.playlist.archetype) || 'logic';
    })();

    // ---------- Essay contents ----------
    // Only essays with authored parts receive navigation. Reading times are
    // calculated per part at a calm long-form pace of roughly 225 words/min.
    (function() {
        var body = document.querySelector('.essay-body');
        var figure = document.querySelector('.essay-figure');
        if (!body || !figure) return;

        var parts = Array.prototype.slice.call(body.querySelectorAll('.essay-part'));
        if (!parts.length) return;

        var numberedPart = 0;
        var links = parts.map(function(part, index) {
            var numeral = part.querySelector('.essay-part-num');
            var title = part.querySelector('.essay-part-title');
            if (numeral) numberedPart += 1;
            part.id = part.id || (numeral ? 'essay-part-' + numberedPart : 'essay-introduction');
            var words = 0;
            var node = part.nextElementSibling;
            while (node && !node.classList.contains('essay-part')) {
                words += (node.textContent.trim().match(/\S+/g) || []).length;
                node = node.nextElementSibling;
            }
            return {
                href: '#' + part.id,
                numeral: numeral ? numeral.textContent.trim() : '',
                title: title ? title.textContent.trim().replace(/^Face Dancer$/, 'Face Dancers') : 'Part ' + (index + 1),
                minutes: Math.max(1, Math.ceil(words / 225))
            };
        });

        var nav = document.createElement('nav');
        nav.className = 'essay-jump';
        nav.setAttribute('aria-label', 'Essay contents');
        nav.innerHTML = '<h2 class="contents-heading">table of contents</h2><div class="essay-jump-track">' + links.filter(function(link) { return Boolean(link.numeral); }).map(function(link) {
            var time = '<span class="essay-jump-time" aria-label="approximately ' + link.minutes + ' minutes">~' + link.minutes + ' min</span>';
            var title = '<span class="essay-jump-title">' + esc(link.title) + '</span>';
            return link.numeral
                ? '<a class="essay-jump-row" href="' + esc(link.href) + '"><span class="essay-jump-numeral">' + esc(link.numeral) + '</span>' + title + time + '</a>'
                : '<span class="essay-jump-row essay-jump-intro">' + title + time + '</span>';
        }).join('') + '</div>';
        ['tl','tr','bl','br'].forEach(function(corner) {
            var mark = document.createElement('span');
            mark.className = 'contents-corner contents-corner-' + corner;
            mark.setAttribute('aria-hidden', 'true');
            nav.appendChild(mark);
        });
        var notes = document.querySelector('.essay-notes');
        var layout = document.querySelector('.essay-layout');
        var stacked = window.matchMedia('(max-width: 1024px)');
        function placeContents() {
            if (notes && layout && !stacked.matches) notes.prepend(nav);
            else if (layout) layout.before(nav);
            else figure.insertAdjacentElement('afterend', nav);
        }
        placeContents();
        if (stacked.addEventListener) stacked.addEventListener('change', placeContents);
        else stacked.addListener(placeContents);

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
        renderSlot(prevSlot, older, '<span class="arr" aria-hidden="true">&larr;</span> older');
        renderSlot(nextSlot, newer, 'newer <span class="arr" aria-hidden="true">&rarr;</span>');
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
        if (dateEl && (d.published || d.date)) dateEl.innerHTML = '<span class="publication-label">Published</span> <time datetime="' + esc(d.published || '') + '">' + esc(d.published ? updatedDate(d.published) : d.date) + '</time>';
        var titleEl = card.querySelector('.featured-title');
        if (titleEl && d.title) titleEl.textContent = d.title;
        var exEl = card.querySelector('.featured-excerpt');
        if (exEl && d.excerpt) exEl.textContent = d.excerpt;
        var imgEl = card.querySelector('#featured-img');
        if (imgEl && d.image) {
            imgEl.setAttribute('src', d.image);
            if (d.title) imgEl.setAttribute('alt', d.imageAlt || ('Lead photograph for ' + d.title));
            imgEl.removeAttribute('loading');
            imgEl.setAttribute('fetchpriority', 'high');
        }
        var dotEl = document.getElementById('featured-dot');
        var arch = (d.playlist && d.playlist.archetype) || 'logic';
        var featured = card.closest('.featured');
        if (featured) featured.dataset.archetype = arch;
        if (dotEl) {
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

/* Measure the title after fonts load so even long names stay on one line. */
(function () {
 var head = document.querySelector('body[data-essay-id] .essay-head');
 if (!head) return;
 var title = head.querySelector('.essay-title');
 function fitTitle() {
  title.style.fontSize = '';
  head.style.removeProperty('--title-measure');
  var base = parseFloat(getComputedStyle(title).fontSize);
  var range = document.createRange();
  range.selectNodeContents(title);
  var natural = range.getBoundingClientRect().width;
  head.style.width = Math.min(900, Math.max(520, natural + 284)) + 'px';
  var available = title.clientWidth;
  if (natural > available) title.style.fontSize = (base * available / natural) + 'px';
  head.style.setProperty('--title-measure', Math.min(natural, available) + 'px');
 }
 fitTitle();
 if (document.fonts) document.fonts.ready.then(fitTitle);
 window.addEventListener('resize', fitTitle);
})();
