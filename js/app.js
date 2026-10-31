/*
  정연이의 딸기나라 - 화면 그리기와 화면 이동 (하늘 친구들의 화면 규칙을 그대로 옮겨 옴)
  놀이 순서: 처음 화면 → 딸기나라 이야기 → 딸기 백화점(쇼핑) → 내 방(옷 입기) → 어디 갈까요? → 나들이
  주소 뒤 # 로 화면을 나눠요.
    #/              처음 화면 (정연이 그림 + 시작 버튼)
    #/story         딸기나라 이야기 (넘기기 화면)
    #/shop          딸기 백화점: 입어 보고 → 바구니에 담고(빼기도 돼요) → 계산해요 → 바구니 보기 → 정말 살까요? → 사요
                    가족 선물을 사면 고맙다고 딸기를 더 받고 다시 백화점, 아니면 내 방으로
    #/room          내 방: 산 옷만 옷장에 있어요. 머리 모양은 공짜
    #/go            어디 갈까요? (메뉴 카드: js/data/menus.js)
    #/go/<id>       나들이 장면 (놀이 끝)
    #/parent        어른용 기록 (처음 화면에 링크 없음, 주소로만)
    #/guide/blue    디자인 견본
  놀이 상태와 기록은 이 기기의 localStorage에 저장해요 (berryland-now, berryland-history)
*/
(function () {
  "use strict";

  const SITE = window.SITE || { name: "딸기나라", emoji: "", child: "정연", family: {} };
  const MENUS = window.MENUS || [];
  const SHOP = window.SHOP;
  const CATS = window.CATS;
  const ITEMS = window.ITEMS;
  const BASE = window.BASE;
  const GIFTS = window.GIFTS;
  const HAIRS = window.HAIRS;
  const HAIR_COLORS = window.HAIR_COLORS;
  const CHARACTERS = window.CHARACTERS || {};
  const Doll = window.Doll;
  const Scenes = window.Scenes;
  const ITEM = Object.fromEntries([...ITEMS, ...BASE, ...GIFTS].map((i) => [i.id, i]));

  const app = document.getElementById("app");
  const titleEl = document.getElementById("page-title");

  let nav = null;     // 지금 화면의 ◀ ▶ 동작 (키보드·밀기에서 사용). { prev, next, quiet?, noSwipe? }
  let cleanup = null; // 화면을 떠날 때 정리할 일

  // 무지개 테마 (메뉴 카드 순서). 색 값은 css/style.css의 --c-…
  const THEMES = [
    ["red", "빨강"], ["orange", "주황"], ["yellow", "노랑"], ["green", "초록"],
    ["blue", "파랑"], ["navy", "남색"], ["purple", "보라"],
  ];

  // ───────── 작은 도우미 ─────────
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const theme = (name) => `--accent:var(--c-${name});--accent-ink:var(--c-${name}-ink, #fff);--accent-text:var(--c-${name}-text, var(--c-${name}))`;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const $ = (sel) => app.querySelector(sel);

  // 한국어 받침: 정연 → 정연이 · 정연아 / 정우 → 정우 · 정우야
  const batchim = (w) => { const c = String(w).charCodeAt(String(w).length - 1); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0; };
  const callName = (n) => (batchim(n) ? n + "이" : n);
  const vocative = (n) => n + (batchim(n) ? "아" : "야");
  const subj = (n) => n + (batchim(n) ? "이" : "가");
  const KID = SITE.child;
  const famName = (who) => (SITE.family[who] || {}).name || who;
  const famEmoji = (who) => (SITE.family[who] || {}).emoji || "🎁";

  const priceOf = (it) => (it.cat === "gift" ? SHOP.price.gift : it.char ? SHOP.price.character : SHOP.price.normal);
  const labelOf = (it) => (it.cat === "gift" ? `${famName(it.who)} 선물 · ${it.sub}` : it.name);

  function setTitle(t) {
    titleEl.textContent = t;
    document.title = t === SITE.name ? `${SITE.name} ${SITE.emoji}`.trim() : `${t} - ${SITE.name}`;
  }

  // ───────── 효과음 (소리 파일 없이 브라우저에서 바로 만들어요) ─────────
  // 누르는 것마다 짧은 "딸깍", 폭죽이 터질 때는 박수 소리. 바구니에 담을 때 "퐁", 살 때 "짤랑", 옷을 입을 때 "뾰로롱", 사진은 "찰칵"
  // 휴대폰은 화면을 누른 순간에만 소리를 낼 수 있어서, 첫 누름 때 소리 장치를 만들어 깨워 둬요.
  const Sound = {
    ctx: null,
    out: null,
    played: 0, // 자동 검사용: 소리를 몇 번 냈는지
    get() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        this.ctx = new AC();
        // 여러 소리가 겹쳐도 찢어지지 않게 마지막에 압축기
        this.out = this.ctx.createDynamicsCompressor();
        this.out.connect(this.ctx.destination);
      }
      if (this.ctx.state === "suspended") this.ctx.resume();
      return this.ctx;
    },
    // 딸깍: 스위치를 누를 때처럼 아주 짧은 '톡' 두 번 ("딸" → 0.025초 뒤 조금 작은 "깍"), 음높이 변화 없음
    clickBuf: null,
    click() {
      const ac = this.get();
      if (!ac) return;
      if (!this.clickBuf) {
        const sr = ac.sampleRate;
        const len = Math.floor(sr * 0.05);
        const buf = ac.createBuffer(1, len, sr);
        const d = buf.getChannelData(0);
        // 한 번의 '톡' = 순간적인 잡음(0.6ms) + 아주 짧게 울리는 딱딱한 소리(3~4ms)
        const tick = (at, ring, amp) => {
          const s = Math.floor(at * sr);
          for (let k = 0; s + k < len && k < sr * 0.012; k++) {
            const x = k / sr;
            const noise = (Math.random() * 2 - 1) * Math.exp(-x / 0.0006);
            const body = Math.sin(2 * Math.PI * ring * x) * Math.exp(-x / 0.0035);
            d[s + k] += amp * (0.7 * noise + 0.5 * body);
          }
        };
        tick(0, 2600, 0.9);      // 딸
        tick(0.025, 1700, 0.6);  // 깍
        this.clickBuf = buf;
      }
      const src = ac.createBufferSource();
      src.buffer = this.clickBuf;
      const hp = ac.createBiquadFilter(); // 낮은 웅웅거림은 빼고 또렷하게
      hp.type = "highpass";
      hp.frequency.value = 900;
      const g = ac.createGain();
      g.gain.value = 0.55;
      src.connect(hp).connect(g).connect(this.out);
      src.start();
      this.played++;
    },
    // 맑은 음 하나 (짤랑·뾰로롱에 씀)
    tone(freq, at, dur, type = "sine", vol = 0.2) {
      const ac = this.ctx;
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.linearRampToValueAtTime(vol, at + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      o.connect(g).connect(this.out);
      o.start(at);
      o.stop(at + dur + 0.05);
    },
    notes(list, gap, type, vol, dur) {
      const ac = this.get();
      if (!ac) return;
      const t = ac.currentTime + 0.01;
      list.forEach((f, k) => this.tone(f, t + k * gap, dur, type, vol));
      this.played++;
    },
    chime() { this.notes([1319, 1760], 0.08, "sine", 0.22, 0.32); },             // 짤랑 (살 때)
    sparkle() { this.notes([1047, 1319, 1568, 2093], 0.05, "triangle", 0.1, 0.2); }, // 뾰로롱 (입어 볼 때)
    coins() { this.notes([784, 988, 1175, 1568, 1976], 0.07, "sine", 0.16, 0.3); },  // 딸기를 받을 때
    pop() { this.notes([988, 1480], 0.06, "triangle", 0.14, 0.16); },               // 퐁 (바구니에 담을 때)
    boop() { this.notes([392, 330], 0.12, "sine", 0.16, 0.22); },                    // 딸기가 모자랄 때·바구니에서 뺄 때
    shutter() {                                                                       // 찰칵 (사진)
      const ac = this.get();
      if (!ac) return;
      const sr = ac.sampleRate;
      const len = Math.floor(sr * 0.16);
      const buf = ac.createBuffer(1, len, sr);
      const d = buf.getChannelData(0);
      for (const [at, amp] of [[0, 0.9], [0.07, 0.7]]) {
        const s = Math.floor(at * sr);
        for (let k = 0; s + k < len && k < sr * 0.04; k++) d[s + k] += amp * (Math.random() * 2 - 1) * Math.exp(-k / (sr * 0.006));
      }
      const src = ac.createBufferSource();
      src.buffer = buf;
      const hp = ac.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 1200;
      src.connect(hp).connect(this.out);
      src.start();
      this.played++;
    },
    // 박수: 여러 사람이 손뼉 치는 소리를 짧은 잡음 덩어리로 흉내 (약 2.5초, 커졌다가 잦아듦)
    applause(sec = 2.5) {
      const ac = this.get();
      if (!ac) return;
      const sr = ac.sampleRate;
      const len = Math.floor(sr * sec);
      const buf = ac.createBuffer(1, len, sr);
      const d = buf.getChannelData(0);
      for (let person = 0; person < 14; person++) {
        const perSec = 4 + Math.random() * 2.5;     // 한 사람이 1초에 4~6번 손뼉
        const amp = 0.2 + Math.random() * 0.3;
        for (let t = Math.random() * 0.2; t < sec - 0.05; t += (0.8 + Math.random() * 0.4) / perSec) {
          const start = Math.floor(t * sr);
          const decay = sr * (0.006 + Math.random() * 0.008);
          for (let k = 0; k < decay * 4 && start + k < len; k++) d[start + k] += (Math.random() * 2 - 1) * amp * Math.exp(-k / decay);
        }
      }
      for (let k = 0; k < len; k++) {
        const x = k / len;
        d[k] *= Math.min(1, x * 10) * Math.min(1, (1 - x) * 2.5) * 0.3;
      }
      const src = ac.createBufferSource();
      src.buffer = buf;
      const band = ac.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.value = 1700;
      band.Q.value = 0.6;
      src.connect(band).connect(this.out);
      src.start();
      this.played++;
    },
    init() {
      // 버튼·링크·카드·점·체크 상자를 누를 때마다 딸깍
      // 단, data-quiet 안의 버튼은 조용히 (누르자마자 다른 효과음이 나는 곳에서 소리가 겹치지 않게)
      const quiet = (el) => !!el.closest("[data-quiet]");
      document.addEventListener("pointerdown", (e) => {
        if (e.button > 0) return;
        const hit = e.target.closest("button, a, label, input");
        if (hit && !quiet(hit)) this.click();
      }, true);
      // 키보드로 누를 때(Enter·Space)도
      document.addEventListener("keydown", (e) => {
        const hit = (e.key === "Enter" || e.key === " ") && e.target.closest && e.target.closest("button, a");
        if (hit && !quiet(hit)) this.click();
      }, true);
    },
  };
  window.SiteSound = { played: () => Sound.played }; // 자동 검사용

  // 폭죽 + 박수 소리 (칭찬할 때)
  const CONFETTI = ["🎉", "✨", "⭐", "🎈", "💖", "🌈"];
  function confetti(n = 36, set = CONFETTI) {
    Sound.applause();
    for (let k = 0; k < n; k++) {
      const s = document.createElement("span");
      s.className = "confetti";
      s.textContent = set[k % set.length];
      s.style.left = Math.random() * 100 + "vw";
      s.style.animationDuration = 2.2 + Math.random() * 2 + "s";
      s.style.animationDelay = Math.random() * 0.8 + "s";
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 5200);
    }
  }

  // 가운데 창 (둥근 메달 + 제목 + 한 줄 + 버튼). party면 폭죽·박수도 함께
  function modal({ emoji = "🍓", title, text = "", extra = "", buttons = [{ label: "좋아요!" }], party = false, set, themeName = "pink" }) {
    if (party) confetti(36, set);
    const box = document.createElement("div");
    box.className = "celebrate";
    box.setAttribute("style", theme(themeName));
    box.innerHTML = `<div class="celebrate-box" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="medal-big" aria-hidden="true">${emoji}</div>
      ${extra}
      <h2>${title}</h2>
      ${text ? `<p>${text}</p>` : ""}
      <div class="modal-btns">${buttons.map((b, k) => `<button class="big-btn${k === 0 ? "" : " alt"}" data-k="${k}">${b.label}</button>`).join("")}</div>
    </div>`;
    box.querySelectorAll(".modal-btns button").forEach((btn) => btn.addEventListener("click", () => {
      box.remove();
      const b = buttons[+btn.dataset.k];
      if (b.onClick) b.onClick();
    }));
    document.body.appendChild(box);
    box.querySelector(".modal-btns button").focus();
  }
  // 축하 창 (디자인 견본에서 씀)
  function celebrate({ emoji = "🏅", title = "잘했어요!", text = "", button = "고마워요!", themeName = "yellow" } = {}) {
    modal({ emoji, title, text, buttons: [{ label: button }], party: true, themeName });
  }

  // 숫자가 위로 둥실 떠오르는 글자 (-5 🍓, +10 🍓)
  function floatNote(anchor, text) {
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    const s = document.createElement("span");
    s.className = "float-note";
    s.textContent = text;
    s.style.left = r.left + r.width / 2 + "px";
    s.style.top = r.top + r.height / 2 - 18 + "px";
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 1400);
  }
  // 옷을 입으면 반짝반짝
  function sparkleOn(el) {
    if (!el) return;
    for (let k = 0; k < 7; k++) {
      const s = document.createElement("span");
      s.className = "burst";
      s.textContent = ["✨", "💖", "⭐", "✨"][k % 4];
      s.style.left = 15 + Math.random() * 70 + "%";
      s.style.top = 10 + Math.random() * 70 + "%";
      s.style.animationDelay = k * 0.05 + "s";
      el.appendChild(s);
      setTimeout(() => s.remove(), 1100);
    }
  }
  function toast(text) {
    document.querySelectorAll(".toast").forEach((t) => t.remove());
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = text;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2200);
  }

  // ───────── 놀이 상태 · 기록 (이 기기에 저장) ─────────
  const KEY = "berryland-now";
  const HKEY = "berryland-history";
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 저장 못 해도 놀이는 계속 */ } },
  };
  const STAGES = ["story", "shop", "room", "go", "done"];
  const baseLook = () => ({ dress: "base-dress", top: null, bottom: null, shoes: "base-shoes", hat: null });
  let G = store.get(KEY, null);
  if (!G || G.v !== 1) G = null;

  const reached = (s) => !!G && STAGES.indexOf(G.stage) >= STAGES.indexOf(s);
  const advance = (s) => { if (G && !reached(s)) G.stage = s; };
  const routeFor = (s) => ({ story: "#/story", shop: "#/shop", room: "#/room", go: "#/go" })[s] || "#/";
  function note(type, data = {}) { if (G) G.log.push(Object.assign({ t: Date.now(), type }, data)); }
  function save() {
    if (!G) return;
    store.set(KEY, G);
    const h = store.get(HKEY, []).filter((s) => s.id !== G.id);
    h.unshift(G);
    store.set(HKEY, h.slice(0, 40));
  }
  function newGame() {
    G = {
      v: 1, id: Date.now().toString(36), startedAt: Date.now(), endedAt: null, stage: "story",
      berries: SHOP.start, owned: [], gifted: [], round: 1,
      mirror: baseLook(), outfit: Object.assign(baseLook(), { hair: "long", hairColor: "black" }),
      place: null, photos: 0, log: [],
    };
    note("start");
    save();
  }
  function go(hash) {
    if (location.hash === hash) route();
    else location.replace(hash);
  }
  // 같은 칸끼리 바꿔 입기 (원피스를 입으면 윗옷·바지는 벗고, 윗옷·바지를 입으면 원피스는 벗어요)
  function putOn(look, it) {
    look[it.cat] = it.id;
    if (it.cat === "dress") { look.top = null; look.bottom = null; }
    if (it.cat === "top" || it.cat === "bottom") look.dress = null;
  }

  // ───────── 넘기기 화면 카드 높이 고정 ─────────
  // 장마다 글 길이가 달라 카드 높이가 바뀌면 ◀ ▶ 버튼이 위아래로 흔들려요. 그래서 같은 화면의 모든 장을
  // 보이지 않는 곳에 한 번씩 그려 보고, 가장 긴 장의 높이를 카드의 최소 높이로 정해요.
  const heightCache = new Map();
  const lockedEls = new Map(); // 요소 → { key, variants, w }
  const lockWatch = window.ResizeObserver ? new ResizeObserver((entries) => {
    for (const { target: el } of entries) {
      const info = lockedEls.get(el);
      if (!info) continue;
      if (!el.isConnected) { lockWatch.unobserve(el); lockedEls.delete(el); continue; }
      if (el.offsetWidth !== info.w) lockHeight(el, info.key, info.variants);
    }
  }) : null;
  function lockHeight(el, key, variants) {
    for (const old of lockedEls.keys()) {
      if (!old.isConnected) { lockWatch?.unobserve(old); lockedEls.delete(old); }
    }
    if (!el || !el.isConnected) return;
    const w = el.offsetWidth;
    lockedEls.set(el, { key, variants, w });
    lockWatch?.observe(el);
    const ck = `${key}|${w}|${innerHeight}|${document.fonts ? document.fonts.status : ""}`;
    if (!heightCache.has(ck)) {
      const probe = el.cloneNode(false);
      probe.removeAttribute("id");
      probe.setAttribute("aria-hidden", "true");
      Object.assign(probe.style, { position: "absolute", left: "-10000px", top: "0", width: `${w}px`,
        minHeight: "", visibility: "hidden", pointerEvents: "none", animation: "none" });
      el.parentNode.appendChild(probe);
      let max = 0;
      for (const html of variants()) {
        probe.innerHTML = html.replace(/ src="images\/[^"]*"/g, "");
        max = Math.max(max, probe.offsetHeight);
      }
      probe.remove();
      heightCache.set(ck, max);
    }
    el.style.minHeight = `${heightCache.get(ck)}px`;
  }
  function whenFontsReady(fn) {
    if (document.fonts && document.fonts.status !== "loaded") document.fonts.ready.then(fn);
  }

  // ───────── 넘기기 화면 공통 (점, 화살표) ─────────
  function slideNav(count) {
    return `<div class="slide-nav">
      <button class="nav-arrow prev" aria-label="앞 장">◀</button>
      <div class="dots">${Array.from({ length: count }, (_, k) => `<button class="dot" data-k="${k}" aria-label="${k + 1}번째 장"></button>`).join("")}</div>
      <button class="nav-arrow next" aria-label="다음 장">▶</button>
    </div>`;
  }
  function bindSlideNav(root, count, show, getIndex) {
    const prev = root.querySelector(".slide-nav .prev");
    const next = root.querySelector(".slide-nav .next");
    const dots = [...root.querySelectorAll(".dot")];
    prev.addEventListener("click", () => show(getIndex() - 1));
    next.addEventListener("click", () => show(getIndex() + 1));
    dots.forEach((d) => d.addEventListener("click", () => show(+d.dataset.k)));
    return (i) => {
      prev.disabled = i <= 0;
      next.disabled = i >= count - 1;
      dots.forEach((d, k) => d.classList.toggle("on", k === i));
    };
  }
  function slideShow({ key, slides, html, after }) {
    const holder = $("#slide");
    const root = $("#slides");
    let i = 0;
    const lock = () => lockHeight(holder.firstElementChild, key, () => slides.map(html));
    const updateNav = bindSlideNav(root, slides.length, (n) => show(n), () => i);
    function show(n) {
      i = clamp(n, 0, slides.length - 1);
      holder.innerHTML = `<div class="slide-card">${html(slides[i], i)}</div>`;
      lock();
      if (after) after(slides[i], i);
      updateNav(i);
    }
    nav = { prev: () => show(i - 1), next: () => show(i + 1) };
    show(0);
    whenFontsReady(lock);
    window.addEventListener("resize", lock);
    cleanup = () => window.removeEventListener("resize", lock);
  }

  // ───────── 메뉴 카드 ─────────
  function menuCard({ href, theme: themeName, emoji = "", art = "", title, sub = "" }) {
    return `<a class="menu-card" href="${href}" style="${theme(themeName)}">
      <span class="menu-art" aria-hidden="true">${art || `<span class="emoji">${emoji}</span>`}</span>
      <span class="menu-title">${title}</span>
      ${sub ? `<span class="menu-sub">${sub}</span>` : ""}
    </a>`;
  }

  // ───────── 처음 화면 ─────────
  function viewHome() {
    setTitle(SITE.name);
    const going = !!G && G.stage !== "done";
    const look = G && going ? G.outfit : Object.assign(baseLook(), { hair: "long", hairColor: "black" });
    app.innerHTML = `
      <section class="home" style="${theme("pink")}">
        <div class="hero"><h2>${SITE.name}</h2></div>
        <div class="home-stage">
          <div class="home-doll">
            ${Doll.figure(look, { label: KID })}
            <span class="home-deco d1" aria-hidden="true">🍓</span><span class="home-deco d2" aria-hidden="true">💖</span>
            <span class="home-deco d3" aria-hidden="true">🍓</span><span class="home-deco d4" aria-hidden="true">✨</span>
          </div>
          <div class="home-talk">
            <p class="bubble">${going ? `${vocative(KID)}, 다시 왔네요!<br>하던 놀이를 이어서 해요.` : `${vocative(KID)}, 안녕!<br>딸기나라에 놀러 가요!`}</p>
            <div class="home-btns">
              ${going ? `<button class="big-btn" id="go-on">▶ 이어서 해요</button><button class="small-btn" id="go-new">🔄 처음부터 해요</button>`
                : `<button class="big-btn" id="go-new">🍓 시작해요</button>`}
            </div>
          </div>
        </div>
      </section>`;
    const startNew = () => {
      if (G && G.stage !== "done") { note("quit"); save(); }
      newGame();
      location.hash = "#/story";
    };
    $("#go-new").addEventListener("click", () => {
      if (!going) return startNew();
      modal({ emoji: "🔄", title: "처음부터 할까요?", text: "산 옷이 모두 없어져요.",
        buttons: [{ label: "네, 처음부터 해요", onClick: startNew }, { label: "아니요" }] });
    });
    $("#go-on")?.addEventListener("click", () => { location.hash = routeFor(G.stage); });
  }

  // ───────── 딸기나라 이야기 ─────────
  function viewStory() {
    if (!G) newGame();
    setTitle("딸기나라 이야기");
    const f = SITE.family;
    const slides = [
      { emoji: "🍓", title: "딸기나라에 왔어요!", text: "여기서는 딸기가 돈이에요." },
      { emoji: "🧺", title: `딸기 ${SHOP.start}개를 받았어요!`, text: "이 딸기로 옷을 살 수 있어요.",
        extra: `<div class="berry-pile" aria-hidden="true">${"🍓".repeat(10)}</div>` },
      { emoji: "🏷️", title: "옷마다 값이 달라요", text: `보통 옷은 딸기 ${SHOP.price.normal}개, 캐릭터 옷은 딸기 ${SHOP.price.character}개예요.`,
        extra: `<div class="price-tags" aria-hidden="true"><span class="tag">👗 🍓${SHOP.price.normal}</span><span class="tag hot">⭐👗 🍓${SHOP.price.character}</span></div>` },
      { emoji: "🎁", title: "가족 선물도 있어요", text: `${f.dad.name}, ${f.mom.name}, ${f.twin.name} 선물도 살 수 있어요.` },
      { emoji: "🧺", title: "바구니에 담아요", text: "사고 싶은 옷은 바구니에 담아요. 다 고르면 계산해요." },
      { emoji: "🏬", title: "백화점에 가 볼까요?", text: "산 옷은 내 방에서 입어 봐요.", go: true },
    ];
    const html = (s, k) => `
      <div class="slide-kicker">딸기나라 이야기 ${k + 1} / ${slides.length}</div>
      <div class="slide-emoji" aria-hidden="true">${s.emoji}</div>
      <h2 class="slide-title">${s.title}</h2>
      <p class="slide-text">${s.text}</p>
      ${s.extra || ""}
      ${s.go ? `<a class="big-btn" href="#/shop" id="to-shop">🏬 백화점에 가요</a>` : ""}`;
    app.innerHTML = `
      <section class="slides" id="slides" style="${theme("red")}">
        <div id="slide"></div>
        ${slideNav(slides.length)}
      </section>`;
    slideShow({ key: "story", slides, html });
  }

  // ───────── 가게·옷장 공통 ─────────
  const tabsHtml = (tabs, cur) => `<div class="tabs" role="tablist" style="--tabs:${tabs.length}">${tabs.map((t) => `<button class="tab" role="tab" data-tab="${t.id}" aria-selected="${t.id === cur}"><span class="tab-emoji" aria-hidden="true">${t.emoji}</span><span class="tab-label">${t.label}</span></button>`).join("")}</div>`;
  function bindTabs(onPick) {
    app.querySelectorAll(".tab").forEach((b) => b.addEventListener("click", () => {
      app.querySelectorAll(".tab").forEach((x) => x.setAttribute("aria-selected", String(x === b)));
      onPick(b.dataset.tab);
    }));
  }
  const wearing = (look) => ({ ...look, hair: G.outfit.hair, hairColor: G.outfit.hairColor });

  // ───────── 딸기 백화점 ─────────
  let shopTab = "dress";
  let pickId = null;
  function viewShop() {
    if (!G) return go("#/");
    advance("shop");
    note("shop", { round: G.round });
    save();
    setTitle("딸기 백화점");
    const tabs = [...CATS, { id: "gift", label: "선물", emoji: "🎁" }];
    if (pickId && !ITEM[pickId]) pickId = null;
    if (!Array.isArray(G.cart)) G.cart = [];
    // 바구니(장바구니): 사고 싶은 옷을 먼저 담아 두고, '계산해요'에서 한 번 더 보고 사요.
    // 지갑 숫자는 '지금 쓸 수 있는 딸기' = 가진 딸기 - 바구니에 담은 옷값 (담으면 줄고, 빼면 다시 늘어요)
    const cartTotal = () => G.cart.reduce((a, id) => a + priceOf(ITEM[id]), 0);
    const free = () => G.berries - cartTotal();
    app.innerHTML = `
      <section class="studio shop" style="${theme("pink")}">
        <div class="stage fitting">
          <div class="stage-top">
            <div class="wallet" id="wallet" aria-live="polite"><span class="wallet-berry" aria-hidden="true">🍓</span><b id="berries">${free()}</b><span class="sr-only">쓸 수 있는 딸기</span></div>
            <button class="bag" id="bag" aria-label="바구니 보기"><span aria-hidden="true">🧺</span><b>${G.cart.length}</b></button>
            <button class="icon-btn" id="mirror-reset" aria-label="처음 옷으로 돌아가기">🔄</button>
          </div>
          <div class="doll-wrap" id="mirror"></div>
          <div class="pick" id="pick" aria-live="polite"></div>
        </div>
        <div class="shelf">
          ${tabsHtml(tabs, shopTab)}
          <div class="shelf-grid" id="grid" data-quiet></div>
          <button class="big-btn done-btn" id="done">🧺 계산해요</button>
        </div>
      </section>`;

    const list = (tab) => (tab === "gift" ? GIFTS : ITEMS.filter((i) => i.cat === tab));
    const card = (it) => {
      const owned = G.owned.includes(it.id);
      const inCart = G.cart.includes(it.id);
      const p = priceOf(it);
      return `<button class="item-card${it.char ? " char" : ""}${owned ? " owned" : ""}${inCart ? " in-cart" : ""}${it.id === pickId ? " on" : ""}" data-id="${it.id}" aria-label="${esc(labelOf(it))}, 딸기 ${p}개${owned ? ", 샀어요" : inCart ? ", 바구니에 있어요" : ""}">
        <span class="item-art">${it.cat === "gift" ? Doll.giftThumb(it) : Doll.thumb(it)}</span>
        ${it.cat === "gift" ? `<span class="who" aria-hidden="true">${famEmoji(it.who)}</span><span class="item-name">${famName(it.who)}</span>` : ""}
        <span class="price${it.char ? " hot" : ""}" aria-hidden="true">🍓${p}</span>
        ${it.char ? `<span class="star-badge" aria-hidden="true">⭐</span>` : ""}
        ${owned ? `<span class="stamp" aria-hidden="true">${G.gifted.includes(it.id) ? "💝" : "✔"}</span>` : inCart ? `<span class="stamp cart" aria-hidden="true">🧺</span>` : ""}
      </button>`;
    };
    const drawGrid = () => { $("#grid").innerHTML = list(shopTab).map(card).join(""); Doll.fit($("#grid")); $("#grid").scrollTop = 0; };
    const redrawCards = () => { const top = $("#grid").scrollTop; $("#grid").innerHTML = list(shopTab).map(card).join(""); Doll.fit($("#grid")); $("#grid").scrollTop = top; };
    const drawMirror = (shine) => {
      const it = pickId && ITEM[pickId];
      $("#mirror").innerHTML = it && it.cat === "gift"
        ? Doll.family(it.who, { label: `${famName(it.who)}가 입은 모습` }) + `<span class="mirror-tag">${famEmoji(it.who)} ${famName(it.who)}</span>`
        : Doll.figure(wearing(G.mirror), { label: `${KID} 거울` });
      if (shine) sparkleOn($("#mirror"));
    };
    const drawPick = () => {
      const it = pickId && ITEM[pickId];
      if (!it) {
        $("#pick").innerHTML = `<p class="pick-hint">${G.cart.length ? "다 골랐으면 '계산해요'를 눌러요." : "옷을 누르면 입어 볼 수 있어요."}</p>`;
        return;
      }
      const p = priceOf(it);
      let act;
      if (G.gifted.includes(it.id)) act = `<span class="chip hot">💝 선물했어요</span>`;
      else if (G.owned.includes(it.id)) act = `<span class="chip">✔ 샀어요</span>`;
      else if (G.cart.includes(it.id)) act = `<span class="chip hot">🧺 바구니에 있어요</span><button class="small-btn" id="cart-out" data-quiet>✕ 빼요</button>`;
      else if (free() >= p) act = `<button class="big-btn buy-btn" id="cart-in" data-quiet>🧺 바구니에 담아요</button>`;
      else act = `<p class="pick-warn">딸기가 모자라요 😢</p>${G.cart.length ? `<p class="pick-hint small">바구니에서 하나 빼 볼까요?</p>` : ""}`;
      $("#pick").innerHTML = `<p class="pick-name">${it.char ? "⭐ " : ""}${esc(labelOf(it))} <span class="price${it.char ? " hot" : ""}">🍓${p}</span></p><div class="pick-act">${act}</div>`;
    };
    const bump = (el) => { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); };
    const updateWallet = (delta) => {
      $("#berries").textContent = free();
      $("#bag b").textContent = G.cart.length;
      bump($("#wallet"));
      if (delta) floatNote($("#wallet"), `${delta > 0 ? "+" : ""}${delta} 🍓`);
    };
    // 바구니에 담기 · 빼기
    const cartIn = (it) => {
      const p = priceOf(it);
      if (G.cart.includes(it.id) || G.owned.includes(it.id)) return;
      if (free() < p) { Sound.boop(); return; }
      G.cart.push(it.id);
      note("cart-in", { id: it.id, price: p, round: G.round });
      save();
      Sound.pop();
      updateWallet(-p);
      bump($("#bag"));
      redrawCards();
      drawPick();
    };
    const cartOut = (id) => {
      if (!G.cart.includes(id)) return;
      const p = priceOf(ITEM[id]);
      G.cart = G.cart.filter((x) => x !== id);
      note("cart-out", { id, price: p, round: G.round });
      save();
      Sound.boop();
      updateWallet(p);
      bump($("#bag"));
      redrawCards();
      drawPick();
    };

    drawGrid();
    drawMirror(false);
    drawPick();
    bindTabs((t) => { shopTab = t; drawGrid(); });

    $("#grid").addEventListener("click", (e) => {
      const b = e.target.closest(".item-card");
      if (!b) return;
      const it = ITEM[b.dataset.id];
      pickId = it.id;
      if (it.cat !== "gift") putOn(G.mirror, it);
      note("try", { id: it.id });
      save();
      Sound.sparkle();
      app.querySelectorAll(".item-card").forEach((c) => c.classList.toggle("on", c === b));
      drawMirror(true);
      drawPick();
    });
    $("#pick").addEventListener("click", (e) => {
      const it = pickId && ITEM[pickId];
      if (!it) return;
      if (e.target.closest("#cart-in")) cartIn(it);
      else if (e.target.closest("#cart-out")) cartOut(it.id);
    });
    $("#mirror-reset").addEventListener("click", () => {
      G.mirror = baseLook();
      pickId = null;
      save();
      app.querySelectorAll(".item-card.on").forEach((c) => c.classList.remove("on"));
      drawMirror(false);
      drawPick();
    });
    $("#bag").addEventListener("click", openCart);
    $("#done").addEventListener("click", openCart);

    const goRoom = () => { advance("room"); save(); location.hash = "#/room"; };

    // 계산 1단계: 바구니 보기. 여기서도 ✕ 빼요로 고른 것을 취소할 수 있어요
    function openCart() {
      document.querySelectorAll(".celebrate").forEach((el) => el.remove());
      note("cart-open", { n: G.cart.length });
      const box = document.createElement("div");
      box.className = "celebrate";
      box.setAttribute("style", theme("pink"));
      const render = () => {
        const items = G.cart.map((id) => ITEM[id]).filter(Boolean);
        box.innerHTML = `<div class="celebrate-box cart-box" role="dialog" aria-modal="true" aria-label="바구니">
          <h2>🧺 바구니 <small>장바구니</small></h2>
          ${items.length
            ? `<ul class="cart-list">${items.map((it) => `<li class="cart-row${it.char ? " char" : ""}">
                <span class="cart-art">${it.cat === "gift" ? Doll.giftThumb(it) : Doll.thumb(it)}</span>
                <span class="cart-name">${it.char ? "⭐ " : ""}${esc(labelOf(it))} <span class="price${it.char ? " hot" : ""}">🍓${priceOf(it)}</span></span>
                <button class="small-btn cart-out" data-id="${it.id}" data-quiet aria-label="${esc(labelOf(it))} 빼기">✕ 빼요</button>
              </li>`).join("")}</ul>
              <p class="cart-sum">모두 <b>🍓${cartTotal()}</b></p>`
            : `<div class="medal-big" aria-hidden="true">🧺</div><p>바구니가 비어 있어요.</p>`}
          <div class="modal-btns">
            ${items.length ? `<button class="big-btn" data-act="buy">🍓 이걸로 살래요!</button>` : `<button class="big-btn" data-act="room">🚪 내 방에 가요</button>`}
            <button class="big-btn alt" data-act="close">더 고를래요</button>
          </div>
        </div>`;
        Doll.fit(box);
        box.querySelector(".modal-btns button").focus();
      };
      box.addEventListener("click", (e) => {
        const out = e.target.closest(".cart-out");
        if (out) { cartOut(out.dataset.id); render(); return; }
        const act = e.target.closest("[data-act]")?.dataset.act;
        if (!act) return;
        box.remove();
        if (act === "buy") confirmPay();
        if (act === "room") {
          note("checkout", { round: G.round, items: [], total: 0, gifts: [], bonus: 0, left: G.berries });
          goRoom();
        }
      });
      document.body.appendChild(box);
      render();
    }

    // 계산 2단계: 정말 살까요? (아니요 → 다시 바구니)
    function confirmPay() {
      modal({ emoji: "🍓", title: "정말 살까요?", text: `딸기 ${cartTotal()}개를 내요.`,
        buttons: [{ label: "네, 살래요!", onClick: pay }, { label: "아니요", onClick: openCart }] });
    }

    // 계산 3단계: 사요. 가족 선물이 있으면 고맙다고 딸기를 받고 다시 백화점, 없으면 내 방으로
    function pay() {
      const items = [...G.cart];
      const total = cartTotal();
      items.forEach((id) => { G.owned.push(id); note("buy", { id, price: priceOf(ITEM[id]), round: G.round }); });
      G.berries -= total;
      G.cart = [];
      const fresh = GIFTS.filter((g) => items.includes(g.id) && !G.gifted.includes(g.id));
      G.gifted.push(...fresh.map((g) => g.id));
      const all = fresh.length > 0 && G.gifted.length === GIFTS.length;
      const bonus = fresh.length * SHOP.giftThanks + (all ? SHOP.allGiftsBonus : 0);
      G.berries += bonus;
      note("checkout", { round: G.round, items, total, gifts: fresh.map((g) => g.id), bonus, left: G.berries });
      G.round++;
      save();
      Sound.chime();
      $("#bag b").textContent = 0;
      bump($("#bag"));
      redrawCards();
      drawPick();
      if (!fresh.length) {
        updateWallet();
        modal({ emoji: "🛍️", title: "다 샀어요!", text: "내 방에 가서 입어 봐요.",
          buttons: [{ label: "🚪 내 방에 가요", onClick: goRoom }, ...(free() >= SHOP.price.normal ? [{ label: "🏬 더 살래요" }] : [])] });
        return;
      }
      const names = fresh.map((g) => famName(g.who));
      const who = names.length === 1 ? subj(names[0]) : `${names.slice(0, -1).join(", ")}, ${subj(names[names.length - 1])}`;
      setTimeout(() => Sound.coins(), 350);
      modal({
        emoji: all ? "💖" : "💝",
        extra: `<div class="faces" aria-hidden="true">${fresh.map((g) => famEmoji(g.who)).join("")}</div>`,
        title: all ? "가족을 사랑하는 착한 어린이예요!" : `${who} 정말 좋아해요!`,
        text: all && fresh.length === GIFTS.length ? `가족 모두 고맙다고 딸기 ${bonus}개를 줬어요.` : `${all ? who + " " : ""}고맙다고 딸기 ${bonus}개를 줬어요.`,
        party: true, set: ["🍓", "💖", "🎁", "✨", "🍓", "💝"],
        buttons: [{ label: "🛍️ 더 사러 가요", onClick: () => { updateWallet(bonus); redrawCards(); drawPick(); } }],
      });
    }
  }

  // ───────── 내 방 ─────────
  let roomTab = "dress";
  function viewRoom() {
    if (!G) return go("#/");
    if (!reached("room")) return go(routeFor(G.stage));
    note("room");
    save();
    setTitle(`${callName(KID)} 방`);
    const tabs = [...CATS, { id: "hair", label: "머리", emoji: "💇‍♀️" }];
    app.innerHTML = `
      <section class="studio room" style="${theme("purple")}">
        <div class="stage myroom">
          <div class="stage-top"><span class="room-sign">🪞 ${callName(KID)} 거울</span></div>
          <div class="doll-wrap" id="mirror"></div>
          <div class="pick" id="pick" aria-live="polite"><p class="pick-hint">옷장에서 입고 싶은 옷을 골라요.</p></div>
        </div>
        <div class="shelf">
          ${tabsHtml(tabs, roomTab)}
          <div class="shelf-grid" id="grid" data-quiet></div>
          <button class="big-btn done-btn" id="done">🚪 다 입었어요!</button>
        </div>
      </section>`;

    const look = G.outfit;
    const owned = (cat) => [...BASE, ...ITEMS].filter((i) => i.cat === cat && (i.base || G.owned.includes(i.id)));
    const drawMirror = (shine) => {
      $("#mirror").innerHTML = Doll.figure(look, { label: `${KID} 거울` });
      if (shine) sparkleOn($("#mirror"));
    };
    const drawGrid = () => {
      const g = $("#grid");
      if (roomTab === "hair") {
        g.innerHTML = `<div class="hair-colors" role="group" aria-label="머리 색">${HAIR_COLORS.map((c) => `<button class="color-dot${look.hairColor === c.id ? " on" : ""}" data-color="${c.id}" style="background:${c.color}" aria-label="${c.name}" aria-pressed="${look.hairColor === c.id}"></button>`).join("")}</div>`
          + HAIRS.map((h) => `<button class="item-card hair-card${look.hair === h.id ? " on" : ""}" data-hair="${h.id}" aria-label="${h.name}" aria-pressed="${look.hair === h.id}"><span class="item-art">${Doll.hairThumb(h.id, look.hairColor)}</span></button>`).join("");
      } else {
        const list = owned(roomTab);
        g.innerHTML = list.length
          ? list.map((it) => `<button class="item-card${it.char ? " char" : ""}${look[it.cat] === it.id ? " on" : ""}" data-id="${it.id}" aria-label="${esc(it.name)}" aria-pressed="${look[it.cat] === it.id}"><span class="item-art">${Doll.thumb(it)}</span>${it.char ? `<span class="star-badge" aria-hidden="true">⭐</span>` : ""}</button>`).join("")
          : `<div class="empty"><p>이 옷장은 비어 있어요.</p>${G.berries >= SHOP.price.normal ? `<a class="small-btn" href="#/shop">🏬 백화점에 가요</a>` : ""}</div>`;
      }
      Doll.fit(g);
      g.scrollTop = 0;
    };
    const say = (t) => { $("#pick").innerHTML = `<p class="pick-name">${t}</p>`; };

    drawMirror(false);
    drawGrid();
    bindTabs((t) => { roomTab = t; drawGrid(); });

    $("#grid").addEventListener("click", (e) => {
      const c = e.target.closest(".color-dot");
      const h = e.target.closest("[data-hair]");
      const b = e.target.closest(".item-card[data-id]");
      if (c) {
        look.hairColor = c.dataset.color;
        note("hairColor", { id: look.hairColor });
        say(`${HAIR_COLORS.find((x) => x.id === look.hairColor).name} 머리 ✨`);
      } else if (h) {
        look.hair = h.dataset.hair;
        note("hair", { id: look.hair });
        say(`${HAIRS.find((x) => x.id === look.hair).name} ✨`);
      } else if (b) {
        const it = ITEM[b.dataset.id];
        if (look[it.cat] === it.id) {
          // 한 번 더 누르면 벗어요
          look[it.cat] = null;
          note("wear", { cat: it.cat, id: null });
          say("벗었어요");
        } else {
          putOn(look, it);
          note("wear", { cat: it.cat, id: it.id });
          say(`${esc(it.name)} ✨`);
        }
      } else return;
      save();
      Sound.sparkle();
      drawMirror(true);
      const top = $("#grid").scrollTop;
      drawGrid();
      $("#grid").scrollTop = top;
    });
    $("#done").addEventListener("click", () => {
      note("dressed", { outfit: { ...look } });
      advance("go");
      save();
      location.hash = "#/go";
    });
  }

  // ───────── 어디 갈까요? ─────────
  function viewPlaces() {
    if (!G) return go("#/");
    if (!reached("go")) return go(routeFor(G.stage));
    setTitle("어디 갈까요?");
    app.innerHTML = `
      <section class="places">
        <div class="places-head">
          <div class="mini-doll">${Doll.figure(G.outfit, { label: KID })}</div>
          <h2 class="section-title">예쁘게 입고 어디 갈까요?</h2>
        </div>
        <div class="menu-group">
          <nav class="menu-grid" aria-label="갈 곳">${MENUS.map((m) => menuCard({ ...m, href: `#/go/${m.id}` })).join("")}</nav>
        </div>
      </section>`;
  }

  // ───────── 나들이 (놀이 끝) ─────────
  function viewScene(id) {
    const place = MENUS.find((m) => m.id === id);
    if (!G) return go("#/");
    if (!place || !reached("go")) return go(routeFor(G.stage));
    G.place = id;
    G.stage = "done";
    G.endedAt = Date.now();
    note("go", { id });
    save();
    setTitle("나들이");
    const giftOf = (who) => GIFTS.find((g) => g.who === who);
    const gave = (w) => !!giftOf(w) && G.gifted.includes(giftOf(w).id);
    // 서는 순서: 아빠 · 정연 · 정우 · 엄마 (선물을 받은 가족만 함께 나와요)
    const order = ["dad", "me", "twin", "mom"].filter((w) => w === "me" || gave(w));
    const people = order.map((w) => (w === "me"
      ? `<div class="person kid me">${Doll.figure(G.outfit, { label: KID })}</div>`
      : `<div class="person ${w === "twin" ? "kid" : "adult"}">${Doll.family(w, { label: famName(w) })}</div>`)).join("");
    const fam = ["dad", "mom", "twin"].filter(gave).map(famName);
    app.innerHTML = `
      <section class="finale" style="${theme(place.theme)}">
        <div class="scene" id="scene">
          ${Scenes.svg(id)}
          <div class="scene-people" style="--n:${order.length}">${people}</div>
          <div class="flash" id="flash" aria-hidden="true"></div>
        </div>
        <div class="finale-side">
          <h2 class="finale-title">${callName(KID)}가 ${place.arrive}</h2>
          <p class="finale-text">${fam.length ? `${fam.join(", ")}도 선물한 옷을 입고 왔어요.` : "오늘 옷이 정말 예뻐요."}</p>
          <div class="finale-btns">
            <button class="big-btn" id="photo" data-quiet>📸 사진 찍기</button>
            <a class="big-btn alt" href="#/">🏠 처음으로</a>
          </div>
        </div>
      </section>
      <p class="rotate-hint">📱 휴대폰을 옆으로 돌리면 더 크게 보여요</p>`;
    const t = setTimeout(() => confetti(30, ["🎉", "✨", "💖", "🍓", "🌈", "⭐"]), 450);
    cleanup = () => clearTimeout(t);
    $("#photo").addEventListener("click", () => {
      Sound.shutter();
      const f = $("#flash");
      f.classList.remove("on");
      void f.offsetWidth;
      f.classList.add("on");
      G.photos = (G.photos || 0) + 1;
      note("photo", { id });
      save();
      toast("찰칵! 멋진 사진이에요 📸");
    });
  }

  // ───────── 어른용 기록 (#/parent) ─────────
  // 아이가 무엇을, 어떤 순서로, 얼마에 샀는지 · 가족 선물을 언제 샀는지 · 많이 입어 본 옷 · 좋아한 색
  function summarize(s) {
    const L = s.log || [];
    const items = s.owned.map((id) => ITEM[id]).filter(Boolean);
    const clothes = items.filter((i) => i.cat !== "gift");
    const chars = clothes.filter((i) => i.char);
    const spent = items.reduce((a, i) => a + priceOf(i), 0);
    const charSpent = chars.reduce((a, i) => a + priceOf(i), 0);
    const clothesSpent = clothes.reduce((a, i) => a + priceOf(i), 0);
    const bonus = L.filter((e) => e.type === "checkout").reduce((a, e) => a + (e.bonus || 0), 0);
    const tries = {};
    L.filter((e) => e.type === "try").forEach((e) => { tries[e.id] = (tries[e.id] || 0) + 1; });
    const count = (arr, key) => arr.reduce((m, i) => { const k = key(i); m[k] = (m[k] || 0) + 1; return m; }, {});
    const end = s.endedAt || (L.length ? L[L.length - 1].t : s.startedAt);
    return {
      clothes, chars, spent, charSpent, clothesSpent, bonus,
      tries: Object.entries(tries).sort((a, b) => b[1] - a[1]),
      tryCount: L.filter((e) => e.type === "try").length,
      adds: L.filter((e) => e.type === "cart-in").length,
      // 바구니에 담았다가 뺀 옷 (예전 기록의 '돌려주기'도 함께 셈)
      removed: Object.entries(count(L.filter((e) => e.type === "cart-out" || e.type === "return"), (e) => e.id)).sort((a, b) => b[1] - a[1]),
      removeCount: L.filter((e) => e.type === "cart-out" || e.type === "return").length,
      tones: Object.entries(count(clothes, (i) => i.tone)).sort((a, b) => b[1] - a[1]),
      cats: count(clothes, (i) => i.cat),
      charNames: Object.entries(count(chars, (i) => CHARACTERS[i.char] || i.char)),
      gifts: GIFTS.map((g) => { const b = L.find((e) => e.type === "buy" && e.id === g.id); return { g, round: b ? b.round : null, kept: s.owned.includes(g.id) }; }),
      changes: L.filter((e) => ["wear", "hair", "hairColor"].includes(e.type)).length,
      pays: L.filter((e) => e.type === "checkout" && (e.total || (e.items && e.items.length) || e.items === undefined)).length,
      minutes: Math.max(1, Math.round((end - s.startedAt) / 60000)),
      timeline: L.filter((e) => e.type === "buy"),
    };
  }
  function viewParent() {
    setTitle("어른용 기록");
    const hist = store.get(HKEY, []).filter((s) => s && s.v === 1).sort((a, b) => b.startedAt - a.startedAt);
    const fmt = (t) => new Date(t).toLocaleString("ko-KR", { month: "long", day: "numeric", weekday: "short", hour: "numeric", minute: "2-digit" });
    const chip = (t, hot) => `<span class="chip${hot ? " hot" : ""}">${t}</span>`;
    const catName = Object.fromEntries(CATS.map((c) => [c.id, c.label]));
    const sums = hist.map(summarize);
    const done = hist.filter((s) => s.stage === "done").length;
    const allClothes = sums.reduce((a, x) => a + x.clothes.length, 0);
    const allChars = sums.reduce((a, x) => a + x.chars.length, 0);
    const firstGift = sums.filter((x) => x.gifts.some((g) => g.round === 1)).length;
    const status = (s) => (s.stage === "done" ? chip("끝까지 했어요 ✔") : G && s.id === G.id ? chip("지금 하는 중", true) : chip("중간에 그만뒀어요"));

    const report = (s, x) => {
      const place = MENUS.find((m) => m.id === s.place);
      return `<article class="report">
        <header class="report-head"><h3>${fmt(s.startedAt)}</h3>${status(s)}${place ? chip(`${place.emoji} ${place.title}`) : ""}</header>
        <div class="report-body">
          <div class="report-doll">${Doll.figure(s.outfit, { label: "마지막에 입은 옷" })}</div>
          <div class="report-info">
            <ul class="stats">
              <li><b>딸기</b> 처음 ${SHOP.start} + 선물 고마워요 ${x.bonus} → 쓴 딸기 ${x.spent} · 남은 딸기 ${s.berries}</li>
              <li><b>산 옷</b> ${x.clothes.length}벌 · 딸기 ${x.clothesSpent}개 (캐릭터 옷 ${x.chars.length}벌 · 딸기 ${x.charSpent}개 = 옷값의 ${x.clothesSpent ? Math.round((x.charSpent / x.clothesSpent) * 100) : 0}%)</li>
              <li><b>가족 선물</b> ${x.gifts.map(({ g, round, kept }) => `${famEmoji(g.who)} ${famName(g.who)} ${kept ? `✔ (${round}번째 계산)` : "✕"}`).join(" · ")}</li>
              <li><b>쇼핑</b> 계산 ${x.pays}번 · 입어 본 횟수 ${x.tryCount}번 · 바구니에 담기 ${x.adds}번 · 바구니에서 빼기 ${x.removeCount}번 · 내 방에서 바꿔 입기 ${x.changes}번 · 사진 ${s.photos || 0}장 · 약 ${x.minutes}분</li>
              ${s.cart && s.cart.length ? `<li><b>바구니에 남은 옷</b> ${s.cart.length}벌 (계산하지 않음)</li>` : ""}
              <li><b>종류</b> ${CATS.map((c) => `${c.emoji} ${catName[c.id]} ${x.cats[c.id] || 0}`).join(" · ")}</li>
            </ul>
            ${x.timeline.length ? `<h4>산 순서</h4><ol class="buy-list">${x.timeline.map((e) => { const it = ITEM[e.id]; if (!it) return ""; return `<li>${esc(labelOf(it))} ${chip(`🍓${e.price}`, it.char)} <small>${e.round}번째 계산</small></li>`; }).join("")}</ol>` : "<p>산 물건이 없어요.</p>"}
            ${x.removed.length ? `<h4>바구니에 담았다가 뺀 옷</h4><div class="chips left">${x.removed.map(([id, n]) => (ITEM[id] ? chip(`${esc(labelOf(ITEM[id]))}${n > 1 ? ` ${n}번` : ""}`, ITEM[id].char) : "")).join("")}</div>` : ""}
            ${x.tries.length ? `<h4>많이 입어 본 옷</h4><div class="chips left">${x.tries.slice(0, 5).map(([id, n]) => (ITEM[id] ? chip(`${esc(labelOf(ITEM[id]))} ${n}번`, ITEM[id].char) : "")).join("")}</div>` : ""}
            ${x.tones.length ? `<h4>좋아한 색 (산 옷)</h4><div class="chips left">${x.tones.map(([t, n]) => chip(`${t} ${n}`)).join("")}</div>` : ""}
            ${x.charNames.length ? `<h4>캐릭터</h4><div class="chips left">${x.charNames.map(([t, n]) => chip(`⭐ ${t} ${n}`, true)).join("")}</div>` : ""}
          </div>
        </div>
      </article>`;
    };
    app.innerHTML = `
      <section class="parent">
        <h2 class="section-title">📋 어른용 기록 <small>이 기기에만 저장돼요</small></h2>
        <div class="guide-block">
          ${hist.length ? `<p class="parent-sum">놀이 ${hist.length}번 (끝까지 ${done}번) · 산 옷 ${allClothes}벌 중 캐릭터 옷 ${allChars}벌${allClothes ? ` (${Math.round((allChars / allClothes) * 100)}%)` : ""} · 첫 계산에서 가족 선물을 산 놀이 ${firstGift}번</p>`
            : "<p class=\"parent-sum\">아직 기록이 없어요.</p>"}
          <p class="parent-note">가족 선물을 사면 고맙다는 딸기(선물마다 ${SHOP.giftThanks}개)를 받는다는 건 아이에게 미리 알려 주지 않아요. '1번째 계산'에서 산 선물은 보상을 모르고 고른 선물이에요. 바구니에 담은 옷은 '계산'을 해야 산 옷이 돼요.</p>
          ${hist.length ? `<button class="small-btn" id="wipe">🗑️ 기록 모두 지우기</button>` : ""}
        </div>
        ${hist.map((s, k) => report(s, sums[k])).join("")}
        <p style="text-align:center"><a class="back-link" href="#/">처음으로</a></p>
      </section>`;
    $("#wipe")?.addEventListener("click", () => {
      if (!window.confirm("기록을 모두 지울까요? (지금 하는 놀이는 그대로 있어요)")) return;
      store.set(HKEY, []);
      if (G) save();
      viewParent();
    });
  }

  // ───────── 디자인 견본 ─────────
  // 옮겨 온 디자인 규칙이 제대로 보이는지 한눈에 확인하는 화면. 아이가 볼 화면은 아님
  const GUIDE_SLIDES = [
    { emoji: "👗", title: "넘기기 화면", text: "◀ ▶ 버튼, 아래 점, 손가락으로 밀기, 키보드 ← → 로 넘겨요." },
    { emoji: "🎀", title: "카드 높이 고정", text: "장마다 글 길이가 달라도 카드 높이를 가장 긴 장에 맞춰 고정해요. 그래서 넘길 때 ◀ ▶ 버튼이 위아래로 흔들리지 않아요. 이 장은 일부러 글을 길게 썼어요." },
    { emoji: "🌈", title: "축하해요!", text: "끝까지 보면 폭죽과 박수 소리로 칭찬해 줘요.", celebrate: true },
  ];

  function viewGuide(themeName) {
    const name = THEMES.some(([n]) => n === themeName) || themeName === "pink" ? themeName : "blue";
    const label = name === "pink" ? "딸기 분홍" : THEMES.find(([n]) => n === name)[1];
    setTitle("디자인 견본");
    const slideHtml = (s, k) => `
      <div class="slide-kicker">견본 ${k + 1} / ${GUIDE_SLIDES.length}</div>
      <div class="slide-emoji" aria-hidden="true">${s.emoji}</div>
      <h2 class="slide-title">${s.title}</h2>
      <p class="slide-text">${s.text}</p>
      ${s.celebrate ? `<button class="big-btn" id="guide-celebrate">🎉 축하 창 보기</button>` : ""}`;

    app.innerHTML = `
      <section class="guide" style="${theme(name)}">
        <h2 class="section-title">🎨 디자인 견본 <small>${label} 테마</small></h2>

        <div class="guide-block">
          <h3>무지개 테마 색 (메뉴 카드 순서) · 눌러서 바꿔 보기</h3>
          <div class="swatches">
            ${THEMES.map(([n, l]) => `
              <a class="swatch" href="#/guide/${n}" style="${theme(n)}" ${n === name ? 'aria-current="page"' : ""}>
                <span class="chip-color">Aa</span><span>${l}</span><span class="hex" data-var="--c-${n}"></span>
              </a>`).join("")}
          </div>
          <h3 style="margin-top:16px">기본 색 · 딸기 분홍</h3>
          <div class="swatches base-colors">
            ${[["--sky-top", "하늘 위"], ["--sky-bottom", "하늘 아래"], ["--ink", "글씨"], ["--ink-soft", "옅은 글씨"], ["--ink-blue", "하늘 위 글씨"], ["--card", "카드"]].map(([v, l]) => `
              <span class="swatch"><span class="chip-color" style="background:var(${v});${v.startsWith("--ink") ? "color:#fff" : ""}">Aa</span><span>${l}</span><span class="hex" data-var="${v}"></span></span>`).join("")}
            <a class="swatch" href="#/guide/pink" style="${theme("pink")}" ${name === "pink" ? 'aria-current="page"' : ""}><span class="chip-color">Aa</span><span>딸기 분홍</span><span class="hex" data-var="--c-pink"></span></a>
          </div>
        </div>

        <div class="guide-block">
          <h3>글씨 (주아 글꼴)</h3>
          <div class="on-sky"><div class="hero"><h2>${SITE.name}</h2></div></div>
          <p class="type-sample section-title" style="margin:10px 0">화면 제목 <small>section-title</small></p>
          <p class="type-sample slide-title">넘기기 장 제목 <small>slide-title</small></p>
          <p class="type-sample slide-text">넘기기 장 글 · 한 화면에 한두 문장만 <small>slide-text</small></p>
          <p class="type-sample menu-title">메뉴 카드 제목 <small>menu-title</small></p>
          <p class="type-sample slide-sub">작은 설명 글 <small>slide-sub</small></p>
        </div>

        <div class="guide-block">
          <h3>버튼 · 이름표</h3>
          <div class="guide-row">
            <button class="big-btn">큰 버튼</button>
            <button class="big-btn alt">흰 큰 버튼</button>
            <button class="small-btn">작은 버튼</button>
            <button class="icon-btn" aria-label="그림 버튼">⭐</button>
            <button class="nav-arrow" aria-label="화살표 버튼">▶</button>
          </div>
          <div class="guide-row" style="margin-top:14px">
            <nav class="modes" aria-label="고르기 견본">
              <a class="mode-btn" href="#/guide/${name}" aria-current="page">첫째 보기</a>
              <a class="mode-btn" href="#/guide/${name}">둘째 보기</a>
            </nav>
            <label class="toggle"><input type="checkbox"> 켜고 끄기</label>
            <span class="chip">이름표</span>
            <span class="chip hot">⭐ 눈에 띄는 이름표</span>
            <span class="wallet"><span class="wallet-berry" aria-hidden="true">🍓</span><b>100</b></span>
            <a class="back-link" href="#/">처음으로</a>
          </div>
        </div>

        <div class="slides" id="slides">
          <div id="slide"></div>
          ${slideNav(GUIDE_SLIDES.length)}
        </div>
      </section>`;

    const root = getComputedStyle(document.documentElement);
    app.querySelectorAll(".hex").forEach((el) => (el.textContent = root.getPropertyValue(el.dataset.var).trim()));
    slideShow({
      key: "guide", slides: GUIDE_SLIDES, html: slideHtml,
      after: () => {
        const btn = $("#guide-celebrate");
        if (btn) btn.addEventListener("click", () => celebrate({ emoji: "🌈", title: "축하해요!", text: "끝까지 잘 봤어요.", themeName: name }));
      },
    });
  }

  // ───────── 화면 이동 ─────────
  function route() {
    nav = null;
    if (cleanup) { cleanup(); cleanup = null; }
    document.querySelectorAll(".celebrate, .float-note, .toast, .confetti").forEach((el) => el.remove());

    const [a, b] = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
    document.body.dataset.view = a || "home";
    if (a === "guide") viewGuide(b);
    else if (a === "story") viewStory();
    else if (a === "shop") viewShop();
    else if (a === "room") viewRoom();
    else if (a === "go") (b ? viewScene(b) : viewPlaces());
    else if (a === "parent") viewParent();
    else viewHome();

    window.scrollTo(0, 0);
    app.focus({ preventScroll: true });
  }

  // 손가락으로 옆으로 밀면 ◀ ▶
  let sx = 0;
  let sy = 0;
  app.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  app.addEventListener("touchend", (e) => {
    if (!nav || nav.noSwipe) return;
    const dx = e.changedTouches[0].clientX - sx;
    const dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) { if (!nav.quiet) Sound.click(); (dx < 0 ? nav.next : nav.prev)(); }
  }, { passive: true });

  // 키보드 ← → 로도 넘기기
  document.addEventListener("keydown", (e) => {
    if (!nav || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === "ArrowRight") { e.preventDefault(); if (!nav.quiet) Sound.click(); nav.next(); }
    if (e.key === "ArrowLeft") { e.preventDefault(); if (!nav.quiet) Sound.click(); nav.prev(); }
  });

  Sound.init();
  window.addEventListener("hashchange", route);
  route();
})();
