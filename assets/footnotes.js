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

    var stackedMQ = window.matchMedia('(max-width: 880px)');
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
        var items = refs.map(function(ref) {
            var fnId = ref.dataset.fn;
            var note = document.getElementById('fn-' + fnId);
            if (!note) return null;
            var refRect = ref.getBoundingClientRect();
            var targetY = Math.max(0, Math.round(refRect.top - containerRect.top - 4));
            return { note: note, targetY: targetY };
        }).filter(Boolean);

        items.sort(function(a, b) { return a.targetY - b.targetY; });

        var lastBottom = 0;
        var gap = 16;
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
        var refRect = ref.getBoundingClientRect();
        var refMidY = ((refRect.top + refRect.bottom) / 2) - layoutRect.top;
        var refRightX = (refRect.right - layoutRect.left) + 1;

        var marker = note.querySelector('.fn-marker');
        var dotRect = (marker || note).getBoundingClientRect();
        var x2 = (dotRect.left - layoutRect.left) + 2.5;
        var y2 = (dotRect.top - layoutRect.top) + Math.min(dotRect.height / 2, 8);

        var x1 = refRightX;
        var y1 = refMidY;
        var dx = x2 - x1;
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

        var path = createSvg('path', { d: d, 'class': 'wire-path' });
        svg.appendChild(path);

        var len = path.getTotalLength();
        path.style.strokeDasharray = len;
        path.style.strokeDashoffset = len;
        path.style.transition = 'stroke-dashoffset 0.3s cubic-bezier(0.22, 1, 0.36, 1)';
        path.getBoundingClientRect();
        path.style.strokeDashoffset = 0;

        var archetype = ref.getAttribute('data-archetype');
        var endpoints = [
            { x: x1, y: y1, delay: 0, color: null },
            { x: x2, y: y2, delay: 240, color: archetypeDotFill(archetype) }
        ];
        endpoints.forEach(function(p) {
            var c = createSvg('circle', {
                cx: p.x.toFixed(1),
                cy: p.y.toFixed(1),
                r: 2.5,
                'class': 'wire-dot'
            });
            if (p.color) c.style.fill = p.color;
            c.style.opacity = 0;
            svg.appendChild(c);
            setTimeout(function() { c.classList.add('pulse'); }, p.delay);
        });
    }

    function activate(fnId) {
        if (isStacked()) return;
        if (clearTimer) { clearTimeout(clearTimer); clearTimer = null; }
        var ref = document.querySelector('.fnref[data-fn="' + fnId + '"]');
        var note = document.getElementById('fn-' + fnId);
        if (!ref || !note) return;
        refs.forEach(function(r) { r.classList.remove('linked'); });
        footnotes.forEach(function(f) { f.classList.remove('linked'); });
        ref.classList.add('linked');
        note.classList.add('linked');
        drawWire(ref, note);
    }

    function deactivate() {
        if (isStacked()) return;
        if (clearTimer) clearTimeout(clearTimer);
        clearTimer = setTimeout(function() {
            refs.forEach(function(r) { r.classList.remove('linked'); });
            footnotes.forEach(function(f) { f.classList.remove('linked'); });
            clearWires();
            clearTimer = null;
        }, 90);
    }

    function setupHover() {
        refs.concat(footnotes).forEach(function(el) {
            var fnId = el.dataset.fn;
            el.addEventListener('mouseenter', function() { activate(fnId); });
            el.addEventListener('mouseleave', deactivate);
            el.addEventListener('focusin', function() { activate(fnId); });
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
