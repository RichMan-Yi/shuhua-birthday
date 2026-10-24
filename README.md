# 觀光大使的生日小旅行

1/6 舒華生日企劃：3D 桃園地圖，五個景點各有一個小遊戲。五關都過關後送出生日祝福，祝福會出現在祝福島上。

所有可以點開的頁面整理在 [dev_check.md](dev_check.md)。完整的遊戲流程與規則見 [GAME_FLOW.md](GAME_FLOW.md)，各系統的規格見 [docs/specs/](docs/specs/README.md)。

## 本機執行

```sh
python3 tools/serve.py 8000
```

- 電腦：開 http://localhost:8000
- 手機（和 Mac 同一個 Wi‑Fi）：開 `http://<Mac 的 IP>:8000`，IP 用 `ipconfig getifaddr en0` 查
- 直接進某一關：網址後面加 `#game-daxi`、`#game-lalashan`、`#game-shimen`、`#game-xpark`、`#game-night`
- 直接看生日派對：網址後面加 `#party`
- 祝福島：開 http://localhost:8000/wall.html（目前是模擬資料）

## 結構

- `src/map.js` 桃園地圖、景點模型、鏡頭
- `src/castle.js` 地圖中央的 Neverland 城堡（祝福島才現身）與偽裝用的山丘
- `src/daylight.js` 地圖的天色 7 階段
- `src/fireworks.js` 煙火（生日派對、祝福島共用）
- `src/spots.js` 景點資料（名稱、介紹、位置）
- `src/wolf.js` 小狼角色和所有可調參數
- `src/models.js` 水蜜桃、蜜蜂、樹等模型
- `src/games/shell.js` 所有小遊戲共用的外殼（說明、倒數、HUD、結算、印章）
- `src/games/common.js` 共用的操作（左右拖曳、點擊 3D 物件）與燈光
- `src/games/daxi.js` 大溪老街・豆干記憶大考驗
- `src/games/peach.js` 拉拉山・接水蜜桃
- `src/games/shimen.js` 石門水庫・划船大冒險
- `src/games/xpark.js` Xpark・海洋生物找找看
- `src/games/night.js` 桃園觀光夜市・夜市限時點餐
- `src/ending.js` 集滿印章後的生日派對
- `src/audio.js` 音效
- `wall.html`、`src/wall.js`、`src/wall-data.js` 祝福島（3D 地圖＋手寫紙條，模擬 1,268 位玩家）

## 模型檢視

開 http://localhost:8000/viewer.html：可以旋轉、切換視角和動作，也能疊上參考圖比對。

- `viewer.html#compare` 直接開啟參考圖疊圖
- `viewer.html#side`（或 `#front`、`#three`、`#back`、`#top`）直接用指定視角開啟
- `viewer.html#tune` 直接打開「調整」分頁

### 調整小狼的流程

1. 在「調整」分頁拉滑桿，可以搭配「疊上參考圖」和「按住看原版」比較
2. 滿意後按「複製設定給 Claude」，把複製到的文字貼給 Claude
3. Claude 把數值寫進 `src/wolf.js` 的 `WOLF_PARAMS`，成為新的預設值，遊戲也會跟著用新版本

滑桿的種類和範圍都定義在 `src/wolf.js` 的 `WOLF_PARAMS`。

## 部署

- 網址：https://richman-yi.github.io/shuhua-birthday/
- 推送到 `main` 就會由 [.github/workflows/pages.yml](.github/workflows/pages.yml) 自動部署到 GitHub Pages。
- 網站只放遊戲會載入的檔案：`index.html`、`wall.html`、`frame.html`（電腦版的手機比例外框）、`src/`（不含 `src/viewer.js`）。規格文件、工具和模型檢視頁只在倉庫裡。
- `ref/` 的參考圖不進倉庫（見 `.gitignore`），只留在本機。
