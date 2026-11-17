const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");

const themeToggle = document.querySelector(".theme-toggle");
themeToggle.hidden = false;
themeToggle.addEventListener("click", () => {
  const dark = document.documentElement.dataset.theme !== "dark";
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  themeToggle.setAttribute("aria-pressed", String(dark));
  document.querySelector('meta[name="theme-color"]').content = dark ? "#201D22" : "#F7F3ED";
});

const stage = document.querySelector(".hero__stage");
const hero = stage.closest(".hero");
const slides = [...stage.querySelectorAll(".hero__slide")];
const heroControls = document.querySelector(".hero__controls");
const slideButtons = [...heroControls.querySelectorAll(".hero__dots button")];
let slideIndex = 0;
let rotationTimer;
let heroInView = true;

function showSlide(index) {
  slideIndex = index;
  slides.forEach((slide, position) => {
    const active = position === index;
    slide.classList.toggle("is-active", active);
    slide.setAttribute("aria-hidden", String(!active));
    slideButtons[position].setAttribute("aria-current", String(active));
  });
}

function syncRotation() {
  clearInterval(rotationTimer);
  if (!motionPreference.matches && !document.hidden && heroInView) {
    rotationTimer = setInterval(() => showSlide((slideIndex + 1) % slides.length), 6500);
  }
}

heroControls.hidden = false;
slideButtons.forEach((button, index) => {
  button.addEventListener("click", () => {
    showSlide(index);
    syncRotation();
  });
});
if ("IntersectionObserver" in window) {
  new IntersectionObserver(([entry]) => {
    heroInView = entry.isIntersecting;
    syncRotation();
  }).observe(hero);
}
document.addEventListener("visibilitychange", syncRotation);
motionPreference.addEventListener("change", syncRotation);
syncRotation();

(function setupHeroHover() {
  const copy = document.querySelector(".hero__copy");
  const signature = copy?.querySelector(".hero__signature");
  const stroke = signature?.querySelector(".hero__signature-stroke");
  if (!stroke) return;

  const burstDuration = 4200;
  let burstTimer;
  let embers;

  function trackWarmth(event) {
    if (event.pointerType !== "mouse" || motionPreference.matches) return;
    const { left, top } = copy.getBoundingClientRect();
    copy.style.setProperty("--warmth-x", `${event.clientX - left}px`);
    copy.style.setProperty("--warmth-y", `${event.clientY - top}px`);
    if (!copy.classList.contains("is-warming")) copy.classList.add("is-warming");
  }

  function clearWarmth() {
    copy.classList.remove("is-warming");
    copy.style.removeProperty("--warmth-x");
    copy.style.removeProperty("--warmth-y");
  }

  function clearBurst() {
    clearTimeout(burstTimer);
    embers?.remove();
    embers = null;
    signature.classList.remove("is-stoked");
  }

  function playBurst() {
    if (motionPreference.matches) return;

    const wasStoked = signature.classList.contains("is-stoked");
    clearBurst();
    // Apply the reset before replaying the CSS animation on the same name.
    if (wasStoked) stroke.getBoundingClientRect();

    signature.classList.add("is-stoked", "has-flared");
    embers = document.createElement("span");
    embers.className = "hero__hover-embers";
    embers.setAttribute("aria-hidden", "true");
    for (let index = 0; index < 8; index += 1) {
      embers.append(document.createElement("span"));
    }
    stroke.append(embers);
    burstTimer = setTimeout(clearBurst, burstDuration);
  }

  copy.addEventListener("pointerenter", trackWarmth);
  copy.addEventListener("pointermove", trackWarmth);
  copy.addEventListener("pointerleave", (event) => {
    if (event.pointerType === "mouse") copy.classList.remove("is-warming");
  });

  signature.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "mouse") playBurst();
  });
  signature.addEventListener("click", playBurst);

  function updateMotionPreference({ matches }) {
    signature.setAttribute("aria-disabled", String(matches));
    if (!matches) return;
    clearWarmth();
    clearBurst();
  }

  motionPreference.addEventListener("change", updateMotionPreference);
  updateMotionPreference(motionPreference);

  function resetHero() {
    window.scrollTo({ top: 0, behavior: "instant" });
    showSlide(0);
    syncRotation();
    clearWarmth();
    clearBurst();
    signature.classList.remove("has-flared");

    if (motionPreference.matches) return;
    for (const animation of hero.getAnimations?.({ subtree: true }) ?? []) {
      if (animation.transitionProperty === "opacity" && slides.includes(animation.effect?.target)) {
        animation.finish();
      } else if (animation.animationName?.startsWith("hero-")) {
        animation.currentTime = 0;
        animation.play();
      }
    }
  }

  document.querySelectorAll('.brand[href="#top"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey ||
        event.shiftKey || event.altKey) return;
      // Let the fragment link update history and focus before replaying the hero.
      requestAnimationFrame(resetHero);
    });
  });
})();

