(() => {
  const profile = document.getElementById("home-profile");
  const card = profile.querySelector("details");
  const toggle = card.querySelector("summary");
  const narrow = matchMedia("(max-width: 991.98px)");
  const profileHash = "#home-profile";

  const setDefault = () => {
    card.open = !narrow.matches || location.hash === profileHash;
  };
  setDefault();
  narrow.addEventListener("change", setDefault);
  window.addEventListener("hashchange", () => {
    if (location.hash === profileHash) card.open = true;
  });

  document.addEventListener("click", (event) => {
    if (!narrow.matches || !card.open) return;
    if (!profile.contains(event.target) || event.target.closest(".home-profile-links a")) {
      card.open = false;
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && card.open && (narrow.matches || card.contains(event.target))) {
      card.open = false;
      toggle.focus();
    }
  });
})();

(() => {
  const pet = document.querySelector(".home-pet");
  if (!pet) return;

  const button = pet.querySelector(".home-pet-button");
  const face = button.querySelector("img");
  const openEyes = face.src;
  const message = pet.querySelector(".home-pet-message");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const expressions = [
    [face.dataset.blinkSrc, 190],
    [face.dataset.winkSrc, 670],
    [face.dataset.alertSrc, 750],
  ].map(([source, hold]) => {
    const image = new Image();
    image.src = source;
    return { hold, ready: image.decode().then(() => image.src, () => null) };
  });
  const bounce = [
    { transform: "scale(1.16, 0.83)", offset: 0.22, easing: "cubic-bezier(0.2, 0.72, 0.4, 1)" },
    { transform: "scale(0.9, 1.14)", offset: 0.49, easing: "ease-in-out" },
    { transform: "scale(1.04, 0.97)", offset: 0.74, easing: "ease-in-out" },
    { transform: "scale(1)", offset: 1 },
  ];
  const quotes = [
    "喵，我在。",
    "这个靠窗的位置给你留着。",
    "嗯？雪又下大了？",
    "晒到太阳就很满足。",
    "我在数窗外的雪花。数到三就忘了。",
    "窗外很冷，屋里刚好。",
    "写累了就歇一会儿。",
    "走慢一点，雪地里有脚印。",
    "这个冬天也要认真晒太阳。",
    "今天的雪很安静。",
    "别急，先把这一行写完。",
    "猫的工作就是守着窗边的阳光。",
  ];
  let latestClick = 0;
  let animation;
  let reopen;
  let dismissal;

  button.addEventListener("click", async () => {
    const click = ++latestClick;
    const index = click - 1;
    message.textContent = quotes[index % quotes.length];
    clearTimeout(dismissal);
    dismissal = setTimeout(() => { message.textContent = ""; }, 3600);

    const transform = getComputedStyle(face).transform;
    animation?.cancel();
    clearTimeout(reopen);
    if (reducedMotion.matches) {
      face.src = openEyes;
      return;
    }

    // Start from the current shape when another tap interrupts a bounce.
    animation = face.animate([{ transform, offset: 0, easing: "ease-in-out" }, ...bounce], 560);

    const expression = expressions[index % expressions.length];
    const source = await expression.ready;
    if (click !== latestClick || reducedMotion.matches) return;
    face.src = source || openEyes;
    reopen = setTimeout(() => { face.src = openEyes; }, expression.hold);
  });
})();
