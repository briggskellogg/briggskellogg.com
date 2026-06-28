(function () {
  var meta = document.querySelector('meta[name="subscribe-endpoint"]');
  var ENDPOINT = meta && meta.content ? meta.content.trim() : "";

  var CONFIRM_COPY = {
    success: {
      kicker: "confirmed",
      headline: "You're on the list.",
    },
    repeat: {
      kicker: "already subscribed",
      headline: "Nothing to do.",
    },
  };

  function showStatus(form, options) {
    var status = form.querySelector("[data-subscribe-status]");
    if (!status) {
      status = document.createElement("p");
      status.className = "subscribe-status";
      status.setAttribute("data-subscribe-status", "");
      form.appendChild(status);
    }

    status.hidden = false;
    status.classList.remove("is-error", "is-success", "is-repeat");

    if (options.kind === "success" || options.kind === "repeat") {
      var copy = CONFIRM_COPY[options.kind];
      status.classList.add(options.kind === "repeat" ? "is-repeat" : "is-success");
      status.innerHTML =
        '<span class="subscribe-confirm-kicker">' +
        copy.kicker +
        "</span>" +
        '<span class="subscribe-confirm-head">' +
        copy.headline +
        "</span>";
      return;
    }

    status.textContent = options.message || "Something went wrong. Please try again.";
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
              var kind = data.repeat ? "repeat" : "success";
              showStatus(form, { kind: kind });
              return;
            }
            showStatus(form, {
              kind: "error",
              message: data.error || "Something went wrong. Please try again.",
            });
          });
        })
        .catch(function () {
          showStatus(form, { kind: "error", message: "Network error — please try again." });
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
