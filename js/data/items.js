/*
  딸기 백화점 물건 목록 (그림은 js/doll.js가 아래 값으로 바로 그려요. 그림 파일 없음)

  SHOP  : 딸기(돈) 규칙
  CATS  : 옷장·가게 칸 (원피스, 윗옷, 바지·치마, 신발, 모자)
  ITEMS : 가게에서 파는 옷. 한 줄에 하나
    id      : 바꾸지 마세요 (기록에 남는 이름표)
    cat     : dress 원피스 · top 윗옷 · bottom 바지·치마 · shoes 신발 · hat 모자
    name    : 아이가 읽는 이름
    tone    : 어른용 기록에서 '좋아한 색'을 셀 때 쓰는 색 이름
    shape   : 모양 (doll.js의 그리기 함수 이름)
    color   : 바탕색, color2 : 둘째 색(리본·안감 등)
    pattern : 무늬 dots 땡땡이 · stripes 줄무늬 · gingham 체크 · flowers 꽃 · hearts 하트 · stars 별
              berries 딸기 · rainbow 무지개 · sparkle 반짝이 · denim 청 · quilt 패딩 / pc : 무늬 색
    sleeve  : none 민소매 · short 반팔 · puff 퍼프 · long 긴팔 / collar : round · sailor · frill
    motif   : 가슴·치마에 그리는 그림 (heart, chick, bear, berry, star, flower, rainbow, melody, kuromi, hachu …)
    char    : 캐릭터 옷 (melody 마이멜로디 · kuromi 쿠로미 · hachu 하츄핑). 값은 SHOP.price.character
  BASE  : 처음부터 입고 있는 하얀 원피스·하얀 구두 (사지 않아도 옷장에 있어요)
  GIFTS : 가족 선물 (who는 js/data/site.js의 family와 짝)
  HAIRS / HAIR_COLORS : 내 방 거울 앞에서 공짜로 바꾸는 머리 모양(그림은 doll.js의 hairBack·hairFront)과 머리 색
*/
window.SHOP = {
  start: 100,                                   // 처음에 받는 딸기
  price: { normal: 5, character: 15, gift: 5 }, // 보통 옷 · 캐릭터 옷 · 가족 선물
  giftThanks: 10,                               // 가족 선물 하나마다 고맙다고 받는 딸기
  allGiftsBonus: 0,                             // 세 사람 모두 선물했을 때 더 주는 딸기 (0이면 10 × 3 = 30개)
};

window.CATS = [
  { id: "dress", label: "원피스", emoji: "👗" },
  { id: "top", label: "윗옷", emoji: "👚" },
  { id: "bottom", label: "바지·치마", emoji: "👖" },
  { id: "shoes", label: "신발", emoji: "👟" },
  { id: "hat", label: "모자", emoji: "👒" },
];

window.CHARACTERS = { melody: "마이멜로디", kuromi: "쿠로미", hachu: "하츄핑" };

// 진짜 캐릭터 그림 (선택). images/characters/ 폴더에 배경이 투명한 PNG를 이 이름으로 넣으면
// 캐릭터 옷의 무늬가 그 그림으로 바뀌어요. 파일이 없으면 js/doll.js가 그린 흉내 그림을 써요.
// 이 폴더의 그림 파일은 git·Vercel에 올라가지 않아요 (.gitignore · .vercelignore). 집에서 index.html로 열 때만 보여요
window.CHARACTER_IMAGES = {
  melody: "images/characters/melody.png",
  kuromi: "images/characters/kuromi.png",
  hachu: "images/characters/hachu.png",
};

