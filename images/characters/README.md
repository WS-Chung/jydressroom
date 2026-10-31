# 진짜 캐릭터 그림 넣는 곳

이 폴더에 아래 이름으로 PNG를 넣으면, 캐릭터 옷(원피스·윗옷·바지·치마·신발·하츄핑 머리띠)의 무늬가 그 그림으로 바뀌어요.
파일이 없으면 앱이 그린 흉내 그림을 그대로 써요.

| 파일 이름 | 캐릭터 |
| --- | --- |
| `melody.png` | 마이멜로디 |
| `kuromi.png` | 쿠로미 |
| `hachu.png` | 하츄핑 |

- 배경이 **투명한** PNG (얼굴이나 상반신, 가로세로가 비슷한 그림이 가장 잘 어울려요). 500px 안팎이면 충분해요
- 그림은 정사각형 상자 안에 비율을 지켜 들어가고, 옷 위에 붙인 스티커처럼 흰 테두리가 생겨요
- 파일 이름이나 위치를 바꾸려면 `js/data/items.js`의 `CHARACTER_IMAGES`를 고쳐요
- 이 폴더의 그림 파일은 `.gitignore`·`.vercelignore`로 GitHub·Vercel에 올라가지 않아요. `index.html`을 이 PC에서 열 때만 보여요
- 쿠로미 모자·마이멜로디 모자는 모자 모양 자체가 캐릭터라 그림 파일과 상관없이 그대로예요

## 지금 들어 있는 그림 (집에서 보는 용도로만)

배경이 투명한지(네 귀퉁이 투명도 0) 확인했고, 마이멜로디·쿠로미는 바깥 투명 여백을 잘라 냈어요.

| 파일 | 원본 | 크기 |
| --- | --- | --- |
| `melody.png` | Hello Kitty Wiki (Fandom) `Sanrio_Characters_My_Melody_Image030.png` | 218×383 |
| `kuromi.png` | Hello Kitty Wiki (Fandom) `List-kuromi.png` | 464×556 |
| `hachu.png` | Catch! Teenieping Wiki (Fandom) `Heartsping_S1_Render_1.png` | 800×659 |

캐릭터의 권리는 산리오(마이멜로디·쿠로미)와 SAMG엔터테인먼트(하츄핑)에 있어요.
