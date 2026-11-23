// 자동 검사: 헤드리스 Edge로 놀이 흐름(쇼핑 → 가족 선물 보상 → 옷 입기 → 나들이)과
// 6가지 화면 크기에서 디자인 규칙이 지켜지는지 보고, 화면을 캡처해요.
// 사용법: node tools/check.mjs        (사이트 폴더 어디서 실행해도 됨. index.html이 있는 폴더를 찾아 올라감)
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9351;
let root = resolve(import.meta.dirname);
while (!existsSync(join(root, "index.html")) && dirname(root) !== root) root = dirname(root);
const shots = join(import.meta.dirname, "work", "shots");
mkdirSync(shots, { recursive: true });
const indexUrl = pathToFileURL(join(root, "index.html")).href;
const profile = mkdtempSync(join(tmpdir(), "dress-check-"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const edge = spawn(EDGE, ["--headless=new", "--disable-gpu", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  "--autoplay-policy=no-user-gesture-required", "--mute-audio", "about:blank"], { stdio: "ignore" });

let ws, seq = 0;
const pending = new Map();
const errors = [];
const results = [];
const send = (method, params = {}) => new Promise((res) => { const id = ++seq; pending.set(id, res); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async (e) => {
  const r = await send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};
const check = (name, ok, detail = "") => results.push(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  (" + detail + ")" : ""}`);
const go = async (hash, wait = 700) => { await send("Page.navigate", { url: indexUrl + hash }); await sleep(wait); };
const hashTo = async (hash, wait = 500) => { await evaluate(`location.hash = ${JSON.stringify(hash)}; true`); await sleep(wait); };
const click = async (sel, wait = 250) => { const ok = await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return false; el.click(); return true; })()`); await sleep(wait); return ok; };
const shot = async (name) => {
  const s = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(shots, `${name}.png`), Buffer.from(s.data, "base64"));
};
const berries = () => evaluate(`+document.querySelector('#berries').textContent`);
const hash = () => evaluate(`location.hash`);

const RAINBOW = ["rgb(229, 57, 53)", "rgb(251, 140, 0)", "rgb(253, 216, 53)", "rgb(67, 160, 71)", "rgb(100, 181, 246)", "rgb(40, 53, 147)", "rgb(142, 36, 170)"];
// 메뉴 카드: 줄마다 카드가 가운데에 있는지 (왼쪽·오른쪽 남는 폭이 같은지)
const BALANCE_JS = `[...document.querySelectorAll('.menu-grid')].flatMap((g) => {
  const gr = g.getBoundingClientRect();
  const rows = {};
  [...g.children].forEach((c) => { const r = c.getBoundingClientRect(); (rows[Math.round(r.top)] ||= []).push(r); });
  return Object.values(rows).map((cs) => ({ cards: cs.length,
    diff: Math.abs((Math.min(...cs.map((r) => r.left)) - gr.left) - (gr.right - Math.max(...cs.map((r) => r.right)))) }));
})`;

try {
  let target;
  for (let i = 0; i < 40 && !target; i++) {
    try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === "page"); } catch { /* 대기 */ }
    if (!target) await sleep(250);
  }
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result || m); pending.delete(m.id); }
    if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    // images/characters/ 의 진짜 캐릭터 그림은 넣었을 때만 쓰는 선택 파일이라, 없어서 나는 오류는 빼요
    if (m.method === "Log.entryAdded" && m.params.entry.level === "error" && !String(m.params.entry.url || "").includes("images/characters/")) errors.push(m.params.entry.text);
  };
  await send("Runtime.enable");
  await send("Log.enable");
  await send("Page.enable");
  // 이 PC는 Windows 애니메이션 효과가 꺼져 있으면 '움직임 줄이기'로 보이므로, 검사는 '움직임 있음'으로 흉내 냄
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });

  // ───────── 1) 놀이 흐름 (노트북 크기) ─────────
  await send("Emulation.setDeviceMetricsOverride", { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false });
  await go("#/", 1000);
  await evaluate(`localStorage.clear(); true`);
  await go("#/", 1000);
  const home = await evaluate(`({ doll: !!document.querySelector('.home-doll svg.doll'), btn: document.querySelector('#go-new')?.textContent.trim(), title: document.title })`);
  check("처음 화면: 정연이 그림 + 시작 버튼", home.doll && home.btn.includes("시작"), JSON.stringify(home));
  await shot("flow_home");
  await click("#go-new", 600);
  check("시작 → 딸기나라 이야기", (await hash()) === "#/story");
  const navTops = [];
  for (let k = 0; k < 6; k++) {
    navTops.push(await evaluate(`Math.round(document.querySelector('.slide-nav .next').getBoundingClientRect().top + scrollY)`));
    if (k < 5) await click(".slide-nav .next", 200);
  }
  check("이야기: 6장 넘기기, ◀ ▶ 버튼이 흔들리지 않음", Math.max(...navTops) - Math.min(...navTops) <= 1 && (await evaluate(`document.querySelectorAll('.dot').length`)) === 6, navTops.join(","));
  await shot("flow_story_last");
  await click("#to-shop", 700);
  check("이야기 끝 → 백화점", (await hash()) === "#/shop");
  check("백화점: 처음 딸기 100개", (await berries()) === 100);

  // 칸마다 옷 개수 (12~20개), 선물 3개, 캐릭터 옷 15딸기 · 보통 옷 5딸기
  const counts = {};
  for (const tab of ["dress", "top", "bottom", "shoes", "hat", "gift"]) {
    await click(`.tab[data-tab="${tab}"]`, 300);
    counts[tab] = await evaluate(`[...document.querySelectorAll('#grid .item-card')].map((c) => ({ char: c.classList.contains('char'), price: c.querySelector('.price').textContent }))`);
  }
  const clothesOk = ["dress", "top", "bottom", "shoes", "hat"].every((t) => counts[t].length >= 12 && counts[t].length <= 20);
  check("백화점: 칸마다 옷 12~20개, 선물 3개", clothesOk && counts.gift.length === 3, Object.entries(counts).map(([k, v]) => `${k} ${v.length}`).join(", "));
  const allCards = Object.values(counts).flat();
  check("백화점: 캐릭터 옷은 🍓15, 보통 옷·선물은 🍓5", allCards.every((c) => c.price === (c.char ? "🍓15" : "🍓5")));
  await click(`.tab[data-tab="dress"]`, 300);

  // 진짜 캐릭터 그림(PNG)을 넣었을 때: 그려 둔 칸·거울의 캐릭터 무늬 자리가 그 그림으로 바뀌는지 (시험용 그림으로 흉내)
  const fake = (c, t) => "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="${c}"/><text x="50" y="60" font-size="30" text-anchor="middle" fill="#fff">${t}</text></svg>`);
  const drawnBefore = await evaluate(`document.querySelectorAll('#grid g.char-motif').length`);
  await evaluate(`Doll.setCharacterImage('melody', ${JSON.stringify(fake("#f48fb1", "MM"))}); Doll.setCharacterImage('kuromi', ${JSON.stringify(fake("#3a3347", "KU"))}); Doll.setCharacterImage('hachu', ${JSON.stringify(fake("#ff5fa8", "HA"))}); true`);
  await sleep(300);
  await click(`#grid .item-card.char`, 400);
  const png = await evaluate(`({ grid: document.querySelectorAll('#grid image.char-img').length, mirror: document.querySelectorAll('#mirror image.char-img').length, left: document.querySelectorAll('#grid g.char-motif:not(:has(image))').length })`);
  check("캐릭터 그림 파일을 넣으면: 옷 칸과 거울의 캐릭터 무늬가 그 그림으로", drawnBefore === 4 && png.grid === 4 && png.mirror === 1 && png.left === 0, JSON.stringify({ drawnBefore, ...png }));
  await shot("flow_char_png");

  // 입어 보기 → 바구니에 담기 → 빼기 → 다시 담기
  const bagN = () => evaluate(`+document.querySelector('#bag b').textContent`);
  const modalTitle = () => evaluate(`document.querySelector('.celebrate h2')?.textContent || ''`);
  const before = await evaluate(`document.querySelector('#mirror').innerHTML.length`);
  await click("#grid .item-card:not(.char)", 300);
  const after = await evaluate(`document.querySelector('#mirror').innerHTML.length`);
  check("입어 보기: 옷을 누르면 거울 속 정연이가 그 옷을 입음", before !== after && (await evaluate(`!!document.querySelector('#cart-in')`)));
  // '바구니에 담아요'는 글자(옷 이름·값) 없이 위아래로 큰 버튼 + 커졌다 작아지기·빛 스침·반짝이
  const ci = await evaluate(`(() => { const b = document.querySelector('#cart-in'); const r = b.getBoundingClientRect(); const pick = document.querySelector('#pick');
    return { h: Math.round(r.height), anim: getComputedStyle(b).animationName, glint: getComputedStyle(b, '::after').animationName, twinkles: pick.querySelectorAll('.twinkle').length,
      text: pick.textContent.replace(/\\s+/g, ' ').trim(), price: !!pick.querySelector('.price, .pick-name') }; })()`);
  check("담아요 버튼: 옷 이름·값 글자 없이 큰 버튼(높이 100px 넘게) + 커졌다 작아지기·빛·반짝이", ci.h >= 100 && ci.anim === "breathe" && ci.glint === "glint" && ci.twinkles === 4
    && !ci.price && ci.text.replace(/[^가-힣]/g, "") === "바구니에담아요", JSON.stringify(ci));
  const top = await evaluate(`({ wallet: document.querySelector('#wallet').textContent.replace(/\\s+/g, ' ').trim(), reset: !!document.querySelector('#mirror-reset') })`);
  check("지갑: '남은 딸기 🍓 100', 🔄 버튼 없음", top.wallet.startsWith("남은 딸기") && top.wallet.endsWith("🍓100") && !top.reset, JSON.stringify(top));
  // 옷 칸 탭: 위아래로 큼직(112px) + 아래 꾸밈선, 선물 탭은 금색 + 다른 움직임
  const tabs = await evaluate(`(() => { const t = [...document.querySelectorAll('.tab')]; const g = document.querySelector('.tab-gift'); const d = document.querySelector('.tab-dress');
    const div = document.querySelector('.shelf-divider').getBoundingClientRect(); const grid = document.querySelector('#grid').getBoundingClientRect();
    return { h: Math.min(...t.map((x) => Math.round(x.getBoundingClientRect().height))), giftAnim: getComputedStyle(g).animationName, giftEmoji: getComputedStyle(g.querySelector('.tab-emoji')).animationName,
      giftBg: getComputedStyle(g).backgroundImage.includes('255, 246, 214'), plainAnim: getComputedStyle(document.querySelector('.tab-top')).animationName,
      divider: div.height > 0 && div.bottom <= grid.top + 1 && div.top >= t[0].getBoundingClientRect().bottom }; })()`);
  check("탭: 높이 112px · 탭과 옷 그림 사이 꾸밈선 · 선물 탭은 금색 + 반짝 번짐·흔들 (담아요 버튼과 다른 효과)", tabs.h >= 110 && tabs.divider && tabs.giftBg && tabs.giftAnim === "gift-glow"
    && tabs.giftEmoji === "gift-wiggle" && tabs.plainAnim === "none" && tabs.giftAnim !== ci.anim, JSON.stringify(tabs));
  const p0 = await evaluate(`SiteSound.played()`);
  await click("#cart-in", 300);
  check("바구니에 담기: 쓸 수 있는 딸기 95개, 바구니 1개, 🧺 표시, 퐁 소리", (await berries()) === 95 && (await bagN()) === 1
    && (await evaluate(`!!document.querySelector('#grid .item-card.in-cart .stamp.cart')`)) && (await evaluate(`SiteSound.played()`)) === p0 + 1);
  await click("#cart-out", 300);
  check("바구니에서 빼기: 딸기 100개로 돌아오고 바구니 0개", (await berries()) === 100 && (await bagN()) === 0 && (await evaluate(`!!document.querySelector('#cart-in')`)));
  await click("#cart-in", 300);
  // 1) 담은 칸은 회색(비활성): 다시 눌러도 거울·바구니가 그대로, 흔들림 + "이미 바구니에 담았어요"
  const dimmed = await evaluate(`(() => { const c = document.querySelector('#grid .item-card.in-cart'); const cs = getComputedStyle(c); const art = getComputedStyle(c.querySelector('.item-art'));
    return { disabled: c.getAttribute('aria-disabled'), bg: cs.backgroundColor, gray: art.filter.includes('grayscale'), label: c.querySelector('.cart-label')?.textContent }; })()`);
  const mirrorBefore = await evaluate(`document.querySelector('#mirror').innerHTML`);
  await click("#grid .item-card.in-cart", 300);
  const again = await evaluate(`({ nope: document.querySelector('#grid .item-card.in-cart').classList.contains('nope'), msg: document.querySelector('#pick').textContent, add: !!document.querySelector('#cart-in') })`);
  const mirrorSame = (await evaluate(`document.querySelector('#mirror').innerHTML`)) === mirrorBefore;
  check("담은 옷 칸은 회색 + '담았어요' (비활성), 다시 눌러도 담기·입어 보기 안 됨", dimmed.disabled === "true" && dimmed.bg === "rgb(228, 224, 230)" && dimmed.gray && dimmed.label === "담았어요"
    && again.nope && again.msg.includes("이미 바구니에 담았어요") && !again.add && mirrorSame && (await bagN()) === 1, JSON.stringify({ ...dimmed, ...again, mirrorSame }));
  await shot("flow_shop_cart");

  // 가족 선물 3개 담기 → 계산해요 → 바구니 보기 → 하나 빼기 → 이걸로 살래요 → 정말 살까요? → 네 → 칭찬 + 30개
  await click(`.tab[data-tab="gift"]`, 300);
  for (let k = 0; k < 3; k++) { await click(`#grid .item-card:nth-child(${k + 1})`, 250); await click("#cart-in", 250); }
  check("가족 선물 3개 담기 (딸기 5개씩) → 쓸 수 있는 딸기 80개, 바구니 4개", (await berries()) === 80 && (await bagN()) === 4, String(await berries()));
  check("선물을 고르면 거울에 가족이 입은 모습", await evaluate(`!!document.querySelector('#mirror .mirror-tag')`));
  // 2) 🧺 바구니 보기 버튼: 칸 구분 없이 담은 옷(원피스 1 + 선물 3)이 모두 한 창에
  await click("#bag", 400);
  const view = await evaluate(`({ label: document.querySelector('#bag').textContent.replace(/\\s+/g, ' ').trim(), rows: [...document.querySelectorAll('.cart-box .cart-row .cart-name')].map((n) => n.textContent.trim()) })`);
  check("🧺 바구니 보기 버튼 → 칸 구분 없이 담은 4개가 모두 보이는 창", view.label.includes("바구니 보기") && view.rows.length === 4 && view.rows.some((r) => r.includes("원피스")) && view.rows.filter((r) => r.includes("선물")).length === 3,
    JSON.stringify(view));
  await click('.cart-box [data-act="close"]', 300);
  await click("#done", 400);
  const sheet = await evaluate(`({ rows: document.querySelectorAll('.cart-box .cart-row').length, sum: document.querySelector('.cart-box .cart-sum')?.textContent })`);
  await shot("flow_cart_sheet");
  await click(".cart-box .cart-row:first-child .cart-out", 300);
  const sheet2 = await evaluate(`({ rows: document.querySelectorAll('.cart-box .cart-row').length, sum: document.querySelector('.cart-box .cart-sum')?.textContent })`);
  check("계산해요 → 바구니 보기 4개 · 모두 🍓20 → ✕ 빼요 하면 3개 · 🍓15", sheet.rows === 4 && sheet.sum.includes("🍓20") && sheet2.rows === 3 && sheet2.sum.includes("🍓15") && (await berries()) === 85,
    JSON.stringify([sheet, sheet2]));
  const buyLabel = await evaluate(`document.querySelector('.cart-box [data-act="buy"]').textContent.trim()`);
  await click('.cart-box [data-act="buy"]', 400);
  const ask = await evaluate(`({ title: document.querySelector('.celebrate h2')?.textContent, text: document.querySelector('.celebrate p')?.textContent })`);
  check("'🍓 다 골랐어요' → '정말 살까요? 딸기 15개를 내요.'", buyLabel === "🍓 다 골랐어요" && ask.title === "정말 살까요?" && ask.text === "딸기 15개를 내요.", JSON.stringify({ buyLabel, ...ask }));
  await shot("flow_cart_confirm");
  await click(".celebrate .modal-btns button", 900);
  const praise = await evaluate(`({ title: document.querySelector('.celebrate h2')?.textContent, text: document.querySelector('.celebrate p')?.textContent, confetti: document.querySelectorAll('.confetti').length })`);
  check("가족 3명 선물을 사면 → '가족을 사랑하는 착한 어린이' 칭찬 + 딸기 30개 + 폭죽", praise.title?.includes("착한 어린이") && praise.text?.includes("30개") && praise.confetti > 0, JSON.stringify(praise));
  await shot("flow_gift_praise");
  await click(".celebrate .modal-btns button", 400);
  check("칭찬 후 다시 백화점: 딸기 115개, 바구니 비움, 선물 💝", (await hash()) === "#/shop" && (await berries()) === 115 && (await bagN()) === 0
    && (await evaluate(`document.querySelectorAll('#grid .item-card.owned .stamp').length`)) === 3, String(await berries()));

  // 캐릭터 옷 7벌 담기 → 딸기가 모자라면 못 담음 → 계산 → 다 샀어요 → 내 방
  for (const tab of ["dress", "top", "hat", "shoes", "bottom"]) {
    await click(`.tab[data-tab="${tab}"]`, 250);
    for (let k = 0; k < (tab === "dress" || tab === "top" ? 2 : 1); k++) { await click(`#grid .item-card.char:not(.owned):not(.in-cart)`, 200); await click("#cart-in", 200); }
  }
  check("캐릭터 옷 7벌 담기 → 쓸 수 있는 딸기 10개", (await berries()) === 10, String(await berries()));
  await click(`.tab[data-tab="dress"]`, 250);
  await click(`#grid .item-card.char:not(.owned):not(.in-cart)`, 250);
  check("딸기가 모자라면 '딸기가 모자라요' + '바구니에서 하나 빼 볼까요?'", await evaluate(`!!document.querySelector('.pick-warn') && !!document.querySelector('.pick-hint.small') && !document.querySelector('#cart-in')`));
  await click(`#grid .item-card:not(.char):not(.owned):not(.in-cart)`, 250);
  await click("#cart-in", 250);
  await click(`.tab[data-tab="gift"]`, 250);
  await click(`#grid .item-card`, 250);
  check("선물한 물건은 다시 못 담음 (💝 선물했어요)", await evaluate(`!document.querySelector('#cart-in') && document.querySelector('#pick').textContent.includes('선물했어요')`));
  await click("#done", 400);
  const rows8 = await evaluate(`document.querySelectorAll('.cart-box .cart-row').length`);
  await click('.cart-box [data-act="buy"]', 400);
  await click(".celebrate .modal-btns button", 600);
  const done = await evaluate(`({ title: document.querySelector('.celebrate h2')?.textContent, btns: [...document.querySelectorAll('.celebrate .modal-btns button')].map((b) => b.textContent.trim()) })`);
  check("8벌 계산 → '다 샀어요!' + 내 방에 가요 / 더 살래요", rows8 === 8 && done.title === "다 샀어요!" && done.btns.length === 2 && done.btns[0].includes("내 방"), JSON.stringify({ rows8, ...done }));
  await click(".celebrate .modal-btns button", 700);
  check("내 방에 가요 → 내 방", (await hash()) === "#/room");

  // 3) 캐릭터 머리띠: 머리띠 + 캐릭터 그림 (덮는 모자가 아니라서 똥머리·리본이 그대로 보여요)
  const headbands = await evaluate(`["h-melody", "h-kuromi", "h-hachu"].map((id) => { const d = document.createElement('div'); d.innerHTML = Doll.figure({ hat: id, hair: 'bun' });
    return { id, name: ITEM_NAME(id), band: d.querySelectorAll('path[d^="M 56 68 Q 58 30"]').length === 2, char: !!d.querySelector('g.char-motif'), bun: !!d.querySelector('circle[cx="100"][cy="20"]') }; })`.replace("ITEM_NAME(id)", "ITEMS.find((i) => i.id === id).name"));
  check("마이멜로디·쿠로미·하츄핑 머리띠: 머리띠 위에 캐릭터 그림, 머리 모양은 그대로", headbands.every((b) => b.band && b.char && b.bun && b.name.endsWith("머리띠")), JSON.stringify(headbands));

  // 내 방: 산 옷만 옷장에 · 입기 · 머리 바꾸기
  const roomDress = await evaluate(`document.querySelectorAll('#grid .item-card').length`);
  check("내 방: 원피스 칸은 하얀 원피스 + 산 원피스 3벌만", roomDress === 4, String(roomDress));
  await click(`.tab[data-tab="top"]`, 250);
  await click(`#grid .item-card`, 300);
  check("내 방: 윗옷을 입으면 원피스는 벗음", await evaluate(`document.querySelectorAll('#grid .item-card.on').length === 1`));
  await click(`.tab[data-tab="hair"]`, 250);
  const hairs = await evaluate(`document.querySelectorAll('#grid .hair-card').length`);
  await click(`#grid [data-hair="twinlow"]`, 250);
  await click(`#grid [data-color="pink"]`, 250);
  check("내 방: 머리 모양 12가지 넘게, 고르면 표시", hairs >= 12 && (await evaluate(`document.querySelector('#grid [data-hair="twinlow"]').classList.contains('on') && document.querySelector('[data-color="pink"]').classList.contains('on')`)), `${hairs}가지`);
  await shot("flow_room");
  await click("#done", 600);
  check("다 입었어요 → 어디 갈까요?", (await hash()) === "#/go");
  const bands = await evaluate(`[...document.querySelectorAll('.menu-card')].map((c) => getComputedStyle(c).borderBottomColor)`);
  check("어디 갈까요?: 7곳, 카드 띠 빨주노초파남보", bands.join() === RAINBOW.join(), bands.length + "장");
  await click(".menu-card", 1200);
  const fin = await evaluate(`({ hash: location.hash, people: document.querySelectorAll('.scene-people .person').length, title: document.querySelector('.finale-title').textContent, confetti: document.querySelectorAll('.confetti').length })`);
  check("나들이: 정연이 + 선물 옷 입은 가족 3명, 폭죽", fin.hash === "#/go/school" && fin.people === 4 && fin.title.startsWith("정연이가") && fin.confetti > 0, JSON.stringify(fin));
  // 키 비율: 머리 꼭대기~발바닥 길이가 아빠 180 · 엄마 160 · 정우 120 · 정연 110 (cm) 비율과 같은지 (±3%)
  const tallRatio = await evaluate(`(() => { const B = Doll.BODY; const cm = { me: SITE.childHeight, dad: SITE.family.dad.height, mom: SITE.family.mom.height, twin: SITE.family.twin.height };
    const body = {}; document.querySelectorAll('.person').forEach((p) => { const b = p.dataset.who === 'me' || p.dataset.who === 'twin' ? B.kid : B.adult;
      body[p.dataset.who] = p.getBoundingClientRect().height * (b.feet - b.top) / b.h; });
    const feet = [...document.querySelectorAll('.person')].map((p) => { const b = p.dataset.who === 'me' || p.dataset.who === 'twin' ? B.kid : B.adult;
      return p.offsetTop + p.offsetHeight * (1 - (b.h - (b.feet - Number(b.viewBox.split(' ')[1]))) / b.h); }); // 콩콩 뛰는 움직임은 빼고 발바닥 위치
    return { ok: Object.keys(body).every((w) => Math.abs((body[w] / body.me) / (cm[w] / cm.me) - 1) < 0.03), px: Object.fromEntries(Object.entries(body).map(([k, v]) => [k, Math.round(v)])), feet: feet.map(Math.round), sameFloor: Math.max(...feet) - Math.min(...feet) <= 2 }; })()`);
  check("나들이: 키 비율 아빠 180 · 엄마 160 · 정우 120 · 정연 110, 발이 같은 땅에", tallRatio.ok && tallRatio.sameFloor, JSON.stringify(tallRatio));
  const s0 = await evaluate(`SiteSound.played()`);
  await click("#photo", 300);
  check("사진 찍기: 찰칵 + 번쩍", (await evaluate(`SiteSound.played()`)) === s0 + 1 && (await evaluate(`document.querySelector('#flash').classList.contains('on')`)));
  await shot("flow_finale");
  // 사진이 나와서 → 첫 사진은 벽 액자에, 다음 사진은 냉장고에 자석으로 붙어요
  await sleep(500);
  const printing = await evaluate(`({ fly: !!document.querySelector('.photo-room .polaroid.flying.developing'), title: document.querySelector('#pw-title')?.textContent })`);
  await shot("flow_photo_print");
  await sleep(2400);
  const framed = await evaluate(`({ frame: !!document.querySelector('.pw-frame .slot .polaroid.stuck .snap .person'), title: document.querySelector('#pw-title').textContent, caption: document.querySelector('.pw-frame .pcap')?.textContent.trim() })`);
  await shot("flow_photo_frame");
  await click('.photo-wall [data-act="again"]', 400);
  await sleep(2900);
  const fridge = await evaluate(`({ n: document.querySelectorAll('.fridge .slot .polaroid').length, magnet: !!document.querySelector('.fridge .polaroid .magnet'), frameKept: !!document.querySelector('.pw-frame .slot .polaroid'),
    title: document.querySelector('#pw-title').textContent, tilt: getComputedStyle(document.querySelector('.fridge .polaroid')).transform !== 'none' })`);
  check("사진: 나와서(하얗다가 보임) → 1장은 벽 금색 액자에 → 또 찍으면 냉장고에 자석으로 (비스듬히)", printing.fly && printing.title === "📸 찰칵!" && framed.frame && framed.title === "🖼️ 액자에 넣었어요!"
    && /\d+월 \d+일/.test(framed.caption) && fridge.n === 1 && fridge.magnet && fridge.frameKept && fridge.title === "🧲 냉장고에 붙였어요!" && fridge.tilt, JSON.stringify({ printing, framed, fridge }));
  await shot("flow_photo_fridge");
  await click('.photo-wall [data-act="ok"]', 300);
  check("사진 창: 좋아요! 로 닫힘", (await evaluate(`document.querySelectorAll('.photo-wall').length`)) === 0);
  await hashTo("#/parent", 700);
  const rep = await evaluate(`({ n: document.querySelectorAll('.report').length, text: document.querySelector('.report')?.textContent || '' })`);
  check("어른용 기록: 산 순서 · 가족 선물(1번째 계산) · 캐릭터 비율 · 바구니에서 뺀 옷", rep.n === 1 && rep.text.includes("1번째 계산") && rep.text.includes("캐릭터")
    && rep.text.includes("산 순서") && rep.text.includes("담았다가 뺀 옷"), `${rep.n}개`);
  await shot("flow_parent");

  // ───────── 2) 6가지 화면 크기 ─────────
  const VIEWS = [["#/", "home"], ["#/story", "story"], ["#/shop", "shop"], ["#/room", "room"], ["#/go", "go"], ["#/go/party", "party"], ["#/parent", "parent"], ["#/guide/yellow", "guide"]];
  for (const [w, h] of [[390, 844], [844, 390], [768, 1024], [1024, 768], [1280, 800], [1920, 1080]]) {
    await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 800 || h < 500 });
    const over = [];
    for (const [hs, name] of VIEWS) {
      await go(hs, name === "party" ? 1300 : 900);
      if (name === "story") { await evaluate(`document.querySelectorAll('.dot')[5].click(); true`); await sleep(200); }
      if (name === "shop") {
        // 바구니 보기 창이 화면 안에 들어오는지 (처음 크기에서 남은 딸기 5개로 한 벌 담아 둠)
        await click(".tab[data-tab='dress']", 200);
        if (await click("#grid .item-card:not(.owned):not(.in-cart):not(.char)", 200)) await click("#cart-in", 200);
        await click("#done", 400);
        const c = await evaluate(`(() => { const b = document.querySelector('.cart-box').getBoundingClientRect(); const btn = document.querySelector('.cart-box [data-act]').getBoundingClientRect();
          return { inside: b.left >= 0 && b.right <= innerWidth && b.top >= 0 && b.bottom <= innerHeight + 1, btn: btn.bottom <= innerHeight, rows: document.querySelectorAll('.cart-row').length }; })()`);
        check(`${w}x${h} 바구니 보기: 창과 버튼이 화면 안에`, c.inside && c.btn && c.rows === 1, JSON.stringify(c));
        await shot(`m${w}_cart`);
        await click('.cart-box [data-act="close"]', 200);
        await click(".tab[data-tab='gift']", 200);
        await click("#grid .item-card", 300);
      }
      const sw = await evaluate("document.documentElement.scrollWidth");
      if (sw > w) over.push(`${name} ${sw}`);
      if (name === "home") {
        const t = await evaluate(`(async () => { await document.fonts.ready; return { topbar: Math.round(document.querySelector('.topbar').getBoundingClientRect().height),
          font: getComputedStyle(document.body).fontFamily.split(',')[0].replace(/"/g, '').trim(), jua: document.fonts.check('20px Jua'),
          doll: Math.round(document.querySelector('.home-doll svg').getBoundingClientRect().height) }; })()`);
        const wantBar = w <= 760 ? 62 : 72;
        check(`${w}x${h} 처음 화면: 위쪽 막대 ${wantBar}px · 주아 글꼴 · 정연이 그림`, t.topbar === wantBar && t.font === "Jua" && t.jua && t.doll >= 200, JSON.stringify(t));
      }
      if (name === "shop" || name === "room") {
        const s = await evaluate(`(() => { const d = document.querySelector('#mirror svg').getBoundingClientRect(); const g = document.querySelector('#grid').getBoundingClientRect(); const b = document.querySelector('#done').getBoundingClientRect();
          const c = document.querySelector('#bag')?.getBoundingClientRect(); const shelf = document.querySelector('.shelf').getBoundingClientRect();
          return { doll: Math.round(d.height), grid: Math.round(g.height), done: b.bottom <= innerHeight + 30 && b.right <= innerWidth,
            ...(c ? { cartBtn: c.left >= shelf.left && c.right <= b.left && c.bottom <= innerHeight + 30 } : {}) }; })()`);
        if (name === "shop" && !s.cartBtn) s.done = false; // 바구니 보기 버튼도 옷 칸 안에, 계산해요와 겹치지 않게
        check(`${w}x${h} ${name === "shop" ? "백화점" : "내 방"}: 거울 그림·옷 칸·끝 버튼이 화면 안에`, s.doll >= 150 && s.grid >= 110 && s.done, JSON.stringify(s));
      }
      if (name === "go") {
        const rows = await evaluate(BALANCE_JS);
        const perRow = w <= 520 ? 1 : w <= 900 ? 2 : 4;
        check(`${w}x${h} 어디 갈까요?: 카드 줄마다 가운데 정렬, 한 줄 최대 ${perRow}장`, rows.every((r) => r.diff < 2) && rows[0].cards === perRow && rows.every((r) => r.cards <= perRow),
          rows.map((r) => `${r.cards}장(${r.diff.toFixed(1)})`).join(", "));
      }
      if (name === "party") {
        const f = await evaluate(`(() => { const s = document.querySelector('.scene').getBoundingClientRect(); const ps = [...document.querySelectorAll('.person')].map((p) => p.getBoundingClientRect());
          return { inside: ps.every((p) => p.left >= s.left - 2 && p.right <= s.right + 2 && p.top >= s.top - 2), h: Math.round(s.height), n: ps.length }; })()`);
        check(`${w}x${h} 나들이: 가족 ${f.n}명이 장면 안에`, f.inside && f.h >= 200, JSON.stringify(f));
      }
      await shot(`m${w}_${name}`);
      if (name === "party") {
        // 사진 창(액자·냉장고)이 화면 안에, 가로 넘침 없이
        await click("#photo", 3300);
        const pw = await evaluate(`(() => { const b = document.querySelector('.photo-box').getBoundingClientRect(); const r = document.querySelector('.photo-room').getBoundingClientRect(); const btn = document.querySelector('.photo-wall [data-act="ok"]').getBoundingClientRect();
          return { inside: b.left >= 0 && b.right <= innerWidth && b.top >= 0 && b.bottom <= innerHeight + 1 && btn.bottom <= innerHeight, room: Math.round(r.width), stuck: !!document.querySelector('.photo-room .polaroid.stuck'), sw: document.documentElement.scrollWidth }; })()`);
        check(`${w}x${h} 사진 창: 방 그림·버튼이 화면 안에, 사진이 붙음`, pw.inside && pw.room >= 240 && pw.stuck && pw.sw <= w, JSON.stringify(pw));
        await shot(`m${w}_photo`);
      }
    }
    check(`${w}x${h} 모든 화면: 가로 넘침 없음`, over.length === 0, over.join(", "));
  }

  // ───────── 3) 디자인 견본 화면의 부품과 조작 (노트북 크기) ─────────
  await send("Emulation.setDeviceMetricsOverride", { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false });
  await go("#/guide/yellow", 1000);
  const themeInk = await evaluate(`(() => { const b = document.querySelector('.guide-row .big-btn'); const cs = getComputedStyle(b);
    return { bg: cs.backgroundColor, ink: cs.color, kicker: getComputedStyle(document.querySelector('.slide-kicker')).color }; })()`);
  check("견본(노랑): 큰 버튼은 노랑 바탕 + 진한 글씨, 작은 제목은 진한 노랑 글씨", themeInk.bg === "rgb(253, 216, 53)" && themeInk.ink === "rgb(35, 50, 74)"
    && themeInk.kicker === "rgb(161, 124, 0)", JSON.stringify(themeInk));
  await go("#/guide/red", 800);
  const red = await evaluate(`getComputedStyle(document.querySelector('.guide-row .big-btn')).color`);
  check("견본(빨강): 큰 버튼 글씨는 흰색", red === "rgb(255, 255, 255)", red);

  const state = () => evaluate(`({ on: [...document.querySelectorAll('.dot')].findIndex((d) => d.classList.contains('on')),
    prev: document.querySelector('.slide-nav .prev').disabled, next: document.querySelector('.slide-nav .next').disabled,
    navTop: Math.round(document.querySelector('.slide-nav .next').getBoundingClientRect().top + scrollY) })`);
  const g0 = await state();
  await evaluate(`document.querySelector('.slide-nav .next').click(); true`);
  await sleep(200);
  const g1 = await state();
  await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' })); true`);
  await sleep(200);
  const g2 = await state();
  await evaluate(`document.querySelectorAll('.dot')[0].click(); true`);
  await sleep(200);
  const g3 = await state();
  check("견본 넘기기: ▶ · → 키 · 점으로 넘김", g0.on === 0 && g1.on === 1 && g2.on === 2 && g3.on === 0, [g0, g1, g2, g3].map((s) => s.on).join("→"));
  check("견본 넘기기: 처음엔 ◀, 끝에선 ▶ 흐려짐", g0.prev && !g0.next && g2.next && !g2.prev);
  check("견본 넘기기: ◀ ▶ 버튼 위치가 흔들리지 않음 (카드 높이 고정)", Math.max(g0.navTop, g1.navTop, g2.navTop) - Math.min(g0.navTop, g1.navTop, g2.navTop) <= 1,
    [g0, g1, g2].map((s) => s.navTop).join(", "));

  const c0 = await evaluate(`SiteSound.played()`);
  await evaluate(`document.querySelector('.small-btn').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 })); true`);
  const c1 = await evaluate(`SiteSound.played()`);
  check("효과음: 버튼을 누르면 딸깍", c1 === c0 + 1, `${c0} → ${c1}`);
  await evaluate(`document.querySelectorAll('.dot')[2].click(); true`);
  await sleep(200);
  await evaluate(`document.querySelector('#guide-celebrate').click(); true`);
  await sleep(700);
  const party = await evaluate(`({ box: !!document.querySelector('.celebrate .celebrate-box .medal-big'), confetti: document.querySelectorAll('.confetti').length, played: SiteSound.played() })`);
  check("축하 창: 메달 + 폭죽 + 박수", party.box && party.confetti > 0 && party.played === c1 + 1, JSON.stringify(party));
  await evaluate(`document.querySelector('.celebrate .big-btn').click(); true`);
  await sleep(200);
  check("축하 창: 버튼으로 닫힘", (await evaluate(`document.querySelectorAll('.celebrate').length`)) === 0);
  await evaluate(`location.hash = '#/'; true`);
  await sleep(400);
  check("🏠 처음부터 다시보기 · 제목", (await evaluate(`document.querySelector('#home-btn').textContent.trim() + '|' + document.title`)).startsWith("🏠처음부터 다시보기|정연이의 딸기나라"));
  check("오류 없음", errors.length === 0, errors.slice(0, 5).join(" | "));
} catch (e) {
  results.push("ERROR " + e.stack);
} finally {
  console.log(results.join("\n"));
  const fail = results.filter((r) => !r.startsWith("PASS")).length;
  console.log(`\n${results.length - fail} / ${results.length} 통과`);
  try { ws?.close(); } catch { /* 무시 */ }
  edge.kill();
  await sleep(800);
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* 무시 */ }
}
