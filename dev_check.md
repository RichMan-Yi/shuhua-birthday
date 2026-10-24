# 開發檢查連結

所有可以直接點開的頁面和文件。

## 線上版（GitHub Pages）

推送到 `main` 後約 1 分鐘自動更新，手機在任何網路下都能開，畫面上沒有多餘的標題列。

| 頁面 | 網址 |
|---|---|
| 遊戲 | https://richman-yi.github.io/shuhua-birthday/ |
| 開發者模式 | https://richman-yi.github.io/shuhua-birthday/#dev |
| 生日派對 | https://richman-yi.github.io/shuhua-birthday/#party |
| 祝福島 | https://richman-yi.github.io/shuhua-birthday/wall.html |
| 倉庫 | https://github.com/RichMan-Yi/shuhua-birthday |
| 部署紀錄 | https://github.com/RichMan-Yi/shuhua-birthday/actions |

線上版只有遊戲和祝福島；模型檢視頁（viewer.html）需要本機的參考圖，只能用本機伺服器開。

## 先啟動本機伺服器

在專案資料夾執行：

```sh
python3 tools/serve.py 8000
```

這個伺服器會告訴瀏覽器不要快取，改完程式重新整理就能看到最新版。Mac 重開機或關掉終端機後要重新執行。

- **電腦**：用下面的 `localhost` 網址。
- **手機**（要和 Mac 連同一個網路）：把 `localhost` 換成 Mac 的 IP。目前是 `172.20.10.4`，換網路後會變，可以用 `ipconfig getifaddr en0` 查。

## 電腦上用手機比例測試

電腦打開遊戲會自動用手機比例的直式框顯示（見 [level-framework.md](docs/specs/level-framework.md)），所以在 Mac 上用 `localhost` 就能先看到手機版的畫面，不用每次推上 GitHub。

- 想用整個視窗看：網址加 `?full`，例如 http://localhost:8000/?full#dev

## 測試時先開開發者模式

| 動作 | 電腦 | 手機 |
|---|---|---|
| 開啟開發者模式（會記住） | http://localhost:8000/#dev | http://172.20.10.4:8000/#dev |
| 關閉開發者模式 | http://localhost:8000/#nodev | http://172.20.10.4:8000/#nodev |

開啟後，地圖右下角有工具列：
- **重置進度**：一鍵回到剛開始。
- **全部通關**：五關都蓋章並填入示範成績，用來測生日派對和送出祝福。
- **天色 ◀ ▶**：預覽 7 個天色階段。
- 已過關的關卡也可以再玩。

## 遊戲

| 頁面 | 電腦 | 手機 |
|---|---|---|
| 遊戲（桃園地圖） | http://localhost:8000/ | http://172.20.10.4:8000/ |
| 大溪老街・豆干記憶大考驗 | http://localhost:8000/#game-daxi | http://172.20.10.4:8000/#game-daxi |
| 拉拉山・接水蜜桃 | http://localhost:8000/#game-lalashan | http://172.20.10.4:8000/#game-lalashan |
| 石門水庫・划船大冒險 | http://localhost:8000/#game-shimen | http://172.20.10.4:8000/#game-shimen |
| Xpark・海洋生物找找看 | http://localhost:8000/#game-xpark | http://172.20.10.4:8000/#game-xpark |
| 桃園觀光夜市・夜市限時點餐 | http://localhost:8000/#game-night | http://172.20.10.4:8000/#game-night |
| 生日派對（結局） | http://localhost:8000/#party | http://172.20.10.4:8000/#party |

- 直接開關卡的網址，**只對還沒過關的關卡有效**（開發者模式下不受限制）。
- 開關卡網址之後如果畫面停在地圖，請重新整理一次（網址的 `#` 改變時，頁面不會自己重新載入）。

## 祝福島

| 頁面 | 電腦 | 手機 |
|---|---|---|
| 祝福島（夜晚星空＋手寫紙條） | http://localhost:8000/wall.html | http://172.20.10.4:8000/wall.html |
| 祝福島，先冒出自己的祝福 | http://localhost:8000/wall.html#me | http://172.20.10.4:8000/wall.html#me |
| 祝福島，開啟開發模式（看 1,268 位模擬玩家） | http://localhost:8000/wall.html#dev | http://172.20.10.4:8000/wall.html#dev |
| 祝福島，關閉開發模式（只看真實的祝福） | http://localhost:8000/wall.html#nodev | http://172.20.10.4:8000/wall.html#nodev |

