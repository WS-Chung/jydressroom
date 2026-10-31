/*
  사이트 기본 정보
  - name   : 위쪽 막대 제목, 처음 화면 큰 제목, 브라우저 탭 제목에 쓰는 이름
  - emoji  : 처음 화면 탭 제목 끝에 붙는 그림 글자
  - child  : 앱을 쓰는 아이 이름 (받침이 있으면 "정연이가", "정연아"처럼 불러요)
  - family : 가족 선물을 받을 사람. 선물 목록(js/data/items.js의 GIFTS)의 who와 짝이 맞아요
  - childHeight · family.height : 키(cm). 나들이 장면의 사람 크기 비율
  (index.html의 <title>·<h1>은 처음 열 때 잠깐 보이는 값이라, 이름을 바꾸면 거기도 같이 바꿔 주세요)
*/
window.SITE = {
  name: "정연이의 딸기나라",
  emoji: "🍓",
  child: "정연",
  childHeight: 110, // 키 (cm). 나들이 장면에서 가족과 키를 맞춰 그려요
  family: {
    dad: { name: "아빠", emoji: "👨", height: 180 },
    mom: { name: "엄마", emoji: "👩", height: 160 },
    twin: { name: "정우", emoji: "👦", height: 120 }, // 쌍둥이 남매지만 정연이보다 키가 커요
  },
};
