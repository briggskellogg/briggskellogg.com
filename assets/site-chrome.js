(function() {
    'use strict';

    // ---------- Easter egg ----------
    (function() {
        var wrap = document.querySelector('.egg-wrap');
        var egg = document.querySelector('.easter-egg');
        var shell = document.querySelector('.egg-shell');
        var cracks = document.querySelectorAll('.crack');
        var catalogueId = document.querySelector('.catalogue-id');
        if (!wrap || wrap.hidden || !egg || !shell || !catalogueId) return;
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

// One shared social destination; links remain ordinary keyboard-accessible links.
(function() {
    var dock = document.querySelector('.social-dock');
    if (!dock) return;
    var toggle = dock.querySelector('.social-toggle');
    var links = dock.querySelector('.social-links');
    var closeTimer = null;
    function setOpen(open, returnFocus) {
        toggle.setAttribute('aria-expanded', String(open));
        clearTimeout(closeTimer);
        if (open) {
            links.classList.remove('is-closing');
            links.hidden = false;
        } else if (!links.hidden) {
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                links.hidden = true;
                links.classList.remove('is-closing');
                if (returnFocus) toggle.focus();
                return;
            }
            links.classList.add('is-closing');
            closeTimer = setTimeout(function() {
                links.hidden = true;
                links.classList.remove('is-closing');
            }, 420);
        }
        if (returnFocus) toggle.focus();
    }
    toggle.addEventListener('click', function() {
        var open = toggle.getAttribute('aria-expanded') !== 'true';
        setOpen(open, false);
        if (open) links.querySelector('a').focus();
    });
    document.addEventListener('pointerdown', function(event) {
        if (!dock.contains(event.target)) setOpen(false, false);
    });
    dock.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') { event.preventDefault(); setOpen(false, true); }
    });
    dock.addEventListener('focusout', function(event) {
        if (!dock.contains(event.relatedTarget)) setOpen(false, false);
    });
})();
