/* ==========================================================================
   RESOL — resolservices.in
   Site behaviour. Vanilla JS, no dependencies, safe to defer.
   ========================================================================== */
(function () {
  "use strict";

  /* ----------------------------------------------------------------------
     CONFIGURE ME — contact form delivery
     ----------------------------------------------------------------------
     Paste an endpoint from Formspree (https://formspree.io) or Web3Forms
     (https://web3forms.com) below, e.g.:
         var FORM_ENDPOINT = "https://formspree.io/f/xxxxxxxx";
     While this is empty the form validates, then hands the enquiry to the
     visitor's email client as a pre-filled draft to CONTACT_EMAIL.
     -------------------------------------------------------------------- */
  var FORM_ENDPOINT = "";
  var CONTACT_EMAIL = "info@resolservices.in";

  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $  = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ----------------------------------------------------------------------
     1. Header state + scroll progress
     -------------------------------------------------------------------- */
  function initScrollChrome() {
    var header = $(".header");
    var progress = $(".progress");
    var toTop = $(".to-top");
    var ticking = false;

    function update() {
      var y = window.scrollY || document.documentElement.scrollTop;
      if (header) header.classList.toggle("is-stuck", y > 12);
      if (toTop) toTop.classList.toggle("is-visible", y > 600);
      if (progress) {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        progress.style.setProperty("--p", max > 0 ? (y / max).toFixed(4) : 0);
      }
      ticking = false;
    }

    window.addEventListener("scroll", function () {
      if (!ticking) { window.requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();

    if (toTop) {
      toTop.addEventListener("click", function () {
        window.scrollTo({ top: 0, behavior: prefersReduced ? "auto" : "smooth" });
      });
    }
  }

  /* ----------------------------------------------------------------------
     2. Mobile drawer
     -------------------------------------------------------------------- */
  function initDrawer() {
    var toggle = $(".menu-toggle");
    var drawer = $(".drawer");
    if (!toggle || !drawer) return;

    // Stagger the links as the drawer opens
    $$(".drawer__link", drawer).forEach(function (link, i) {
      link.style.setProperty("--d", (0.08 + i * 0.07).toFixed(2) + "s");
    });

    function setOpen(open) {
      drawer.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      document.body.classList.toggle("is-locked", open);
      if (open) {
        var first = $(".drawer__link", drawer);
        if (first) window.setTimeout(function () { first.focus(); }, 320);
      }
    }

    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });

    drawer.addEventListener("click", function (e) {
      if (e.target.closest("a")) setOpen(false);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && drawer.classList.contains("is-open")) {
        setOpen(false);
        toggle.focus();
      }
    });

    // Drop the lock if the viewport grows past the mobile breakpoint
    window.matchMedia("(min-width: 1024px)").addEventListener("change", function (e) {
      if (e.matches) setOpen(false);
    });
  }

  /* ----------------------------------------------------------------------
     3. Reveal on scroll
     -------------------------------------------------------------------- */
  function initReveal() {
    var items = $$(".reveal, .step");
    if (!items.length) return;

    if (prefersReduced || !("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

    items.forEach(function (el) {
      // Stagger siblings that share a parent unless an explicit delay is set
      if (!el.style.getPropertyValue("--d")) {
        var group = el.parentElement ? $$(".reveal", el.parentElement) : [];
        var idx = group.indexOf(el);
        if (idx > 0 && idx < 8) el.style.setProperty("--d", (idx * 0.08).toFixed(2) + "s");
      }
      io.observe(el);
    });
  }

  /* ----------------------------------------------------------------------
     4. Animated stat counters
     -------------------------------------------------------------------- */
  function initCounters() {
    var nums = $$("[data-count]");
    if (!nums.length) return;

    function run(el) {
      var target = parseFloat(el.getAttribute("data-count"));
      var pad = el.getAttribute("data-pad") === "true";
      var duration = 1400;
      var start = null;

      function frame(ts) {
        if (start === null) start = ts;
        var p = Math.min((ts - start) / duration, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        var value = Math.round(target * eased);
        el.textContent = pad && value < 10 ? "0" + value : String(value);
        if (p < 1) window.requestAnimationFrame(frame);
      }
      window.requestAnimationFrame(frame);
    }

    if (prefersReduced || !("IntersectionObserver" in window)) {
      nums.forEach(function (el) {
        var t = parseInt(el.getAttribute("data-count"), 10);
        el.textContent = el.getAttribute("data-pad") === "true" && t < 10 ? "0" + t : String(t);
      });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        run(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.6 });
    nums.forEach(function (el) { io.observe(el); });
  }

  /* ----------------------------------------------------------------------
     5. Pointer-tracked glow on cards
     -------------------------------------------------------------------- */
  function initCardGlow() {
    if (prefersReduced || !window.matchMedia("(hover: hover)").matches) return;
    $$(".card").forEach(function (card) {
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100).toFixed(1) + "%");
        card.style.setProperty("--my", ((e.clientY - r.top) / r.height * 100).toFixed(1) + "%");
      });
    });
  }

  /* ----------------------------------------------------------------------
     6. Marquee — duplicate the track so the loop is seamless
     -------------------------------------------------------------------- */
  function initMarquee() {
    $$(".marquee__track").forEach(function (track) {
      track.innerHTML += track.innerHTML;
      track.setAttribute("aria-hidden", "true");
    });
  }

  /* ----------------------------------------------------------------------
     7. Scrollspy for the practice index (services page)
     -------------------------------------------------------------------- */
  function initScrollspy() {
    var links = $$(".practice-nav__link");
    if (!links.length || !("IntersectionObserver" in window)) return;

    var sections = links
      .map(function (link) { return document.getElementById(link.getAttribute("href").slice(1)); })
      .filter(Boolean);
    if (!sections.length) return;

    var visible = new Set();

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) visible.add(entry.target.id);
        else visible.delete(entry.target.id);
      });

      // Highlight the topmost section currently in view
      var active = sections.filter(function (s) { return visible.has(s.id); })[0];
      if (!active) return;
      links.forEach(function (link) {
        link.classList.toggle("is-active", link.getAttribute("href") === "#" + active.id);
      });
    }, { rootMargin: "-25% 0px -55% 0px", threshold: 0 });

    sections.forEach(function (s) { io.observe(s); });
  }

  /* ----------------------------------------------------------------------
     8. FAQ accordion
     -------------------------------------------------------------------- */
  function initAccordion() {
    $$(".faq__q").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var open = btn.getAttribute("aria-expanded") === "true";
        // One panel at a time within each accordion
        var root = btn.closest(".faq");
        if (root && !open) {
          $$(".faq__q", root).forEach(function (other) {
            other.setAttribute("aria-expanded", "false");
          });
        }
        btn.setAttribute("aria-expanded", String(!open));
      });
    });
  }

  /* ----------------------------------------------------------------------
     9. Contact form
     -------------------------------------------------------------------- */
  function initForm() {
    var form = $("#enquiry-form");
    if (!form) return;

    var status = $("#form-status");
    var submit = $("#form-submit");
    var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    var PHONE_RE = /^[+()\-\s\d]{7,20}$/;

    function fieldOf(input) { return input.closest(".field"); }

    function setError(input, message) {
      var field = fieldOf(input);
      if (!field) return;
      field.classList.add("has-error");
      input.setAttribute("aria-invalid", "true");
      var slot = $(".field__error", field);
      if (slot && message) slot.textContent = message;
    }

    function clearError(input) {
      var field = fieldOf(input);
      if (!field) return;
      field.classList.remove("has-error");
      input.removeAttribute("aria-invalid");
    }

    function validate(input) {
      var value = (input.value || "").trim();
      var required = input.hasAttribute("required");

      if (input.type === "checkbox") {
        if (required && !input.checked) { setError(input, "Please tick to continue"); return false; }
        clearError(input); return true;
      }
      if (required && !value) { setError(input, "Required"); return false; }
      if (value && input.type === "email" && !EMAIL_RE.test(value)) {
        setError(input, "Enter a valid email"); return false;
      }
      if (value && input.type === "tel" && !PHONE_RE.test(value)) {
        setError(input, "Enter a valid number"); return false;
      }
      if (value && input.name === "message" && value.length < 20) {
        setError(input, "Add more detail"); return false;
      }
      clearError(input);
      return true;
    }

    function hasContent(input) {
      return input.type === "checkbox" ? input.checked : (input.value || "").trim() !== "";
    }

    var controls = $$(".control, .consent input", form);
    controls.forEach(function (input) {
      input.addEventListener("blur", function () {
        // Don't flag a field someone merely clicked through. On blur we only
        // check what was actually typed; "required but empty" is reported on
        // submit. Already-flagged fields are re-checked so they can clear.
        var field = fieldOf(input);
        if (hasContent(input) || (field && field.classList.contains("has-error"))) validate(input);
      });
      input.addEventListener("input", function () {
        if (fieldOf(input) && fieldOf(input).classList.contains("has-error")) validate(input);
      });
      input.addEventListener("change", function () {
        if (fieldOf(input) && fieldOf(input).classList.contains("has-error")) validate(input);
      });
    });

    function showStatus(kind, html) {
      if (!status) return;
      status.className = "form__status form__status--" + kind + " is-visible";
      status.innerHTML = html;
      status.setAttribute("role", kind === "err" ? "alert" : "status");
    }

    function setBusy(busy) {
      if (!submit) return;
      submit.classList.toggle("is-busy", busy);
      submit.disabled = busy;
      submit.innerHTML = busy
        ? '<span class="spinner"></span> Sending…'
        : 'Send enquiry <svg class="icon icon--sm btn-arrow" aria-hidden="true"><use href="#i-arrow"></use></svg>';
    }

    function mailtoFallback(data) {
      var lines = [
        "Name: " + data.name,
        "Email: " + data.email,
        "Phone: " + (data.phone || "—"),
        "Organisation: " + (data.company || "—"),
        "Industry: " + (data.industry || "—"),
        "Service: " + (data.service || "—"),
        "",
        data.message
      ].join("\n");
      window.location.href = "mailto:" + CONTACT_EMAIL +
        "?subject=" + encodeURIComponent("Website enquiry — " + (data.service || "General")) +
        "&body=" + encodeURIComponent(lines);
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var ok = true;
      var firstBad = null;
      controls.forEach(function (input) {
        if (!validate(input)) {
          ok = false;
          if (!firstBad) firstBad = input;
        }
      });

      if (!ok) {
        showStatus("err", "Please correct the highlighted fields and try again.");
        if (firstBad) firstBad.focus();
        return;
      }

      // Honeypot — silently accept and discard obvious bot submissions
      var trap = form.querySelector('input[name="company_website"]');
      if (trap && trap.value) { form.reset(); return; }

      var fd = new FormData(form);
      var data = {};
      fd.forEach(function (v, k) { data[k] = v; });

      if (!FORM_ENDPOINT) {
        showStatus("ok", "<span>Opening your email app with this enquiry ready to send. If nothing happens, write to <a href=\"mailto:" + CONTACT_EMAIL + "\">" + CONTACT_EMAIL + "</a>.</span>");
        mailtoFallback(data);
        return;
      }

      setBusy(true);
      if (status) status.className = "form__status";

      fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: fd
      }).then(function (res) {
        if (!res.ok) throw new Error("Request failed: " + res.status);
        form.reset();
        showStatus("ok", "<span>Thank you — your enquiry has reached us. A member of the team will respond shortly.</span>");
      }).catch(function () {
        showStatus("err", "<span>We could not send that automatically. Please email <a href=\"mailto:" + CONTACT_EMAIL + "\">" + CONTACT_EMAIL + "</a> and we will pick it up right away.</span>");
      }).then(function () {
        setBusy(false);
      });
    });

    // Deep link: contact.html?service=aml preselects the service
    var params = new URLSearchParams(window.location.search);
    var wanted = params.get("service");
    if (wanted) {
      var select = $("#service", form);
      if (select) {
        $$("option", select).forEach(function (opt) {
          if (opt.value.toLowerCase() === wanted.toLowerCase()) select.value = opt.value;
        });
      }
    }
  }

  /* ----------------------------------------------------------------------
     10. Footer year
     -------------------------------------------------------------------- */
  function initYear() {
    $$("[data-year]").forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
    });
  }

  /* ----------------------------------------------------------------------
     Boot
     -------------------------------------------------------------------- */
  function boot() {
    initScrollChrome();
    initDrawer();
    initReveal();
    initCounters();
    initCardGlow();
    initMarquee();
    initScrollspy();
    initAccordion();
    initForm();
    initYear();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
