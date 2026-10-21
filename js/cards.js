/********************************************************************
 * LAYER 1: CARD REGISTRY, MULTI-THEME PACK (144 CARDS) & WEB AUDIO (js/cards.js)
 * Supports live switching between:
 *  - 'DEMON_CASTLE': 🏰 深淵魔王城 (Embedded 2:3 Full Card Art)
 *  - 'CLASSIC_BURN_RATE': 💼 原版 Burn Rate 矽谷新創商戰 (Dynamic CSS Cards)
 ********************************************************************/

let activeThemeId = (function() {
  try {
    return window.localStorage.getItem('dbr_v13_theme_id') || 'CLASSIC_BURN_RATE';
  } catch (e) {
    return 'CLASSIC_BURN_RATE';
  }
})();

const THEME_PACKS = {
  DEMON_CASTLE: {
    id: 'DEMON_CASTLE',
    label: '🏰 深淵魔王城 (奇幻插畫版)',
    shortLabel: '🏰 深淵魔王城',
    useFullCardArt: true,
    terms: {
      appTitle: '深淵魔王城：燒魔率爭霸戰',
      shortTitle: '深淵魔王城',
      appIcon: '🏰',
      subtitle: '招募四大部門魔界精英、轉嫁討伐危機，成為最後不破產的深淵霸主！',
      lordTitle: '魔王尊號',
      defaultPlayerName: '深淵領主',
      aiNames: ['傲慢魔王・貝爾', '鮮血女王・莉莉絲', '深淵暴君・阿薩謝爾'],
      currencyName: '魔晶',
      currencyIcon: '💎',
      burnName: '燒魔',
      burnUnit: '魔力供品',
      vpName: '皇室',
      vpIcon: '👑',
      mgrName: '主管',
      empName: '部下',
      engName: '苦工',
      engFull: '哥布林苦工',
      engIcon: '⚒️',
      crisisName: '危機',
      crisisFull: '討伐危機',
      crisisIcon: '⚠️',
      outName: '外包',
      outFull: '高利貸外包傭兵',
      outIcon: '👹',
      jobBankTitle: '🏛️ 公共魔界人才池（點擊頂牌展開大卡檢視）',
      jobBankModalTitle: '🏛️ 中央魔界人才池（四大部門翻開頂牌）',
      jobBankModalSub: '打出「契約召喚」或「強塞魔物」時可選取此處翻開的部下。',
      handTitle: '✋ 法術手牌',
      emptySlotTitle: '缺工空城 (0級)',
      emptySlotSub: '無主管駐守，檢定視為 0 級',
      settleBtnText: '⏭️ 結束出牌 ➔ 發薪'
    },
    depts: {
      RED:    { name: '防禦鍊金部', short: '防禦', icon: '⚗️' },
      YELLOW: { name: '黑魔法情報部', short: '黑魔', icon: '📜' },
      BLUE:   { name: '魔物召喚祭壇', short: '召喚', icon: '🌀' },
      GREEN:  { name: '掠奪金庫部', short: '金庫', icon: '💎' },
      PURPLE: { name: '皇室專屬法則', short: '皇室', icon: '👑' }
    },
    employees: {
      E_R_VP3:     { title: '煉獄魔龍大公', subTitle: '防禦皇室 (3級/$2)', svg: '🐉' },
      E_R_VP2:     { title: '血族鍊金侯爵', subTitle: '防禦皇室 (2級/$2)', svg: '🧛' },
      E_R_VP0:     { title: '傲嬌幼龍皇子', subTitle: '廢柴皇室 (0級/$2)', svg: '🐣' },
      E_R_M1:      { title: '機關鍊金術師', subTitle: '防禦主管 (1級/$1)', svg: '🧙‍♂️' },
      E_R_ENG:     { title: '哥布林苦工',   subTitle: '基層苦工 (抵1危機/$1)', svg: '⚒️' },
      E_Y_VP1:     { title: '怠惰魅魔公主', subTitle: '黑魔皇室 (1級/$2)', svg: '😈' },
      E_Y_VP0:     { title: '夢遊死靈皇孫', subTitle: '廢柴皇室 (0級/$2)', svg: '💀' },
      E_Y_M2:      { title: '暗影雙面間諜', subTitle: '黑魔主管 (2級/$1)', svg: '🥷' },
      E_Y_M1:      { title: '黑魔法傳令官', subTitle: '黑魔主管 (1級/$1)', svg: '🦇' },
      E_B_VP3:     { title: '深淵契約大主教', subTitle: '召喚皇室 (3級/$2)', svg: '👁️' },
      E_B_VP2:     { title: '墮落天使親王', subTitle: '召喚皇室 (2級/$2)', svg: '🪽' },
      E_B_M2:      { title: '高階召喚導師', subTitle: '召喚主管 (2級/$1)', svg: '🔮' },
      E_B_M1:      { title: '祭壇契約法師', subTitle: '召喚主管 (1級/$1)', svg: '🕯️' },
      E_G_VP3:     { title: '貪婪黃金巨龍', subTitle: '金庫皇室 (3級/$2)', svg: '🐲' },
      E_G_VP2:     { title: '冥界稅務公爵', subTitle: '金庫皇室 (2級/$2)', svg: '⚖️' },
      E_G_VP2_LOW: { title: '節儉妖精女王', subTitle: '低薪皇室 (2級/$1)', svg: '🧚‍♀️' },
      E_G_M1:      { title: '地精金庫帳房', subTitle: '金庫主管 (1級/$1)', svg: '🪙' }
    },
    actions: {
      FUND_5:  { title: '搜刮貢品 +5',  subTitle: '原版：資金 +5',  desc: '將 5 顆魔晶石加到你的金庫。', svg: '💰' },
      FUND_10: { title: '地下城收稅 +10', subTitle: '原版：資金 +10', desc: '將 10 顆魔晶石加到你的金庫。', svg: '💎' },
      FUND_15: { title: '掠奪商隊 +15', subTitle: '原版：資金 +15', desc: '將 15 顆魔晶石加到你的金庫。', svg: '👑' },
      FUND_20: { title: '點石成金 +20', subTitle: '原版：資金 +20', desc: '將 20 顆魔晶石加到你的金庫。', svg: '🌟' },
      RELEASE: { title: '鎮壓危機',     subTitle: '原版：解放',     desc: '將你魔王城內的 1 個討伐危機移除至棄牌堆。', svg: '🍾' },
      FIRE:    { title: '獻祭遣散',     subTitle: '原版：解僱',     desc: '將自己 1 名部下放回牌庫底。*皇室需 2 張。', svg: '🚪' },
      HIRE:    { title: '契約召喚',     subTitle: '原版：聘僱',     desc: '從中央魔界人才池召喚 1 名翻開部下。', svg: '🤝' },
      POACH:   { title: '魅惑挖角',     subTitle: '原版：網羅',     desc: '從對手挖角 1 名部下。*挖角皇室須用 2 張。', svg: '🕸️' },
      FHIRE:   { title: '強塞魔物',     subTitle: '原版：爛聘僱',   desc: '強制對手從中央人才池召喚 1 名指定部下。', svg: '🪤' },
      IDEA_1:  { title: '討伐危機 ×1',  subTitle: '爛點子 ×1',      desc: '冒險者小隊闖入：需 1 名苦工應付。', svg: '⚔️' },
      IDEA_2:  { title: '討伐危機 ×2',  subTitle: '爛點子 ×2',      desc: '聖騎士巡邏隊：需 2 名苦工應付。', svg: '🛡️' },
      IDEA_3:  { title: '討伐危機 ×3',  subTitle: '爛點子 ×3',      desc: '皇家大法師轟炸：需 3 名苦工應付。', svg: '☄️' },
      IDEA_4:  { title: '討伐危機 ×4',  subTitle: '爛點子 ×4',      desc: '傳說勇者討伐團：需 4 名苦工應付。', svg: '⚡' },
      VP_CONFLICT: { title: '皇族內鬨',     subTitle: '意見衝突 (≥2皇室)', desc: '需≥2名皇室：放逐對手 1 名皇室回牌庫底。', svg: '⚡' },
      VP_PASTURE:  { title: '發配邊疆',     subTitle: '放牛吃草 (≥3皇室)', desc: '需≥3名皇室：放逐對手 1 名皇室回牌庫底。', svg: '🌪️' },
      VP_DOUBLE:   { title: '魔界工會暴動', subTitle: '新營運計劃 (≥3皇室)', desc: '需≥3名皇室：對手下回合支付雙倍總供品！', svg: '🔥' },
      VP_LAYOFF:   { title: '血祭大掃除',   subTitle: '裁員 (≥2皇室)',     desc: '需≥2名皇室：遣散任意自家部下(保留≥2皇室)。', svg: '🩸' }
    }
  },

  CLASSIC_BURN_RATE: {
    id: 'CLASSIC_BURN_RATE',
    label: '💼 原版 Burn Rate (矽谷新創動態CSS版)',
    shortLabel: '💼 原版 Burn Rate',
    useFullCardArt: false,
    terms: {
      appTitle: 'Burn Rate：矽谷新創燒錢爭霸戰',
      shortTitle: 'Burn Rate 燒錢戰',
      appIcon: '💼',
      subtitle: '經營四大企業部門、高薪挖角人才、把爛點子塞給對手，撐到最後不破產！',
      lordTitle: '執行長(CEO)名號',
      defaultPlayerName: '新創執行長',
      aiNames: ['獨角獸創辦人・馬克', '華爾街女王・薇薇安', '矽谷狂人・伊隆'],
      currencyName: '資金',
      currencyIcon: '💵',
      burnName: '燒錢',
      burnUnit: '營運薪資',
      vpName: '副總',
      vpIcon: '👔',
      mgrName: '經理',
      empName: '員工',
      engName: '工程師',
      engFull: '軟體工程師',
      engIcon: '👨‍💻',
      crisisName: '爛點子',
      crisisFull: '爛點子專案',
      crisisIcon: '💥',
      outName: '外包',
      outFull: '高價外包顧問',
      outIcon: '💸',
      jobBankTitle: '🏢 公共人力銀行（點擊頂牌檢視應徵者）',
      jobBankModalTitle: '🏢 中央人力銀行（四大部門翻開應徵者）',
      jobBankModalSub: '打出「正式聘僱」或「爛聘僱」時可選取此處翻開的員工。',
      handTitle: '📁 商業行動手牌',
      emptySlotTitle: '部門懸缺 (0級)',
      emptySlotSub: '無主管駐守，檢定視為 0 級',
      settleBtnText: '⏭️ 結束出牌 ➔ 發薪結算'
    },
    depts: {
      RED:    { name: '研發工程部', short: '研發', icon: '💻' },
      YELLOW: { name: '業務行銷部', short: '業務', icon: '📢' },
      BLUE:   { name: '人力資源部', short: '人資', icon: '🤝' },
      GREEN:  { name: '財務融資部', short: '財務', icon: '📈' },
      PURPLE: { name: '董事會高層', short: '副總', icon: '👔' }
    },
    employees: {
      E_R_VP3:     { title: '王牌研發副總', subTitle: 'VP of Development', svg: '💻' },
      E_R_VP2:     { title: '資深研發副總', subTitle: 'VP of Development', svg: '🖥️' },
      E_R_VP0:     { title: '外行空降副總', subTitle: '0級庸才副總 (鎖死0級)', svg: '🤡' },
      E_R_M1:      { title: '系統研發經理', subTitle: 'Development Manager', svg: '⚙️' },
      E_R_ENG:     { title: '軟體工程師',   subTitle: 'Engineer (抵1爛點子)', svg: '👨‍💻' },
      E_Y_VP1:     { title: '公關業務副總', subTitle: 'VP of Sales', svg: '📣' },
      E_Y_VP0:     { title: '嘴砲業務副總', subTitle: '0級庸才副總 (鎖死0級)', svg: '🫧' },
      E_Y_M2:      { title: '王牌業務總監', subTitle: 'Senior Sales Manager', svg: '🎯' },
      E_Y_M1:      { title: '專案業務經理', subTitle: 'Sales Manager', svg: '📊' },
      E_B_VP3:     { title: '人資執行副總', subTitle: 'VP of Human Resources', svg: '🏛️' },
      E_B_VP2:     { title: '資深人資副總', subTitle: 'VP of Human Resources', svg: '📋' },
      E_B_M2:      { title: '首席獵頭總監', subTitle: 'Senior HR Manager', svg: '🕵️' },
      E_B_M1:      { title: '招募人資經理', subTitle: 'HR Manager', svg: '🤝' },
      E_G_VP3:     { title: '首席財務副總', subTitle: 'VP of Finance (CFO)', svg: '🏦' },
      E_G_VP2:     { title: '資本營運副總', subTitle: 'VP of Finance', svg: '⚖️' },
      E_G_VP2_LOW: { title: '節流財務副總', subTitle: '低薪副總 (2級/僅$1!)', svg: '🧮' },
      E_G_M1:      { title: '企業財務經理', subTitle: 'Finance Manager', svg: '💹' }
    },
    actions: {
      FUND_5:  { title: '天使輪注資 +5',  subTitle: 'Funding +5',  desc: '獲得創投 5 百萬美元營運資金。', svg: '💵' },
      FUND_10: { title: 'A輪創投融資 +10', subTitle: 'Funding +10', desc: '完成 A 輪融資，公司增加 10 百萬資金。', svg: '💰' },
      FUND_15: { title: 'B輪策略增資 +15', subTitle: 'Funding +15', desc: '完成 B 輪增資，公司增加 15 百萬資金。', svg: '🏦' },
      FUND_20: { title: 'IPO 募資進帳 +20', subTitle: 'Funding +20', desc: '資本市場重磅注資，增加 20 百萬資金。', svg: '🚀' },
      RELEASE: { title: '專案結案 (解放)', subTitle: 'Release',     desc: '終止並移除自己公司內的 1 個「爛點子專案」。', svg: '✅' },
      FIRE:    { title: '資遣解僱',       subTitle: 'Fire',        desc: '將自己 1 名員工放回牌庫底。*解僱副總需 2 張。', svg: '📦' },
      HIRE:    { title: '正式聘僱',       subTitle: 'Hire',        desc: '從中央人力銀行聘用 1 名翻開的應徵者。', svg: '🤝' },
      POACH:   { title: '高薪挖角 (網羅)', subTitle: 'Poach',       desc: '從對手公司挖角 1 名員工。*挖角副總需 2 張。', svg: '🎣' },
      FHIRE:   { title: '塞人關說 (爛聘僱)', subTitle: 'Bad Hire',  desc: '強制對手從人力銀行聘用 1 名指定應徵者。', svg: '🪤' },
      IDEA_1:  { title: '爛點子專案 ×1',  subTitle: 'Bad Idea ×1', desc: '高層突發奇想：需 1 名工程師維護。', svg: '💣' },
      IDEA_2:  { title: '爛點子專案 ×2',  subTitle: 'Bad Idea ×2', desc: '盲目跟風轉型：需 2 名工程師維護。', svg: '💣' },
      IDEA_3:  { title: '爛點子專案 ×3',  subTitle: 'Bad Idea ×3', desc: '強行重寫底層：需 3 名工程師維護。', svg: '🚨' },
      IDEA_4:  { title: '爛點子專案 ×4',  subTitle: 'Bad Idea ×4', desc: '失控元宇宙大餅：需 4 名工程師維護。', svg: '☢️' },
      VP_CONFLICT: { title: '意見衝突',   subTitle: '需 ≥2 名副總', desc: '需≥2名副總：逼退對手 1 名副總回牌庫底。', svg: '⚡' },
      VP_PASTURE:  { title: '放牛吃草',   subTitle: '需 ≥3 名副總', desc: '需≥3名副總：將對手 1 名副總冷凍回牌庫底。', svg: '🏌️' },
      VP_DOUBLE:   { title: '新營運計劃', subTitle: '需 ≥3 名副總', desc: '需≥3名副總：對手下回合支付雙倍總薪資 (×2)！', svg: '📉' },
      VP_LAYOFF:   { title: '大裁員重組', subTitle: '需 ≥2 名副總', desc: '需≥2名副總：資遣任意自家員工 (保留≥2副總)。', svg: '✂️' }
    }
  }
};

