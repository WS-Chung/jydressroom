/*
  옷 입히기 그림 (그림 파일 없이 SVG로 바로 그려요)
  - 정연이 한 사람을 같은 자리(viewBox 0 -20 200 400)에 겹겹이 그려서, 옷을 고르면 그 위에 '입혀져요'
    겹 순서: 뒷머리 → 몸 → (속옷) → 신발 → 바지·치마 → 윗옷 → 원피스 → 손 → 얼굴 → 앞머리 → 모자
  - 옷 모양·색·무늬는 js/data/items.js의 값으로 정해요 (shape, color, pattern, motif …)
  - 캐릭터 그림(마이멜로디·쿠로미·하츄핑)은 집에서 쓰려고 단순하게 흉내 낸 그림이에요

  window.Doll
    .figure(outfit, opts)   정연이 (outfit: { dress, top, bottom, shoes, hat, hair, hairColor })
    .thumb(item)            가게·옷장 칸에 보이는 옷 그림
    .hairThumb(hair, color) 머리 모양 그림
    .family(who, opts)      가족 (dad 아빠 · mom 엄마 · twin 정우)이 선물 옷을 입은 모습
    .giftThumb(gift)        가족 선물 옷 그림
*/
(function () {
  "use strict";

  const SKIN = "#ffe2cf";
  const SKIN_L = "#e9b59c";
  const ALL = [...(window.ITEMS || []), ...(window.BASE || [])];
  const byId = Object.fromEntries(ALL.map((i) => [i.id, i]));
  const HAIR_COLOR = Object.fromEntries((window.HAIR_COLORS || []).map((h) => [h.id, h.color]));
  const RAINBOW = ["#ff8a80", "#ffcc80", "#fff59d", "#a5d6a7", "#90caf9", "#ce93d8"];
  const resolve = (x) => (typeof x === "string" ? byId[x] : x) || null;

  // ───────── 색 도우미 ─────────
  const rgb = (h) => {
    h = h.replace("#", "");
    if (h.length === 3) h = [...h].map((c) => c + c).join("");
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const mix = (a, b, t) => { const A = rgb(a), B = rgb(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
  const dark = (c, t = 0.3) => mix(c, "#3b2333", t);   // 테두리: 조금 진하게
  const light = (c, t = 0.5) => mix(c, "#ffffff", t);
  const f1 = (n) => +n.toFixed(1);
  // 좌우 뒤집기 (x 좌표만 200 - x). M·L·Q·C·Z 처럼 좌표가 두 개씩 짝인 경로에만 씀
  const mirror = (d) => { let i = 0; return d.replace(/-?\d+(\.\d+)?/g, (n) => (i++ % 2 === 0 ? String(f1(200 - +n)) : n)); };
  const sh = (d, fill, line, extra = "") => `<path d="${d}" fill="${fill}" stroke="${line}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"${extra ? " " + extra : ""}/>`;

  // 한 번 그릴 때마다 무늬 id가 겹치지 않게 (한 화면에 그림이 여러 장)
  let seq = 0;
  class Paint {
    constructor() { this.id = "dl" + (++seq).toString(36); this.defs = []; this.n = 0; }
    fill(it, base) {
      base = base || it.color;
      if (!it.pattern) return base;
      const id = `${this.id}p${++this.n}`;
      this.defs.push(pattern(id, it.pattern, base, it.pc || "#ffffff"));
      return `url(#${id})`;
    }
  }

  // ───────── 작은 그림 ─────────
  function heart(cx, cy, s, fill, line) {
    return `<path d="M ${f1(cx)} ${f1(cy + s)} C ${f1(cx - s * 1.9)} ${f1(cy - s * 0.1)} ${f1(cx - s * 0.9)} ${f1(cy - s * 1.6)} ${f1(cx)} ${f1(cy - s * 0.45)} C ${f1(cx + s * 0.9)} ${f1(cy - s * 1.6)} ${f1(cx + s * 1.9)} ${f1(cy - s * 0.1)} ${f1(cx)} ${f1(cy + s)} Z" fill="${fill}"${line ? ` stroke="${line}" stroke-width="1.5" stroke-linejoin="round"` : ""}/>`;
  }
  function star(cx, cy, r, fill, line) {
    const pts = [];
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      const rr = k % 2 ? r * 0.45 : r;
      pts.push(`${f1(cx + rr * Math.cos(a))},${f1(cy + rr * Math.sin(a))}`);
    }
    return `<polygon points="${pts.join(" ")}" fill="${fill}"${line ? ` stroke="${line}" stroke-width="1.4" stroke-linejoin="round"` : ""}/>`;
  }
  function flower(cx, cy, fill, s = 1, mid = "#ffd54f") {
    let o = "";
    for (let k = 0; k < 5; k++) {
      const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5;
      o += `<circle cx="${f1(cx + 2.9 * s * Math.cos(a))}" cy="${f1(cy + 2.9 * s * Math.sin(a))}" r="${f1(2.5 * s)}" fill="${fill}"/>`;
    }
    return o + `<circle cx="${cx}" cy="${cy}" r="${f1(1.8 * s)}" fill="${mid}"/>`;
  }
  function berry(cx, cy, s = 1) {
    return `<g transform="translate(${cx} ${cy}) scale(${s})"><path d="M -5 -2 Q -6 6 0 9 Q 6 6 5 -2 Q 0 -5 -5 -2 Z" fill="#e53935"/><path d="M -4.5 -3 L -1.5 -1 L 0 -5 L 1.5 -1 L 4.5 -3 L 2.5 0 L -2.5 0 Z" fill="#43a047"/><circle cx="-2" cy="2" r=".7" fill="#ffe082"/><circle cx="2" cy="3" r=".7" fill="#ffe082"/><circle cx="0" cy="6" r=".7" fill="#ffe082"/></g>`;
  }
  function bow(x, y, color, s = 1) {
    const L = dark(color);
    return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M -2 2 L -6 12 M 2 2 L 6 12" stroke="${L}" stroke-width="4.4" stroke-linecap="round"/><path d="M -2 2 L -6 12 M 2 2 L 6 12" stroke="${color}" stroke-width="2.6" stroke-linecap="round"/><path d="M 0 0 L -11 -7 Q -14 0 -11 7 Z" fill="${color}" stroke="${L}" stroke-width="1.6" stroke-linejoin="round"/><path d="M 0 0 L 11 -7 Q 14 0 11 7 Z" fill="${color}" stroke="${L}" stroke-width="1.6" stroke-linejoin="round"/><circle r="3.2" fill="${color}" stroke="${L}" stroke-width="1.4"/></g>`;
  }
  const tie = (x, y) => `<circle cx="${x}" cy="${y}" r="4.8" fill="#ff6b9a" stroke="#d94a78" stroke-width="1.5"/>`;

  function pattern(id, kind, bg, fg) {
    const open = (w, h) => `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="${bg}"/>`;
    let s;
    switch (kind) {
      case "dots": s = open(14, 14) + `<circle cx="3.5" cy="3.5" r="2.3" fill="${fg}"/><circle cx="10.5" cy="10.5" r="2.3" fill="${fg}"/>`; break;
      case "stripes": s = open(12, 12) + `<rect width="12" height="5" fill="${fg}"/>`; break;
      case "gingham": s = open(12, 12) + `<rect width="6" height="12" fill="${fg}" opacity=".45"/><rect width="12" height="6" fill="${fg}" opacity=".45"/>`; break;
      case "flowers": s = open(26, 26) + flower(7, 7, fg, 0.9) + flower(20, 19, fg, 0.75); break;
      case "hearts": s = open(18, 18) + heart(5, 5, 2.6, fg) + heart(14, 14, 2.6, fg); break;
      case "stars": s = open(22, 22) + star(6, 6, 3.6, fg) + star(16, 16, 2.6, fg); break;
      case "berries": s = open(26, 26) + berry(8, 9, 0.9) + berry(20, 21, 0.75); break;
      case "rainbow": s = open(10, 42) + RAINBOW.map((c, k) => `<rect y="${k * 7}" width="10" height="7" fill="${c}"/>`).join(""); break;
      case "sparkle": s = open(28, 28) + star(7, 8, 2.6, fg) + `<circle cx="20" cy="19" r="1.3" fill="${fg}"/><circle cx="22" cy="5" r="0.9" fill="${fg}"/>` + star(12, 22, 1.7, fg); break;
      case "denim": s = open(6, 6) + `<path d="M0 6 L6 0" stroke="${fg}" stroke-width=".8" opacity=".3"/>`; break;
      case "quilt": s = open(40, 16) + `<path d="M0 15 L40 15" stroke="${fg}" stroke-width="1.6"/>`; break;
      default: s = open(10, 10);
    }
    return s + "</pattern>";
  }

  // 옷에 그리는 그림 (가운데 0,0 · 크기 약 지름 26)
  const MOTIFS = {
    heart: () => heart(0, 0, 8, "#ff6b9a", "#d94a78"),
    star: () => star(0, 0, 11, "#ffe082", "#e0b33a"),
    berry: () => berry(0, -1, 1.8),
    flower: () => flower(0, 0, "#ff8fab", 2),
    chick: () => `<path d="M -1 -10 Q 0 -15 3 -11" stroke="#e0a800" stroke-width="1.4" fill="none"/><circle r="10" fill="#ffd54f" stroke="#e0a800" stroke-width="1.4"/><circle cx="-3.5" cy="-2" r="1.4" fill="#333"/><circle cx="3.5" cy="-2" r="1.4" fill="#333"/><path d="M -2.5 1.5 L 2.5 1.5 L 0 4.5 Z" fill="#ff8a00"/><ellipse cx="-6.5" cy="2.5" rx="1.8" ry="1.1" fill="#ff8a80" opacity=".7"/><ellipse cx="6.5" cy="2.5" rx="1.8" ry="1.1" fill="#ff8a80" opacity=".7"/>`,
    bear: () => `<circle cx="-8" cy="-8" r="4.5" fill="#a1673f"/><circle cx="8" cy="-8" r="4.5" fill="#a1673f"/><circle r="10.5" fill="#a1673f"/><ellipse cy="3" rx="5" ry="4" fill="#f6e6d0"/><circle cx="-4" cy="-2" r="1.4" fill="#333"/><circle cx="4" cy="-2" r="1.4" fill="#333"/><ellipse cy="1.6" rx="1.8" ry="1.2" fill="#333"/>`,
    robot: () => `<line x1="0" y1="-14" x2="0" y2="-9" stroke="#90a4ae" stroke-width="1.6"/><circle cy="-15" r="2.2" fill="#ff5252"/><rect x="-14" y="-4" width="3" height="7" rx="1" fill="#90a4ae"/><rect x="11" y="-4" width="3" height="7" rx="1" fill="#90a4ae"/><rect x="-11" y="-9" width="22" height="17" rx="4" fill="#e3eaee" stroke="#78909c" stroke-width="1.4"/><circle cx="-5" cy="-1.5" r="3" fill="#4fc3f7" stroke="#0288d1" stroke-width="1"/><circle cx="5" cy="-1.5" r="3" fill="#4fc3f7" stroke="#0288d1" stroke-width="1"/><rect x="-5" y="3.5" width="10" height="2.4" rx="1" fill="#78909c"/>`,
    melody: () => {
      const P = "#f59ec2", L = "#d97aa2";
      return `<ellipse cx="-7.5" cy="-15" rx="5" ry="11" transform="rotate(-16 -7.5 -15)" fill="${P}" stroke="${L}" stroke-width="1.2"/><ellipse cx="7.5" cy="-15" rx="5" ry="11" transform="rotate(16 7.5 -15)" fill="${P}" stroke="${L}" stroke-width="1.2"/><circle r="12.5" fill="${P}" stroke="${L}" stroke-width="1.2"/><ellipse cy="3" rx="10" ry="8" fill="#fff"/><ellipse cx="-4" cy="2" rx="1.2" ry="1.8" fill="#2b2b2b"/><ellipse cx="4" cy="2" rx="1.2" ry="1.8" fill="#2b2b2b"/><ellipse cy="5" rx="1.5" ry="1" fill="#ffd54f"/>${flower(11, -23, "#ff6fa8", 0.9, "#ffe082")}`;
    },
    kuromi: () => {
      const B = "#2f2a3a", E = "#f7a1c4";
      return `<path d="M -10 -6 Q -16 -18 -21 -24 Q -10 -20 -2 -11 Z" fill="${B}" stroke="${E}" stroke-width="1"/><path d="M 10 -6 Q 16 -18 21 -24 Q 10 -20 2 -11 Z" fill="${B}" stroke="${E}" stroke-width="1"/><circle r="12.5" fill="${B}" stroke="${E}" stroke-width="1"/><ellipse cy="3.5" rx="9.5" ry="7.5" fill="#fff"/><circle cy="-7" r="3.2" fill="${E}"/><circle cx="-1.1" cy="-7.4" r=".7" fill="${B}"/><circle cx="1.1" cy="-7.4" r=".7" fill="${B}"/><ellipse cx="-3.8" cy="2.5" rx="1.2" ry="1.7" fill="${B}"/><ellipse cx="3.8" cy="2.5" rx="1.2" ry="1.7" fill="${B}"/><ellipse cy="5.2" rx="1.1" ry=".8" fill="${E}"/><path d="M -1.8 7 Q 0 8.2 1.8 7" stroke="${B}" stroke-width=".8" fill="none"/>`;
    },
    hachu: () => {
      const P = "#ff8cc6", D = "#ff4f9e";
      return `<ellipse cx="-14" cy="0" rx="6.5" ry="4.5" transform="rotate(-25 -14 0)" fill="#fff" stroke="#ffb3d6" stroke-width="1.2"/><ellipse cx="14" cy="0" rx="6.5" ry="4.5" transform="rotate(25 14 0)" fill="#fff" stroke="#ffb3d6" stroke-width="1.2"/>${heart(0, -14, 5.5, D, "#d93a85")}<circle r="12" fill="${P}" stroke="#e46aa8" stroke-width="1.2"/><ellipse cx="-4.3" cy="0" rx="2.2" ry="2.9" fill="#3a2433"/><ellipse cx="4.3" cy="0" rx="2.2" ry="2.9" fill="#3a2433"/><circle cx="-3.6" cy="-1" r=".8" fill="#fff"/><circle cx="5" cy="-1" r=".8" fill="#fff"/><ellipse cx="-7.5" cy="4" rx="2" ry="1.2" fill="${D}" opacity=".6"/><ellipse cx="7.5" cy="4" rx="2" ry="1.2" fill="${D}" opacity=".6"/><path d="M -2 4.5 Q 0 6.5 2 4.5" stroke="#3a2433" stroke-width=".9" fill="none"/>${heart(0, -7, 1.8, "#fff")}`;
    },
  };
  // ───────── 진짜 캐릭터 그림 (넣었을 때만) ─────────
  // js/data/items.js의 CHARACTER_IMAGES 주소에 PNG가 있으면 옷 무늬에 그 그림을 쓰고, 없으면 위의 흉내 그림을 써요.
  // 그림은 늦게 불러와지니까, 캐릭터 무늬 자리(g.char-motif)에 표시를 해 두고 불러온 뒤 그 자리만 바꿔 끼워요.
  const CHAR_FILES = window.CHARACTER_IMAGES || {};
  const charImg = {};       // 불러온 그림 주소 (이름 → 주소)
  const CHAR_BOX = 44;      // 그림 상자 (무늬 단위 · 가로세로). 온몸 그림이라 흉내 그림(얼굴, 지름 약 26 + 귀)보다 조금 크게
  const charImage = (name) => `<image class="char-img" href="${charImg[name]}" x="${-CHAR_BOX / 2}" y="${-CHAR_BOX / 2 - 4}" width="${CHAR_BOX}" height="${CHAR_BOX}" preserveAspectRatio="xMidYMid meet"/>`;
  const motif = (name, x, y, s) => {
    if (!MOTIFS[name]) return "";
    const isChar = Object.prototype.hasOwnProperty.call(CHAR_FILES, name);
    return `<g transform="translate(${x} ${y}) scale(${s})"${isChar ? ` class="char-motif" data-char="${name}"` : ""}>${charImg[name] ? charImage(name) : MOTIFS[name]()}</g>`;
  };
  function setCharacterImage(name, src) {
    if (!MOTIFS[name] || !src) return;
    charImg[name] = src;
    document.querySelectorAll(`g.char-motif[data-char="${name}"]`).forEach((g) => { g.innerHTML = charImage(name); });
  }
  for (const [name, src] of Object.entries(CHAR_FILES)) {
    if (!src) continue;
    const im = new Image();
    im.onload = () => setCharacterImage(name, src); // 파일이 없으면 조용히 흉내 그림 그대로
    im.src = src;
  }

  // ───────── 몸 (정연이·정우 같은 크기) ─────────
  const ARM_L = "M 76 150 Q 64 192 61 230";
  const ARM_R = "M 124 150 Q 136 192 139 230";
  const LEG_L = "M 78 222 L 99 222 L 96 346 L 83 346 Z";
  const LEG_R = "M 101 222 L 122 222 L 117 346 L 104 346 Z";
  const TORSO = "M 76 140 Q 100 134 124 140 L 129 152 L 124 200 L 126 228 L 74 228 L 76 200 L 71 152 Z";

  function bodyBack() {
    const arm = (d) => `<path d="${d}" stroke="${SKIN_L}" stroke-width="16" fill="none" stroke-linecap="round"/><path d="${d}" stroke="${SKIN}" stroke-width="12.5" fill="none" stroke-linecap="round"/>`;
    return sh(LEG_L, SKIN, SKIN_L) + sh(LEG_R, SKIN, SKIN_L)
      + `<ellipse cx="89.5" cy="347" rx="9" ry="6" fill="${SKIN}" stroke="${SKIN_L}" stroke-width="2"/><ellipse cx="110.5" cy="347" rx="9" ry="6" fill="${SKIN}" stroke="${SKIN_L}" stroke-width="2"/>`
      + arm(ARM_L) + arm(ARM_R)
      + `<rect x="92" y="112" width="16" height="32" rx="6" fill="${SKIN}" stroke="${SKIN_L}" stroke-width="2"/>`
      + sh(TORSO, SKIN, SKIN_L);
  }
  const hands = () => `<circle cx="60.5" cy="235" r="7.5" fill="${SKIN}" stroke="${SKIN_L}" stroke-width="2"/><circle cx="139.5" cy="235" r="7.5" fill="${SKIN}" stroke="${SKIN_L}" stroke-width="2"/>`;
  function head() {
    return `<circle cx="54" cy="92" r="8" fill="${SKIN}" stroke="${SKIN_L}" stroke-width="2"/><circle cx="146" cy="92" r="8" fill="${SKIN}" stroke="${SKIN_L}" stroke-width="2"/>`
      + `<ellipse cx="100" cy="82" rx="47" ry="46" fill="${SKIN}" stroke="${SKIN_L}" stroke-width="2"/>`
      + `<g class="doll-eyes"><ellipse cx="82" cy="94" rx="5.2" ry="6.6" fill="#3a2433"/><ellipse cx="118" cy="94" rx="5.2" ry="6.6" fill="#3a2433"/><circle cx="84" cy="91.5" r="1.9" fill="#fff"/><circle cx="120" cy="91.5" r="1.9" fill="#fff"/></g>`
      + `<ellipse cx="70" cy="107" rx="8" ry="5" fill="#ff9aa8" opacity=".55"/><ellipse cx="130" cy="107" rx="8" ry="5" fill="#ff9aa8" opacity=".55"/>`
      + `<path d="M 93 107 Q 100 116 107 107 Q 100 110 93 107 Z" fill="#ff7b93" stroke="#e0607a" stroke-width="1.6" stroke-linejoin="round"/>`;
  }
  const UNDER_TOP = "M 81 142 L 87 141 Q 100 152 113 141 L 119 142 L 126 156 L 124 214 L 76 214 L 74 156 Z";
  const UNDER_BOT = "M 75 204 L 125 204 L 127 238 Q 113 243 101 238 L 100 232 L 99 238 Q 87 243 73 238 Z";

  // 소매: 팔 길을 따라 굵은 선으로 (pathLength 100 기준 얼마큼 덮을지)
  function sleeves(kind, fill, line, opt = {}) {
    if (!kind || kind === "none") return "";
    if (kind === "puff") {
      return [[72, 155, -22], [128, 155, 22]].map(([x, y, r]) => `<g transform="rotate(${r} ${x} ${y})"><ellipse cx="${x}" cy="${y}" rx="12.5" ry="12" fill="${fill}" stroke="${line}" stroke-width="2"/><path d="M ${x - 9} ${y + 7} Q ${x} ${y + 12} ${x + 9} ${y + 7}" stroke="${line}" stroke-width="1.3" fill="none"/></g>`).join("");
    }
    const len = kind === "short" ? 33 : 92;
    const w = opt.w || 21;
    return (opt.arms || [ARM_L, ARM_R]).map((path) => {
      return `<path d="${path}" pathLength="100" stroke-dasharray="${len + 2} 300" stroke="${line}" stroke-width="${w + 4}" fill="none"/><path d="${path}" pathLength="100" stroke-dasharray="${len} 300" stroke="${fill}" stroke-width="${w}" fill="none"/>`
        + (opt.cuff ? `<path d="${path}" pathLength="100" stroke-dasharray="0 ${len - 7} 7 300" stroke="${opt.cuff}" stroke-width="${w}" fill="none"/>` : "");
    }).join("");
  }

  function collar(kind, color, line, accent) {
    if (kind === "round") return sh("M 100 143 C 95 154 82 154 79 141 L 90 136 Q 95 142 100 143 Z", color, line) + sh("M 100 143 C 105 154 118 154 121 141 L 110 136 Q 105 142 100 143 Z", color, line);
    if (kind === "sailor") {
      return sh("M 74 141 L 90 136 L 100 168 L 110 136 L 126 141 L 129 151 L 100 184 L 71 151 Z", accent, dark(accent))
        + `<path d="M 76 148 L 100 176 L 124 148" stroke="#fff" stroke-width="1.8" fill="none"/>` + bow(100, 178, "#e53935", 0.8);
    }
    if (kind === "frill") {
      let o = "";
      for (let k = 0; k <= 6; k++) {
        const t = k / 6;
        o += `<circle cx="${f1(82 + 36 * t)}" cy="${f1(139 + 9 * Math.sin(Math.PI * t))}" r="4.6" fill="${color}" stroke="${line}" stroke-width="1.4"/>`;
      }
      return o;
    }
    return "";
  }

  // 튜튜처럼 끝이 뾰족뾰족한 치마
  function zigzag(top, hem, xl, xr, n, amp) {
    let d = `M 77 ${top} L 123 ${top} L ${xr} ${hem - amp}`;
    for (let k = 1; k <= 2 * n; k++) d += ` L ${f1(xr - ((xr - xl) * k) / (2 * n))} ${k % 2 ? hem : hem - amp}`;
    return d + " Z";
  }

  // ───────── 원피스 ─────────
  const BODICE = "M 74 141 L 90 136 Q 100 147 110 136 L 126 141 L 130 153 L 125 200 L 75 200 L 70 153 Z";
  const BODICE_NS = "M 81 141 L 88 139 Q 100 151 112 139 L 119 141 L 126 156 L 125 200 L 75 200 L 74 156 Z";
  const DSKIRT = {
    aline: "M 76 196 L 124 196 Q 138 238 152 282 Q 126 292 100 290 Q 74 292 48 282 Q 62 238 76 196 Z",
    long: "M 76 196 L 124 196 Q 142 262 156 330 Q 128 340 100 338 Q 72 340 44 330 Q 58 262 76 196 Z",
    princess: "M 76 196 L 124 196 Q 152 250 170 324 Q 136 340 100 338 Q 64 340 30 324 Q 48 250 76 196 Z",
  };
  function drawDress(it, p) {
    const f = p.fill(it), L = dark(it.color), a2 = it.color2 || light(it.color, 0.6);
    const pin = it.shape === "pinafore";
    let o = "";
    if (pin) o += sleeves("short", "#ffffff", "#cfc7cc") + sh(BODICE, "#ffffff", "#cfc7cc") + collar("round", "#ffffff", "#cfc7cc");
    else if (it.sleeve !== "puff") o += sleeves(it.sleeve, f, L);
    if (it.shape === "tutu") {
      o += sh(zigzag(196, 268, 38, 162, 7, 11), light(it.color, 0.35), L, `opacity=".92"`) + sh(zigzag(196, 256, 46, 154, 6, 9), f, L);
    } else if (it.shape === "princess") {
      o += sh(DSKIRT.princess, f, L) + sh("M 88 198 L 112 198 Q 124 262 132 336 Q 100 342 68 336 Q 76 262 88 198 Z", light(it.color, 0.5), L)
        + bow(80, 300, a2, 0.7) + bow(120, 300, a2, 0.7);
    } else {
      o += sh(DSKIRT[it.shape] || DSKIRT.aline, f, L);
    }
    if (pin) {
      o += `<path d="M 84 162 L 85 140 M 116 162 L 115 140" stroke="${L}" stroke-width="9" stroke-linecap="round"/><path d="M 84 162 L 85 140 M 116 162 L 115 140" stroke="${f}" stroke-width="6" stroke-linecap="round"/>`
        + sh("M 80 160 L 120 160 L 124 200 L 76 200 Z", f, L) + `<circle cx="84" cy="164" r="2.6" fill="#ffd54f" stroke="#c99a00"/><circle cx="116" cy="164" r="2.6" fill="#ffd54f" stroke="#c99a00"/>`;
    } else {
      o += sh(it.sleeve === "none" ? BODICE_NS : BODICE, f, L);
    }
    if (it.sleeve === "puff") o += sleeves("puff", f, L);
    if (it.collar) o += collar(it.collar, it.collar === "frill" && it.color2 ? it.color2 : "#ffffff", L, it.color2 || "#283593");
    if (it.belt) o += `<path d="M 75 191 L 125 191 L 125 201 L 75 201 Z" fill="${a2}" stroke="${dark(a2)}" stroke-width="1.6"/>` + bow(100, 196, a2, 0.9);
    if (it.shape === "princess") o += star(100, 168, 5, "#fff59d", "#e0b33a");
    if (it.motif) {
      if (pin) o += motif(it.motif, 100, 180, 0.8);
      else if (it.shape === "tutu") o += motif(it.motif, 100, 174, 0.95);
      else o += motif(it.motif, 100, 248, it.shape === "princess" ? 1.4 : 1.3);
    }
    return o;
  }

  // ───────── 윗옷 ─────────
  const TOP = "M 74 141 L 90 136 Q 100 146 110 136 L 126 141 L 130 153 L 128 226 Q 100 232 72 226 L 70 153 Z";
  const TOP_NS = "M 81 141 L 88 139 Q 100 151 112 139 L 119 141 L 126 156 L 128 226 Q 100 232 72 226 L 74 156 Z";
  const PAD = "M 70 140 L 90 134 Q 100 143 110 134 L 130 140 L 136 154 L 134 232 Q 100 240 66 232 L 64 154 Z";
  const PANEL_L = "M 74 141 L 90 136 L 97 160 L 97 229 Q 84 230 72 226 L 70 153 Z";
  function drawTop(it, p) {
    const f = p.fill(it), L = dark(it.color), a2 = it.color2 || light(it.color, 0.55);
    const rib = it.pattern ? "#ffffff" : dark(it.color, 0.12);
    const hem = `<path d="M 72 218 Q 100 224 128 218 L 128 226 Q 100 232 72 226 Z" fill="${rib}" stroke="${L}" stroke-width="1.6"/>`;
    const inner = sh(TOP, "#ffffff", "#cfc7cc");
    let o = "";
    switch (it.shape) {
      case "tank": o += sh(TOP_NS, f, L); break;
      case "tee": o += sleeves("short", f, L) + sh(TOP, f, L) + `<path d="M 91.5 139 Q 100 148.5 108.5 139" stroke="${L}" stroke-width="1.2" fill="none"/>`; break;
      case "longtee": o += sleeves("long", f, L) + sh(TOP, f, L); break;
      case "blouse": o += sh(TOP, f, L) + sleeves("puff", f, L) + collar("frill", "#ffffff", L) + [166, 184, 202].map((y) => `<circle cx="100" cy="${y}" r="2.2" fill="#fff" stroke="${L}" stroke-width="1"/>`).join(""); break;
      case "hoodie":
        o += sh("M 72 150 Q 64 116 100 114 Q 136 116 128 150 Q 100 140 72 150 Z", it.color2 || dark(it.color, 0.1), L)
          + sleeves("long", f, L, { cuff: rib }) + sh(TOP, f, L) + hem
          + sh("M 82 196 L 118 196 L 122 218 L 78 218 Z", dark(it.color, 0.06), L)
          + `<path d="M 94 146 L 93 170 M 106 146 L 107 170" stroke="${a2}" stroke-width="2" stroke-linecap="round"/>`;
        break;
      case "cardigan":
        o += inner + sleeves("long", f, L, { cuff: rib }) + sh(PANEL_L, f, L) + sh(mirror(PANEL_L), f, L)
          + [168, 186, 204].map((y) => `<circle cx="93" cy="${y}" r="2.4" fill="#fff" stroke="${L}" stroke-width="1"/>`).join("");
        break;
      case "jacket":
        o += inner + sleeves("long", f, L) + sh(PANEL_L, f, L) + sh(mirror(PANEL_L), f, L)
          + sh("M 90 136 L 97 160 L 84 152 L 79 140 Z", light(it.color, 0.25), L) + sh(mirror("M 90 136 L 97 160 L 84 152 L 79 140 Z"), light(it.color, 0.25), L)
          + `<path d="M 78 178 L 92 178 M 108 178 L 122 178" stroke="${L}" stroke-width="1.6"/><circle cx="85" cy="183" r="1.8" fill="#ffd54f"/><circle cx="115" cy="183" r="1.8" fill="#ffd54f"/>`;
        break;
      case "knit": o += sleeves("long", f, L, { cuff: rib }) + sh(TOP, f, L) + hem + `<path d="M 90 136 Q 100 146 110 136" stroke="${rib}" stroke-width="4" fill="none"/>`; break;
      case "padding":
        o += sleeves("long", f, L, { w: 27 }) + sh(PAD, f, L)
          + `<path d="M 100 142 L 100 236" stroke="${L}" stroke-width="2"/><path d="M 88 134 Q 100 146 112 134 L 114 128 Q 100 138 86 128 Z" fill="${dark(it.color, 0.08)}" stroke="${L}" stroke-width="1.6"/>`;
        break;
      case "shirt":
        o += sleeves("long", f, L) + sh(TOP, f, L)
          + sh("M 90 136 L 100 148 L 92 154 L 82 140 Z", "#ffffff", L) + sh(mirror("M 90 136 L 100 148 L 92 154 L 82 140 Z"), "#ffffff", L)
          + [162, 180, 198, 216].map((y) => `<circle cx="100" cy="${y}" r="2" fill="#fff" stroke="${L}" stroke-width="1"/>`).join("");
        break;
      case "sweat": o += sleeves("long", f, L, { cuff: rib }) + sh(TOP, f, L) + hem; break;
      case "jumper": // 정우 로봇 점퍼
        o += sleeves("long", f, L, { cuff: a2, w: 23 }) + sh(PAD, f, L)
          + `<path d="M 88 134 Q 100 146 112 134 L 114 127 Q 100 138 86 127 Z" fill="${a2}" stroke="${dark(a2)}" stroke-width="1.6"/>`
          + `<path d="M 66 224 Q 100 232 134 224 L 134 232 Q 100 240 66 232 Z" fill="${a2}" stroke="${dark(a2)}" stroke-width="1.6"/>`;
        break;
      default: o += sleeves("short", f, L) + sh(TOP, f, L);
    }
    if (it.motif) o += it.shape === "cardigan" ? motif(it.motif, 85, 206, 0.55) : motif(it.motif, 100, 184, it.shape === "jumper" ? 1.3 : 1.15);
    return o;
  }

  // ───────── 바지·치마 ─────────
  const BOT = {
    skirt: "M 76 198 L 124 198 Q 134 230 143 260 Q 122 268 100 266 Q 78 268 57 260 Q 66 230 76 198 Z",
    longskirt: "M 76 198 L 124 198 Q 140 262 150 322 Q 126 330 100 328 Q 74 330 50 322 Q 60 262 76 198 Z",
    pants: "M 74 198 L 126 198 L 128 232 L 122 340 L 103 340 L 100 240 L 97 340 L 78 340 L 72 232 Z",
    shorts: "M 74 198 L 126 198 L 129 232 L 130 258 L 103 260 L 100 240 L 97 260 L 70 258 L 71 232 Z",
    leggings: "M 76 198 L 124 198 L 124 228 L 118 342 L 104 342 L 100 236 L 96 342 L 82 342 L 76 228 Z",
  };
  function drawBottom(it, p) {
    const f = p.fill(it), L = dark(it.color);
    const band = `<path d="M 75 198 L 125 198 L 125.5 207 L 74.5 207 Z" fill="${it.pattern ? "#ffffff" : dark(it.color, 0.1)}" stroke="${L}" stroke-width="1.6"/>`;
    let o = "";
    switch (it.shape) {
      case "pleats":
        o += sh(BOT.skirt, f, L) + [84, 92, 100, 108, 116].map((x) => `<path d="M ${x} 207 L ${f1(100 + (x - 100) * 1.75)} ${x === 100 ? 266 : 264}" stroke="${L}" stroke-width="1.2" opacity=".6"/>`).join("") + band;
        break;
      case "tutu": o += sh(zigzag(198, 262, 50, 150, 6, 10), light(it.color, 0.35), L, `opacity=".92"`) + sh(zigzag(198, 252, 56, 144, 5, 9), f, L) + band; break;
      case "skirt": case "longskirt": o += sh(BOT[it.shape], f, L) + band; break;
      case "shorts": o += sh(BOT.shorts, f, L) + band + `<path d="M 100 207 L 100 238" stroke="${L}" stroke-width="1.2"/>`; break;
      case "leggings": o += sh(BOT.leggings, f, L) + band; break;
      case "jeans":
        o += sh(BOT.pants, f, L) + band
          + `<path d="M 78 330 L 97 330 L 97 340 L 78 340 Z M 103 330 L 122 330 L 122 340 L 103 340 Z" fill="${light(it.color, 0.3)}" stroke="${L}" stroke-width="1.4"/>`
          + `<path d="M 79 212 Q 88 222 92 212 M 121 212 Q 112 222 108 212 M 100 207 L 100 238" stroke="#ffd180" stroke-width="1.3" stroke-dasharray="3 2" fill="none"/>`;
        break;
      case "jogger":
        o += sh(BOT.pants, f, L) + band
          + `<path d="M 78 330 L 97 330 L 97 340 L 78 340 Z M 103 330 L 122 330 L 122 340 L 103 340 Z" fill="${dark(it.color, 0.12)}" stroke="${L}" stroke-width="1.4"/>`
          + `<path d="M 73 214 L 79 328 M 127 214 L 121 328" stroke="#fff" stroke-width="2.4"/>`;
        break;
      default: o += sh(BOT.pants, f, L) + band + `<path d="M 100 207 L 100 238" stroke="${L}" stroke-width="1.2"/>`;
    }
    if (it.motif) {
      if (it.shape === "pants" || it.shape === "jeans" || it.shape === "jogger") o += motif(it.motif, 87, 262, 0.62);
      else if (it.shape === "tutu") o += motif(it.motif, 100, 232, 0.85);
      else o += motif(it.motif, 100, 240, 0.95);
    }
    return o;
  }

  // ───────── 신발 ─────────
  const FEET = [89.5, 110.5];
  const shoe = (cx, top, bottom = 362, half = 12.5) => `M ${f1(cx - half + 2.5)} ${top} Q ${f1(cx - half - 0.5)} ${top + 6} ${f1(cx - half)} ${bottom - 6} Q ${f1(cx - half + 0.5)} ${bottom} ${f1(cx - 5)} ${bottom} L ${f1(cx + 5)} ${bottom} Q ${f1(cx + half - 0.5)} ${bottom} ${f1(cx + half)} ${bottom - 6} Q ${f1(cx + half + 0.5)} ${top + 6} ${f1(cx + half - 2.5)} ${top} Q ${cx} ${top - 3} ${f1(cx - half + 2.5)} ${top} Z`;
  function drawShoes(it, p) {
    const c = it.color, L = dark(c), f = p.fill(it), c2 = it.color2 || light(c, 0.6);
    const toe = (cx) => {
      if (!it.motif || it.motif === "frog") return "";
      if (it.motif === "bow") return bow(cx, 345, "#ff6b9a", 0.5);
      return motif(it.motif, cx, 351, 0.3);
    };
    return FEET.map((cx) => {
      let o = "";
      const shaft = (top) => sh(`M ${f1(cx - 10)} ${top} L ${f1(cx + 10)} ${top} L ${f1(cx + 11)} 350 L ${f1(cx - 11)} 350 Z`, f, L);
      switch (it.shape) {
        case "sneaker": case "lightup": {
          const lace = c === "#ffffff" ? "#9ec9f0" : "#ffffff";
          o += sh(shoe(cx, 336), f, L)
            + `<path d="M ${f1(cx - 12.6)} 354 L ${f1(cx + 12.6)} 354 L ${f1(cx + 12.3)} 357 Q ${f1(cx + 12)} 362 ${f1(cx + 5)} 362 L ${f1(cx - 5)} 362 Q ${f1(cx - 12)} 362 ${f1(cx - 12.3)} 357 Z" fill="#fff" stroke="${L}" stroke-width="1.6"/>`
            + `<path d="M ${f1(cx - 5)} 341 L ${f1(cx + 5)} 343 M ${f1(cx - 5)} 345.5 L ${f1(cx + 5)} 347.5" stroke="${lace}" stroke-width="1.8" stroke-linecap="round"/>`;
          if (it.shape === "lightup") o += RAINBOW.map((rc, k) => `<circle cx="${f1(cx - 9 + k * 3.6)}" cy="358" r="1.6" fill="${rc}"/>`).join("") + star(cx + 12, 340, 3, "#fff59d");
          break;
        }
        case "maryjane": case "glass":
          o += sh(shoe(cx, 346), f, L)
            + `<path d="M ${f1(cx - 10)} 346 Q ${cx} 339 ${f1(cx + 10)} 346" stroke="${L}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M ${f1(cx - 10)} 346 Q ${cx} 339 ${f1(cx + 10)} 346" stroke="${c}" stroke-width="2" fill="none" stroke-linecap="round"/>`
            + `<ellipse cx="${f1(cx - 5)}" cy="355" rx="3.2" ry="1.6" fill="#fff" opacity=".65"/>`;
          if (it.shape === "glass") o += star(cx, 352, 3.6, "#ffffff", "#9fc9ee") + star(cx + 11, 342, 2.4, "#fff59d");
          break;
        case "boots": o += shaft(296) + sh(shoe(cx, 342), f, L) + `<path d="M ${f1(cx - 10)} 296 L ${f1(cx + 10)} 296 L ${f1(cx + 10.2)} 304 L ${f1(cx - 10.2)} 304 Z" fill="${dark(c, 0.15)}" stroke="${L}" stroke-width="1.4"/>`; break;
        case "rainboots":
          o += shaft(300) + sh(shoe(cx, 342), f, L) + `<path d="M ${f1(cx - 5)} 306 L ${f1(cx - 5)} 340" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".6"/>`;
          if (it.motif === "frog") o += [-5, 5].map((dx) => `<circle cx="${f1(cx + dx)}" cy="349" r="3.6" fill="#fff" stroke="${L}" stroke-width="1.2"/><circle cx="${f1(cx + dx)}" cy="349.5" r="1.6" fill="#222"/>`).join("") + `<path d="M ${f1(cx - 4)} 356 Q ${cx} 359 ${f1(cx + 4)} 356" stroke="#2e7d32" stroke-width="1.4" fill="none"/>`;
          break;
        case "furboots":
          o += shaft(314) + sh(shoe(cx, 342), f, L)
            + [-8, -3, 2, 7].map((dx, k) => `<circle cx="${f1(cx + dx + 0.5)}" cy="${314 + (k % 2)}" r="5" fill="${c2}" stroke="${dark(c2, 0.2)}" stroke-width="1.2"/>`).join("");
          break;
        case "sandals":
          o += `<path d="M ${f1(cx - 12)} 357 L ${f1(cx + 12)} 357 Q ${f1(cx + 12)} 362 ${f1(cx + 6)} 362 L ${f1(cx - 6)} 362 Q ${f1(cx - 12)} 362 ${f1(cx - 12)} 357 Z" fill="${dark(c, 0.15)}" stroke="${L}" stroke-width="1.6"/>`
            + `<path d="M ${f1(cx - 9)} 346 L ${f1(cx + 9)} 346 M ${f1(cx - 10)} 352 L ${f1(cx + 10)} 352 M ${f1(cx - 7)} 338 L ${f1(cx + 7)} 338" stroke="${c}" stroke-width="3.4" stroke-linecap="round"/>`
            + flower(cx, 346, "#fff59d", 0.7, "#ff8fab");
          break;
        case "ballet":
          o += `<path d="M ${f1(cx - 6)} 348 L ${f1(cx + 6)} 330 M ${f1(cx + 6)} 348 L ${f1(cx - 6)} 330 M ${f1(cx - 6)} 330 L ${f1(cx + 5)} 314 M ${f1(cx + 6)} 330 L ${f1(cx - 5)} 314" stroke="${dark(c, 0.15)}" stroke-width="2.2" stroke-linecap="round"/>`
            + sh(shoe(cx, 349), f, L) + bow(cx, 348, dark(c, 0.1), 0.38);
          break;
        default: o += sh(shoe(cx, 340), f, L);
      }
      return o + toe(cx);
    }).join("");
  }

  // ───────── 모자 ─────────
  const COVER = new Set(["straw", "cap", "beanie", "beret", "berrycap", "bucket"]);
  // 캐릭터 머리띠 위 그림의 높이 (세로로 긴 그림은 조금 위로 올려서 앞머리를 덜 가리게)
  const CHARBAND_Y = { melody: 16, kuromi: 18, hachu: 24 };
  function drawHat(it, p) {
    const c = it.color, L = dark(c), c2 = it.color2 || light(c, 0.55), f = p.fill(it);
    // 머리띠 (line: 테두리 색. 까만 머리띠는 분홍 테두리라야 까만 머리 위에서 보여요)
    const band = (col, line = dark(col)) => `<path d="M 56 68 Q 58 30 100 28 Q 142 30 144 68" stroke="${line}" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M 56 68 Q 58 30 100 28 Q 142 30 144 68" stroke="${col}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    switch (it.shape) {
      case "straw":
        return `<ellipse cx="100" cy="58" rx="76" ry="15" fill="${c}" stroke="${L}" stroke-width="2"/><path d="M 34 62 Q 100 74 166 62" stroke="${L}" stroke-width="1" opacity=".5" fill="none"/>`
          + sh("M 62 58 Q 60 18 100 16 Q 140 18 138 58 Z", c, L) + sh("M 62 46 Q 100 52 138 46 L 138.5 56 Q 100 62 61.5 56 Z", c2, dark(c2)) + bow(130, 51, c2, 0.8);
      case "cap":
        return sh("M 54 70 Q 54 20 100 20 Q 146 20 146 70 Q 100 60 54 70 Z", f, L)
          + `<path d="M 100 22 L 100 62 M 76 26 Q 70 46 72 66 M 124 26 Q 130 46 128 66" stroke="${L}" stroke-width="1.2" fill="none"/><circle cx="100" cy="21" r="3.5" fill="${c}" stroke="${L}" stroke-width="1.5"/>`
          + heart(100, 44, 6, "#ffffff") + sh("M 52 70 Q 100 58 148 70 Q 154 82 142 84 Q 100 72 58 84 Q 46 82 52 70 Z", dark(c, 0.12), L);
      case "beanie":
        return `<circle cx="100" cy="16" r="13" fill="${c2}" stroke="${dark(c2, 0.25)}" stroke-width="2"/>` + sh("M 52 76 Q 50 20 100 18 Q 150 20 148 76 Z", f, L)
          + `<path d="M 76 26 Q 72 44 72 62 M 100 20 L 100 58 M 124 26 Q 128 44 128 62" stroke="${L}" stroke-width="1.2" fill="none" opacity=".6"/>`
          + sh("M 49 62 Q 100 52 151 62 L 151 80 Q 100 70 49 80 Z", dark(c, 0.1), L);
      case "bucket":
        return sh("M 62 58 Q 62 22 100 22 Q 138 22 138 58 Z", c, L) + sh("M 61 54 Q 100 48 139 54 L 158 80 Q 100 68 42 80 Z", c, L)
          + `<path d="M 54 70 Q 100 62 146 70" stroke="${L}" stroke-width="1" stroke-dasharray="3 2" fill="none"/>`;
      case "crown":
        return sh("M 70 48 L 68 22 L 82 34 L 92 12 L 100 30 L 108 12 L 118 34 L 132 22 L 130 48 Q 100 42 70 48 Z", c, L)
          + [[68, 22], [92, 12], [108, 12], [132, 22]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="${c}" stroke="${L}" stroke-width="1.4"/>`).join("")
          + `<circle cx="100" cy="38" r="4.2" fill="#ff5fa8" stroke="#c2185b" stroke-width="1.2"/><circle cx="84" cy="41" r="3" fill="#4fc3f7" stroke="#0288d1" stroke-width="1"/><circle cx="116" cy="41" r="3" fill="#81c784" stroke="#388e3c" stroke-width="1"/>`;
      case "bunny":
        return [[78, -12], [122, 12]].map(([x, r]) => `<g transform="rotate(${r} ${x} 4)"><ellipse cx="${x}" cy="2" rx="10" ry="26" fill="${c}" stroke="${L}" stroke-width="2"/><ellipse cx="${x}" cy="5" rx="5" ry="18" fill="${c2}"/></g>`).join("") + band(c);
      case "cat":
        return sh("M 62 46 L 66 12 L 90 32 Z", c, L) + sh("M 67.5 39 L 69.5 21 L 83 32 Z", c2, c2) + sh(mirror("M 62 46 L 66 12 L 90 32 Z"), c, L) + sh(mirror("M 67.5 39 L 69.5 21 L 83 32 Z"), c2, c2) + band(c);
      case "bow": return bow(128, 40, c, 2.1);
      case "flowers": {
        const cols = ["#ff8fab", "#fff59d", "#ce93d8", "#ffffff", "#90caf9", "#ffcc80"];
        let o = `<path d="M 54 70 Q 56 26 100 26 Q 144 26 146 70" stroke="${c}" stroke-width="4" fill="none"/>`;
        for (let k = 0; k <= 8; k++) {
          const a = Math.PI + (k / 8) * Math.PI;
          o += flower(f1(100 + 48 * Math.cos(a)), f1(72 + 44 * Math.sin(a)), cols[k % cols.length], 2.1);
        }
        return o;
      }
      case "beret":
        return `<g transform="rotate(-8 100 40)">${sh("M 46 52 Q 48 20 100 18 Q 154 20 156 46 Q 150 62 100 62 Q 54 64 46 52 Z", c, L)}<path d="M 100 19 L 102 8" stroke="${L}" stroke-width="3.4" stroke-linecap="round"/></g>`;
      case "berrycap": {
        let o = sh("M 52 78 Q 46 20 100 16 Q 154 20 148 78 Q 100 66 52 78 Z", c, L);
        for (const [x, y] of [[70, 50], [86, 38], [100, 54], [114, 38], [130, 50], [78, 66], [122, 66], [100, 30]]) o += `<ellipse cx="${x}" cy="${y}" rx="1.8" ry="2.6" fill="#ffe082"/>`;
        return o + sh("M 76 26 L 88 14 L 92 22 L 100 8 L 108 22 L 112 14 L 124 26 Q 100 34 76 26 Z", "#66bb6a", "#388e3c") + `<path d="M 100 9 L 101 0" stroke="#388e3c" stroke-width="3" stroke-linecap="round"/>`;
      }
      case "starpins": return star(126, 48, 8, c, L) + star(140, 66, 6.5, "#ff8fab", dark("#ff8fab")) + star(110, 38, 5.5, "#90caf9", dark("#90caf9"));
      // 캐릭터 머리띠: 색 머리띠 + 정수리에 캐릭터 그림 (진짜 그림 파일이 있으면 그 그림)
      case "charband": case "hachuband": {
        const name = it.motif || "hachu";
        return band(c, it.color2 || dark(c)) + motif(name, 100, CHARBAND_Y[name] ?? 24, 1.5);
      }
      default: return "";
    }
  }

  // ───────── 머리 ─────────
  const HB = {
    head: "M 50 92 Q 46 30 100 30 Q 154 30 150 92 Q 150 114 140 124 L 60 124 Q 50 114 50 92 Z",
    long: "M 50 90 Q 46 28 100 28 Q 154 28 150 90 L 156 214 Q 142 224 128 218 Q 114 226 100 220 Q 86 226 72 218 Q 58 224 44 214 Z",
    bob: "M 48 92 Q 44 28 100 28 Q 156 28 152 92 L 155 132 Q 146 142 136 136 Q 118 142 100 138 Q 82 142 64 136 Q 54 142 45 132 Z",
    short: "M 50 92 Q 46 30 100 30 Q 154 30 150 92 L 151 114 Q 146 122 140 114 L 60 114 Q 54 122 49 114 Z",
    wavy: "M 50 90 Q 46 28 100 28 Q 154 28 150 90 Q 162 118 152 146 Q 164 176 154 210 Q 128 228 100 220 Q 72 228 46 210 Q 36 176 48 146 Q 38 118 50 90 Z",
    princess: "M 50 90 Q 46 28 100 28 Q 154 28 150 90 L 154 194 Q 100 210 46 194 Z",
    boy: "M 51 86 Q 46 27 100 26 Q 154 27 149 86 Q 140 60 100 58 Q 60 60 51 86 Z", // 뒷머리가 귀 아래로 내려오지 않게
    jadoo: "M 48 92 Q 44 28 100 28 Q 156 28 152 92 L 153 120 Q 146 128 138 122 L 62 122 Q 54 128 47 120 Z", // 턱까지 오는 짧은 단발
  };
  // 앞머리: 이마만 덮고, 옆은 얼굴 테두리(가운데 100,82 · 가로 47 · 세로 46) 바깥으로만 내려와요 (볼을 가리지 않게)
  const HF = {
    bangs: "M 50 92 Q 44 30 100 29 Q 156 30 150 92 Q 149 78 144 70 Q 134 80 122 71 Q 112 81 100 73 Q 88 81 78 71 Q 66 80 56 70 Q 51 78 50 92 Z",
    side: "M 50 92 Q 44 30 100 29 Q 156 30 150 92 Q 149 70 136 58 Q 114 48 92 58 Q 72 66 60 70 Q 51 76 50 92 Z",
    blunt: "M 50 92 Q 44 30 100 29 Q 156 30 150 92 Q 149 78 145 69 Q 100 75 55 69 Q 51 78 50 92 Z", // 일자 앞머리 (자두 머리)
    // 남자아이 짧은 머리: 이마가 보이는 짧은 앞머리, 옆머리는 귀 위에서 끝
    boy: "M 53 86 Q 48 30 100 30 Q 152 30 147 86 Q 145 72 140 62 L 132 68 L 126 56 L 116 64 L 108 54 L 100 64 L 92 54 L 84 64 L 74 56 L 68 68 L 60 62 Q 55 72 53 86 Z",
  };
  // 앞으로 내려온 옆머리: 귀를 덮고 어깨 위로 내려오되, 얼굴 테두리 안으로는 들어오지 않아요
  const LOCK = "M 52 84 Q 40 128 46 172 Q 52 180 60 172 Q 54 130 56 98 Q 55 89 52 84 Z";
  const LOCK_WAVY = "M 52 84 Q 38 108 47 128 Q 38 150 47 174 Q 53 180 61 172 Q 52 150 57 128 Q 50 108 56 98 Q 55 89 52 84 Z";
  const TAIL_LOW = "M 56 100 Q 30 122 33 162 Q 35 190 50 202 Q 46 172 57 150 Q 66 128 64 106 Z";
  const TAIL_HIGH = "M 66 50 Q 30 38 24 80 Q 20 122 38 152 Q 36 112 48 86 Q 56 68 72 58 Z";
  const PONY = "M 106 30 Q 152 8 162 58 Q 168 110 150 152 Q 152 104 140 74 Q 128 48 108 40 Z";
  const SIDEPONY = "M 140 64 Q 178 72 173 130 Q 170 176 156 198 Q 158 156 153 128 Q 149 100 141 84 Z"; // 뒤에 그려서 얼굴 뒤로 지나가요
  const JADOO_TAIL = "M 58 52 Q 40 38 22 42 Q 32 50 28 58 Q 42 62 56 68 Z";                           // 자두 머리: 귀 위에서 옆으로 뻗친 짧은 꽁지
  const CURLS_BACK = [[50, 70], [58, 46], [76, 30], [100, 24], [124, 30], [142, 46], [150, 70], [154, 96], [152, 122], [146, 144], [48, 96], [48, 122], [54, 144], [70, 150], [130, 150]];
  const CURLS_FRONT = [[62, 64], [76, 56], [92, 53], [108, 53], [124, 56], [138, 64]];

  // 뿌까 머리: 땋은 머리를 돌돌 말아 올린 동그란 머리 (바깥 고리에 땋은 마디 8개 + 안쪽 고리 4개)
  // 땋은 마디의 줄 색: 까만 머리에는 밝은 줄, 밝은 머리에는 진한 줄 (테두리 색만으로는 까만 머리에서 안 보여요)
  const texture = (col) => { const [r, g, b] = rgb(col); return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.4 ? light(col, 0.32) : dark(col, 0.3); };
  function braidBun(x, y, r, col, L) {
    let o = `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}" stroke="${L}" stroke-width="2"/>`;
    const T = texture(col);
    const ring = (n, rr, rx, ry, w) => {
      for (let k = 0; k < n; k++) {
        const a = (k * 2 * Math.PI) / n;
        const cx = f1(x + rr * Math.cos(a)), cy = f1(y + rr * Math.sin(a));
        o += `<ellipse cx="${cx}" cy="${cy}" rx="${f1(rx)}" ry="${f1(ry)}" transform="rotate(${f1((a * 180) / Math.PI + 90)} ${cx} ${cy})" fill="${col}" stroke="${T}" stroke-width="${w}"/>`;
      }
    };
    ring(8, r * 0.64, r * 0.36, r * 0.24, 1.4);
    ring(4, r * 0.24, r * 0.24, r * 0.16, 1.2);
    return o + `<path d="M ${f1(x - r * 0.5)} ${f1(y - r * 0.55)} Q ${x} ${f1(y - r * 0.85)} ${f1(x + r * 0.5)} ${f1(y - r * 0.55)}" stroke="${light(col, 0.45)}" stroke-width="2" fill="none" opacity=".6"/>`;
  }
  function braid(x0, y0, x1, y1, n, col, L) {
    let o = "";
    const T = texture(col);
    for (let k = 0; k < n; k++) {
      const t = k / (n - 1);
      const x = f1(x0 + (x1 - x0) * t + (k % 2 ? 1.5 : -1.5)), y = f1(y0 + (y1 - y0) * t);
      // 마디 하나 + 안쪽 땋은 결 (V 모양)
      o += `<ellipse cx="${x}" cy="${y}" rx="8" ry="9" fill="${col}" stroke="${L}" stroke-width="1.8"/>`
        + `<path d="M ${f1(x - 5)} ${f1(y - 4)} Q ${x} ${f1(y + 3)} ${f1(x + 5)} ${f1(y - 4)}" stroke="${T}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
    }
    return o + `<path d="M ${x1 - 6} ${y1 + 8} Q ${x1} ${y1 + 22} ${x1 + 6} ${y1 + 8} Z" fill="${col}" stroke="${L}" stroke-width="1.8"/>` + tie(x1, y1 + 7);
  }
  function hairBack(id, col, cover) {
    const L = dark(col, 0.38), s = (d) => sh(d, col, L);
    const bun = (x, y, r) => (cover ? "" : `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}" stroke="${L}" stroke-width="2"/><path d="M ${x - r * 0.5} ${y - r * 0.2} Q ${x} ${y - r * 0.7} ${x + r * 0.5} ${y - r * 0.2}" stroke="${L}" stroke-width="1.2" fill="none"/>`);
    switch (id) {
      case "long": case "halfup": return s(HB.long);
      case "twinlow": return s(TAIL_LOW) + s(mirror(TAIL_LOW)) + s(HB.head);
      case "twinhigh": return s(TAIL_HIGH) + s(mirror(TAIL_HIGH)) + s(HB.head);
      case "pony": return s(PONY) + s(HB.head);
      case "bun": return bun(100, 20, 19) + s(HB.head);
      case "spacebuns": return bun(64, 36, 15) + bun(136, 36, 15) + s(HB.head);
      case "bob": return s(HB.bob);
      case "wavy": return s(HB.wavy);
      case "short": return s(HB.short);
      case "princess": return s(HB.princess) + [[52, 200], [68, 208], [84, 212], [116, 212], [132, 208], [148, 200]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="10" fill="${col}" stroke="${L}" stroke-width="2"/>`).join("");
      case "curly": return CURLS_BACK.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="18" fill="${col}" stroke="${L}" stroke-width="2"/>`).join("") + `<ellipse cx="100" cy="88" rx="52" ry="58" fill="${col}"/>`;
      case "sidepony": return s(SIDEPONY) + s(HB.head);
      case "pucca": return s(HB.head);
      case "jadoo": return (cover ? "" : s(JADOO_TAIL) + s(mirror(JADOO_TAIL))) + s(HB.jadoo);
      case "boy": return s(HB.boy);
      default: return s(HB.head);
    }
  }
  function hairFront(id, col, cover) {
    const L = dark(col, 0.38), s = (d) => sh(d, col, L);
    const shine = `<path d="M 66 50 Q 80 38 98 37" stroke="${light(col, 0.45)}" stroke-width="3.5" stroke-linecap="round" fill="none" opacity=".7"/>`;
    let o;
    switch (id) {
      case "long": case "princess": o = s(LOCK) + s(mirror(LOCK)) + s(HF.bangs); break;
      case "halfup": o = s(LOCK) + s(mirror(LOCK)) + s(HF.bangs) + (cover ? "" : bow(100, 30, "#ff6b9a", 1.1)); break;
      case "twinlow": o = s(HF.bangs) + tie(50, 106) + tie(150, 106); break;
      case "twinhigh": o = s(HF.bangs) + tie(66, 52) + tie(134, 52); break;
      case "pony": o = s(HF.bangs) + (cover ? "" : tie(104, 33)); break;
      case "bun": o = s(HF.bangs) + (cover ? "" : `<path d="M 88 36 Q 100 42 112 36" stroke="#ff6b9a" stroke-width="4" stroke-linecap="round" fill="none"/>`); break;
      // 땋은 머리는 얼굴 옆(귀 아래)에서 시작해 어깨 앞으로 내려와요
      case "braids": o = s(HF.bangs) + braid(47, 108, 45, 196, 7, col, L) + braid(153, 108, 155, 196, 7, col, L); break;
      case "sidebraid": o = s(HF.side) + braid(153, 106, 157, 200, 7, col, L); break;
      case "wavy": o = s(LOCK_WAVY) + s(mirror(LOCK_WAVY)) + s(HF.side); break;
      case "short": o = s(HF.side); break;
      case "sidepony": o = s(HF.side) + tie(146, 70); break;
      case "pucca": // 뿌까 머리: 양쪽에 땋아서 돌돌 만 머리 + 빨간 리본
        o = s(HF.bangs) + (cover ? "" : braidBun(58, 44, 19, col, L) + braidBun(142, 44, 19, col, L) + bow(70, 60, "#e53935", 0.6) + bow(130, 60, "#e53935", 0.6));
        break;
      case "jadoo": // 자두 머리: 일자 앞머리 + 짧은 단발 + 옆으로 뻗친 양쪽 꽁지
        o = s(HF.blunt) + (cover ? "" : tie(56, 59) + tie(144, 59));
        break;
      case "curly": o = s("M 50 92 Q 44 30 100 29 Q 156 30 150 92 Q 148 74 138 66 Q 100 58 62 66 Q 52 74 50 92 Z") + CURLS_FRONT.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="11" fill="${col}" stroke="${L}" stroke-width="1.8"/>`).join(""); break;
      case "boy": // 짧은 머리 + 뻗친 머리카락 + 짙은 눈썹
        o = s(HF.boy) + s("M 97 31 Q 102 16 115 18 Q 106 23 105 31 Z")
          + `<path d="M 75 80 Q 83 75 91 80 M 109 80 Q 117 75 125 80" stroke="${L}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`;
        break;
      default: o = s(HF.bangs);
    }
    return o + shine;
  }
  const hairColor = (c) => HAIR_COLOR[c] || (c && c.startsWith && c.startsWith("#") ? c : HAIR_COLOR.black || "#3a2a24");

  // ───────── 그림 묶기 ─────────
  function wrap(p, inner, vb, opts = {}) {
    const label = opts.label ? `role="img" aria-label="${opts.label}"` : `aria-hidden="true"`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" class="${opts.cls || "doll"}" ${label} preserveAspectRatio="xMidYMid meet"><defs>${p.defs.join("")}</defs>${inner}</svg>`;
  }

  // 정연이 (정우도 같은 몸에 다른 머리·옷)
  function figure(o = {}, opts = {}) {
    const p = new Paint();
    const g = (k) => resolve(o[k]);
    const dress = g("dress");
    const top = dress ? null : g("top");
    const bottom = dress ? null : g("bottom");
    const shoes = g("shoes");
    const hat = g("hat");
    const col = hairColor(o.hairColor);
    const hair = o.hair || "long";
    const cover = !!(hat && COVER.has(hat.shape));
    let s = hairBack(hair, col, cover) + bodyBack();
    if (!dress && !top) s += sh(UNDER_TOP, "#ffffff", "#d6cdd2");
    if (!dress && !bottom) s += sh(UNDER_BOT, "#ffffff", "#d6cdd2");
    if (shoes) s += drawShoes(shoes, p);
    if (bottom) s += drawBottom(bottom, p);
    if (top) s += drawTop(top, p);
    if (dress) s += drawDress(dress, p);
    s += hands() + head() + hairFront(hair, col, cover);
    if (hat) s += drawHat(hat, p);
    return wrap(p, s, opts.viewBox || "0 -20 200 400", { cls: opts.cls || "doll", label: opts.label });
  }

  // 옷 한 벌만 (가게·옷장 칸)
  function cropFor(it) {
    const tall = { long: 1, princess: 1, longskirt: 1, pants: 1, jeans: 1, leggings: 1, jogger: 1 };
    switch (it.cat) {
      case "dress": return tall[it.shape] ? "22 126 156 218" : "28 126 144 170";
      case "top": return "38 108 124 136";
      case "bottom": return tall[it.shape] ? "40 192 120 154" : "40 192 120 82";
      case "shoes": return /boots|ballet/.test(it.shape) ? "64 290 72 76" : "70 328 60 40";
      case "hat": return "8 -22 184 170";
      default: return "0 -20 200 400";
    }
  }
  function thumb(item) {
    const it = resolve(item);
    if (!it) return "";
    if (it.cat === "gift") return giftThumb(it);
    const p = new Paint();
    const draw = { dress: drawDress, top: drawTop, bottom: drawBottom, shoes: drawShoes, hat: drawHat }[it.cat];
    return wrap(p, draw ? draw(it, p) : "", cropFor(it), { cls: "thumb" });
  }
  function hairThumb(id, colorId) {
    const col = hairColor(colorId);
    const s = hairBack(id, col, false) + `<rect x="92" y="112" width="16" height="22" rx="6" fill="${SKIN}" stroke="${SKIN_L}" stroke-width="2"/>` + head() + hairFront(id, col, false);
    return wrap(new Paint(), s, "6 -6 188 232", { cls: "thumb" });
  }

  // ───────── 가족 (선물 옷을 입은 모습) ─────────
  const ROBOT_JUMPER = { cat: "top", shape: "jumper", color: "#42a5f5", color2: "#ffca28", motif: "robot" };
  const TWIN_PANTS = { cat: "bottom", shape: "pants", color: "#5b6f9a", pattern: "denim", pc: "#ffffff" };
  const TWIN_SHOES = { cat: "shoes", shape: "sneaker", color: "#64b5f6" };

  // 어른 몸 (viewBox 0 -10 200 460)
  const A = {
    armL: "M 64 132 Q 50 190 48 246", armR: "M 136 132 Q 150 190 152 246",
    legL: "M 68 234 L 99 234 L 96 410 L 78 410 Z", legR: "M 101 234 L 132 234 L 122 410 L 104 410 Z",
    torso: "M 64 124 Q 100 116 136 124 L 142 140 L 136 240 L 64 240 L 58 140 Z",
  };
  function adultHead(kind) {
    const hairCol = kind === "dad" ? "#2b211d" : "#7a4a2e", L = dark(hairCol, 0.4);
    const back = kind === "mom" ? sh("M 58 76 Q 54 18 100 18 Q 146 18 142 76 L 150 150 Q 124 162 100 156 Q 76 162 50 150 Z", hairCol, L) : "";
    const front = kind === "mom"
      ? sh("M 60 82 Q 56 22 100 22 Q 144 22 140 82 Q 132 50 108 42 Q 84 52 64 60 Q 60 68 60 82 Z", hairCol, L)
      : sh("M 61 74 Q 56 22 100 22 Q 144 22 139 74 Q 136 52 120 46 Q 100 54 78 44 Q 64 52 61 74 Z", hairCol, L);
    return back + `<rect x="92" y="94" width="16" height="34" rx="6" fill="${SKIN}" stroke="${SKIN_L}" stroke-width="2"/>`
      + `<circle cx="62" cy="70" r="7" fill="${SKIN}" stroke="${SKIN_L}" stroke-width="2"/><circle cx="138" cy="70" r="7" fill="${SKIN}" stroke="${SKIN_L}" stroke-width="2"/>`
      + `<ellipse cx="100" cy="64" rx="38" ry="39" fill="${SKIN}" stroke="${SKIN_L}" stroke-width="2"/>`
      + `<g class="doll-eyes"><ellipse cx="86" cy="72" rx="4" ry="5" fill="#3a2433"/><ellipse cx="114" cy="72" rx="4" ry="5" fill="#3a2433"/><circle cx="87.4" cy="70.2" r="1.4" fill="#fff"/><circle cx="115.4" cy="70.2" r="1.4" fill="#fff"/></g>`
      + `<path d="M 80 61 Q 86 58 92 61 M 108 61 Q 114 58 120 61" stroke="${L}" stroke-width="2" fill="none" stroke-linecap="round"/>`
      + `<ellipse cx="76" cy="84" rx="6" ry="3.6" fill="#ff9aa8" opacity=".45"/><ellipse cx="124" cy="84" rx="6" ry="3.6" fill="#ff9aa8" opacity=".45"/>`
      + `<path d="M 93 86 Q 100 93 107 86" stroke="#d65a74" stroke-width="2.4" fill="none" stroke-linecap="round"/>`
      + front + (kind === "mom" ? `<circle cx="62" cy="80" r="2.6" fill="#fff" stroke="#d6cdd2"/><circle cx="138" cy="80" r="2.6" fill="#fff" stroke="#d6cdd2"/>` : "");
  }
  function adultBody() {
    const arm = (d) => `<path d="${d}" stroke="${SKIN_L}" stroke-width="16" fill="none" stroke-linecap="round"/><path d="${d}" stroke="${SKIN}" stroke-width="12.5" fill="none" stroke-linecap="round"/>`;
    return sh(A.legL, SKIN, SKIN_L) + sh(A.legR, SKIN, SKIN_L) + arm(A.armL) + arm(A.armR) + sh(A.torso, SKIN, SKIN_L);
  }
  const adultHands = () => `<circle cx="47.5" cy="252" r="7.5" fill="${SKIN}" stroke="${SKIN_L}" stroke-width="2"/><circle cx="152.5" cy="252" r="7.5" fill="${SKIN}" stroke="${SKIN_L}" stroke-width="2"/>`;
  function adultShoes(color) {
    return [87, 113].map((cx) => sh(shoe(cx, 404, 424, 13.5), color, dark(color)) + `<ellipse cx="${cx - 5}" cy="417" rx="3.4" ry="1.6" fill="#fff" opacity=".4"/>`).join("");
  }
  function suit() {
    const N = "#c9ced6", NL = dark(N, 0.45), arms = [A.armL, A.armR]; // 옅은 회색 양복
    return `<path d="M 66 236 L 134 236 L 134 262 L 126 410 L 103 410 L 100 262 L 97 410 L 74 410 L 66 262 Z" fill="${N}" stroke="${NL}" stroke-width="2" stroke-linejoin="round"/>`
      + adultShoes("#2b2b2b")
      + arms.map((d) => `<path d="${d}" pathLength="100" stroke-dasharray="94 300" stroke="${NL}" stroke-width="28" fill="none"/><path d="${d}" pathLength="100" stroke-dasharray="92 300" stroke="${N}" stroke-width="24" fill="none"/>`).join("")
      + sh(A.torso, "#ffffff", "#cfc7cc")
      + sh("M 62 124 L 88 118 L 100 170 L 112 118 L 138 124 L 144 140 L 140 264 Q 100 272 60 264 L 56 140 Z", N, NL)
      + sh("M 88 118 L 100 170 L 82 146 L 78 126 Z", "#aeb5c0", NL) + sh(mirror("M 88 118 L 100 170 L 82 146 L 78 126 Z"), "#aeb5c0", NL)
      + sh("M 95 121 L 105 121 L 103 129 L 107 160 L 100 169 L 93 160 L 97 129 Z", "#1f2f5c", "#101b3d")
      + `<path d="M 100 170 L 100 266" stroke="${NL}" stroke-width="1.6"/><circle cx="104" cy="192" r="2.4" fill="#8a93a1"/><circle cx="104" cy="214" r="2.4" fill="#8a93a1"/>`
      + `<path d="M 118 148 L 130 148 L 127 142 L 122 145 Z" fill="#fff" stroke="#8a93a1" stroke-width="1"/>`;
  }
  function momDress(p) {
    const it = { color: "#9fd3f7", pattern: "flowers", pc: "#ffffff" };
    const f = p.fill(it), L = dark(it.color);
    return adultShoes("#f2c6a0")
      + [A.armL, A.armR].map((d) => `<path d="${d}" pathLength="100" stroke-dasharray="32 300" stroke="${L}" stroke-width="26" fill="none"/><path d="${d}" pathLength="100" stroke-dasharray="30 300" stroke="${f}" stroke-width="22" fill="none"/>`).join("")
      + sh("M 66 210 L 134 210 Q 150 270 160 322 Q 130 334 100 332 Q 70 334 40 322 Q 50 270 66 210 Z", f, L)
      + sh("M 64 124 L 86 118 Q 100 134 114 118 L 136 124 L 142 140 L 136 214 L 64 214 L 58 140 Z", f, L)
      + `<path d="M 64 206 L 136 206 L 136 216 L 64 216 Z" fill="#ffffff" stroke="${L}" stroke-width="1.6"/>` + bow(118, 211, "#ffffff", 0.7);
  }
  function family(who, opts = {}) {
    if (who === "twin") {
      return figure({ hair: "boy", hairColor: "black", top: ROBOT_JUMPER, bottom: TWIN_PANTS, shoes: TWIN_SHOES }, { cls: opts.cls || "doll", label: opts.label, viewBox: opts.viewBox });
    }
    const p = new Paint();
    let s = adultBody();
    if (who === "dad") s += suit();
    else s += momDress(p);
    s += adultHands() + adultHead(who);
    return wrap(p, s, opts.viewBox || "0 -10 200 450", { cls: opts.cls || "doll", label: opts.label });
  }
  // 키를 맞춰 세울 때 쓰는 몸 크기 (그림 단위). 발바닥이 그림 아래 끝에 오도록 자른 viewBox,
  // top = 머리 꼭대기, feet = 신발 바닥
  const BODY = {
    kid: { viewBox: "0 -20 200 386", w: 200, h: 386, top: 30, feet: 362 },
    adult: { viewBox: "0 -10 200 438", w: 200, h: 438, top: 20, feet: 424 },
  };
  function giftThumb(g) {
    if (g.who === "twin") return thumb(ROBOT_JUMPER);
    const p = new Paint();
    const s = g.who === "dad" ? suit() : momDress(p);
    return wrap(p, s, g.who === "dad" ? "30 110 140 210" : "26 110 148 230", { cls: "thumb" });
  }

  // 칸 그림을 그림 크기에 꼭 맞게 (작은 리본·머리핀도 크게 보이게). 화면에 붙인 다음에 불러요
  function fit(root) {
    (root || document).querySelectorAll("svg.thumb:not([data-fit])").forEach((svg) => {
      try {
        const b = svg.getBBox();
        if (!b.width || !b.height) return;
        const pad = Math.max(b.width, b.height) * 0.07 + 3;
        svg.setAttribute("viewBox", `${f1(b.x - pad)} ${f1(b.y - pad)} ${f1(b.width + pad * 2)} ${f1(b.height + pad * 2)}`);
        svg.dataset.fit = "1";
      } catch { /* 안 보이는 곳이면 그대로 */ }
    });
  }

  window.Doll = { figure, thumb, hairThumb, family, giftThumb, fit, byId, resolve, BODY, setCharacterImage, motif: (n) => (MOTIFS[n] ? MOTIFS[n]() : "") };
})();
