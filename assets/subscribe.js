(function () {
  var meta = document.querySelector('meta[name="subscribe-endpoint"]');
  var ENDPOINT = meta && meta.content ? meta.content.trim() : "";

  function ensureConfirmedBox(section) {
    var box = section.querySelector("[data-subscribe-confirmed]");
    if (box) return box;

    box = document.createElement("div");
    box.className = "subscribe-confirmed";
    box.setAttribute("data-subscribe-confirmed", "");
    box.hidden = true;
    box.setAttribute("role", "status");
    box.innerHTML =
      '<span class="sc sc-tl"></span>' +
      '<span class="sc sc-tr"></span>' +
      '<span class="sc sc-bl"></span>' +
      '<span class="sc sc-br"></span>' +
      "confirmed";
    section.appendChild(box);
    return box;
  }

  function showConfirmed(form) {
    var section = form.closest(".essay-newsletter");
    if (!section) return;

    var status = form.querySelector("[data-subscribe-status]");
    if (status) {
      status.hidden = true;
      status.textContent = "";
      status.classList.remove("is-error");
    }

    var head = section.querySelector(".newsletter-head");
    if (head) head.hidden = true;
    form.hidden = true;

    section.classList.add("is-confirmed");

    var box = ensureConfirmedBox(section);
    box.hidden = false;
    box.classList.remove("is-visible");
    void box.offsetWidth;
    box.classList.add("is-visible");
  }

  function showError(form, message) {
    var section = form.closest(".essay-newsletter");
    if (section) section.classList.remove("is-confirmed");

    var box = section && section.querySelector("[data-subscribe-confirmed]");
    if (box) {
      box.hidden = true;
      box.classList.remove("is-visible");
    }

    var head = section && section.querySelector(".newsletter-head");
    if (head) head.hidden = false;
    form.hidden = false;

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
              showConfirmed(form);
              return;
            }
            showError(form, data.error || "Something went wrong. Please try again.");
          });
        })
        .catch(function () {
          showError(form, "Network error — please try again.");
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