(function setupServiceBanner() {
  const banner = document.querySelector(".service-banner");
  const track = banner?.querySelector(".service-banner__track");
  const list = track?.querySelector(".service-banner__list");
  if (!list) return;

  const copy = list.cloneNode(true);
  copy.setAttribute("aria-hidden", "true");
  copy.inert = true;
  let inView = !("IntersectionObserver" in window);

  function syncPlayback() {
    const playing = !motionPreference.matches && inView && !document.hidden;
    banner.classList.toggle("is-playing", playing);
  }

  function configureMotion() {
    const enabled = !motionPreference.matches;
    if (enabled) {
      banner.dataset.motion = "on";
      track.append(copy);
    } else {
      delete banner.dataset.motion;
      copy.remove();
    }
    syncPlayback();
  }

  document.addEventListener("visibilitychange", syncPlayback);
  motionPreference.addEventListener("change", configureMotion);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      syncPlayback();
    }).observe(banner);
  }
  configureMotion();
})();

function setupGallery(gallery) {
  const controls = document.querySelector(".gallery-controls");
  const previous = controls.querySelector(".gallery-prev");
  const next = controls.querySelector(".gallery-next");
  const cards = [...gallery.querySelectorAll(".card")];
  const copies = cards.map((card) => {
    const copy = card.cloneNode(true);
    copy.setAttribute("aria-hidden", "true");
    copy.inert = true;
    return copy;
  });
  const pixelsPerSecond = 34;
  const resumeDelay = 2000;
  let loopWidth = 0;
  let inView = !("IntersectionObserver" in window);
  let hovered = false;
  let waiting = false;
  let resumeTimer;
  let frame = null;
  let lastFrame = 0;
  let position = 0;
  let drag = null;

  function updateArrows() {
    previous.setAttribute("aria-disabled", String(!loopWidth && gallery.scrollLeft <= 1));
    const atEnd = gallery.scrollLeft >= gallery.scrollWidth - gallery.clientWidth - 1;
    next.setAttribute("aria-disabled", String(!loopWidth && atEnd));
  }

  function measureLoop() {
    loopWidth = copies[0].isConnected
      ? copies[0].getBoundingClientRect().left - cards[0].getBoundingClientRect().left
      : 0;
    updateArrows();
  }

  function slide(timestamp) {
    if (lastFrame) {
      const elapsed = Math.min(timestamp - lastFrame, 64) / 1000;
      // The first copy is exactly one full set, including the inter-card gap, from the first card.
      position = (position + elapsed * pixelsPerSecond) % loopWidth;
      gallery.scrollLeft = position;
    }
    lastFrame = timestamp;
    frame = requestAnimationFrame(slide);
  }

  function syncAutoplay() {
    const canPlay = loopWidth && inView && !document.hidden &&
      !hovered && !waiting && !drag && !gallery.matches(":focus-within");
    if (canPlay && frame === null) {
      position = gallery.scrollLeft % loopWidth;
      lastFrame = 0;
      frame = requestAnimationFrame(slide);
    } else if (!canPlay && frame !== null) {
      cancelAnimationFrame(frame);
      frame = null;
    }
  }

  function waitForManualScroll() {
    if (!loopWidth) return;
    clearTimeout(resumeTimer);
    waiting = true;
    syncAutoplay();
    resumeTimer = setTimeout(() => {
      waiting = false;
      syncAutoplay();
    }, resumeDelay);
  }

  function configureMotion() {
    const enableLoop = !motionPreference.matches;
    const offset = loopWidth ? gallery.scrollLeft % loopWidth : gallery.scrollLeft;
    gallery.classList.toggle("is-looping", enableLoop);
    if (enableLoop) {
      gallery.append(...copies);
    } else {
      copies.forEach((copy) => copy.remove());
    }
    gallery.scrollLeft = offset;
    measureLoop();
    syncAutoplay();
  }

  function advance(event, direction) {
    if (event.currentTarget.getAttribute("aria-disabled") === "true") return;
    waitForManualScroll();
    const step = cards[1].getBoundingClientRect().left - cards[0].getBoundingClientRect().left;
    if (!loopWidth) {
      gallery.scrollBy({ left: step * direction, behavior: "instant" });
      return;
    }
    const current = gallery.scrollLeft % loopWidth;
    const destination = (Math.round(current / step) + direction) * step;
    const wrap = destination < 0 ? loopWidth : 0;
    gallery.scrollLeft = current + wrap;
    gallery.scrollTo({ left: destination + wrap, behavior: "smooth" });
  }

  controls.hidden = false;
  previous.addEventListener("click", (event) => advance(event, -1));
  next.addEventListener("click", (event) => advance(event, 1));

  gallery.addEventListener("scroll", () => {
    if (frame === null) waitForManualScroll();
    if (!loopWidth) updateArrows();
  }, { passive: true });
  gallery.addEventListener("wheel", waitForManualScroll, { passive: true });
  gallery.addEventListener("focus", syncAutoplay);
  gallery.addEventListener("blur", syncAutoplay);
  gallery.addEventListener("pointerenter", (event) => {
    if (event.pointerType !== "mouse") return;
    hovered = true;
    syncAutoplay();
  });
  gallery.addEventListener("pointerleave", (event) => {
    if (event.pointerType !== "mouse") return;
    hovered = false;
    syncAutoplay();
  });
  gallery.addEventListener("pointerdown", (event) => {
    waitForManualScroll();
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    event.preventDefault();
    drag = { pointer: event.pointerId, x: event.clientX, offset: gallery.scrollLeft };
    gallery.setPointerCapture(event.pointerId);
    gallery.classList.add("is-dragging");
  });
  gallery.addEventListener("pointermove", (event) => {
    if (event.pointerId !== drag?.pointer) return;
    gallery.scrollLeft = drag.offset + drag.x - event.clientX;
  });
  gallery.addEventListener("lostpointercapture", () => {
    drag = null;
    gallery.classList.remove("is-dragging");
    waitForManualScroll();
  });

  window.addEventListener("resize", () => {
    measureLoop();
    position = loopWidth ? gallery.scrollLeft % loopWidth : gallery.scrollLeft;
    syncAutoplay();
  });
  document.addEventListener("visibilitychange", syncAutoplay);
  motionPreference.addEventListener("change", configureMotion);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      syncAutoplay();
    }).observe(gallery);
  }
  configureMotion();
}

