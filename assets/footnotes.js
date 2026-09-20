(function() {
    'use strict';

    var layout = document.querySelector('.essay-layout');
    var notes = document.querySelector('.essay-notes');
    var svg = document.querySelector('.essay-wires');
    if (!layout || !notes || !svg) return;

    var SVG_NS = 'http://www.w3.org/2000/svg';
    var refs = Array.prototype.slice.call(document.querySelectorAll('.fnref'));
    var footnotes = Array.prototype.slice.call(document.querySelectorAll('.footnote'));
    if (!refs.length || !footnotes.length) return;

    var stackedMQ = window.matchMedia('(max-width: 1024px)');
    var clearTimer = null;
    var relayoutTimer = null;

    function isStacked() {
        return stackedMQ.matches;
    }

    function sizeSvg() {
        var w = layout.clientWidth;
        var h = layout.clientHeight;
        svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
        svg.setAttribute('width', w);
        svg.setAttribute('height', h);
    }

    function layoutFootnotes() {
        if (isStacked()) {
            notes.style.minHeight = '';
            footnotes.forEach(function(f) { f.style.top = ''; });
            sizeSvg();
            return;
        }
        var containerRect = notes.getBoundingClientRect();
        var placed = new Set();
        var items = refs.map(function(ref) {
            var fnId = ref.dataset.fn;
            if (placed.has(fnId)) return null;
            placed.add(fnId);
            var note = document.getElementById('fn-' + fnId);
            if (!note) return null;
            var refRect = ref.getBoundingClientRect();
            var targetY = Math.max(0, Math.round(refRect.top - containerRect.top - 4));
            return { note: note, targetY: targetY };
        }).filter(Boolean);

        items.sort(function(a, b) { return a.targetY - b.targetY; });

        var key = notes.querySelector('.note-key');
        var lastBottom = key ? key.offsetHeight + 20 : 0;
        var gap = 32;
        items.forEach(function(item) {
            var y = Math.max(item.targetY, lastBottom + gap);
            item.note.style.top = y + 'px';
            lastBottom = y + item.note.offsetHeight;
        });
        notes.style.minHeight = lastBottom + 'px';
        sizeSvg();
    }

    function clearWires() {
        while (svg.firstChild) svg.removeChild(svg.firstChild);
    }

    function createSvg(tag, attrs) {
        var el = document.createElementNS(SVG_NS, tag);
        Object.keys(attrs).forEach(function(k) { el.setAttribute(k, attrs[k]); });
        return el;
    }

    function archetypeDotFill(archetype) {
        var vars = getComputedStyle(document.documentElement);
        if (archetype === 'logic') return vars.getPropertyValue('--logic').trim();
        if (archetype === 'instinct') return vars.getPropertyValue('--instinct').trim();
        if (archetype === 'psyche') return vars.getPropertyValue('--psyche').trim();
        return null;
    }

    function drawWire(ref, note) {
        sizeSvg();
        clearWires();
        if (isStacked()) return;

        var layoutRect = layout.getBoundingClientRect();
        var refRect = ref.querySelector('.note-symbol').getBoundingClientRect();

        var marker = note.querySelector('.fn-marker .note-symbol');
        var dotRect = (marker || note).getBoundingClientRect();
        var x2 = (dotRect.left - layoutRect.left) - 8;
        var y2 = (dotRect.top - layoutRect.top) + dotRect.height / 2;

        // Travel in the interline space, then curve through the gutter.
        // Starting at a symbol's midpoint can cross the following capital letter.
        var bodyRect = layout.querySelector('.essay-body').getBoundingClientRect();
        var paragraph = ref.closest('p, li, blockquote, h2, h3') || ref.parentElement;
        var range = document.createRange();
        range.selectNodeContents(paragraph);
        var lineTop = null;
        Array.prototype.forEach.call(range.getClientRects(), function(rect) {
            if (rect.height > refRect.height && rect.top <= refRect.bottom && rect.bottom >= refRect.top) {
                if (lineTop === null || rect.top < lineTop) lineTop = rect.top;
            }
        });
        var laneY = (lineTop === null ? refRect.top - 2 : lineTop - 4) - layoutRect.top;
        var x1 = refRect.right - layoutRect.left + 4;
        var y1 = ((refRect.top + refRect.bottom) / 2) - layoutRect.top;
        var dx = x2 - x1;
        if (dx < 6) return;
        var gutterX = Math.min(x2 - 8, Math.max(x1 + 26, bodyRect.right - layoutRect.left + 6));
        var entryX = Math.min(gutterX, x1 + 22);
        var horizontalHandle = Math.max(10, (gutterX - entryX) * 0.45);
        var gutterHandle = Math.max(6, Math.min((x2 - gutterX) * 0.5, 18));
        var d = 'M ' + x1.toFixed(1) + ' ' + y1.toFixed(1) +
                ' C ' + (x1 + 8).toFixed(1) + ' ' + y1.toFixed(1) +
                ' ' + (x1 + 8).toFixed(1) + ' ' + laneY.toFixed(1) +
                ' ' + entryX.toFixed(1) + ' ' + laneY.toFixed(1) +
                ' C ' + (entryX + horizontalHandle).toFixed(1) + ' ' + laneY.toFixed(1) +
                ' ' + (gutterX - horizontalHandle).toFixed(1) + ' ' + laneY.toFixed(1) +
                ' ' + gutterX.toFixed(1) + ' ' + laneY.toFixed(1) +
                ' C ' + (gutterX + gutterHandle).toFixed(1) + ' ' + laneY.toFixed(1) +
                ' ' + (x2 - gutterHandle).toFixed(1) + ' ' + y2.toFixed(1) +
                ' ' + x2.toFixed(1) + ' ' + y2.toFixed(1);

        var defs = createSvg('defs', {});
        var gradient = createSvg('linearGradient', {
            id: 'note-wire-fade', gradientUnits: 'userSpaceOnUse',
            x1: x1, y1: y1, x2: x2, y2: y2
        });
        [[0, 0.25], [Math.min(0.18, 8 / dx), 1], [Math.max(0.82, 1 - 8 / dx), 1], [1, 0.25]].forEach(function(stop) {
            gradient.appendChild(createSvg('stop', {
                offset: stop[0], 'stop-color': 'currentColor', 'stop-opacity': stop[1]
            }));
        });
        defs.appendChild(gradient);
        svg.appendChild(defs);
        var path = createSvg('path', { d: d, 'class': 'wire-path' });
        path.style.stroke = 'url(#note-wire-fade)';
        svg.appendChild(path);

        var len = path.getTotalLength();
        path.style.strokeDasharray = len;
        path.style.strokeDashoffset = len;
        path.style.transition = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'none' : 'stroke-dashoffset 0.3s ease';
        path.getBoundingClientRect();
        path.style.strokeDashoffset = 0;

    }

    var activeRefs = Object.create(null);

    function activate(fnId, origin) {
        if (clearTimer) { clearTimeout(clearTimer); clearTimer = null; }
        var ref = (origin && origin.classList.contains('fnref') ? origin : activeRefs[fnId]) || document.querySelector('.fnref[data-fn="' + fnId + '"]');
        var note = document.getElementById('fn-' + fnId);
        if (!ref || !note) return;
        refs.forEach(function(r) { r.classList.remove('linked'); });
        footnotes.forEach(function(f) { f.classList.remove('linked'); });
        ref.classList.add('linked');
        note.classList.add('linked');
        drawWire(ref, note);
    }

    function deactivate() {
        if (clearTimer) clearTimeout(clearTimer);
        clearTimer = setTimeout(function() {
            refs.forEach(function(r) { r.classList.remove('linked'); });
            footnotes.forEach(function(f) { f.classList.remove('linked'); });
            clearWires();
            clearTimer = null;
        }, 90);
    }

    function setupHover() {
        refs.forEach(function(ref) {
            ref.addEventListener('click', function() {
                activeRefs[ref.dataset.fn] = ref;
                var note = document.getElementById('fn-' + ref.dataset.fn);
                if (note) note.querySelectorAll('.fn-marker, .fn-back').forEach(function(back) {
                    back.setAttribute('href', '#' + ref.id);
                });
            });
        });
        refs.concat(footnotes).forEach(function(el) {
            var fnId = el.dataset.fn;
            el.addEventListener('mouseenter', function() { activate(fnId, el); });
            el.addEventListener('mouseleave', deactivate);
            el.addEventListener('focusin', function() { activate(fnId, el); });
            el.addEventListener('focusout', deactivate);
        });
    }

    function scheduleRelayout() {
        if (relayoutTimer) clearTimeout(relayoutTimer);
        relayoutTimer = setTimeout(function() {
            relayoutTimer = null;
            layoutFootnotes();
            clearWires();
        }, 50);
    }

    function onResize() {
        scheduleRelayout();
    }

    function init() {
        layoutFootnotes();
        clearWires();
        setupHover();
        window.addEventListener('resize', onResize);
        if (stackedMQ.addEventListener) {
            stackedMQ.addEventListener('change', onResize);
        } else if (stackedMQ.addListener) {
            stackedMQ.addListener(onResize);
        }
    }

    if (document.readyState === 'complete') {
        init();
    } else {
        window.addEventListener('load', init);
    }

    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(scheduleRelayout);
    }

    document.querySelectorAll('.essay-figure img').forEach(function(img) {
        if (img.complete) return;
        img.addEventListener('load', scheduleRelayout, { once: true });
        if (img.decode) img.decode().then(scheduleRelayout).catch(function() {});
    });

    if (window.ResizeObserver) {
        var ro = new ResizeObserver(scheduleRelayout);
        ro.observe(layout);
        var body = document.querySelector('.essay-body');
        if (body) ro.observe(body);
    }
})();
