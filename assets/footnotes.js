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
        var contents = notes.querySelector('.essay-jump');
        if (contents) lastBottom = Math.max(lastBottom, contents.offsetTop + contents.offsetHeight);
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
        var refMidY = ((refRect.top + refRect.bottom) / 2) - layoutRect.top;
        var refRightX = (refRect.right - layoutRect.left) + 10;

        var marker = note.querySelector('.fn-marker .note-symbol');
        var dotRect = (marker || note).getBoundingClientRect();
        var x2 = (dotRect.left - layoutRect.left) - 8;
        var y2 = (dotRect.top - layoutRect.top) + dotRect.height / 2;

        // The original connector was one continuous cubic curve from the
        // body marker to the centre of the matching note marker.
        var x1 = refRightX;
        var y1 = refMidY;
        var dx = x2 - x1;
        if (dx < 6) return;
        var handle = Math.max(24, Math.min(dx * 0.5, 90));
        var c1x = x1 + handle;
        var c2x = x2 - handle;
        if (c2x < c1x) {
            var mid = x1 + dx * 0.5;
            c1x = mid;
            c2x = mid;
        }
        var d = 'M ' + x1.toFixed(1) + ' ' + y1.toFixed(1) +
                ' C ' + c1x.toFixed(1) + ' ' + y1.toFixed(1) +
                ' ' + c2x.toFixed(1) + ' ' + y2.toFixed(1) +
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

        // Keep the curve itself stationary. Animating a one-pixel dash along
        // a cubic path forces repeated subpixel rasterization and can make the
        // connector appear to shimmer on high-density displays.
        path.style.opacity = 0;
        path.style.transition = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'none' : 'opacity 0.14s ease-out';
        path.getBoundingClientRect();
        path.style.opacity = 1;

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
        var contents = document.querySelector('.essay-jump');
        if (contents) ro.observe(contents);
    }
})();