setupGallery(document.getElementById("gallery"));

const bookingForm = document.getElementById("booking-form");
const enquiry = document.getElementById("enquiry");
const summary = document.getElementById("enquiry-details");
const enquiryWhatsApp = document.getElementById("enquiry-whatsapp");
const fields = [...bookingForm.querySelectorAll("[required]")];
const copyButton = document.getElementById("copy-enquiry");
const copyStatus = document.getElementById("copy-status");

function today() {
  const current = new Date();
  const month = String(current.getMonth() + 1).padStart(2, "0");
  const day = String(current.getDate()).padStart(2, "0");
  return current.getFullYear() + "-" + month + "-" + day;
}

const fieldMessages = {
  name: "Enter your name.",
  event: "Choose an occasion.",
  date: "Choose today or a future date.",
  message: "Add a few details about your occasion.",
};

function validateField(field) {
  const valid = Boolean(field.value.trim()) && field.validity.valid;
  document.getElementById(field.id + "-error").textContent = valid ? "" : fieldMessages[field.name];
  field.setAttribute("aria-invalid", String(!valid));
  return valid;
}

bookingForm.elements.date.min = today();
bookingForm.hidden = false;
fields.forEach((field) => {
  field.addEventListener("input", () => {
    if (field.getAttribute("aria-invalid") === "true") validateField(field);
  });
});

bookingForm.addEventListener("submit", (event) => {
  event.preventDefault();
  bookingForm.elements.date.min = today();
  const invalidFields = fields.filter((field) => !validateField(field));
  if (invalidFields.length) {
    invalidFields[0].focus();
    return;
  }

  const values = new FormData(bookingForm);
  const preferredDate = new Date(values.get("date") + "T12:00:00");
  const formattedDate = new Intl.DateTimeFormat("en-KE", { dateStyle: "long" }).format(preferredDate);
  summary.value = [
    "Name: " + values.get("name").trim(),
    "Occasion: " + values.get("event"),
    "Preferred date: " + formattedDate,
    "Details: " + values.get("message").trim(),
  ].join("\n");
  const message = "Hi Chef Jack, I’d like to enquire about a booking.\n\n" + summary.value;
  const chatUrl = new URL(enquiryWhatsApp.href);
  chatUrl.search = "text=" + encodeURIComponent(message);
  enquiryWhatsApp.href = chatUrl.href;

  copyStatus.textContent = "";
  bookingForm.hidden = true;
  enquiry.hidden = false;
  document.getElementById("enquiry-title").focus();
  enquiryWhatsApp.click();
});

if (navigator.clipboard?.writeText) {
  copyButton.hidden = false;
  copyButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(summary.value);
      copyStatus.textContent = "Enquiry details copied.";
    } catch {
      summary.select();
      copyStatus.textContent = "Copy the selected text to save your enquiry details.";
    }
  });
}

document.getElementById("edit-enquiry").addEventListener("click", () => {
  enquiry.hidden = true;
  bookingForm.hidden = false;
  bookingForm.elements.name.focus();
});

if (!motionPreference.matches && "IntersectionObserver" in window) {
  const sectionTitleObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.remove("is-awaiting-entry");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.06 });

  document.querySelectorAll("main > section:not(.hero) h2").forEach((heading) => {
    if (heading.getBoundingClientRect().top < window.innerHeight) return;
    heading.classList.add("section-title-reveal", "is-awaiting-entry");
    sectionTitleObserver.observe(heading);
  });
}

const studioCredit = document.querySelector(".footer__credit-name");
if (studioCredit && "IntersectionObserver" in window) {
  const creditObserver = new IntersectionObserver(([entry]) => {
    studioCredit.classList.toggle("is-in-view", entry.isIntersecting);
  });
  creditObserver.observe(studioCredit);
}
