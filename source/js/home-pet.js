(() => {
  const pet = document.querySelector(".home-pet");
  if (!pet) return;

  const button = pet.querySelector(".home-pet-button");
  const message = pet.querySelector(".home-pet-message");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let animation;
  let dismissal;

  button.addEventListener("click", () => {
    message.textContent = "喵，欢迎来小窝！";
    clearTimeout(dismissal);
    dismissal = setTimeout(() => { message.textContent = ""; }, 2600);

    if (!reducedMotion.matches) {
      animation?.cancel();
      animation = button.animate([
        { transform: "translateY(0) rotate(0)" },
        { transform: "translateY(-8px) rotate(-6deg)" },
        { transform: "translateY(-3px) rotate(5deg)" },
        { transform: "translateY(0) rotate(0)" },
      ], { duration: 440, easing: "ease-out" });
    }
  });
})();
