(function () {
  var meta = document.querySelector('meta[name="subscribe-endpoint"]');
  var ENDPOINT = meta && meta.content ? meta.content.trim() : "";

  function showStatus(form, message, isError) {
    var status = form.querySelector("[data-subscribe-status]");
    if (!status) {
      status = document.createElement("p");
      status.className = "subscribe-status";
      status.setAttribute("data-subscribe-status", "");
      form.appendChild(status);
    }
    status.hidden = false;
    status.textContent = message;
    status.classList.toggle("is-error", !!isError);
  }

  function wireForm(form) {
    form.addEventListener("submit", function (event) {
      if (!ENDPOINT) return;

      event.preventDefault();

      var input = form.querySelector('input[type="email"]');
      var button = form.querySelector('button[type="submit"]');
      var email = input && input.value.trim();
      if (!email) return;

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
              form.reset();
              showStatus(
                form,
                data.message || "Check your inbox for a confirmation link.",
                false
              );
              return;
            }
            showStatus(form, data.error || "Something went wrong. Please try again.", true);
          });
        })
        .catch(function () {
          showStatus(form, "Network error — please try again.", true);
        })
        .finally(function () {
          if (button) {
            button.disabled = false;
            button.textContent = button.dataset.prevLabel || "subscribe →";
          }
        });
    });
  }

  document.querySelectorAll("[data-subscribe-form]").forEach(wireForm);
})();
