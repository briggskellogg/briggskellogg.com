(function () {
  var meta = document.querySelector('meta[name="subscribe-endpoint"]');
  var ENDPOINT = meta && meta.content ? meta.content.trim() : "";

  function showConfirmed(form) {
    var section = form.closest(".essay-newsletter");
    if (!section) return;

    var status = form.querySelector("[data-subscribe-status]");
    if (status) {
      status.hidden = true;
      status.textContent = "";
      status.classList.remove("is-error");
    }

    form.classList.add("is-confirmed");

    var input = form.querySelector('input[type="email"]');
    if (input) input.disabled = true;

    var button = form.querySelector('button[type="submit"]');
    if (button) {
      button.disabled = true;
      button.textContent = "confirmed";
      button.setAttribute("aria-label", "Subscription confirmed");
    }
  }

  function showError(form, message) {
    form.classList.remove("is-confirmed");

    var input = form.querySelector('input[type="email"]');
    if (input) input.disabled = false;

    var button = form.querySelector('button[type="submit"]');
    if (button) {
      button.disabled = false;
      button.textContent = button.dataset.prevLabel || "subscribe →";
      button.setAttribute("aria-label", "Subscribe");
    }

    var status = form.querySelector("[data-subscribe-status]");
    if (!status) {
      status = document.createElement("p");
      status.className = "subscribe-status";
      status.setAttribute("data-subscribe-status", "");
      form.appendChild(status);
    }
    status.hidden = false;
    status.textContent = message;
    status.classList.add("is-error");
  }

  function wireForm(form) {
    form.addEventListener("submit", function (event) {
      if (!ENDPOINT) return;

      event.preventDefault();

      var input = form.querySelector('input[type="email"]');
      var button = form.querySelector('button[type="submit"]');
      var email = input && input.value.trim();
      if (!email) return;

      var confirmed = false;

      if (button) {
        button.disabled = true;
        button.dataset.prevLabel = button.textContent;
        button.textContent = "sending…";
      }

      var source = form.getAttribute("data-subscribe-source") || "essay";

      fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, source: source }),
      })
        .then(function (resp) {
          return resp.json().catch(function () {
            return {};
          }).then(function (data) {
            if (resp.ok && data.ok) {
              showConfirmed(form);
              confirmed = true;
              return;
            }
            showError(form, data.error || "Something went wrong. Please try again.");
          });
        })
        .catch(function () {
          showError(form, "Network error — please try again.");
        })
        .finally(function () {
          if (confirmed || !button) return;
          button.disabled = false;
          button.textContent = button.dataset.prevLabel || "subscribe →";
        });
    });
  }

  document.querySelectorAll("[data-subscribe-form]").forEach(wireForm);
})();
