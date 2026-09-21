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

    function syncFieldState() {
      row.classList.toggle('has-value', Boolean(field.value));
      button.disabled = pending || failed || form.classList.contains('is-confirmed') || !field.value.trim() || !field.validity.valid;
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

    function showConfirmed() {
      clearError();
      pending = false;
      form.removeAttribute('aria-busy');
      form.classList.add('is-confirmed');
      field.disabled = true;
      button.disabled = true;
      button.innerHTML = '<span>confirmation sent</span><span aria-hidden="true">✓</span>';
      button.setAttribute('aria-label', 'Subscription confirmation sent. Check your inbox.');
      status.hidden = false;
      status.textContent = 'Confirmation sent. Check your inbox to confirm your subscription.';
    }

    function fieldChanged() {
      failed = false;
      // An old response must not overwrite feedback for a newly entered email.
      if (pending) {
        requestId += 1;
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
      if (!email || !field.validity.valid) {
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

      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, source: source })
      }).then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (data) {
          if (attempt !== requestId) return;
          if (response.ok && data.ok) {
            showConfirmed();
          } else {
            showError();
          }
        });
      }).catch(function () {
        if (attempt === requestId) showError();
      });
    });
  }

  document.querySelectorAll('[data-subscribe-form]').forEach(wireForm);
})();
