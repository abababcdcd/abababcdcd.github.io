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
  const closedEyes = new Image();
  closedEyes.src = face.dataset.blinkSrc;
  const blinkReady = closedEyes.decode().then(() => true, () => false);
  const message = pet.querySelector(".home-pet-message");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const motions = [
    ["rotate(-11deg)", "rotate(4deg)"],
    ["translateY(4px) scale(1.02, 0.94)", "translateY(-2px)"],
    ["translateY(-9px) rotate(6deg)", "translateY(1px) rotate(-3deg)"],
  ];
  let nextMotion = 0;
  let latestClick = 0;
  let animation;
  let reopen;
  let dismissal;

  button.addEventListener("click", async () => {
    const click = ++latestClick;
    message.textContent = "喵。";
    clearTimeout(dismissal);
    dismissal = setTimeout(() => { message.textContent = ""; }, 2600);

    animation?.cancel();
    clearTimeout(reopen);
    if (reducedMotion.matches) {
      face.src = openEyes;
      return;
    }

    const transforms = ["none", ...motions[nextMotion], "none"];
    nextMotion = (nextMotion + 1) % motions.length;
    animation = button.animate(transforms.map((transform) => ({ transform })), {
      duration: 430,
      easing: "ease-out",
    });

    if (await blinkReady && click === latestClick && !reducedMotion.matches) {
      face.src = closedEyes.src;
      reopen = setTimeout(() => { face.src = openEyes; }, 180);
    }
  });
})();