function getActiveTheme() {
  return THEME_PACKS[activeThemeId] || THEME_PACKS.CLASSIC_BURN_RATE;
}

function getThemeTerms() {
  return getActiveTheme().terms;
}

const DEPT_META = {
  RED:    { id: 'RED',    name: '研發工程部', short: '研發', origName: '研發部', color: 'bg-red-700',    border: 'border-red-500',    badgeBg: 'bg-red-900',    panelBg: 'bg-red-950/60',    text: 'text-red-300',    icon: '💻' },
  YELLOW: { id: 'YELLOW', name: '業務行銷部', short: '業務', origName: '業務部', color: 'bg-amber-600',  border: 'border-amber-400',  badgeBg: 'bg-amber-900',  panelBg: 'bg-amber-950/60',  text: 'text-amber-300',  icon: '📢' },
  BLUE:   { id: 'BLUE',   name: '人力資源部', short: '人資', origName: '人資部', color: 'bg-blue-700',   border: 'border-blue-400',   badgeBg: 'bg-blue-900',   panelBg: 'bg-blue-950/60',   text: 'text-blue-300',   icon: '🤝' },
  GREEN:  { id: 'GREEN',  name: '財務融資部', short: '財務', origName: '財務部', color: 'bg-emerald-700',border: 'border-emerald-400',badgeBg: 'bg-emerald-900',panelBg: 'bg-emerald-950/60',text: 'text-emerald-300',icon: '📈' },
  PURPLE: { id: 'PURPLE', name: '董事會高層', short: '副總', origName: '特殊卡', color: 'bg-purple-800', border: 'border-purple-400', badgeBg: 'bg-purple-950', panelBg: 'bg-purple-950/80', text: 'text-purple-300', icon: '👔' }
};

