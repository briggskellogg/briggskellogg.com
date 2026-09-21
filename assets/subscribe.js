(function () {
  var meta = document.querySelector('meta[name="subscribe-endpoint"]');
  var ENDPOINT = meta && meta.content ? meta.content.trim() : "";
  var feedbackId = 0;

  function wireForm(form) {
    var field = form.querySelector('input[type="email"]');
    var button = form.querySelector('button[type="submit"]');
    var row = form.querySelector('.subscribe-row');
    if (!ENDPOINT || !field || !button || !row) return;

    // Invalid addresses and failed requests quietly disable the action.
    form.noValidate = true;
    var originalButton = button.innerHTML;
    var originalLabel = button.getAttribute('aria-label') || 'Subscribe';
    var pending = false;
    var failed = false;
    var requestId = 0;
    var controller = null;
    var status = form.querySelector('[data-subscribe-status]');
    if (!status) {
      status = document.createElement('p');
      status.className = 'subscribe-status';
      status.setAttribute('data-subscribe-status', '');
    }
    status.id = status.id || 'subscribe-feedback-' + (++feedbackId);
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('aria-atomic', 'true');
    status.hidden = true;
    row.appendChild(status);
    var describedBy = (field.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    if (describedBy.indexOf(status.id) === -1) describedBy.push(status.id);
    field.setAttribute('aria-describedby', describedBy.join(' '));

    function validEmail() {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value.trim()) && field.validity.valid;
    }

    function syncFieldState() {
      row.classList.toggle('has-value', Boolean(field.value));
      button.disabled = pending || failed || form.classList.contains('is-confirmed') || !validEmail();
    }

    function restoreButton() {
      button.innerHTML = originalButton;
      button.setAttribute('aria-label', originalLabel);
      form.removeAttribute('aria-busy');
      pending = false;
      syncFieldState();
    }

    function clearError() {
      form.classList.remove('has-error');
      field.removeAttribute('aria-invalid');
      status.hidden = true;
      status.textContent = '';
      status.classList.remove('is-error');
    }

    function showError() {
      failed = true;
      restoreButton();
      clearError();
      field.disabled = false;
    }

    function showConfirmed(outcome) {
      clearError();
      pending = false;
      form.removeAttribute('aria-busy');
      form.classList.add('is-confirmed');
      field.disabled = true;
      button.disabled = true;
      var needsConfirmation = outcome === 'confirmation_sent';
      button.innerHTML = '<span>' + (needsConfirmation ? 'confirmation sent' : 'subscribed') + '</span><span aria-hidden="true">✓</span>';
      button.setAttribute('aria-label', needsConfirmation ? 'Subscription confirmation sent. Check your inbox.' : 'Subscribed to new essays.');
      status.hidden = false;
      status.textContent = needsConfirmation ? 'Confirmation sent. Check your inbox to confirm your subscription.' : 'You are subscribed to new essays.';
    }

    function fieldChanged() {
      failed = false;
      // An old response must not overwrite feedback for a newly entered email.
      if (pending) {
        requestId += 1;
        if (controller) controller.abort();
        restoreButton();
      }
      clearError();
      syncFieldState();
    }
    field.addEventListener('input', fieldChanged);
    field.addEventListener('change', fieldChanged);
    syncFieldState();

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (pending || failed || form.classList.contains('is-confirmed')) return;
      clearError();

      var email = field.value.trim();
      field.value = email;
      syncFieldState();
      if (!validEmail()) {
        syncFieldState();
        return;
      }

      pending = true;
      var attempt = ++requestId;
      form.setAttribute('aria-busy', 'true');
      button.disabled = true;
      button.innerHTML = '<span class="subscribe-loading" aria-hidden="true"><i></i><i></i><i></i></span>';
      button.setAttribute('aria-label', 'Sending subscription request');
      var source = form.getAttribute('data-subscribe-source') || 'essay';

      controller = new AbortController();
      var thisController = controller;
      var timeout = setTimeout(function () { thisController.abort(); }, 15000);
      fetch(ENDPOINT, {
        signal: thisController.signal,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, source: source })
      }).then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (data) {
          if (attempt !== requestId) return;
          if (response.ok && data.ok && (!data.outcome || data.outcome === 'subscribed' || data.outcome === 'confirmation_sent')) {
            showConfirmed(data.outcome || 'subscribed');
          } else {
            showError();
          }
        });
      }).catch(function () {
        if (attempt === requestId) showError();
      }).finally(function () {
        clearTimeout(timeout);
        if (controller === thisController) controller = null;
      });
    });
  }

  document.querySelectorAll('[data-subscribe-form]').forEach(wireForm);
})();