window.ITEMS = [
  // ── 원피스 ──
  { id: "d-dots", cat: "dress", name: "분홍 땡땡이 원피스", tone: "분홍", shape: "aline", sleeve: "puff", collar: "round", color: "#f8a5c2", pattern: "dots", pc: "#ffffff" },
  { id: "d-flower", cat: "dress", name: "노란 꽃무늬 원피스", tone: "노랑", shape: "aline", sleeve: "short", color: "#ffe28a", pattern: "flowers", pc: "#ff8fab" },
  { id: "d-sailor", cat: "dress", name: "하늘색 세일러 원피스", tone: "하늘", shape: "aline", sleeve: "short", collar: "sailor", color: "#a7d8f7", color2: "#283593" },
  { id: "d-check", cat: "dress", name: "빨간 체크 원피스", tone: "빨강", shape: "pinafore", color: "#ffffff", pattern: "gingham", pc: "#e53935", color2: "#e53935" },
  { id: "d-princess", cat: "dress", name: "보라 공주 드레스", tone: "보라", shape: "princess", sleeve: "puff", color: "#cfa8e0", pattern: "sparkle", pc: "#ffffff", color2: "#8e24aa" },
  { id: "d-mint", cat: "dress", name: "민트 줄무늬 원피스", tone: "초록", shape: "aline", sleeve: "none", color: "#8fe3c8", pattern: "stripes", pc: "#ffffff" },
  { id: "d-berry", cat: "dress", name: "딸기 원피스", tone: "빨강", shape: "aline", sleeve: "puff", collar: "round", color: "#fff4f4", pattern: "berries", color2: "#e53935" },
  { id: "d-tutu", cat: "dress", name: "발레 튜튜 원피스", tone: "분홍", shape: "tutu", sleeve: "none", color: "#ffc9de" },
  { id: "d-denim", cat: "dress", name: "청 멜빵 원피스", tone: "파랑", shape: "pinafore", color: "#5b8fd6", pattern: "denim", pc: "#ffffff", motif: "heart" },
  { id: "d-star", cat: "dress", name: "별빛 긴 드레스", tone: "남색", shape: "long", sleeve: "short", color: "#3f51b5", pattern: "stars", pc: "#ffe082" },
  { id: "d-rainbow", cat: "dress", name: "무지개 원피스", tone: "무지개", shape: "aline", sleeve: "short", color: "#ffffff", pattern: "rainbow" },
  { id: "d-orange", cat: "dress", name: "주황 리본 원피스", tone: "주황", shape: "aline", sleeve: "puff", color: "#ffb74d", color2: "#ffffff", belt: true },
  { id: "d-long", cat: "dress", name: "분홍 꽃 긴 원피스", tone: "분홍", shape: "long", sleeve: "puff", collar: "frill", color: "#f48fb1", pattern: "flowers", pc: "#ffffff" },
  { id: "d-melody", cat: "dress", name: "마이멜로디 원피스", tone: "분홍", shape: "aline", sleeve: "puff", collar: "round", color: "#ffc4dd", motif: "melody", char: "melody", belt: true, color2: "#ffffff" },
  { id: "d-kuromi", cat: "dress", name: "쿠로미 원피스", tone: "검정", shape: "aline", sleeve: "short", collar: "frill", color: "#3a3347", color2: "#f7a1c4", motif: "kuromi", char: "kuromi" },
  { id: "d-hachu", cat: "dress", name: "하츄핑 공주 드레스", tone: "분홍", shape: "princess", sleeve: "puff", color: "#ff9ccc", pattern: "hearts", pc: "#ffffff", color2: "#ff5fa8", motif: "hachu", char: "hachu" },
  { id: "d-hachu2", cat: "dress", name: "하츄핑 튜튜 원피스", tone: "분홍", shape: "tutu", sleeve: "puff", color: "#ffb3d9", color2: "#ff5fa8", motif: "hachu", char: "hachu" },

  // ── 윗옷 ──
  { id: "t-heart", cat: "top", name: "하얀 하트 티셔츠", tone: "하양", shape: "tee", color: "#ffffff", motif: "heart" },
  { id: "t-stripe", cat: "top", name: "분홍 줄무늬 티셔츠", tone: "분홍", shape: "tee", color: "#f8a5c2", pattern: "stripes", pc: "#ffffff" },
  { id: "t-chick", cat: "top", name: "노란 병아리 티셔츠", tone: "노랑", shape: "tee", color: "#fff3b0", motif: "chick" },
  { id: "t-blouse", cat: "top", name: "하늘색 블라우스", tone: "하늘", shape: "blouse", color: "#bfe3fb" },
  { id: "t-hoodie", cat: "top", name: "초록 후드티", tone: "초록", shape: "hoodie", color: "#81c784" },
  { id: "t-berry", cat: "top", name: "빨간 딸기 티셔츠", tone: "빨강", shape: "tee", color: "#ff8a80", motif: "berry" },
  { id: "t-cardigan", cat: "top", name: "보라 가디건", tone: "보라", shape: "cardigan", color: "#b39ddb" },
  { id: "t-jacket", cat: "top", name: "청자켓", tone: "파랑", shape: "jacket", color: "#6f9fd8", pattern: "denim", pc: "#ffffff" },
  { id: "t-knit", cat: "top", name: "무지개 니트", tone: "무지개", shape: "knit", color: "#ffffff", pattern: "rainbow" },
  { id: "t-tank", cat: "top", name: "꽃무늬 민소매 티", tone: "분홍", shape: "tank", color: "#ffd6e7", pattern: "flowers", pc: "#ff6f9f" },
  { id: "t-bear", cat: "top", name: "곰돌이 맨투맨", tone: "갈색", shape: "sweat", color: "#f1dcc0", motif: "bear" },
  { id: "t-shirt", cat: "top", name: "주황 체크 셔츠", tone: "주황", shape: "shirt", color: "#ffffff", pattern: "gingham", pc: "#fb8c00" },
  { id: "t-padding", cat: "top", name: "분홍 패딩", tone: "분홍", shape: "padding", color: "#f48fb1", pattern: "quilt", pc: "#d76a93" },
  { id: "t-star", cat: "top", name: "남색 별 티셔츠", tone: "남색", shape: "longtee", color: "#3949ab", motif: "star" },
  { id: "t-melody", cat: "top", name: "마이멜로디 티셔츠", tone: "분홍", shape: "tee", color: "#ffd6e8", motif: "melody", char: "melody" },
  { id: "t-melody2", cat: "top", name: "마이멜로디 가디건", tone: "분홍", shape: "cardigan", color: "#ffbcd8", motif: "melody", char: "melody" },
  { id: "t-kuromi", cat: "top", name: "쿠로미 후드티", tone: "검정", shape: "hoodie", color: "#3a3347", color2: "#f7a1c4", motif: "kuromi", char: "kuromi" },
  { id: "t-hachu", cat: "top", name: "하츄핑 티셔츠", tone: "분홍", shape: "tee", color: "#ffe3f0", motif: "hachu", char: "hachu" },

  // ── 바지·치마 ──
  { id: "b-pleats", cat: "bottom", name: "분홍 주름치마", tone: "분홍", shape: "pleats", color: "#f8a5c2" },
  { id: "b-jeans", cat: "bottom", name: "청바지", tone: "파랑", shape: "jeans", color: "#5b8fd6", pattern: "denim", pc: "#ffffff" },
  { id: "b-shorts", cat: "bottom", name: "노란 반바지", tone: "노랑", shape: "shorts", color: "#ffe082" },
  { id: "b-check", cat: "bottom", name: "빨간 체크 치마", tone: "빨강", shape: "skirt", color: "#ffffff", pattern: "gingham", pc: "#e53935" },
  { id: "b-tutu", cat: "bottom", name: "하얀 튜튜 치마", tone: "하양", shape: "tutu", color: "#fbf3ff" },
  { id: "b-leggings", cat: "bottom", name: "하늘색 별 레깅스", tone: "하늘", shape: "leggings", color: "#9fd3f7", pattern: "stars", pc: "#ffffff" },
  { id: "b-long", cat: "bottom", name: "꽃무늬 긴 치마", tone: "노랑", shape: "longskirt", color: "#fff0d6", pattern: "flowers", pc: "#ff8a65" },
  { id: "b-green", cat: "bottom", name: "초록 바지", tone: "초록", shape: "pants", color: "#81c784" },
  { id: "b-dots", cat: "bottom", name: "보라 땡땡이 치마", tone: "보라", shape: "skirt", color: "#b39ddb", pattern: "dots", pc: "#ffffff" },
  { id: "b-navy", cat: "bottom", name: "남색 반바지", tone: "남색", shape: "shorts", color: "#3949ab" },
  { id: "b-berry", cat: "bottom", name: "딸기 치마", tone: "빨강", shape: "skirt", color: "#ffffff", pattern: "berries" },
  { id: "b-rainbow", cat: "bottom", name: "무지개 치마", tone: "무지개", shape: "pleats", color: "#ffffff", pattern: "rainbow" },
  { id: "b-jogger", cat: "bottom", name: "분홍 운동복 바지", tone: "분홍", shape: "jogger", color: "#f48fb1" },
  { id: "b-melody", cat: "bottom", name: "마이멜로디 치마", tone: "분홍", shape: "skirt", color: "#ffc4dd", motif: "melody", char: "melody" },
  { id: "b-kuromi", cat: "bottom", name: "쿠로미 바지", tone: "검정", shape: "pants", color: "#3a3347", motif: "kuromi", char: "kuromi" },
  { id: "b-hachu", cat: "bottom", name: "하츄핑 튜튜 치마", tone: "분홍", shape: "tutu", color: "#ff9ccc", motif: "hachu", char: "hachu" },

  // ── 신발 ──
  { id: "s-pink", cat: "shoes", name: "분홍 운동화", tone: "분홍", shape: "sneaker", color: "#f48fb1" },
  { id: "s-light", cat: "shoes", name: "반짝 불빛 운동화", tone: "무지개", shape: "lightup", color: "#ffffff" },
  { id: "s-red", cat: "shoes", name: "빨간 구두", tone: "빨강", shape: "maryjane", color: "#e53935" },
  { id: "s-black", cat: "shoes", name: "까만 구두", tone: "검정", shape: "maryjane", color: "#3a3347" },
  { id: "s-rain", cat: "shoes", name: "노란 장화", tone: "노랑", shape: "rainboots", color: "#fdd835" },
  { id: "s-sandal", cat: "shoes", name: "하늘색 샌들", tone: "하늘", shape: "sandals", color: "#64b5f6" },
  { id: "s-glass", cat: "shoes", name: "반짝 공주 구두", tone: "하늘", shape: "glass", color: "#d7ecff" },
  { id: "s-fur", cat: "shoes", name: "하얀 털부츠", tone: "하양", shape: "furboots", color: "#c9a27e", color2: "#fffaf2" },
  { id: "s-purple", cat: "shoes", name: "보라 운동화", tone: "보라", shape: "sneaker", color: "#9575cd" },
  { id: "s-frog", cat: "shoes", name: "개구리 장화", tone: "초록", shape: "rainboots", color: "#66bb6a", motif: "frog" },
  { id: "s-bow", cat: "shoes", name: "리본 구두", tone: "분홍", shape: "maryjane", color: "#ffc1dc", motif: "bow" },
  { id: "s-ballet", cat: "shoes", name: "발레 신발", tone: "분홍", shape: "ballet", color: "#ffd6e7" },
  { id: "s-star", cat: "shoes", name: "별 운동화", tone: "남색", shape: "sneaker", color: "#3949ab", motif: "star" },
  { id: "s-boots", cat: "shoes", name: "갈색 부츠", tone: "갈색", shape: "boots", color: "#a1673f" },
  { id: "s-melody", cat: "shoes", name: "마이멜로디 운동화", tone: "분홍", shape: "sneaker", color: "#ffc4dd", motif: "melody", char: "melody" },
  { id: "s-kuromi", cat: "shoes", name: "쿠로미 구두", tone: "검정", shape: "maryjane", color: "#3a3347", motif: "kuromi", char: "kuromi" },
  { id: "s-hachu", cat: "shoes", name: "하츄핑 구두", tone: "분홍", shape: "glass", color: "#ff9ccc", motif: "hachu", char: "hachu" },

  // ── 모자 ──
  { id: "h-straw", cat: "hat", name: "밀짚모자", tone: "노랑", shape: "straw", color: "#f3d38b", color2: "#ff8fab" },
  { id: "h-cap", cat: "hat", name: "분홍 야구 모자", tone: "분홍", shape: "cap", color: "#f48fb1" },
  { id: "h-beanie", cat: "hat", name: "하늘색 털모자", tone: "하늘", shape: "beanie", color: "#9fd3f7", color2: "#ffffff" },
  { id: "h-yellow", cat: "hat", name: "노란 모자", tone: "노랑", shape: "yellow", color: "#fdd835" },
  { id: "h-crown", cat: "hat", name: "공주 왕관", tone: "노랑", shape: "crown", color: "#ffd54f" },
  { id: "h-bunny", cat: "hat", name: "토끼 머리띠", tone: "하양", shape: "bunny", color: "#ffffff", color2: "#ffc1dc" },
  { id: "h-bow", cat: "hat", name: "분홍 큰 리본", tone: "분홍", shape: "bow", color: "#f48fb1" },
  { id: "h-flowers", cat: "hat", name: "꽃 화관", tone: "분홍", shape: "flowers", color: "#81c784" },
  { id: "h-beret", cat: "hat", name: "빨간 베레모", tone: "빨강", shape: "beret", color: "#ef5350" },
  { id: "h-cat", cat: "hat", name: "고양이 머리띠", tone: "검정", shape: "cat", color: "#3a3347", color2: "#ffc1dc" },
  { id: "h-berry", cat: "hat", name: "딸기 모자", tone: "빨강", shape: "berrycap", color: "#ef5350" },
  { id: "h-bucket", cat: "hat", name: "연두 벙거지 모자", tone: "초록", shape: "bucket", color: "#c5e1a5" },
  { id: "h-stars", cat: "hat", name: "별 머리핀", tone: "노랑", shape: "starpins", color: "#ffd54f" },
  { id: "h-melody", cat: "hat", name: "마이멜로디 모자", tone: "분홍", shape: "melodyhood", color: "#f7a1c4", char: "melody" },
  { id: "h-kuromi", cat: "hat", name: "쿠로미 모자", tone: "검정", shape: "kuromihood", color: "#3a3347", color2: "#f7a1c4", char: "kuromi" },
  { id: "h-hachu", cat: "hat", name: "하츄핑 머리띠", tone: "분홍", shape: "hachuband", color: "#ff8cc6", char: "hachu" },
];

