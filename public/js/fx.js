// Site motion: anime.js (v4, /vendor/anime-4.5.0.min.js) for headline letters and the flag, Motion (v14,
// /vendor/motion-14.14.0.js) for scroll reveals, scroll-linked effects and springs. Loaded with defer on the home page,
// /shop/, every product page and the size guide. Content is never hidden if a script fails, and nothing moves for
// visitors who ask for reduced motion.
// The header tightens after you scroll a little (works with reduced motion too: it is a state, not an animation).
(() => { const set = () => document.documentElement.classList.toggle("scrolled", scrollY > 40); addEventListener("scroll", set, { passive: true }); set(); })();

(() => {
  const M = window.Motion, A = window.anime;
  if (!M || !A || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const ease = [0.2, 0.7, 0.2, 1];
  const inViewport = el => { const r = el.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; };

  // 1. Headlines rise in letter by letter (screen readers keep the whole word via aria-label).
  for (const h of $$(".col-head h1, .info h1, .hero h1, .band q")) {
    if (h.dataset.fx) continue; h.dataset.fx = 1;
    const label = (h.innerText || h.textContent).replace(/\s+/g, " ").trim();
    try {
      const split = A.splitText(h, { words: { wrap: "clip" }, chars: h.matches(".band q") ? false : true });
      h.setAttribute("aria-label", label);
      [...h.children].forEach(c => c.setAttribute("aria-hidden", "true"));
      const parts = split.chars?.length ? split.chars : split.words;
      if (h.matches(".band q")) {
        // the verse band: each word lights up as it scrolls through the screen
        parts.forEach(w => { w.style.opacity = 0.16; w.style.transition = "opacity .25s"; });
        M.scroll(p => { const n = Math.round(p * parts.length * 1.15); parts.forEach((w, i) => { w.style.opacity = i < n ? 1 : 0.16; }); },
          { target: h.closest(".band"), offset: ["start 85%", "center 45%"] });
      } else {
        A.animate(parts, { y: ["110%", "0%"], duration: 900, delay: A.stagger(h.matches(".hero h1") ? 28 : 18, { start: 120 }), ease: "out(4)" });
      }
    } catch (e) { /* leave the headline as it is */ }
  }

  // 2. The flag in the logo waves.
  for (const svg of $$(".logo svg, .brand svg")) {
    const cloth = svg.querySelector("path"); if (!cloth) continue;
    cloth.style.transformBox = "fill-box"; cloth.style.transformOrigin = "0% 50%";
    A.animate(cloth, { skewY: [0, -5, 2, 0], scaleX: [1, 0.94, 0.98, 1], duration: 2600, loop: true, ease: "inOutSine" });
  }

  // 3. Sections and cards slide up as they come into view, in a quick stagger per row.
  const REVEAL = ".col-head p, .filters, .card, .trust, .acc, .recs h2, .guide section, .ftr .cols > *, section h2.big, .lede, .step, .occ li, details";
  const reveal = el => {
    if (el.dataset.rv) return; el.dataset.rv = 1;
    const siblings = [...el.parentElement.children].filter(c => c.matches(REVEAL));
    const delay = Math.min(siblings.indexOf(el), 6) * 0.06;
    const play = () => M.animate(el, { opacity: [0, 1], y: [28, 0] }, { duration: 0.8, delay, ease });
    if (inViewport(el)) return play();
    el.style.opacity = 0;
    M.inView(el, () => { play(); }, { margin: "0px 0px -8% 0px" });
  };
  const scan = root => $$(REVEAL, root).forEach(reveal);
  scan(document);
  // the home page draws its product cards after loading prices: reveal those too
  const grid = document.getElementById("line-grid");
  if (grid) new MutationObserver(() => scan(grid)).observe(grid, { childList: true });

  // 4. Product photos open like a curtain; the main photo drifts slowly as you scroll.
  const figs = $$(".gallery figure");
  if (figs.length) {
    M.animate(figs, { clipPath: ["inset(0 0 100% 0)", "inset(0 0 0% 0)"] }, { duration: 1, delay: M.stagger(0.09), ease });
    const main = figs[0].querySelector("img");
    if (main && matchMedia("(min-width: 901px)").matches) M.scroll(M.animate(main, { scale: [1.06, 1], y: ["-2%", "3%"] }, { ease: "linear" }), { target: figs[0] });
  }

  // 5. Cards tilt toward the cursor (mouse only).
  if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
    document.addEventListener("pointermove", e => {
      const ph = e.target.closest?.(".card .ph"); if (!ph) return;
      const r = ph.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      M.animate(ph, { rotateY: x * 6, rotateX: -y * 6 }, { type: "spring", stiffness: 260, damping: 22 });
    });
    document.addEventListener("pointerout", e => {
      const ph = e.target.closest?.(".card .ph"); if (ph && !ph.contains(e.relatedTarget)) M.animate(ph, { rotateY: 0, rotateX: 0 }, { type: "spring", stiffness: 200, damping: 20 });
    });
    $$(".card .ph").forEach(ph => { ph.style.transformPerspective = "900px"; ph.parentElement.style.perspective = "900px"; });
  }

  // 6. Add to bag: the button presses in, the bag count springs.
  document.addEventListener("click", e => {
    const add = e.target.closest?.("#add, .buy");
    if (!add || add.disabled) return;
    M.animate(add, { scale: [1, 0.96, 1] }, { duration: 0.35, ease });
    setTimeout(() => { const c = document.getElementById("bagc") || document.getElementById("bag-count"); if (c && !c.hidden) M.animate(c, { scale: [1, 1.7, 1] }, { type: "spring", stiffness: 500, damping: 12 }); }, 60);
    const added = document.getElementById("added");
    if (added) setTimeout(() => M.animate(added, { opacity: [0, 1], y: [10, 0] }, { duration: 0.4, ease }), 20);
  });

  // 7. The size chart drawer slides in from the right; its rows follow.
  const sheet = document.querySelector("dialog.sheet");
  if (sheet) new MutationObserver(() => {
    if (!sheet.open) return;
    M.animate(sheet, { x: ["100%", "0%"] }, { duration: 0.55, ease });
    M.animate($$("tr, .howto > div", sheet), { opacity: [0, 1], x: [16, 0] }, { delay: M.stagger(0.035, { startDelay: 0.2 }), duration: 0.4 });
  }).observe(sheet, { attributes: true, attributeFilter: ["open"] });

  // 8. The big footer line drifts up as the page ends.
  const big = document.querySelector(".ftr .big");
  if (big) M.scroll(M.animate(big, { y: [60, 0], opacity: [0.3, 1] }, { ease: "linear" }), { target: big, offset: ["start end", "end end"] });
})();