const EMPLOYEE_RECIPES = [
  { tplId: 'E_R_VP3', dept: 'RED', role: 'VP', isVP: true,  skill: 3, salary: 2, count: 1, title: '煉獄魔龍大公', origTitle: '研發副總 (3級/$2)', svg: '🐉' },
  { tplId: 'E_R_VP2', dept: 'RED', role: 'VP', isVP: true,  skill: 2, salary: 2, count: 1, title: '血族鍊金侯爵', origTitle: '研發副總 (2級/$2)', svg: '🧛' },
  { tplId: 'E_R_VP0', dept: 'RED', role: 'VP', isVP: true,  skill: 0, salary: 2, count: 1, title: '傲嬌幼龍皇子', origTitle: '研發副總 (0級/$2)', svg: '🐣' },
  { tplId: 'E_R_M1',  dept: 'RED', role: 'MANAGER', isVP: false, skill: 1, salary: 1, count: 3, title: '機關鍊金術師', origTitle: '研發經理 (1級/$1)', svg: '🧙‍♂️' },
  { tplId: 'E_R_ENG', dept: 'RED', role: 'ENGINEER',isVP: false, skill: null, salary: 1, count: 10, title: '哥布林苦工', origTitle: '工程師 (無技能/$1)', svg: '⚒️' },
  { tplId: 'E_Y_VP1', dept: 'YELLOW', role: 'VP', isVP: true,  skill: 1, salary: 2, count: 2, title: '怠惰魅魔公主', origTitle: '業務副總 (1級/$2)', svg: '😈' },
  { tplId: 'E_Y_VP0', dept: 'YELLOW', role: 'VP', isVP: true,  skill: 0, salary: 2, count: 1, title: '夢遊死靈皇孫', origTitle: '業務副總 (0級/$2)', svg: '💀' },
  { tplId: 'E_Y_M2',  dept: 'YELLOW', role: 'MANAGER', isVP: false, skill: 2, salary: 1, count: 2, title: '暗影雙面間諜', origTitle: '業務經理 (2級/$1)', svg: '🥷' },
  { tplId: 'E_Y_M1',  dept: 'YELLOW', role: 'MANAGER', isVP: false, skill: 1, salary: 1, count: 3, title: '黑魔法傳令官', origTitle: '業務經理 (1級/$1)', svg: '🦇' },
  { tplId: 'E_B_VP3', dept: 'BLUE', role: 'VP', isVP: true,  skill: 3, salary: 2, count: 1, title: '深淵契約大主教', origTitle: '人資副總 (3級/$2)', svg: '👁️' },
  { tplId: 'E_B_VP2', dept: 'BLUE', role: 'VP', isVP: true,  skill: 2, salary: 2, count: 2, title: '墮落天使親王', origTitle: '人資副總 (2級/$2)', svg: '🪽' },
  { tplId: 'E_B_M2',  dept: 'BLUE', role: 'MANAGER', isVP: false, skill: 2, salary: 1, count: 1, title: '高階召喚導師', origTitle: '人資經理 (2級/$1)', svg: '🔮' },
  { tplId: 'E_B_M1',  dept: 'BLUE', role: 'MANAGER', isVP: false, skill: 1, salary: 1, count: 4, title: '祭壇契約法師', origTitle: '人資經理 (1級/$1)', svg: '🕯️' },
  { tplId: 'E_G_VP3', dept: 'GREEN', role: 'VP', isVP: true,  skill: 3, salary: 2, count: 1, title: '貪婪黃金巨龍', origTitle: '財務副總 (3級/$2)', svg: '🐲' },
  { tplId: 'E_G_VP2', dept: 'GREEN', role: 'VP', isVP: true,  skill: 2, salary: 2, count: 1, title: '冥界稅務公爵', origTitle: '財務副總 (2級/$2)', svg: '⚖️' },
  { tplId: 'E_G_VP2_LOW', dept: 'GREEN', role: 'VP', isVP: true, skill: 2, salary: 1, count: 1, title: '節儉妖精女王', origTitle: '財務副總 (2級/$1 低薪!)', svg: '🧚‍♀️' },
  { tplId: 'E_G_M1',  dept: 'GREEN', role: 'MANAGER', isVP: false, skill: 1, salary: 1, count: 5, title: '地精金庫帳房', origTitle: '財務經理 (1級/$1)', svg: '🪙' }
];

