# 深淵魔王城：燒魔率爭霸戰 V13 (Dungeon Burn Rate - Online Multiplayer Modular Edition)

一款將經典策略桌遊《Burn Rate》數碼化並重塑為「深淵魔王城」奇幻世界觀的可連線網頁卡牌對戰遊戲（支援 2–4 人跨裝置房間碼對戰、同機跨分頁連線、同畫面視角切換測試，以及單機智慧 AI 混編對戰）。

## 專案目錄結構（多檔案模組化維護架構）

```text
dungeon-burn-rate-github/
├── index.html          # 遊戲主入口頁面（可直接於瀏覽器打開或部署至 GitHub Pages）
├── css/
│   └── style.css       # V12/V13 手機直屏 5 區戰術佈局、2.5D 透視牌桌、毛玻璃抽屜、7 大戰鬥特效與連線大廳樣式
├── js/
│   ├── art.js          # 獨立拆出的 V12 高清 GPT 內嵌卡面美術與圓形角色頭像庫 (GPT_FULLCARD_ART / GPT_MINI_AVATAR)
│   ├── cards.js        # Layer 1：四大部門與全套 144 張卡牌配方、唯一 uid 字典建構器與 Web Audio 音效合成器
│   ├── engine.js       # Layer 2：純邏輯規則狀態機（部門主管排序、雙卡皇室檢定、動態視角解耦、戰爭迷霧遮罩）
│   ├── session.js      # Layer 3：房主權威 (Host-Authoritative) 連線管理層（PeerJS 跨網房間碼 + BroadcastChannel 跨分頁同步 + 智慧 AI 步進器 + 斷線原碼重連）
│   └── ui.js           # Layer 4：動態第一人稱視角 (P1~P4)、5 區直屏渲染器、連線候戰大廳與全場同步 VFX 廣播接收器
├── README.md           # 專案說明、連線對戰指南與 GitHub Pages 部署步驟（本檔案）
└── SPECIFICATION.md    # 完整遊戲規則、144 張卡牌資料庫與四層式工程規格書
```

## V13 連線對戰功能亮點

1. **雙軌零後端網路架構（PeerJS WebRTC ＋ BroadcastChannel）**：
   - **跨裝置網際網路連線**：透過 PeerJS 建立點對點加密通道，房主開房自動產生 8 碼房間通行碼（如 `AB88QX27`），支援一鍵複製房間碼或邀請連結（`?room=AB88QX27`），完全相容 GitHub Pages 純靜態部署。
   - **同瀏覽器跨分頁零延遲聯調**：內建 `BroadcastChannel` 同步引擎，在無外部網路或本地開發時，只需開啟多個瀏覽器分頁輸入相同房號即可即時連線對戰。
   - **同視窗多人視角切換測試**：房主大廳提供「➕ 同機模擬真人」按鈕，可於單一畫面直接切換 P1～P4 第一人稱視角與手牌。
2. **房主權威狀態機（Host-Authoritative Engine）與全場特效同步**：
   - 所有選牌（`DRAFT_PICK`）、出牌（`PLAY_CARD`）、棄牌（`DISCARD_CARDS`）與回合結算（`END_TURN`）統一由房主驗證後廣播 `STATE_SYNC`，並附帶 `lastVfxEvent` 序號封包，確保全場玩家同步播放指向雷射箭頭、拋物線飛牌、VS 戰術交鋒橫幅、受擊震動與回合交接大橫幅。
3. **動態第一人稱視角（Dynamic Seat Perspective）與戰爭迷霧（Fog of War）**：
   - 解耦單機寫死的 `p1` 視角，無論玩家分配至 `P1`、`P2`、`P3` 或 `P4`，畫面底部永遠呈現自己的主城與法術手牌，頂部座位列則自動依順時鐘順序排列其他對手。
   - 支援開啟「戰爭迷霧」，自動遮罩其他玩家的未公開手牌與未翻開牌庫序列。
4. **真人＋智慧 AI 自由混編與斷線 AI 代打**：
   - 支援 2–4 人任意比例混編（例如 2 位真人玩家 ＋ 1 位智慧 AI）；對局中若真人玩家暫時離線，支援原房間碼無縫重連，房主亦可隨時點擊頂部「🤖AI代打」由 AI 接手出牌。

## 如何部署至 GitHub Pages

1. 在 GitHub 建立一個新的公開儲存庫（Repository），例如命名為 `dungeon-burn-rate`。
2. 將本資料夾內的所有檔案（維持 `index.html`、`css/`、`js/` 資料夾結構）上傳並 Commit 至 `main` 分支。
3. 進入該 GitHub Repository 的 **Settings** ➔ 左側選單點擊 **Pages**。
4. 在 **Build and deployment** 下方的 Branch 選擇 `main` 及 `/(root)`，點擊 **Save**。
5. 等待約 1 分鐘後，即可透過 `https://<你的GitHub帳號>.github.io/dungeon-burn-rate/` 開啟遊戲並分享房間碼與朋友連線對戰！
