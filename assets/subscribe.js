(function () {
  var meta = document.querySelector('meta[name="subscribe-endpoint"]');
  var ENDPOINT = meta && meta.content ? meta.content.trim() : "";
  var feedbackId = 0;

  function wireForm(form) {
    var field = form.querySelector('input[type="email"]');
    var button = form.querySelector('button[type="submit"]');
    var row = form.querySelector('.subscribe-row');
    if (!ENDPOINT || !field || !button || !row) return;

    // The unenhanced form retains native validation; the enhanced control
    // reports problems within its own field instead of a browser popover.
    form.noValidate = true;
    var originalButton = button.innerHTML;
    var originalLabel = button.getAttribute('aria-label') || 'Subscribe';
    var pending = false;
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
    }

    function restoreButton() {
      button.disabled = false;
      button.innerHTML = originalButton;
      button.setAttribute('aria-label', originalLabel);
      form.removeAttribute('aria-busy');
      pending = false;
    }

    function clearError() {
      form.classList.remove('has-error');
      field.removeAttribute('aria-invalid');
      status.hidden = true;
      status.textContent = '';
      status.classList.remove('is-error');
    }

    function showError(message, invalid) {
      restoreButton();
      form.classList.add('has-error');
      field.disabled = false;
      if (invalid) field.setAttribute('aria-invalid', 'true');
      else field.removeAttribute('aria-invalid');
      status.classList.add('is-error');
      status.hidden = false;
      status.textContent = message;
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
      if (pending || form.classList.contains('is-confirmed')) return;
      clearError();

      var email = field.value.trim();
      field.value = email;
      syncFieldState();
      if (!email || !field.validity.valid) {
        showError(email ? 'enter a valid email address' : 'enter your email address', true);
        field.focus();
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
          } else if (response.status === 400 || response.status === 422) {
            showError('check your email address', true);
          } else if (response.status === 429) {
            showError('please wait a moment · retry', false);
          } else {
            showError('couldn’t send · try again', false);
          }
        });
      }).catch(function () {
        if (attempt === requestId) showError('connection failed · try again', false);
      });
    });
  }

  document.querySelectorAll('[data-subscribe-form]').forEach(wireForm);
})();