const ACTION_RECIPES = [
  { tplId: 'A_FUND_0123_5',  actGroup: 'FUND_5',  dept: 'GREEN', category: 'DEFENSE', effect: 'GAIN_FUNDS', reqSkills: [0,1,2,3], val: 5,  count: 3, title: '搜刮貢品 +5',  origTitle: '資金 +5',  desc: '將 5 顆魔晶石加到你的金庫。', svg: '💰' },
  { tplId: 'A_FUND_0123_10', actGroup: 'FUND_10', dept: 'GREEN', category: 'DEFENSE', effect: 'GAIN_FUNDS', reqSkills: [0,1,2,3], val: 10, count: 2, title: '地下城收稅 +10', origTitle: '資金 +10', desc: '將 10 顆魔晶石加到你的金庫。', svg: '💎' },
  { tplId: 'A_FUND_123_5',   actGroup: 'FUND_5',  dept: 'GREEN', category: 'DEFENSE', effect: 'GAIN_FUNDS', reqSkills: [1,2,3],   val: 5,  count: 3, title: '搜刮貢品 +5',  origTitle: '資金 +5',  desc: '將 5 顆魔晶石加到你的金庫。', svg: '💰' },
  { tplId: 'A_FUND_123_10',  actGroup: 'FUND_10', dept: 'GREEN', category: 'DEFENSE', effect: 'GAIN_FUNDS', reqSkills: [1,2,3],   val: 10, count: 2, title: '地下城收稅 +10', origTitle: '資金 +10', desc: '將 10 顆魔晶石加到你的金庫。', svg: '💎' },
  { tplId: 'A_FUND_23_5',    actGroup: 'FUND_5',  dept: 'GREEN', category: 'DEFENSE', effect: 'GAIN_FUNDS', reqSkills: [2,3],     val: 5,  count: 2, title: '搜刮貢品 +5',  origTitle: '資金 +5',  desc: '將 5 顆魔晶石加到你的金庫。', svg: '💰' },
  { tplId: 'A_FUND_23_10',   actGroup: 'FUND_10', dept: 'GREEN', category: 'DEFENSE', effect: 'GAIN_FUNDS', reqSkills: [2,3],     val: 10, count: 2, title: '地下城收稅 +10', origTitle: '資金 +10', desc: '將 10 顆魔晶石加到你的金庫。', svg: '💎' },
  { tplId: 'A_FUND_23_15',   actGroup: 'FUND_15', dept: 'GREEN', category: 'DEFENSE', effect: 'GAIN_FUNDS', reqSkills: [2,3],     val: 15, count: 1, title: '掠奪商隊 +15', origTitle: '資金 +15', desc: '將 15 顆魔晶石加到你的金庫。', svg: '👑' },
  { tplId: 'A_FUND_23_20',   actGroup: 'FUND_20', dept: 'GREEN', category: 'DEFENSE', effect: 'GAIN_FUNDS', reqSkills: [2,3],     val: 20, count: 1, title: '點石成金 +20', origTitle: '資金 +20', desc: '將 20 顆魔晶石加到你的金庫。', svg: '🌟' },
  { tplId: 'A_FUND_3_5',     actGroup: 'FUND_5',  dept: 'GREEN', category: 'DEFENSE', effect: 'GAIN_FUNDS', reqSkills: [3],       val: 5,  count: 1, title: '搜刮貢品 +5',  origTitle: '資金 +5',  desc: '將 5 顆魔晶石加到你的金庫。', svg: '💰' },
  { tplId: 'A_FUND_3_10',    actGroup: 'FUND_10', dept: 'GREEN', category: 'DEFENSE', effect: 'GAIN_FUNDS', reqSkills: [3],       val: 10, count: 1, title: '地下城收稅 +10', origTitle: '資金 +10', desc: '將 10 顆魔晶石加到你的金庫。', svg: '💎' },
  { tplId: 'A_FUND_3_15',    actGroup: 'FUND_15', dept: 'GREEN', category: 'DEFENSE', effect: 'GAIN_FUNDS', reqSkills: [3],       val: 15, count: 1, title: '掠奪商隊 +15', origTitle: '資金 +15', desc: '將 15 顆魔晶石加到你的金庫。', svg: '👑' },
  { tplId: 'A_FUND_3_20',    actGroup: 'FUND_20', dept: 'GREEN', category: 'DEFENSE', effect: 'GAIN_FUNDS', reqSkills: [3],       val: 20, count: 1, title: '點石成金 +20', origTitle: '資金 +20', desc: '將 20 顆魔晶石加到你的金庫。', svg: '🌟' },
  { tplId: 'A_REL_0123', actGroup: 'RELEASE', dept: 'RED', category: 'DEFENSE', effect: 'RELEASE_CRISIS', reqSkills: [0,1,2,3], val: 1, count: 5, title: '鎮壓危機', origTitle: '原版：解放', desc: '將你魔王城內的 1 個討伐危機移除至棄牌堆。', svg: '🍾' },
  { tplId: 'A_REL_123',  actGroup: 'RELEASE', dept: 'RED', category: 'DEFENSE', effect: 'RELEASE_CRISIS', reqSkills: [1,2,3],   val: 1, count: 5, title: '鎮壓危機', origTitle: '原版：解放', desc: '將你魔王城內的 1 個討伐危機移除至棄牌堆。', svg: '🍾' },
  { tplId: 'A_REL_23',   actGroup: 'RELEASE', dept: 'RED', category: 'DEFENSE', effect: 'RELEASE_CRISIS', reqSkills: [2,3],     val: 1, count: 3, title: '鎮壓危機', origTitle: '原版：解放', desc: '將你魔王城內的 1 個討伐危機移除至棄牌堆。', svg: '🍾' },
  { tplId: 'A_REL_3',    actGroup: 'RELEASE', dept: 'RED', category: 'DEFENSE', effect: 'RELEASE_CRISIS', reqSkills: [3],       val: 1, count: 3, title: '鎮壓危機', origTitle: '原版：解放', desc: '將你魔王城內的 1 個討伐危機移除至棄牌堆。', svg: '🍾' },
  { tplId: 'A_FIRE_0123', actGroup: 'FIRE', dept: 'BLUE', category: 'DEFENSE', effect: 'FIRE_OWN', reqSkills: [0,1,2,3], val: 1, count: 2, title: '獻祭遣散', origTitle: '原版：解僱', desc: '將自己 1 名部下放回牌庫底。*皇室需 2 張。', svg: '🚪' },
  { tplId: 'A_FIRE_123',  actGroup: 'FIRE', dept: 'BLUE', category: 'DEFENSE', effect: 'FIRE_OWN', reqSkills: [1,2,3],   val: 1, count: 4, title: '獻祭遣散', origTitle: '原版：解僱', desc: '將自己 1 名部下放回牌庫底。*皇室需 2 張。', svg: '🚪' },
  { tplId: 'A_FIRE_23',   actGroup: 'FIRE', dept: 'BLUE', category: 'DEFENSE', effect: 'FIRE_OWN', reqSkills: [2,3],     val: 1, count: 2, title: '獻祭遣散', origTitle: '原版：解僱', desc: '將自己 1 名部下放回牌庫底。*皇室需 2 張。', svg: '🚪' },
  { tplId: 'A_FIRE_3',    actGroup: 'FIRE', dept: 'BLUE', category: 'DEFENSE', effect: 'FIRE_OWN', reqSkills: [3],       val: 1, count: 2, title: '獻祭遣散', origTitle: '原版：解僱', desc: '將自己 1 名部下放回牌庫底。*皇室需 2 張。', svg: '🚪' },
  { tplId: 'A_HIRE_0123', actGroup: 'HIRE', dept: 'BLUE', category: 'DEFENSE', effect: 'HIRE_BANK', reqSkills: [0,1,2,3], val: 1, count: 6, title: '契約召喚', origTitle: '原版：聘僱', desc: '從中央魔界人才池召喚 1 名翻開部下。', svg: '🤝' },
  { tplId: 'A_HIRE_123',  actGroup: 'HIRE', dept: 'BLUE', category: 'DEFENSE', effect: 'HIRE_BANK', reqSkills: [1,2,3],   val: 1, count: 4, title: '契約召喚', origTitle: '原版：聘僱', desc: '從中央魔界人才池召喚 1 名翻開部下。', svg: '🤝' },
  { tplId: 'A_HIRE_23',   actGroup: 'HIRE', dept: 'BLUE', category: 'DEFENSE', effect: 'HIRE_BANK', reqSkills: [2,3],     val: 1, count: 2, title: '契約召喚', origTitle: '原版：聘僱', desc: '從中央魔界人才池召喚 1 名翻開部下。', svg: '🤝' },
  { tplId: 'A_HIRE_3',    actGroup: 'HIRE', dept: 'BLUE', category: 'DEFENSE', effect: 'HIRE_BANK', reqSkills: [3],       val: 1, count: 2, title: '契約召喚', origTitle: '原版：聘僱', desc: '從中央魔界人才池召喚 1 名翻開部下。', svg: '🤝' },
  { tplId: 'A_POACH_0',    actGroup: 'POACH', dept: 'BLUE', category: 'ATTACK', effect: 'POACH_ENEMY', reqSkills: [0],       val: 1, count: 2, title: '魅惑挖角', origTitle: '原版：網羅', desc: '從對手挖角 1 名部下。*挖角皇室須用 2 張。', svg: '🕸️' },
  { tplId: 'A_POACH_01',   actGroup: 'POACH', dept: 'BLUE', category: 'ATTACK', effect: 'POACH_ENEMY', reqSkills: [0,1],     val: 1, count: 2, title: '魅惑挖角', origTitle: '原版：網羅', desc: '從對手挖角 1 名部下。*挖角皇室須用 2 張。', svg: '🕸️' },
  { tplId: 'A_POACH_012',  actGroup: 'POACH', dept: 'BLUE', category: 'ATTACK', effect: 'POACH_ENEMY', reqSkills: [0,1,2],   val: 1, count: 3, title: '魅惑挖角', origTitle: '原版：網羅', desc: '從對手挖角 1 名部下。*挖角皇室須用 2 張。', svg: '🕸️' },
  { tplId: 'A_POACH_0123', actGroup: 'POACH', dept: 'BLUE', category: 'ATTACK', effect: 'POACH_ENEMY', reqSkills: [0,1,2,3], val: 1, count: 2, title: '魅惑挖角', origTitle: '原版：網羅', desc: '從對手挖角 1 名部下。*挖角皇室須用 2 張。', svg: '🕸️' },
  { tplId: 'A_FHIRE_0',    actGroup: 'FHIRE', dept: 'BLUE', category: 'ATTACK', effect: 'FORCE_HIRE', reqSkills: [0],       val: 1, count: 2, title: '強塞魔物', origTitle: '原版：爛聘僱', desc: '強制對手從中央人才池召喚 1 名指定部下。', svg: '🪤' },
  { tplId: 'A_FHIRE_01',   actGroup: 'FHIRE', dept: 'BLUE', category: 'ATTACK', effect: 'FORCE_HIRE', reqSkills: [0,1],     val: 1, count: 3, title: '強塞魔物', origTitle: '原版：爛聘僱', desc: '強制對手從中央人才池召喚 1 名指定部下。', svg: '🪤' },
  { tplId: 'A_FHIRE_012',  actGroup: 'FHIRE', dept: 'BLUE', category: 'ATTACK', effect: 'FORCE_HIRE', reqSkills: [0,1,2],   val: 1, count: 3, title: '強塞魔物', origTitle: '原版：爛聘僱', desc: '強制對手從中央人才池召喚 1 名指定部下。', svg: '🪤' },
  { tplId: 'A_FHIRE_0123', actGroup: 'FHIRE', dept: 'BLUE', category: 'ATTACK', effect: 'FORCE_HIRE', reqSkills: [0,1,2,3], val: 1, count: 2, title: '強塞魔物', origTitle: '原版：爛聘僱', desc: '強制對手從中央人才池召喚 1 名指定部下。', svg: '🪤' },
  { tplId: 'A_IDEA_0_1',    actGroup: 'IDEA_1', dept: 'YELLOW', category: 'CRISIS', effect: 'BAD_IDEA', reqSkills: [0],       val: 1, count: 2, title: '討伐危機 ×1', origTitle: '爛點子 ×1', desc: '菜鳥冒險者闖入：需 1 名苦工應付。', svg: '⚔️' },
  { tplId: 'A_IDEA_0_2',    actGroup: 'IDEA_2', dept: 'YELLOW', category: 'CRISIS', effect: 'BAD_IDEA', reqSkills: [0],       val: 2, count: 2, title: '討伐危機 ×2', origTitle: '爛點子 ×2', desc: '聖騎士巡邏隊：需 2 名苦工應付。', svg: '🛡️' },
  { tplId: 'A_IDEA_0_3',    actGroup: 'IDEA_3', dept: 'YELLOW', category: 'CRISIS', effect: 'BAD_IDEA', reqSkills: [0],       val: 3, count: 1, title: '討伐危機 ×3', origTitle: '爛點子 ×3', desc: '皇家大法師轟炸：需 3 名苦工應付。', svg: '☄️' },
  { tplId: 'A_IDEA_0_4',    actGroup: 'IDEA_4', dept: 'YELLOW', category: 'CRISIS', effect: 'BAD_IDEA', reqSkills: [0],       val: 4, count: 1, title: '討伐危機 ×4', origTitle: '爛點子 ×4', desc: '傳說勇者討伐團：需 4 名苦工應付。', svg: '⚡' },
  { tplId: 'A_IDEA_01_1',   actGroup: 'IDEA_1', dept: 'YELLOW', category: 'CRISIS', effect: 'BAD_IDEA', reqSkills: [0,1],     val: 1, count: 3, title: '討伐危機 ×1', origTitle: '爛點子 ×1', desc: '吟遊詩人造謠：需 1 名苦工應付。', svg: '⚔️' },
  { tplId: 'A_IDEA_01_2',   actGroup: 'IDEA_2', dept: 'YELLOW', category: 'CRISIS', effect: 'BAD_IDEA', reqSkills: [0,1],     val: 2, count: 2, title: '討伐危機 ×2', origTitle: '爛點子 ×2', desc: '矮人盜墓爆破團：需 2 名苦工應付。', svg: '🛡️' },
  { tplId: 'A_IDEA_01_3',   actGroup: 'IDEA_3', dept: 'YELLOW', category: 'CRISIS', effect: 'BAD_IDEA', reqSkills: [0,1],     val: 3, count: 1, title: '討伐危機 ×3', origTitle: '爛點子 ×3', desc: '精靈神射手圍城：需 3 名苦工應付。', svg: '☄️' },
  { tplId: 'A_IDEA_012_1',  actGroup: 'IDEA_1', dept: 'YELLOW', category: 'CRISIS', effect: 'BAD_IDEA', reqSkills: [0,1,2],   val: 1, count: 2, title: '討伐危機 ×1', origTitle: '爛點子 ×1', desc: '賞金獵人潛入：需 1 名苦工應付。', svg: '⚔️' },
  { tplId: 'A_IDEA_012_2',  actGroup: 'IDEA_2', dept: 'YELLOW', category: 'CRISIS', effect: 'BAD_IDEA', reqSkills: [0,1,2],   val: 2, count: 2, title: '討伐危機 ×2', origTitle: '爛點子 ×2', desc: '教廷異端審判庭：需 2 名苦工應付。', svg: '🛡️' },
  { tplId: 'A_IDEA_012_3',  actGroup: 'IDEA_3', dept: 'YELLOW', category: 'CRISIS', effect: 'BAD_IDEA', reqSkills: [0,1,2],   val: 3, count: 1, title: '討伐危機 ×3', origTitle: '爛點子 ×3', desc: '天空龍騎士空襲：需 3 名苦工應付。', svg: '☄️' },
  { tplId: 'A_IDEA_0123_1', actGroup: 'IDEA_1', dept: 'YELLOW', category: 'CRISIS', effect: 'BAD_IDEA', reqSkills: [0,1,2,3], val: 1, count: 2, title: '討伐危機 ×1', origTitle: '爛點子 ×1', desc: '迷路村民誤闖：需 1 名苦工應付。', svg: '⚔️' },
  { tplId: 'A_IDEA_0123_2', actGroup: 'IDEA_2', dept: 'YELLOW', category: 'CRISIS', effect: 'BAD_IDEA', reqSkills: [0,1,2,3], val: 2, count: 2, title: '討伐危機 ×2', origTitle: '爛點子 ×2', desc: '重裝傭兵團突襲：需 2 名苦工應付。', svg: '🛡️' },
  { tplId: 'A_VP_CONFLICT', actGroup: 'VP_CONFLICT', dept: 'PURPLE', category: 'VP_ATTACK',  effect: 'VP_KICK_ENEMY', reqSkills: [], reqVPs: 2, val: 1, count: 1, title: '皇族內鬨',     origTitle: '意見衝突 (≥2副總)', desc: '需≥2名皇室：放逐對手 1 名皇室回牌庫底。', svg: '⚡' },
  { tplId: 'A_VP_PASTURE',  actGroup: 'VP_PASTURE',  dept: 'PURPLE', category: 'VP_ATTACK',  effect: 'VP_KICK_ENEMY', reqSkills: [], reqVPs: 3, val: 1, count: 1, title: '發配邊疆',     origTitle: '放牛吃草 (≥3副總)', desc: '需≥3名皇室：放逐對手 1 名皇室回牌庫底。', svg: '🌪️' },
  { tplId: 'A_VP_DOUBLE',   actGroup: 'VP_DOUBLE',   dept: 'PURPLE', category: 'VP_ATTACK',  effect: 'VP_DOUBLE_PAY', reqSkills: [], reqVPs: 3, val: 2, count: 1, title: '魔界工會暴動', origTitle: '新營運計劃 (≥3副總)', desc: '需≥3名皇室：對手下回合支付雙倍總供品！', svg: '🔥' },
  { tplId: 'A_VP_LAYOFF',   actGroup: 'VP_LAYOFF',   dept: 'PURPLE', category: 'VP_DEFENSE', effect: 'VP_MASS_LAYOFF',reqSkills: [], reqVPs: 2, val: 1, count: 1, title: '血祭大掃除',   origTitle: '裁員 (≥2副總)',     desc: '需≥2名皇室：遣散任意自家部下(保留≥2皇室)。', svg: '🩸' }
];

