(function() {
    'use strict';

    // ---------- Quotes carousel ----------
    (function() {
        var carousel = document.querySelector('.quotes-carousel');
        var slides = document.querySelectorAll('.quote-slide');
        var dots = document.querySelectorAll('.quote-dot');
        var nameEl = document.querySelector('.attribution-name');
        var clock = document.querySelector('.quote-progress');
        var nav = document.querySelector('.quote-nav');
        if (!carousel || !slides.length || !dots.length || !nameEl || !clock) return;

        var arc = clock.querySelector('.quote-progress-fill');
        var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        var current = Math.floor(Math.random() * slides.length);
        var duration = 0;
        var elapsed = 0;
        var lastTime = null;
        var typeTimer = null;
        var frame = null;
        var paused = reducedMotion.matches;
        var hovering = false;
        var selecting = false;
        var focused = false;
        var inView = true;

        function updateHeight() {
            carousel.style.height = slides[current].scrollHeight + 'px';
            if (window.updateHomeLink) requestAnimationFrame(window.updateHomeLink);
            if (window.preventArchetypeOverlap) requestAnimationFrame(window.preventArchetypeOverlap);
        }

        function readingTime(slide) {
            var words = slide.querySelector('.quote').textContent.trim().split(/\s+/).length;
            // 150 words/minute, plus time to settle and consider the quotation.
            return Math.max(14000, 5000 + words * 400);
        }

        function isPaused() {
            return paused || hovering || selecting || focused || document.hidden || !inView;
        }

        function paint() {
            var progress = Math.min(1, elapsed / duration);
            arc.style.transform = 'scaleX(' + progress + ')';
            clock.setAttribute('aria-label', paused ? 'Resume automatic quotes' : 'Pause automatic quotes');
            clock.setAttribute('aria-pressed', String(paused));
            clock.title = paused ? 'Resume automatic quotes' : 'Pause automatic quotes';
        }

        function tick(now) {
            frame = null;
            if (!isPaused()) {
                if (lastTime !== null) elapsed += now - lastTime;
                if (elapsed >= duration) show(current + 1, true);
                lastTime = now;
            } else lastTime = null;
            paint();
            if (!isPaused()) frame = requestAnimationFrame(tick);
        }

        function syncPlayback() {
            lastTime = null;
            if (frame !== null) cancelAnimationFrame(frame);
            frame = null;
            paint();
            if (!isPaused()) frame = requestAnimationFrame(tick);
        }

        function show(idx, animate) {
            clearTimeout(typeTimer);
            current = (idx + slides.length) % slides.length;
            slides.forEach(function(slide, i) {
                slide.classList.toggle('active', i === current);
                slide.setAttribute('aria-hidden', String(i !== current));
                dots[i].classList.toggle('active', i === current);
            });
            duration = readingTime(slides[current]);
            elapsed = 0;
            lastTime = null;
            carousel.dataset.readingSeconds = String(duration / 1000);
            nameEl.classList.remove('typing');
            var attribution = slides[current].dataset.attr;
            if (animate && !reducedMotion.matches) {
                // One cancellable chain prevents stale attribution after rapid clicks.
                nameEl.textContent = '';
                nameEl.classList.add('typing');
                var letter = 0;
                function type() {
                    nameEl.textContent = attribution.slice(0, ++letter);
                    if (letter < attribution.length) typeTimer = setTimeout(type, 40);
                    else nameEl.classList.remove('typing');
                }
                typeTimer = setTimeout(type, 200);
            } else nameEl.textContent = attribution;
            updateHeight();
            paint();
        }

        var prev = document.querySelector('.quote-prev');
        var next = document.querySelector('.quote-next');
        function manual(step) {
            show(current + step, true);
            syncPlayback();
        }
        if (prev) prev.addEventListener('click', function() { manual(-1); });
        if (next) next.addEventListener('click', function() { manual(1); });
        clock.addEventListener('click', function() { paused = !paused; syncPlayback(); });
        carousel.addEventListener('mouseenter', function() { hovering = true; syncPlayback(); });
        carousel.addEventListener('mouseleave', function() { hovering = false; syncPlayback(); });
        nav.addEventListener('focusin', function(event) {
            focused = !clock.contains(event.target) && event.target.matches(':focus-visible');
            syncPlayback();
        });
        nav.addEventListener('focusout', function(event) {
            focused = !!event.relatedTarget && nav.contains(event.relatedTarget) &&
                !clock.contains(event.relatedTarget) && event.relatedTarget.matches(':focus-visible');
            syncPlayback();
        });
        document.addEventListener('selectionchange', function() {
            var selection = window.getSelection();
            selecting = !!selection && !selection.isCollapsed &&
                (carousel.contains(selection.anchorNode) || carousel.contains(selection.focusNode));
            syncPlayback();
        });
        document.addEventListener('visibilitychange', syncPlayback);
        reducedMotion.addEventListener('change', function(event) {
            if (event.matches) { paused = true; syncPlayback(); }
        });
        if (window.IntersectionObserver) {
            new IntersectionObserver(function(entries) {
                inView = entries[0].isIntersecting;
                syncPlayback();
            }).observe(carousel);
        }
        window.addEventListener('resize', updateHeight);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(updateHeight);
        show(current, false);
        syncPlayback();
    })();

    // The connector follows the panels; it never moves page content.
    (function() {
        var panels = document.querySelector('.home-panels');
        var svg = panels && panels.querySelector('.home-link');
        if (!svg) return;
        function draw() {
            var pr = panels.getBoundingClientRect();
            var a = panels.querySelector('.frame').getBoundingClientRect();
            var b = panels.querySelector('.featured').getBoundingClientRect();
            var label = panels.querySelector('.home-invitation');
            var narrow = window.matchMedia('(max-width: 1120px)').matches;
            var x1, y1, x2, y2, points;
            if (narrow) {
                x1 = x2 = pr.width / 2;
                y1 = a.bottom - pr.top + 8;
                y2 = b.top - pr.top - 8;
                points = x1+','+y1+' '+x2+','+y2;
            } else {
                x1 = a.right - pr.left + 8;
                y1 = 100;
                x2 = b.left - pr.left + b.width / 2;
                y2 = b.top - pr.top - 8;
                points = x1+','+y1+' '+x2+','+y1+' '+x2+','+y2;
                label.style.right = (b.width / 2 - 110)+'px';
            }
            if (narrow) label.style.right = '';
            svg.setAttribute('viewBox','0 0 '+pr.width+' '+pr.height);
            svg.querySelector('.home-link-line').setAttribute('points',points);
            ['ring','dot'].forEach(function(kind) {
                var start=svg.querySelector('.home-link-'+kind+'--a');
                var end=svg.querySelector('.home-link-'+kind+'--b');
                start.setAttribute('cx',x1); start.setAttribute('cy',y1);
                end.setAttribute('cx',x2); end.setAttribute('cy',y2);
            });
        }
        window.updateHomeLink = draw;
        window.addEventListener('resize',draw);
        window.addEventListener('load',draw);
        if (window.ResizeObserver) new ResizeObserver(draw).observe(panels);
        if (document.fonts) document.fonts.ready.then(draw);
        requestAnimationFrame(draw);
    })();
})();
