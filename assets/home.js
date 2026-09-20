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
        var current = 0;
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
            var text = slide.querySelector('.quote').textContent.trim();
            var words = text.match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu) || [];
            var attributionWords = (slide.dataset.attr.match(/\S+/g) || []).length;
            var sentenceBreaks = (text.match(/[.!?]+/g) || []).length;
            var pauses = (text.match(/[,;:—–]/g) || []).length;
            var ellipses = (text.match(/…|\.{3}/g) || []).length;
            var longWords = words.filter(function(word) { return word.length >= 9; }).length;
            // Quick, length-sensitive pacing: about one third of the earlier
            // dwell time. Pause on interaction so a reader can linger.
            // This is a display heuristic, not a measurement of the reader.
            var milliseconds = 2000 + words.length * 170 + attributionWords * 80 +
                sentenceBreaks * 200 + pauses * 80 + ellipses * 270 + longWords * 40;
            return Math.max(5000, Math.ceil(milliseconds / 500) * 500);
        }

        function setAttribution(slide, animate) {
            var attribution = slide.dataset.attr;
            var split = attribution.indexOf(': ');
            var title = split < 0 ? attribution : attribution.slice(0, split);
            var subtitle = split < 0 ? '' : attribution.slice(split);
            var titleEl = nameEl.querySelector('.attribution-title');
            var subtitleEl = nameEl.querySelector('.attribution-subtitle');
            nameEl.href = slide.dataset.url;
            nameEl.setAttribute('aria-label', attribution + ' — official site (opens in a new tab)');
            nameEl.classList.toggle('has-subtitle', split >= 0);
            function render(count) {
                titleEl.textContent = title.slice(0, count);
                subtitleEl.textContent = subtitle.slice(0, Math.max(0, count - title.length));
            }
            nameEl.classList.remove('typing');
            if (animate && !reducedMotion.matches) {
                render(0);
                nameEl.classList.add('typing');
                var letter = 0;
                function type() {
                    render(++letter);
                    if (letter < attribution.length) typeTimer = setTimeout(type, 40);
                    else { nameEl.classList.remove('typing'); updateHeight(); }
                }
                typeTimer = setTimeout(type, 200);
            } else render(attribution.length);
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
            setAttribution(slides[current], animate);
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
        // Keep the quote and its link stable while someone reads or follows it.
        var quoteRegions = [carousel, nameEl.closest('.attribution'), nav];
        quoteRegions.forEach(function(region) {
            region.addEventListener('mouseenter', function() { hovering = true; syncPlayback(); });
            region.addEventListener('mouseleave', function() { hovering = false; syncPlayback(); });
            region.addEventListener('focusin', function(event) {
                focused = !clock.contains(event.target) && event.target.matches(':focus-visible');
                syncPlayback();
            });
            region.addEventListener('focusout', function(event) {
                focused = !!event.relatedTarget && quoteRegions.some(function(region) {
                    return region.contains(event.relatedTarget);
                }) && !clock.contains(event.relatedTarget) && event.relatedTarget.matches(':focus-visible');
                syncPlayback();
            });
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
            var narrow = window.matchMedia('(max-width: 1009px)').matches;
            var x1, y1, x2, y2, points;
            label.style.left = '';
            label.style.top = '';
            label.style.right = '';
            if (narrow) {
                x1 = x2 = pr.width / 2;
                y1 = a.bottom - pr.top + 8;
                y2 = b.top - pr.top - 8;
                points = x1+','+y1+' '+x2+','+y2;
            } else {
                x1 = a.right - pr.left + 8;
                y1 = a.top - pr.top + 80;
                x2 = b.left - pr.left + b.width / 2;
                y2 = b.top - pr.top - 8;
                points = x1+','+y1+' '+x2+','+y1+' '+x2+','+y2;
                label.style.left = ((x1 + x2) / 2 - label.offsetWidth / 2) + 'px';
                label.style.top = (y1 - label.offsetHeight / 2) + 'px';
            }
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
