/*
  나들이 배경 그림 (SVG, 가로 800 × 세로 500)
  - id는 js/data/menus.js의 id와 같아요 (school, trip, playground, kidscafe, dinner, party, park)
  - 사람은 가운데(약 x 230~570)에 서니까, 꾸밈은 양옆에 둬요
  - 그림 글자(이모지)도 섞어 써요. class="float"는 살랑살랑 움직임 (css)
  window.Scenes.svg(id) → <svg> 글자
*/
(function () {
  "use strict";

  const em = (x, y, size, ch, cls = "") => `<text x="${x}" y="${y}" font-size="${size}" text-anchor="middle" dominant-baseline="central" class="em ${cls}">${ch}</text>`;
  const sky = (id, a, b) => `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="800" height="500" fill="url(#${id})"/>`;
  const cloud = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})" fill="#fff" opacity=".9"><ellipse cx="0" cy="0" rx="46" ry="18"/><circle cx="-16" cy="-10" r="18"/><circle cx="12" cy="-16" r="22"/></g>`;
  const sun = (x, y) => `<g class="spin-slow" style="transform-origin:${x}px ${y}px">${Array.from({ length: 8 }, (_, k) => `<rect x="${x - 4}" y="${y - 70}" width="8" height="22" rx="4" fill="#ffca28" transform="rotate(${k * 45} ${x} ${y})"/>`).join("")}</g><circle cx="${x}" cy="${y}" r="40" fill="#ffd54f" stroke="#ffb300" stroke-width="3"/>`;
  const bunting = (y, cols) => {
    let o = `<path d="M 0 ${y} Q 400 ${y + 40} 800 ${y}" stroke="#bcaaa4" stroke-width="3" fill="none"/>`;
    for (let k = 0; k < 16; k++) {
      const x = 25 + k * 50;
      const t = x / 800;
      const yy = y + 80 * t * (1 - t) + 1; // 줄(2차 곡선) 위의 높이
      o += `<path d="M ${x - 18} ${yy} L ${x + 18} ${yy} L ${x} ${yy + 34} Z" fill="${cols[k % cols.length]}"/>`;
    }
    return o;
  };
  const balloon = (x, y, c, cls = "float") => `<g class="${cls}"><path d="M ${x} ${y + 40} Q ${x - 8} ${y + 80} ${x + 4} ${y + 120}" stroke="#9e9e9e" stroke-width="2" fill="none"/><ellipse cx="${x}" cy="${y}" rx="30" ry="38" fill="${c}"/><ellipse cx="${x - 10}" cy="${y - 14}" rx="7" ry="11" fill="#fff" opacity=".5"/><path d="M ${x - 5} ${y + 40} L ${x + 5} ${y + 40} L ${x} ${y + 34} Z" fill="${c}"/></g>`;
  const PASTEL = ["#ff8a80", "#ffd180", "#fff59d", "#a5d6a7", "#81d4fa", "#ce93d8"];

  const SCENES = {
    school: () => sky("sk-school", "#8fd3ff", "#e8f7ff") + sun(700, 80) + cloud(140, 80) + cloud(470, 50, 0.8)
      + `<rect y="370" width="800" height="130" fill="#9ccc65"/><path d="M 0 380 Q 400 350 800 380 L 800 500 L 0 500 Z" fill="#aed581"/>`
      + `<polygon points="200,200 400,96 600,200" fill="#ef5350" stroke="#c62828" stroke-width="4" stroke-linejoin="round"/>`
      + `<rect x="230" y="196" width="340" height="190" fill="#fff3e0" stroke="#e0c9a6" stroke-width="4"/>`
      + `<rect x="325" y="140" width="150" height="44" rx="14" fill="#fff" stroke="#ffcdd2" stroke-width="4"/><text x="400" y="163" font-size="26" text-anchor="middle" dominant-baseline="central" class="scene-word" fill="#e53935">어린이집</text>`
      + [250, 490].map((x) => `<rect x="${x}" y="226" width="60" height="52" rx="8" fill="#bbdefb" stroke="#90caf9" stroke-width="4"/><path d="M ${x + 30} 226 L ${x + 30} 278 M ${x} 252 L ${x + 60} 252" stroke="#90caf9" stroke-width="3"/>`).join("")
      + `<rect x="370" y="290" width="60" height="96" rx="10" fill="#ffb74d" stroke="#f57c00" stroke-width="3"/><circle cx="418" cy="340" r="4" fill="#795548"/>`
      + Array.from({ length: 9 }, (_, k) => `<rect x="${20 + k * 22}" y="352" width="12" height="44" rx="5" fill="#fff" stroke="#e0e0e0" stroke-width="2"/>`).join("")
      + Array.from({ length: 9 }, (_, k) => `<rect x="${592 + k * 22}" y="352" width="12" height="44" rx="5" fill="#fff" stroke="#e0e0e0" stroke-width="2"/>`).join("")
      + `<rect x="10" y="366" width="210" height="8" fill="#fff"/><rect x="584" y="366" width="210" height="8" fill="#fff"/>`
      + em(90, 300, 110, "🌳") + em(724, 300, 100, "🌳") + em(110, 440, 44, "🌷") + em(170, 460, 40, "🌼") + em(650, 450, 44, "🌷") + em(720, 470, 38, "🌼")
      + em(620, 140, 40, "🦋", "float"),

    trip: () => sky("sk-trip", "#7fd0ff", "#fff3e0") + sun(690, 80) + cloud(330, 70, 0.9) + cloud(560, 140, 0.7)
      + em(150, 90, 56, "✈️", "fly")
      + `<rect y="262" width="800" height="130" fill="#4fc3f7"/><path d="M 0 262 Q 100 252 200 262 T 400 262 T 600 262 T 800 262 L 800 280 L 0 280 Z" fill="#81d4fa"/>`
      + `<path d="M 40 310 Q 70 300 100 310 M 520 300 Q 550 290 580 300 M 300 330 Q 330 320 360 330" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>`
      + em(620, 270, 50, "⛵", "float")
      + `<path d="M 0 360 Q 200 330 400 350 Q 600 370 800 340 L 800 500 L 0 500 Z" fill="#ffe0a3"/>`
      + em(100, 280, 170, "🌴") + em(690, 340, 120, "⛱️") + em(240, 466, 34, "🐚") + em(560, 470, 38, "🦀") + em(730, 450, 52, "🧳") + em(60, 460, 34, "⭐"),

    playground: () => sky("sk-play", "#90d5ff", "#eef9ff") + sun(90, 80) + cloud(360, 70) + cloud(620, 60, 0.8)
      + `<rect y="360" width="800" height="140" fill="#a5d66f"/><path d="M 0 372 Q 400 340 800 372 L 800 500 L 0 500 Z" fill="#b5e07f"/>`
      + `<ellipse cx="660" cy="452" rx="120" ry="30" fill="#ffe0a3" stroke="#f6c770" stroke-width="3"/>`
      + `<polygon points="110,170 166,128 222,170" fill="#42a5f5" stroke="#1e88e5" stroke-width="3" stroke-linejoin="round"/><rect x="114" y="170" width="8" height="60" fill="#90a4ae"/><rect x="210" y="170" width="8" height="60" fill="#90a4ae"/>`
      + `<rect x="106" y="226" width="118" height="14" rx="5" fill="#ff7043"/>`
      + `<path d="M 116 240 L 116 400 M 146 240 L 146 400" stroke="#8d6e63" stroke-width="7"/>` + [270, 300, 330, 360, 390].map((y) => `<path d="M 116 ${y} L 146 ${y}" stroke="#8d6e63" stroke-width="5"/>`).join("")
      + `<path d="M 222 236 Q 280 250 300 330 Q 312 380 352 396" stroke="#f9a825" stroke-width="32" fill="none" stroke-linecap="round"/><path d="M 222 236 Q 280 250 300 330 Q 312 380 352 396" stroke="#ffd54f" stroke-width="24" fill="none" stroke-linecap="round"/>`
      + `<path d="M 590 160 L 562 400 M 590 160 L 618 400 M 760 160 L 732 400 M 760 160 L 788 400" stroke="#8d6e63" stroke-width="8" stroke-linecap="round"/><path d="M 580 160 L 770 160" stroke="#6d4c41" stroke-width="10" stroke-linecap="round"/>`
      + `<g class="swing" style="transform-origin:640px 160px"><path d="M 625 160 L 625 300 M 655 160 L 655 300" stroke="#9e9e9e" stroke-width="3"/><rect x="616" y="298" width="48" height="10" rx="4" fill="#ef5350"/></g>`
      + `<g class="swing late" style="transform-origin:710px 160px"><path d="M 695 160 L 695 300 M 725 160 L 725 300" stroke="#9e9e9e" stroke-width="3"/><rect x="686" y="298" width="48" height="10" rx="4" fill="#7e57c2"/></g>`
      + em(470, 320, 90, "🌳") + em(40, 330, 70, "🌳") + em(560, 110, 36, "🦋", "float") + em(620, 448, 36, "🪣") + em(690, 446, 34, "🏰"),

    kidscafe: () => `<rect width="800" height="500" fill="#fff0f6"/>` + Array.from({ length: 10 }, (_, k) => `<rect x="${k * 80}" width="40" height="380" fill="#ffe4ef"/>`).join("")
      + bunting(20, PASTEL)
      + `<rect y="378" width="800" height="122" fill="#ffe0b2"/>` + Array.from({ length: 8 }, (_, k) => `<path d="M ${k * 100} 378 L ${k * 100 - 40} 500" stroke="#ffcc80" stroke-width="3"/>`).join("")
      + `<rect x="30" y="300" width="250" height="140" rx="26" fill="#81d4fa" stroke="#29b6f6" stroke-width="5"/>`
      + Array.from({ length: 22 }, (_, k) => `<circle cx="${52 + (k % 11) * 21}" cy="${k < 11 ? 300 : 286}" r="12" fill="${PASTEL[k % 6]}" stroke="#fff" stroke-width="2"/>`).join("")
      + `<path d="M 560 430 L 548 470 M 740 430 L 752 470 M 650 440 L 650 476" stroke="#5e35b1" stroke-width="7" stroke-linecap="round"/><ellipse cx="650" cy="428" rx="112" ry="26" fill="#7e57c2" stroke="#5e35b1" stroke-width="4"/><ellipse cx="650" cy="424" rx="88" ry="16" fill="#9575cd"/>`
      + em(730, 320, 70, "🧸") + balloon(110, 130, "#ff8a80") + balloon(690, 130, "#81d4fa", "float late") + em(250, 250, 40, "⭐", "float") + em(560, 240, 40, "🎈", "float late"),

    dinner: () => `<rect width="800" height="500" fill="#fff8e1"/>` + Array.from({ length: 40 }, (_, k) => `<circle cx="${20 + (k % 10) * 80 + (Math.floor(k / 10) % 2) * 40}" cy="${30 + Math.floor(k / 10) * 80}" r="4" fill="#ffe0b2"/>`).join("")
      + `<rect y="380" width="800" height="120" fill="#d7a86e"/>` + Array.from({ length: 16 }, (_, k) => `<rect x="${k * 50}" y="380" width="25" height="120" fill="#c8955a"/>`).join("")
      + `<rect x="580" y="60" width="170" height="130" rx="12" fill="#b3e5fc" stroke="#a1887f" stroke-width="8"/><path d="M 665 60 L 665 190 M 580 125 L 750 125" stroke="#a1887f" stroke-width="5"/>` + cloud(630, 100, 0.5)
      + `<path d="M 160 0 L 160 70" stroke="#795548" stroke-width="3"/><path d="M 120 100 L 200 100 L 180 66 L 140 66 Z" fill="#ffb74d" stroke="#f57c00" stroke-width="3"/><circle cx="160" cy="106" r="8" fill="#fff59d"/>`
      + `<rect x="20" y="300" width="250" height="20" rx="6" fill="#ef9a9a"/><path d="M 30 320 L 30 400 M 260 320 L 260 400" stroke="#8d6e63" stroke-width="10" stroke-linecap="round"/>`
      + Array.from({ length: 12 }, (_, k) => `<rect x="${20 + k * 21}" y="300" width="10" height="20" fill="#fff" opacity=".6"/>`).join("")
      + em(70, 274, 54, "🍝") + em(150, 276, 50, "🍕") + em(226, 278, 44, "🥤")
      + `<rect x="590" y="230" width="170" height="140" rx="14" fill="#5d4037" stroke="#8d6e63" stroke-width="6"/><text x="675" y="258" font-size="22" text-anchor="middle" dominant-baseline="central" class="scene-word" fill="#fff">오늘의 메뉴</text>`
      + em(630, 310, 40, "🍔") + em(675, 312, 40, "🍛") + em(720, 310, 40, "🍰") + em(460, 70, 40, "✨", "float"),

    party: () => `<rect width="800" height="500" fill="#fce4ec"/>` + bunting(14, ["#ff80ab", "#ffd180", "#80d8ff", "#b9f6ca", "#ea80fc"])
      + `<path d="M 230 80 L 570 80 L 556 104 L 570 128 L 230 128 L 244 104 Z" fill="#ff4081"/><text x="400" y="104" font-size="28" text-anchor="middle" dominant-baseline="central" class="scene-word" fill="#fff">생일 축하해요</text>`
      + `<rect y="390" width="800" height="110" fill="#f8bbd0"/>`
      + balloon(80, 170, "#ff8a80") + balloon(150, 140, "#ffd54f", "float late") + balloon(660, 150, "#81d4fa", "float late") + balloon(730, 180, "#ce93d8")
      + `<rect x="600" y="330" width="180" height="16" rx="6" fill="#fff"/><path d="M 615 346 L 615 410 M 765 346 L 765 410" stroke="#bdbdbd" stroke-width="8" stroke-linecap="round"/>`
      + em(690, 280, 110, "🎂") + em(90, 420, 64, "🎁") + em(170, 444, 50, "🎁") + em(230, 450, 40, "🧁")
      + Array.from({ length: 18 }, (_, k) => `<circle cx="${(k * 137) % 800}" cy="${150 + ((k * 61) % 220)}" r="4" fill="${PASTEL[k % 6]}"/>`).join(""),

    park: () => sky("sk-park", "#b39ddb", "#ffe0f0") + cloud(600, 70, 0.8) + em(420, 60, 34, "✨", "float") + em(720, 120, 30, "⭐", "float late")
      + `<path d="M 170 240 L 110 400 M 170 240 L 230 400" stroke="#7e57c2" stroke-width="10" stroke-linecap="round"/>`
      + `<g class="spin-slow" style="transform-origin:170px 240px"><circle cx="170" cy="240" r="130" fill="none" stroke="#fff" stroke-width="8"/>`
      + Array.from({ length: 8 }, (_, k) => { const a = (k * Math.PI) / 4; return `<path d="M 170 240 L ${170 + 130 * Math.cos(a)} ${240 + 130 * Math.sin(a)}" stroke="#fff" stroke-width="4"/><circle cx="${170 + 130 * Math.cos(a)}" cy="${240 + 130 * Math.sin(a)}" r="18" fill="${PASTEL[k % 6]}" stroke="#fff" stroke-width="3"/>`; }).join("")
      + `</g><circle cx="170" cy="240" r="14" fill="#ffd54f"/>`
      + `<path d="M 0 390 Q 400 360 800 390 L 800 500 L 0 500 Z" fill="#a5d66f"/>`
      + em(660, 260, 170, "🏰") + em(720, 420, 70, "🎠") + em(70, 440, 50, "🍭") + balloon(560, 160, "#ff8a80", "float late"),
  };

  window.Scenes = {
    ids: Object.keys(SCENES),
    svg(id) {
      const draw = SCENES[id] || SCENES.playground;
      return `<svg class="scene-bg" viewBox="0 0 800 500" preserveAspectRatio="xMidYMax slice" aria-hidden="true">${draw()}</svg>`;
    },
  };
})();
