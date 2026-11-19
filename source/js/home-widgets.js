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
  const head = button.querySelector(".home-pet-face");
  const face = head.querySelector("img");
  const canvas = head.querySelector("canvas");
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

  function createFaceRenderer() {
    const drawing = canvas.getContext("2d", { willReadFrequently: true });
    if (!drawing) return null;
    drawing.drawImage(face, 0, 0, canvas.width, canvas.height);

    const mouth = { left: 128, top: 207, width: 64, height: 41 };
    const eyes = { left: 77, top: 121, width: 164, height: 60 };
    const read = ({ left, top, width, height }) => drawing.getImageData(left, top, width, height);
    const originalMouth = read(mouth);
    const shapedMouth = drawing.createImageData(mouth.width, mouth.height);
    shapedMouth.data.set(originalMouth.data);
    const originalEyes = read(eyes);
    const scratch = document.createElement("canvas");
    scratch.width = eyes.width;
    scratch.height = eyes.height;
    const samples = scratch.getContext("2d", { willReadFrequently: true });
    if (!samples) return null;
    const radius = (mouth.width - 1) / 2;
    const mouthWeights = Array.from({ length: mouth.width }, (_, x) => (1 - ((x - radius) / radius) ** 2) ** 2);

    function prepareEyes(frame) {
      samples.clearRect(0, 0, eyes.width, eyes.height);
      samples.drawImage(frame, -eyes.left, -eyes.top, canvas.width, canvas.height);
      const pixels = samples.getImageData(0, 0, eyes.width, eyes.height);
      for (let y = 0; y < eyes.height; y++) {
        for (let x = 0; x < eyes.width; x++) {
          const distance = Math.hypot(Math.min(Math.abs(x - 35), Math.abs(x - 128)) / 35, (y - 31) / 29);
          const weight = clamp((1 - distance) / 0.25, 0, 1);
          const offset = (y * eyes.width + x) * 4;
          for (let channel = offset; channel < offset + 3; channel++) {
            const base = originalEyes.data[channel];
            pixels.data[channel] = base + (pixels.data[channel] - base) * weight;
          }
          pixels.data[offset + 3] = originalEyes.data[offset + 3];
        }
      }
      return pixels;
    }

    function showEyes(pixels = originalEyes) {
      drawing.putImageData(pixels, eyes.left, eyes.top);
    }

    function moveMouth(amount) {
      if (amount === 0) {
        drawing.putImageData(originalMouth, mouth.left, mouth.top);
        return;
      }
      const lip = 14;
      // Resample the same muzzle, with the drawing pinned at the nose and chin.
      for (let y = 0; y < mouth.height; y++) {
        const vertical = y <= lip ? y / lip : (mouth.height - 1 - y) / (mouth.height - 1 - lip);
        const shift = 6 * amount * vertical;
        for (let x = 0; x < mouth.width; x++) {
          const sourceY = y - shift * mouthWeights[x];
          const row = Math.floor(sourceY);
          const mix = sourceY - row;
          const upper = (row * mouth.width + x) * 4;
          const lower = (Math.min(row + 1, mouth.height - 1) * mouth.width + x) * 4;
          const offset = (y * mouth.width + x) * 4;
          for (let channel = 0; channel < 3; channel++) {
            const color = originalMouth.data[upper + channel];
            shapedMouth.data[offset + channel] = color + (originalMouth.data[lower + channel] - color) * mix;
          }
        }
      }
      drawing.putImageData(shapedMouth, mouth.left, mouth.top);
    }

    canvas.hidden = false;
    face.hidden = true;
    return { prepareEyes, showEyes, moveMouth };
  }

  let renderer;
  const renderReady = face.decode().then(() => {
    renderer = createFaceRenderer();
    return renderer;
  }).catch(() => null);

  async function preloadEyes(source) {
    const image = new Image();
    image.src = source;
    await image.decode();
    const drawing = await renderReady;
    return drawing?.prepareEyes(image);
  }

  const blink = { ready: preloadEyes(face.dataset.blinkSrc).catch(() => null), hold: 190 };
  const relaxed = { ready: blink.ready, hold: 640 };
  const wink = { ready: preloadEyes(face.dataset.winkSrc).catch(() => null), hold: 670 };
  const surprised = { ready: preloadEyes(face.dataset.alertSrc).catch(() => null), hold: 750 };
  const bounce = [
    { transform: "scale(1.16, 0.83)", offset: 0.22, easing: "cubic-bezier(0.2, 0.72, 0.4, 1)" },
    { transform: "scale(0.9, 1.14)", offset: 0.49, easing: "ease-in-out" },
    { transform: "scale(1.04, 0.97)", offset: 0.74, easing: "ease-in-out" },
    { transform: "scale(1)", offset: 1 },
  ];
  const soft = 0.55;
  const accent = 0.85;
  const closed = 0;
  // Each mouth pose is one beat. The eye expression lands on the accented word or the last pause.
  const reactions = [
    ["喵，我在。", [accent, soft, closed, soft], blink, 520],
    ["这个靠窗的位置给你留着。", [soft, soft, closed, soft, soft, closed, soft], relaxed, 940],
    ["嗯？雪又下大了？", [soft, closed, closed, accent, soft, accent], surprised, 410],
    ["晒到太阳就很满足。", [soft, soft, closed, soft, soft], relaxed, 700],
    ["我在数窗外的雪花。数到三就忘了。", [soft, soft, accent, soft, closed, closed, soft, accent, soft, closed, soft], wink, 1280],
    ["窗外很冷，屋里刚好。", [soft, soft, closed, closed, soft, soft], relaxed, 780],
    ["写累了就歇一会儿。", [soft, soft, closed, soft, soft], relaxed, 620],
    ["走慢一点，雪地里有脚印。", [soft, closed, closed, soft, accent, soft], blink, 820],
    ["这个冬天也要认真晒太阳。", [soft, soft, closed, accent, soft, soft], relaxed, 780],
    ["今天的雪很安静。", [soft, soft, closed, soft, soft], relaxed, 700],
    ["别急，先把这一行写完。", [soft, closed, closed, soft, soft, soft], blink, 850],
    ["猫的工作就是守着窗边的阳光。", [soft, soft, closed, accent, soft, closed, soft], wink, 920],
  ];
  let latestClick = 0;
  let animation;
  let mouthFrame = 0;
  let eyeTimer;
  let dismissal;

  async function speak(beats, click) {
    const drawing = await renderReady;
    if (!drawing || click !== latestClick || reducedMotion.matches) return;
    const poses = [closed, ...beats, closed];
    let start;
    function drawFrame(time) {
      start ??= time;
      const phase = (time - start) / 135;
      const beat = Math.floor(phase);
      if (beat >= poses.length - 1 || reducedMotion.matches) {
        drawing.moveMouth(closed);
        return;
      }
      const progress = phase - beat;
      const blend = progress ** 2 * (3 - 2 * progress);
      drawing.moveMouth(poses[beat] + (poses[beat + 1] - poses[beat]) * blend);
      mouthFrame = requestAnimationFrame(drawFrame);
    }
    mouthFrame = requestAnimationFrame(drawFrame);
  }

  function greet() {
    const click = ++latestClick;
    const [quote, beats, eyes, eyeDelay] = reactions[(click - 1) % reactions.length];
    message.textContent = quote;
    placeMessage();
    clearTimeout(dismissal);
    dismissal = setTimeout(() => { message.textContent = ""; }, 3600);

    const transform = getComputedStyle(head).transform;
    animation?.cancel();
    cancelAnimationFrame(mouthFrame);
    clearTimeout(eyeTimer);
    renderer?.moveMouth(closed);
    renderer?.showEyes();
    if (reducedMotion.matches) return;

    // Start from the current shape when another tap interrupts a bounce.
    animation = head.animate([{ transform, offset: 0, easing: "ease-in-out" }, ...bounce], 560);
    speak(beats, click);
    eyeTimer = setTimeout(async () => {
      const pixels = await eyes.ready;
      if (!pixels || click !== latestClick || reducedMotion.matches) return;
      renderer.showEyes(pixels);
      eyeTimer = setTimeout(() => renderer.showEyes(), eyes.hold);
    }, eyeDelay);
  }

  button.addEventListener("click", (event) => {
    if (skipPointerClick && event.detail > 0) return;
    greet();
  });
})();