let CARDS_BY_ID = {};

function applyThemeToRegistry(themeId) {
  if (!THEME_PACKS[themeId]) themeId = 'CLASSIC_BURN_RATE';
  activeThemeId = themeId;
  try {
    window.localStorage.setItem('dbr_v13_theme_id', themeId);
  } catch (e) {}

  const pack = THEME_PACKS[themeId];
  // 1. Update DEPT_META names & icons
  Object.keys(pack.depts).forEach(deptKey => {
    if (DEPT_META[deptKey]) {
      DEPT_META[deptKey].name = pack.depts[deptKey].name;
      DEPT_META[deptKey].short = pack.depts[deptKey].short;
      DEPT_META[deptKey].icon = pack.depts[deptKey].icon;
    }
  });

  // 2. Update EMPLOYEE_RECIPES
  EMPLOYEE_RECIPES.forEach(r => {
    const tEmp = pack.employees[r.tplId];
    if (tEmp) {
      r.title = tEmp.title;
      r.origTitle = tEmp.subTitle;
      r.svg = tEmp.svg;
    }
  });

  // 3. Update ACTION_RECIPES
  ACTION_RECIPES.forEach(r => {
    const tAct = pack.actions[r.actGroup];
    if (tAct) {
      r.title = tAct.title;
      r.origTitle = tAct.subTitle;
      r.desc = tAct.desc;
      r.svg = tAct.svg;
    }
  });

  // 4. Update existing CARDS_BY_ID instances in place
  Object.values(CARDS_BY_ID).forEach(c => {
    if (!c || !c.tplId) return;
    if (c.cardKind === 'EMPLOYEE' && pack.employees[c.tplId]) {
      c.title = pack.employees[c.tplId].title;
      c.origTitle = pack.employees[c.tplId].subTitle;
      c.svg = pack.employees[c.tplId].svg;
    } else if (c.cardKind === 'ACTION' && c.actGroup && pack.actions[c.actGroup]) {
      c.title = pack.actions[c.actGroup].title;
      c.origTitle = pack.actions[c.actGroup].subTitle;
      c.desc = pack.actions[c.actGroup].desc;
      c.svg = pack.actions[c.actGroup].svg;
    }
  });
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function initCardRegistry() {
  applyThemeToRegistry(activeThemeId);
  CARDS_BY_ID = {};
  const jobBank = { RED: [], YELLOW: [], BLUE: [], GREEN: [] };
  const actionDeck = [];
  let empCounter = 1;
  let actCounter = 1;

  EMPLOYEE_RECIPES.forEach(r => {
    for (let i = 0; i < r.count; i++) {
      const uid = `emp_${String(empCounter++).padStart(3, '0')}`;
      CARDS_BY_ID[uid] = { ...r, uid, cardKind: 'EMPLOYEE' };
      jobBank[r.dept].push(uid);
    }
  });

  ACTION_RECIPES.forEach(r => {
    for (let i = 0; i < r.count; i++) {
      const uid = `act_${String(actCounter++).padStart(3, '0')}`;
      CARDS_BY_ID[uid] = { ...r, uid, cardKind: 'ACTION' };
      actionDeck.push(uid);
    }
  });

  CARDS_BY_ID['HIDDEN_ACT'] = {
    uid: 'HIDDEN_ACT',
    tplId: 'HIDDEN_ACT',
    dept: 'PURPLE',
    category: 'DEFENSE',
    effect: 'HIDDEN',
    reqSkills: [],
    val: 0,
    title: '未知手牌',
    origTitle: '迷霧遮罩',
    desc: '對手未公開之手牌。',
    svg: '🎴',
    cardKind: 'ACTION'
  };
  CARDS_BY_ID['HIDDEN_EMP'] = {
    uid: 'HIDDEN_EMP',
    tplId: 'HIDDEN_EMP',
    dept: 'RED',
    role: 'MANAGER',
    isVP: false,
    skill: 0,
    salary: 1,
    title: '未翻開人員',
    origTitle: '迷霧遮罩',
    svg: '🎴',
    cardKind: 'EMPLOYEE'
  };

  window.CARDS_BY_ID = CARDS_BY_ID;
  return { jobBank, actionDeck };
}

function buildAllDecks() {
  const { jobBank, actionDeck } = initCardRegistry();
  return {
    jobBank: {
      RED: shuffleArray(jobBank.RED),
      YELLOW: shuffleArray(jobBank.YELLOW),
      BLUE: shuffleArray(jobBank.BLUE),
      GREEN: shuffleArray(jobBank.GREEN)
    },
    actionDeck: shuffleArray(actionDeck)
  };
}

initCardRegistry();

/********************************************************************
 * WEB AUDIO SYNTHESIZER
 ********************************************************************/
let audioCtx = null;
let isMuted = false;

function playSfx(type) {
  if (isMuted) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    if (type === 'card') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(680, now + 0.09);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'attack') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.22);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      osc.start(now); osc.stop(now + 0.24);
    } else if (type === 'coin') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.setValueAtTime(880, now + 0.07);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.start(now); osc.stop(now + 0.22);
    } else if (type === 'burn') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(190, now);
      osc.frequency.exponentialRampToValueAtTime(75, now + 0.3);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      osc.start(now); osc.stop(now + 0.32);
    }
  } catch (e) {}
}

window.THEME_PACKS = THEME_PACKS;
window.getActiveTheme = getActiveTheme;
window.getThemeTerms = getThemeTerms;
window.applyThemeToRegistry = applyThemeToRegistry;
window.DEPT_META = DEPT_META;
window.EMPLOYEE_RECIPES = EMPLOYEE_RECIPES;
window.ACTION_RECIPES = ACTION_RECIPES;
window.CARDS_BY_ID = CARDS_BY_ID;
window.shuffleArray = shuffleArray;
window.initCardRegistry = initCardRegistry;
window.buildAllDecks = buildAllDecks;
window.playSfx = playSfx;
