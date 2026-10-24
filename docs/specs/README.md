# 規格文件

「觀光大使的生日小旅行」各系統的需求規格。每份文件都包含：這個系統要做到什麼、已經做出的決定（附日期）、目前的實作數值，以及還沒決定的事。

玩家視角的整體流程請看 [GAME_FLOW.md](../../GAME_FLOW.md)。

## 專案共通條件

| 項目 | 內容 |
|---|---|
| 目的 | 葉舒華 1/6 生日的粉絲遊戲，給 Neverland 玩 |
| 上線時間 | 2027-01-06 |
| 平台 | 手機瀏覽器優先，點連結就能玩、不用安裝；電腦也能玩 |
| 技術 | 網頁 + Three.js 0.160.0，不需要建置工具 |
| 語言 | 介面為繁體中文；玩家的祝福可以是任何語言 |
| 主題 | 舒華是桃園旅遊推廣大使，遊戲以桃園景點為舞台 |
| 美術 | 低多邊形（low-poly）3D、柔和天空色、紙卡片介面、圓體字（Huninn）；所有新頁面都要沿用 |
| 主角 | Q 版灰色小狼（見 [character.md](character.md)） |
| 資料 | 目前全部存在玩家自己的瀏覽器（單機版），還沒有伺服器 |

## 系統一覽

| 文件 | 系統 |
|---|---|
| [map.md](map.md) | 3D 桃園大地圖 |
| [character.md](character.md) | 小狼角色模型、模型檢視與調整工具 |
| [level-framework.md](level-framework.md) | 所有關卡共用的外殼：說明、倒數、HUD、結算、操作、音效 |
| [scoring.md](scoring.md) | 計分原則與總分 |
| [levels/daxi.md](levels/daxi.md) | 大溪老街・豆干記憶大考驗 |
| [levels/lalashan.md](levels/lalashan.md) | 拉拉山・接水蜜桃 |
| [levels/shimen.md](levels/shimen.md) | 石門水庫・划船大冒險 |
| [levels/xpark.md](levels/xpark.md) | Xpark・海洋生物找找看 |
| [levels/night.md](levels/night.md) | 桃園觀光夜市・夜市限時點餐 |
| [progression.md](progression.md) | 通關流程、關卡鎖定、存檔、送出祝福、重置 |
| [ending.md](ending.md) | 集滿印章後的生日派對 |
| [wish-wall.md](wish-wall.md) | 生日祝福牆 |
