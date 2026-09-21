(function () {
    'use strict';
    var mount = document.querySelector('.archive-journey #essay-index');
    if (!mount) return;

    // An explicitly labeled, local-only density study uses existing essays.
    // It never invents titles, dates, or published entries.
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
        if (new URLSearchParams(location.search).get('sample') === '24') {
            var originals = Array.from(mount.children);
            for (var i = originals.length; i < 24; i++) {
                mount.appendChild(originals[i % originals.length].cloneNode(true));
            }
            var note = document.createElement('p');
            note.className = 'journey-sample-note';
            note.textContent = 'Density study · 24 cards. The four published essays repeat here solely to preview a larger archive.';
            mount.closest('.frame').before(note);
        }
    }

    var entries = Array.from(mount.querySelectorAll('.tl-entry'));
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'journey-thread');
    svg.setAttribute('aria-hidden', 'true');
    mount.appendChild(svg);
    var paths = entries.slice(1).map(function () {
        var path = document.createElementNS(svg.namespaceURI, 'path');
        svg.appendChild(path);
        return path;
    });

    function draw() {
        var origin = mount.getBoundingClientRect();
        svg.setAttribute('viewBox', '0 0 ' + origin.width + ' ' + origin.height);
        var points = entries.map(function (entry) {
            var node = entry.querySelector('.tl-node').getBoundingClientRect();
            return { x: node.left + node.width / 2 - origin.left, y: node.top + node.height / 2 - origin.top };
        });
        paths.forEach(function (path, index) {
            var from = points[index];
            var to = points[index + 1];
            if (Math.abs(from.x - to.x) < 0.5) {
                path.setAttribute('d', 'M ' + from.x + ' ' + (from.y + 9) + ' L ' + to.x + ' ' + (to.y - 9));
                return;
            }
            // Measure the unanimated entry so reveals cannot move the curve.
            var bottom = entries[index].getBoundingClientRect().bottom - origin.top;
            var bridge = (bottom + to.y) / 2;
            path.setAttribute('d', 'M ' + from.x + ' ' + (from.y + 9) +
                ' L ' + from.x + ' ' + (bridge - 18) +
                ' C ' + from.x + ' ' + (bridge + 18) + ' ' + to.x + ' ' + (bridge - 18) + ' ' + to.x + ' ' + (bridge + 18) +
                ' L ' + to.x + ' ' + (to.y - 9));
        });
    }
    var scheduled = false;
    function scheduleDraw() {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(function () { scheduled = false; draw(); });
    }
    draw();
    window.addEventListener('resize', scheduleDraw, { passive: true });
    if ('ResizeObserver' in window) new ResizeObserver(scheduleDraw).observe(mount);
    if (document.fonts) document.fonts.ready.then(scheduleDraw);

    // Content is visible without JS. Reveal only cards initially off screen,
    // once, and make keyboard access or reduced-motion preference immediate.
    var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!('IntersectionObserver' in window) || motion.matches) return;
    var observer = new IntersectionObserver(function (changes) {
        changes.forEach(function (change) {
            if (!change.isIntersecting) return;
            change.target.classList.remove('journey-entry-pending');
            change.target.classList.add('journey-entry-revealed');
            observer.unobserve(change.target);
        });
    }, { rootMargin: '0px 0px -24px 0px', threshold: 0.04 });
    entries.forEach(function (entry) {
        if (entry.getBoundingClientRect().top >= window.innerHeight) {
            entry.classList.add('journey-entry-pending');
            observer.observe(entry);
        }
        entry.addEventListener('focusin', function () {
            observer.unobserve(entry);
            entry.classList.remove('journey-entry-pending', 'journey-entry-revealed');
        });
        entry.addEventListener('animationend', function (event) {
            if (event.animationName === 'journey-arrive') entry.classList.remove('journey-entry-revealed');
        });
    });
    motion.addEventListener('change', function (event) {
        if (!event.matches) return;
        observer.disconnect();
        entries.forEach(function (entry) { entry.classList.remove('journey-entry-pending', 'journey-entry-revealed'); });
    });
}());
