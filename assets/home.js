(function() {
    'use strict';

    // ---------- Quotes carousel ----------
    (function() {
        var carousel = document.querySelector('.quotes-carousel');
        var slides = document.querySelectorAll('.quote-slide');
        var dots = document.querySelectorAll('.quote-dot');
        var nameEl = document.querySelector('.attribution-name');
        if (!carousel || !slides.length || !dots.length || !nameEl) return;

        var current = 0;
        var typeTimer = null;
        var auto;

        function updateHeight() {
            carousel.style.height = slides[current].scrollHeight + 'px';
            if (window.updateHomeLink) requestAnimationFrame(window.updateHomeLink);
            if (window.preventArchetypeOverlap) requestAnimationFrame(window.preventArchetypeOverlap);
        }

        function typeOut(cb) {
            var text = nameEl.textContent;
            if (!text.length) { cb(); return; }
            nameEl.classList.add('typing');
            clearTimeout(typeTimer);
            function tick() {
                text = text.slice(0, -1);
                nameEl.textContent = text;
                if (!text.length) {
                    nameEl.classList.remove('typing');
                    cb();
                    return;
                }
                typeTimer = setTimeout(tick, 30);
            }
            typeTimer = setTimeout(tick, 30);
        }

        function typeIn(str) {
            var i = 0;
            nameEl.classList.add('typing');
            clearTimeout(typeTimer);
            function tick() {
                i++;
                nameEl.textContent = str.slice(0, i);
                if (i >= str.length) {
                    nameEl.classList.remove('typing');
                    return;
                }
                typeTimer = setTimeout(tick, 40);
            }
            typeTimer = setTimeout(tick, 40);
        }

        function show(idx) {
            slides[current].classList.remove('active');
            dots[current].classList.remove('active');
            current = (idx + slides.length) % slides.length;
            slides[current].classList.add('active');
            dots[current].classList.add('active');
            updateHeight();
            typeOut(function() {
                setTimeout(function() { typeIn(slides[current].dataset.attr); }, 150);
            });
        }

        function manual(idx) {
            clearTimeout(auto);
            show(idx);
            scheduleNext();
        }

        function scheduleNext() {
            var delay = 4500 + Math.random() * 6000;
            auto = setTimeout(function() {
                show(current + 1);
                scheduleNext();
            }, delay);
        }

        (function randomizeStart() {
            var start = Math.floor(Math.random() * slides.length);
            if (start === 0) return;
            slides[0].classList.remove('active');
            dots[0].classList.remove('active');
            slides[start].classList.add('active');
            dots[start].classList.add('active');
            nameEl.textContent = slides[start].dataset.attr;
            current = start;
        })();

        updateHeight();
        window.addEventListener('resize', updateHeight);
        scheduleNext();

        var prev = document.querySelector('.quote-prev');
        var next = document.querySelector('.quote-next');
        if (prev) prev.addEventListener('click', function() { manual(current - 1); });
        if (next) next.addEventListener('click', function() { manual(current + 1); });
    })();

    // ---------- Home stagger layout + connector wire ----------
    (function() {
        var panels = document.querySelector('.home-panels');
        var svg = document.querySelector('.home-link');
        if (!panels || !svg) return;
        var line = svg.querySelector('.home-link-line');
        var ringA = svg.querySelector('.home-link-ring--a');
        var ringB = svg.querySelector('.home-link-ring--b');
        var dotA = svg.querySelector('.home-link-dot--a');
        var dotB = svg.querySelector('.home-link-dot--b');
        var mq = window.matchMedia('(min-width: 1010px)');
        var STAGGER_LIFT = 300;
        var STAGGER_LIFT_MIN = 120;
        var LIFT_COLLAPSE = 48;
        var main = document.querySelector('main.page');

        function applyStaggerTransforms(frame, featured, shift, lift) {
            featured.style.marginBottom = (-lift + LIFT_COLLAPSE) + 'px';
            frame.style.transform = 'translateX(' + (-shift) + 'px)';
            featured.style.transform = 'translate(' + shift + 'px, ' + (-lift) + 'px)';
        }

        function measureStaggerUnit(frame, featured) {
            var fr = frame.getBoundingClientRect();
            var fe = featured.getBoundingClientRect();
            return {
                top: Math.min(fr.top, fe.top),
                bottom: Math.max(fr.bottom, fe.bottom),
                height: Math.max(fr.bottom, fe.bottom) - Math.min(fr.top, fe.top),
                left: Math.min(fr.left, fe.left),
                right: Math.max(fr.right, fe.right)
            };
        }

        function getViewportInsets() {
            var bodyStyle = getComputedStyle(document.body);
            return {
                top: parseFloat(bodyStyle.paddingTop) || 0,
                bottom: parseFloat(bodyStyle.paddingBottom) || 0,
                left: parseFloat(bodyStyle.paddingLeft) || 0,
                right: parseFloat(bodyStyle.paddingRight) || 0
            };
        }

        function getAvailVerticalBounds(insets, desktop) {
            var top = insets.top;
            var bottom = window.innerHeight - insets.bottom;
            var rights = document.querySelector('.rights');
            if (desktop && rights) {
                bottom = Math.min(bottom, rights.getBoundingClientRect().top - 16);
            }
            if (!desktop) {
                var archetypes = document.querySelector('.archetypes');
                var egg = document.querySelector('.egg-wrap');
                if (archetypes) {
                    bottom = Math.min(bottom, archetypes.getBoundingClientRect().top - 16);
                }
                if (egg) {
                    bottom = Math.min(bottom, egg.getBoundingClientRect().top - 16);
                }
            }
            return { top: top, bottom: bottom };
        }

        function layoutHomeStagger() {
            var frame = panels.querySelector('.frame');
            var featured = panels.querySelector('.featured');
            if (!frame || !featured) return;

            panels.style.transform = '';
            if (main) main.style.marginTop = '';
            frame.style.transform = '';
            featured.style.transform = '';
            featured.style.marginBottom = '';

            if (!mq.matches) {
                if (document.documentElement) document.documentElement.style.overflowY = '';
                layoutStackCenter(frame, featured);
                return;
            }

            if (document.documentElement) document.documentElement.style.overflowY = 'hidden';
            void panels.offsetHeight;

            var verticalGap = featured.offsetTop - frame.offsetTop - frame.offsetHeight;
            if (verticalGap < 0) verticalGap = 28;
            var horizontalGap = featured.offsetLeft - (frame.offsetLeft + frame.offsetWidth);
            var shift = (verticalGap - horizontalGap) / 2;

            var insets = getViewportInsets();
            var vBounds = getAvailVerticalBounds(insets, true);
            var availHeight = vBounds.bottom - vBounds.top;
            var lift = STAGGER_LIFT;
            var unit;

            applyStaggerTransforms(frame, featured, shift, lift);
            void panels.offsetHeight;
            unit = measureStaggerUnit(frame, featured);

            while (unit.height > availHeight && lift > STAGGER_LIFT_MIN) {
                lift -= 12;
                applyStaggerTransforms(frame, featured, shift, lift);
                void panels.offsetHeight;
                unit = measureStaggerUnit(frame, featured);
            }

            var offsetX = (window.innerWidth / 2) - ((unit.left + unit.right) / 2);
            var offsetY;
            if (unit.height <= availHeight) {
                offsetY = ((vBounds.top + vBounds.bottom) / 2) - ((unit.top + unit.bottom) / 2);
                if (unit.top + offsetY < vBounds.top) offsetY = vBounds.top - unit.top;
                if (unit.bottom + offsetY > vBounds.bottom) offsetY = vBounds.bottom - unit.bottom;
            } else {
                offsetY = vBounds.top - unit.top;
            }

            var archetypes = document.querySelector('.archetypes');
            if (archetypes) {
                var ar = archetypes.getBoundingClientRect();
                var overlapPad = 18;
                var projectedBottom = unit.bottom + offsetY;
                var projectedRight = unit.right + offsetX;
                if (projectedRight + overlapPad > ar.left && projectedBottom + overlapPad > ar.top) {
                    offsetY -= (projectedBottom + overlapPad) - ar.top;
                }
            }

            var edgePad = 16;
            if (unit.left + offsetX < edgePad) offsetX += edgePad - (unit.left + offsetX);
            if (unit.right + offsetX > window.innerWidth - edgePad) {
                offsetX -= (unit.right + offsetX) - (window.innerWidth - edgePad);
            }
            panels.style.transform = 'translate(' + offsetX + 'px, ' + offsetY + 'px)';
        }

        function layoutStackCenter(frame, featured) {
            if (!main) return;
            var rights = document.querySelector('.rights');
            var insets = getViewportInsets();
            var vBounds = getAvailVerticalBounds(insets, false);
            var top = main.getBoundingClientRect().top;
            var bottom = rights
                ? rights.getBoundingClientRect().bottom
                : featured.getBoundingClientRect().bottom;
            var contentHeight = bottom - top;
            var availHeight = vBounds.bottom - vBounds.top;
            if (contentHeight > availHeight) return;
            main.style.marginTop = (vBounds.top + (availHeight - contentHeight) / 2 - top) + 'px';
        }

        function updateHomeLink() {
            if (!mq.matches || !line || !ringA || !ringB || !dotA || !dotB) return;
            var frame = panels.querySelector('.frame');
            var featured = panels.querySelector('.featured');
            if (!frame || !featured) return;

            var pr = panels.getBoundingClientRect();
            var fr = frame.getBoundingClientRect();
            var fe = featured.getBoundingClientRect();
            var w = pr.width;
            var h = pr.height;
            if (w < 1 || h < 1) return;

            var dotR = 4.5;
            var gap = 3;
            svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
            svg.setAttribute('width', w);
            svg.setAttribute('height', h);

            var x1 = fr.right - pr.left + dotR + gap;
            var y1 = fr.top - pr.top + (fr.height / 2);
            var x2 = fe.left - pr.left + (fe.width / 2);
            var y2 = fe.top - pr.top - dotR - gap;

            line.setAttribute('points', x1 + ',' + y1 + ' ' + x2 + ',' + y1 + ' ' + x2 + ',' + y2);
            [ringA, dotA].forEach(function(el) {
                el.setAttribute('cx', x1);
                el.setAttribute('cy', y1);
            });
            [ringB, dotB].forEach(function(el) {
                el.setAttribute('cx', x2);
                el.setAttribute('cy', y2);
            });
        }

        function syncHomeLayout() {
            layoutHomeStagger();
            updateHomeLink();
            if (window.preventArchetypeOverlap) window.preventArchetypeOverlap();
        }

        window.updateHomeLink = syncHomeLayout;
        window.addEventListener('resize', syncHomeLayout);
        window.addEventListener('load', syncHomeLayout);
        if (typeof mq.addEventListener === 'function') {
            mq.addEventListener('change', syncHomeLayout);
        } else if (typeof mq.addListener === 'function') {
            mq.addListener(syncHomeLayout);
        }
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(syncHomeLayout);
        }

        var frameEl = panels.querySelector('.frame');
        var featuredEl = panels.querySelector('.featured');
        var carouselEl = panels.querySelector('.quotes-carousel');
        var rightsEl = document.querySelector('.rights');
        if (window.ResizeObserver && frameEl) {
            var linkRo = new ResizeObserver(function() { syncHomeLayout(); });
            linkRo.observe(frameEl);
            if (featuredEl) linkRo.observe(featuredEl);
            if (carouselEl) linkRo.observe(carouselEl);
            if (rightsEl) linkRo.observe(rightsEl);
        }
        requestAnimationFrame(syncHomeLayout);
    })();

    // ---------- Mobile archetype overlap guard ----------
    (function() {
        var featured = document.querySelector('.featured');
        var archetypes = document.querySelector('.archetypes');
        if (!featured || !archetypes) return;

        function preventArchetypeOverlap() {
            if (window.matchMedia('(min-width: 1010px)').matches) return;
            featured.style.marginBottom = '';
        }

        window.preventArchetypeOverlap = preventArchetypeOverlap;
        window.addEventListener('resize', preventArchetypeOverlap);
        window.addEventListener('load', preventArchetypeOverlap);
        if (window.ResizeObserver) {
            var overlapRo = new ResizeObserver(function() { preventArchetypeOverlap(); });
            overlapRo.observe(featured);
            overlapRo.observe(archetypes);
        }
        requestAnimationFrame(preventArchetypeOverlap);
    })();
})();
