/*
  나들이 메뉴 카드 ("어디 갈까요?" 화면, 주소 #/go)
  - id    : 배경 그림 이름 (js/scenes.js) 이자 주소 (#/go/<id>)
  - theme : 카드 아래 띠와 그 화면의 테마 색. 순서대로 빨·주·노·초·파·남·보
            red · orange · yellow · green · blue · navy · purple (색 값은 css/style.css의 --c-…)
  - emoji : 카드 그림
  - title : 카드 큰 글씨 (아이가 읽는 쉬운 말)
  - sub   : 카드 작은 글씨
  - arrive: 도착했을 때 나오는 한 줄 (앞에 "정연이가 "가 붙어요)
*/
window.MENUS = [
  { id: "school", theme: "red", emoji: "🏫", title: "어린이집 가기", sub: "친구들을 만나요", arrive: "어린이집에 왔어요!" },
  { id: "trip", theme: "orange", emoji: "✈️", title: "여행 가기", sub: "바닷가로 슝", arrive: "바닷가로 여행 왔어요!" },
  { id: "playground", theme: "yellow", emoji: "🛝", title: "놀이터 가기", sub: "미끄럼틀 타요", arrive: "놀이터에 왔어요!" },
  { id: "kidscafe", theme: "green", emoji: "🧸", title: "키즈카페 가기", sub: "공 놀이 해요", arrive: "키즈카페에 왔어요!" },
  { id: "dinner", theme: "blue", emoji: "🍝", title: "밥 먹으러 가기", sub: "맛있게 먹어요", arrive: "맛있는 밥 먹으러 왔어요!" },
  { id: "party", theme: "navy", emoji: "🎂", title: "생일 파티 가기", sub: "축하해 줘요", arrive: "생일 파티에 왔어요!" },
  { id: "park", theme: "purple", emoji: "🎠", title: "놀이공원 가기", sub: "회전목마 타요", arrive: "놀이공원에 왔어요!" },
];
