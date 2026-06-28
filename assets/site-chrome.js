(function() {
    'use strict';

    // ---------- Reading light (cursor follower) ----------
    (function() {
        var light = document.querySelector('.reading-light');
        if (!light) return;
        if (window.matchMedia('(hover: none)').matches) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        var targetX = window.innerWidth / 2;
        var targetY = window.innerHeight / 2;
        var currentX = targetX;
        var currentY = targetY;
        var rafId = null;
        var active = false;

        function step() {
            currentX += (targetX - currentX) * 0.22;
            currentY += (targetY - currentY) * 0.22;
            light.style.setProperty('--mx', currentX + 'px');
            light.style.setProperty('--my', currentY + 'px');
            if (Math.abs(targetX - currentX) > 0.4 || Math.abs(targetY - currentY) > 0.4) {
                rafId = requestAnimationFrame(step);
            } else {
                rafId = null;
            }
        }

        document.addEventListener('mousemove', function(e) {
            targetX = e.clientX;
            targetY = e.clientY;
            if (!active) {
                light.classList.add('active');
                active = true;
            }
            if (!rafId) rafId = requestAnimationFrame(step);
        }, { passive: true });

        document.addEventListener('mouseleave', function() {
            light.classList.remove('active');
            active = false;
        });
    })();

    // ---------- Easter egg ----------
    (function() {
        var wrap = document.querySelector('.egg-wrap');
        var egg = document.querySelector('.easter-egg');
        var shell = document.querySelector('.egg-shell');
        var cracks = document.querySelectorAll('.crack');
        var catalogueId = document.querySelector('.catalogue-id');
        if (!wrap || !egg || !shell || !catalogueId) return;
        var taps = 0;
        var shakeClasses = ['egg-shake-1', 'egg-shake-2', 'egg-shake-3'];

        egg.addEventListener('click', function(e) {
            e.preventDefault();
            if (taps >= 3) return;
            taps++;

            shakeClasses.forEach(function(c) { shell.classList.remove(c); });
            void shell.offsetWidth;
            shell.classList.add(shakeClasses[taps - 1]);

            for (var i = 0; i < taps; i++) {
                cracks[i].classList.add('visible');
            }

            if (taps >= 3) {
                var startW = wrap.offsetWidth;
                var startH = wrap.offsetHeight;
                wrap.style.width = startW + 'px';
                wrap.style.height = startH + 'px';
                wrap.style.overflow = 'hidden';

                setTimeout(function() {
                    shell.classList.add('egg-split');

                    setTimeout(function() {
                        egg.style.position = 'absolute';
                        egg.style.visibility = 'hidden';
                        catalogueId.classList.add('measured');

                        void wrap.offsetWidth;
                        var targetW = catalogueId.offsetWidth + parseFloat(getComputedStyle(wrap).paddingLeft) * 2;
                        var targetH = catalogueId.offsetHeight + parseFloat(getComputedStyle(wrap).paddingTop) * 2;

                        requestAnimationFrame(function() {
                            wrap.style.width = targetW + 'px';
                            wrap.style.height = targetH + 'px';

                            setTimeout(function() {
                                egg.style.display = 'none';
                                catalogueId.classList.add('revealed');
                                wrap.style.overflow = '';
                                setTimeout(function() {
                                    wrap.style.width = '';
                                    wrap.style.height = '';
                                }, 100);
                            }, 700);
                        });
                    }, 600);
                }, 500);
            }
        });
    })();
})();
