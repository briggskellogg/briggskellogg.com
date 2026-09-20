(function () {
    'use strict';

    var key = 'bek-reading-theme';
    var root = document.documentElement;
    var media = window.matchMedia('(prefers-color-scheme: dark)');
    var saved = null;

    try { saved = window.localStorage.getItem(key); } catch (_) {}
    if (saved === 'light' || saved === 'dark') root.dataset.readingTheme = saved;

    function currentTheme() {
        return root.dataset.readingTheme || (media.matches ? 'dark' : 'light');
    }

    function sync(button) {
        var current = currentTheme();
        var next = current === 'dark' ? 'light' : 'dark';
        button.dataset.theme = current;
        button.setAttribute('aria-label', 'Switch to ' + next + ' mode');
        button.setAttribute('title', 'Switch to ' + next + ' mode');
        button.setAttribute('aria-pressed', String(current === 'dark'));
        var label = button.querySelector('[data-theme-label]');
        if (label) label.textContent = next;
    }

    function init() {
        var buttons = document.querySelectorAll('[data-reading-theme-toggle]');
        buttons.forEach(function (button) {
            sync(button);
            button.addEventListener('click', function () {
                var next = currentTheme() === 'dark' ? 'light' : 'dark';
                root.dataset.readingTheme = next;
                try { window.localStorage.setItem(key, next); } catch (_) {}
                buttons.forEach(sync);
            });
        });
        var followSystem = function () {
            if (!root.dataset.readingTheme) buttons.forEach(sync);
        };
        if (media.addEventListener) media.addEventListener('change', followSystem);
        else if (media.addListener) media.addListener(followSystem);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
}());