開發模式和遊戲共用同一個開關：在遊戲開 `#dev`，祝福島也會變成開發模式，反之亦然。

自己的祝福要先在遊戲裡五關通關、送出祝福後才會出現。

## 小狼模型檢視

| 頁面 | 電腦 | 手機 |
|---|---|---|
| 模型檢視 | http://localhost:8000/viewer.html | http://172.20.10.4:8000/viewer.html |
| 正面疊圖比對 | http://localhost:8000/viewer.html#compare | http://172.20.10.4:8000/viewer.html#compare |
| 調整面板 | http://localhost:8000/viewer.html#tune | http://172.20.10.4:8000/viewer.html#tune |
| 正面 | http://localhost:8000/viewer.html#front | http://172.20.10.4:8000/viewer.html#front |
| 斜側 | http://localhost:8000/viewer.html#three | http://172.20.10.4:8000/viewer.html#three |
| 側面 | http://localhost:8000/viewer.html#side | http://172.20.10.4:8000/viewer.html#side |
| 另一側 | http://localhost:8000/viewer.html#other | http://172.20.10.4:8000/viewer.html#other |
| 背面 | http://localhost:8000/viewer.html#back | http://172.20.10.4:8000/viewer.html#back |
| 俯視 | http://localhost:8000/viewer.html#top | http://172.20.10.4:8000/viewer.html#top |

## 線上版（不用開伺服器）

- 遊戲：https://claude.ai/artifact/QYJXye1pnNLhmd1HVUZThZ

這是私人連結，要登入你的 claude.ai 帳號才能開，手機也可以。線上版只有遊戲本體和祝福島；模型檢視頁沒有放上去。

## 文件

| 文件 | 內容 |
|---|---|
| [README.md](README.md) | 專案說明、執行方式、檔案結構 |
| [GAME_FLOW.md](GAME_FLOW.md) | 玩家視角的遊戲流程 |
| [docs/game-flow.svg](docs/game-flow.svg) | 流程圖 |
| [docs/specs/README.md](docs/specs/README.md) | 規格文件索引 |
| [docs/specs/map.md](docs/specs/map.md) | 3D 地圖、天色 7 階段 |
| [docs/specs/character.md](docs/specs/character.md) | 小狼角色、模型檢視與調整工具 |
| [docs/specs/level-framework.md](docs/specs/level-framework.md) | 關卡共用外殼 |
| [docs/specs/scoring.md](docs/specs/scoring.md) | 計分與總分 |
| [docs/specs/levels/daxi.md](docs/specs/levels/daxi.md) | 大溪老街・豆干記憶大考驗 |
| [docs/specs/levels/lalashan.md](docs/specs/levels/lalashan.md) | 拉拉山・接水蜜桃 |
| [docs/specs/levels/shimen.md](docs/specs/levels/shimen.md) | 石門水庫・划船大冒險 |
| [docs/specs/levels/xpark.md](docs/specs/levels/xpark.md) | Xpark・海洋生物找找看 |
| [docs/specs/levels/night.md](docs/specs/levels/night.md) | 桃園觀光夜市・夜市限時點餐 |
| [docs/specs/progression.md](docs/specs/progression.md) | 通關流程、存檔、送出祝福、重置 |
| [docs/specs/ending.md](docs/specs/ending.md) | 生日派對 |
| [docs/specs/wish-wall.md](docs/specs/wish-wall.md) | 祝福島 |

## 參考圖

| 檔案 | 內容 |
|---|---|
| [ref/3d/3d1.png](ref/3d/3d1.png) | 正面（模型的權威參考） |
| [ref/3d/3d2.png](ref/3d/3d2.png) | 側面 |
| [ref/3d/3d3.png](ref/3d/3d3.png) | 四面圖 |
| [ref/3d/3d4.png](ref/3d/3d4.png) | 斜側 |
| [ref/01_wolf.png](ref/01_wolf.png) | 原始 2D 圖 |
