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
  const viewport = window.visualViewport;
  const positionKey = "home-pet-position";
  const edge = 8;
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  let position;
  let gesture;
  let skipPointerClick = false;

  function movementArea() {
    const left = (viewport?.offsetLeft ?? 0) + edge;
    const top = (viewport?.offsetTop ?? 0) + edge;
    const width = (viewport?.width ?? document.documentElement.clientWidth) - 2 * edge;
    const height = (viewport?.height ?? document.documentElement.clientHeight) - 2 * edge;
    return {
      left, top, width, height,
      travelX: Math.max(0, width - pet.offsetWidth),
      travelY: Math.max(0, height - pet.offsetHeight),
    };
  }

  function placeMessage(area = movementArea()) {
    if (!message.textContent) return;
    message.style.maxWidth = `${area.width}px`;
    const cat = pet.getBoundingClientRect();
    const bubble = message.getBoundingClientRect();
    const gap = 6;
    const centered = cat.left + (cat.width - bubble.width) / 2;
    const left = clamp(centered, area.left, area.left + area.width - bubble.width);
    const above = cat.top - bubble.height - gap;
    const below = cat.bottom + gap;
    const maxTop = area.top + area.height - bubble.height;
    const top = above >= area.top ? above : Math.min(below, maxTop);
    message.style.inset = `${Math.max(top, area.top) - cat.top}px auto auto ${left - cat.left}px`;
  }

  function movePet(left, top, area = movementArea()) {
    const x = clamp(left - area.left, 0, area.travelX);
    const y = clamp(top - area.top, 0, area.travelY);
    pet.style.inset = `${area.top + y}px auto auto ${area.left + x}px`;
    position = {
      x: area.travelX ? x / area.travelX : position?.x ?? 0,
      y: area.travelY ? y / area.travelY : position?.y ?? 0,
    };
    placeMessage(area);
  }

  function savePosition() {
    try {
      localStorage.setItem(positionKey, JSON.stringify(position));
    } catch {
      // The pet still moves when browser storage is unavailable.
    }
  }

  function fitToViewport() {
    const area = movementArea();
    if (position) {
      movePet(area.left + area.travelX * position.x, area.top + area.travelY * position.y, area);
    } else {
      placeMessage(area);
    }
  }

  try {
    const saved = JSON.parse(localStorage.getItem(positionKey));
    if (Number.isFinite(saved?.x) && Number.isFinite(saved?.y)) position = saved;
  } catch {
    // Use the default corner when a saved position can't be read.
  }
  fitToViewport();
  window.addEventListener("resize", fitToViewport);
  viewport?.addEventListener("resize", fitToViewport);
  viewport?.addEventListener("scroll", fitToViewport);

  button.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || event.button !== 0 || gesture) return;
    const { left, top } = pet.getBoundingClientRect();
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, left, top, moved: false };
    skipPointerClick = false;
    button.setPointerCapture(event.pointerId);
  });

  button.addEventListener("pointermove", (event) => {
    if (gesture?.id !== event.pointerId) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (!gesture.moved) {
      if (Math.hypot(dx, dy) < 6) return;
      gesture.moved = true;
      skipPointerClick = true;
      button.classList.add("is-dragging");
    }
    movePet(gesture.left + dx, gesture.top + dy);
  });

  function endGesture(event) {
    if (gesture?.id !== event.pointerId) return;
    const { moved } = gesture;
    gesture = null;
    button.classList.remove("is-dragging");
    if (moved) {
      savePosition();
    } else if (event.type === "pointerup" && event.pointerType === "touch") {
      // A browser can suppress the native click on the first tap after a drag.
      skipPointerClick = true;
      greet();
    }
  }

  button.addEventListener("pointerup", endGesture);
  button.addEventListener("pointercancel", endGesture);
  button.addEventListener("lostpointercapture", endGesture);

  const directions = new Map([
    ["ArrowLeft", [-1, 0]], ["ArrowRight", [1, 0]],
    ["ArrowUp", [0, -1]], ["ArrowDown", [0, 1]],
  ]);
  button.addEventListener("keydown", (event) => {
    const direction = directions.get(event.key);
    if (!direction || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    event.preventDefault();
    const [dx, dy] = direction;
    const { left, top } = pet.getBoundingClientRect();
    movePet(left + dx * 16, top + dy * 16);
    savePosition();
  });

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  function preloadFace(source) {
    const image = new Image();
    image.src = source;
    return image.decode().then(() => image.src, () => null);
  }

  const blink = { ready: preloadFace(face.dataset.blinkSrc), hold: 190 };
  const relaxed = { ready: blink.ready, hold: 640 };
  const wink = { ready: preloadFace(face.dataset.winkSrc), hold: 670 };
  const surprised = { ready: preloadFace(face.dataset.alertSrc), hold: 750 };
  const bounce = [
    { transform: "scale(1.16, 0.83)", offset: 0.22, easing: "cubic-bezier(0.2, 0.72, 0.4, 1)" },
    { transform: "scale(0.9, 1.14)", offset: 0.49, easing: "ease-in-out" },
    { transform: "scale(1.04, 0.97)", offset: 0.74, easing: "ease-in-out" },
    { transform: "scale(1)", offset: 1 },
  ];
  const reactions = [
    ["喵，我在。", blink],
    ["这个靠窗的位置给你留着。", wink],
    ["嗯？雪又下大了？", surprised],
    ["晒到太阳就很满足。", relaxed],
    ["我在数窗外的雪花。数到三就忘了。", wink],
    ["窗外很冷，屋里刚好。", relaxed],
    ["写累了就歇一会儿。", blink],
    ["走慢一点，雪地里有脚印。", null],
    ["这个冬天也要认真晒太阳。", relaxed],
    ["今天的雪很安静。", relaxed],
    ["别急，先把这一行写完。", null],
    ["猫的工作就是守着窗边的阳光。", wink],
  ];
  let latestClick = 0;
  let animation;
  let reopen;
  let dismissal;

  async function greet() {
    const click = ++latestClick;
    const [quote, expression] = reactions[(click - 1) % reactions.length];
    message.textContent = quote;
    placeMessage();
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

    const source = await expression?.ready;
    if (click !== latestClick || reducedMotion.matches) return;
    face.src = source || openEyes;
    if (source) reopen = setTimeout(() => { face.src = openEyes; }, expression.hold);
  }

  button.addEventListener("click", (event) => {
    if (skipPointerClick && event.detail > 0) return;
    greet();
  });
})();
