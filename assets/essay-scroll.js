(function() {
    'use strict';

    if (!document.body.hasAttribute('data-essay-id')) return;

    var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    var root = document.documentElement;
    var active = null;
    var frame = 0;

    function stop() {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        active = null;
        root.removeAttribute('data-essay-scrolling');
    }

    function destination(target) {
        var margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 28;
        var max = Math.max(0, document.scrollingElement.scrollHeight - window.innerHeight);
        return Math.max(0, Math.min(max, window.scrollY + target.getBoundingClientRect().top - margin));
    }

    function focusTarget(target) {
        // Move keyboard/screen-reader reading position without a second scroll.
        var temporary = !target.hasAttribute('tabindex');
        if (temporary) target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
        if (temporary) target.addEventListener('blur', function() {
            target.removeAttribute('tabindex');
        }, { once: true });
    }

    function moveTo(target) {
        stop();
        var from = window.scrollY;
        var to = destination(target);
        var distance = to - from;
        var x = window.scrollX;

        if (motion.matches || Math.abs(distance) < 2) {
            window.scrollTo({ left: x, top: to, behavior: 'instant' });
            focusTarget(target);
            return;
        }

        // One controller owns the scroll. Native smooth scrolling and scroll
        // anchoring must not keep correcting each animation frame underneath it.
        root.setAttribute('data-essay-scrolling', '');
        var run = active = {
            start: performance.now(),
            duration: Math.min(1500, 500 + Math.sqrt(Math.abs(distance)) * 14)
        };

        function tick(now) {
            if (active !== run) return;
            var t = Math.min(1, (now - run.start) / run.duration);
            // Smoothstep has zero velocity and acceleration at both ends:
            // a gentle departure and landing, without bounce or overshoot.
            var eased = t * t * t * (t * (t * 6 - 15) + 10);
            window.scrollTo({ left: x, top: from + distance * eased, behavior: 'instant' });
            if (t < 1) frame = requestAnimationFrame(tick);
            else {
                stop();
                focusTarget(target);
            }
        }
        frame = requestAnimationFrame(tick);
    }

    document.addEventListener('click', function(event) {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        var link = event.target.closest('.essay-jump a[href]');
        if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
        var url = new URL(link.href, window.location.href);
        if (url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search || !url.hash) return;
        var id;
        try { id = decodeURIComponent(url.hash.slice(1)); }
        catch (_) { return; }
        var target = document.getElementById(id);
        if (!target) return;

        event.preventDefault();
        // pushState preserves deep links and Back navigation
        // without triggering the browser's instant anchor jump first.
        if (window.location.hash !== url.hash) history.pushState(null, '', url.hash);
        moveTo(target);
    });

    // A reader's own gesture wins immediately; another link starts from the
    // current position instead of leaving two animations fighting each other.
    window.addEventListener('wheel', stop, { passive: true });
    window.addEventListener('touchstart', stop, { passive: true });
    window.addEventListener('pointerdown', stop, { passive: true });
    window.addEventListener('resize', stop);
    window.addEventListener('popstate', stop);
    window.addEventListener('hashchange', stop);
    window.addEventListener('pagehide', stop);
    document.addEventListener('keydown', function(event) {
        if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Escape', 'Tab'].indexOf(event.key) !== -1) stop();
    });
    if (motion.addEventListener) motion.addEventListener('change', stop);
})();