window.BASE = [
  { id: "base-dress", cat: "dress", name: "하얀 원피스", tone: "하양", shape: "aline", sleeve: "puff", collar: "round", color: "#ffffff", belt: true, color2: "#ffd6e7", base: true },
  { id: "base-shoes", cat: "shoes", name: "하얀 구두", tone: "하양", shape: "maryjane", color: "#ffffff", base: true },
];

window.GIFTS = [
  { id: "g-dad", cat: "gift", who: "dad", name: "아빠 선물", sub: "멋진 양복", tone: "남색" },
  { id: "g-mom", cat: "gift", who: "mom", name: "엄마 선물", sub: "꽃무늬 원피스", tone: "하늘" },
  { id: "g-twin", cat: "gift", who: "twin", name: "정우 선물", sub: "로봇 점퍼", tone: "파랑" },
];

window.HAIRS = [
  { id: "long", name: "긴 생머리" },
  { id: "twinlow", name: "양갈래 머리" },
  { id: "twinhigh", name: "높은 양갈래" },
  { id: "pony", name: "포니테일" },
  { id: "bun", name: "똥머리" },
  { id: "spacebuns", name: "양쪽 똥머리" },
  { id: "bob", name: "단발머리" },
  { id: "braids", name: "땋은 양갈래" },
  { id: "sidebraid", name: "한쪽 땋은 머리" },
  { id: "halfup", name: "리본 반묶음" },
  { id: "wavy", name: "웨이브 머리" },
  { id: "short", name: "짧은 머리" },
  { id: "princess", name: "공주 머리" },
  { id: "sidepony", name: "옆으로 묶은 머리" },
  { id: "curly", name: "뽀글뽀글 머리" },
  { id: "pucca", name: "뿌까 머리" },
  { id: "jadoo", name: "자두 머리" },
];

window.HAIR_COLORS = [
  { id: "black", name: "까만색", color: "#3a2a24" },
  { id: "brown", name: "갈색", color: "#8a5a3b" },
  { id: "gold", name: "노란색", color: "#f2c94c" },
  { id: "pink", name: "분홍색", color: "#f48fb1" },
  { id: "purple", name: "보라색", color: "#9575cd" },
  { id: "sky", name: "하늘색", color: "#64b5f6" },
];
