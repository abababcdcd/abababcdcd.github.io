(() => {
  const panel = document.querySelector(".reading-toc");
  if (!panel) return;

  const list = panel.querySelector(".reading-toc-list");
  const trigger = panel.querySelector("summary");
  const compact = matchMedia("(max-width: 991.98px)");
  const entries = [...list.querySelectorAll(".reading-toc-link")].flatMap((link) => {
    const heading = document.getElementById(decodeURIComponent(link.hash.slice(1)));
    return heading ? [{ heading, link }] : [];
  });
  if (!entries.length) return;

  let active;
  let frame;

  function revealActive() {
    if (!panel.open || !active || !list.clientHeight) return;
    const viewport = list.getBoundingClientRect();
    const target = active.link.getBoundingClientRect();
    if (target.top < viewport.top) list.scrollTop += target.top - viewport.top;
    else if (target.bottom > viewport.bottom) list.scrollTop += target.bottom - viewport.bottom;
  }

  function updateActive() {
    frame = undefined;
    const offset = parseFloat(getComputedStyle(entries[0].heading).scrollMarginTop) + 4;
    let current = entries[0];
    for (const entry of entries) {
      if (entry.heading.getBoundingClientRect().top > offset) break;
      current = entry;
    }
    if (current === active) return;
    active?.link.removeAttribute("aria-current");
    active = current;
    active.link.setAttribute("aria-current", "location");
    revealActive();
  }

  function scheduleUpdate() {
    if (frame === undefined) frame = requestAnimationFrame(updateActive);
  }

  function setLayout() {
    panel.open = !compact.matches;
    scheduleUpdate();
  }

  compact.addEventListener("change", setLayout);
  setLayout();
  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", scheduleUpdate, { passive: true });
  window.addEventListener("load", scheduleUpdate, { once: true });
  window.addEventListener("hashchange", scheduleUpdate);
  panel.addEventListener("toggle", revealActive);

  list.addEventListener("click", (event) => {
    if (compact.matches && event.target.closest(".reading-toc-link")) panel.open = false;
  });
  document.addEventListener("click", (event) => {
    if (compact.matches && panel.open && !panel.contains(event.target)) panel.open = false;
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && compact.matches && panel.open) {
      panel.open = false;
      trigger.focus();
    }
  });
})();
