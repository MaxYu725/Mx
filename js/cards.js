/********************************************************************
 * LAYER 1: CARD REGISTRY, THEME PACK (144 CARDS) & WEB AUDIO (js/cards.js)
 ********************************************************************/

const DEPT_META = {
  RED:    { id: 'RED',    name: '防禦鍊金部', short: '防禦', origName: '研發部', color: 'bg-red-700',    border: 'border-red-500',    badgeBg: 'bg-red-900',    panelBg: 'bg-red-950/60',    text: 'text-red-300',    icon: '⚗️' },
  YELLOW: { id: 'YELLOW', name: '黑魔法情報部', short: '黑魔', origName: '業務部', color: 'bg-amber-600',  border: 'border-amber-400',  badgeBg: 'bg-amber-900',  panelBg: 'bg-amber-950/60',  text: 'text-amber-300',  icon: '📜' },
  BLUE:   { id: 'BLUE',   name: '魔物召喚祭壇', short: '召喚', origName: '人資部', color: 'bg-blue-700',   border: 'border-blue-400',   badgeBg: 'bg-blue-900',   panelBg: 'bg-blue-950/60',   text: 'text-blue-300',   icon: '🌀' },
  GREEN:  { id: 'GREEN',  name: '掠奪金庫部', short: '金庫', origName: '財務部', color: 'bg-emerald-700',border: 'border-emerald-400',badgeBg: 'bg-emerald-900',panelBg: 'bg-emerald-950/60',text: 'text-emerald-300',icon: '💎' },
  PURPLE: { id: 'PURPLE', name: '皇室專屬法則', short: '皇室', origName: '特殊卡', color: 'bg-purple-800', border: 'border-purple-400', badgeBg: 'bg-purple-950', panelBg: 'bg-purple-950/80', text: 'text-purple-300', icon: '👑' }
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
  { tplId: 'A_FUND_0123_5',  dept: 'GREEN', category: 'DEFENSE', effect: 'GAIN_FUNDS', reqSkills: [0,1,2,3], val: 5,  count: 3, title: '搜刮貢品 +5',  origTitle: '資金 +5',  desc: '將 5 顆魔晶石加到你的金庫。', svg: '💰' },
  { tplId: 'A_FUND_0123_10', dept: 'GREEN', category: 'DEFENSE', effect: 'GAIN_FUNDS', reqSkills: [0,1,2,3], val: 10, count: 2, title: '地下城收稅 +10', origTitle: '資金 +10', desc: '將 10 顆魔晶石加到你的金庫。', svg: '💎' },
  { tplId: 'A_FUND_123_5',   dept: 'GREEN', category: 'DEFENSE', effect: 'GAIN_FUNDS', reqSkills: [1,2,3],   val: 5,  count: 3, title: '搜刮貢品 +5',  origTitle: '資金 +5',  desc: '將 5 顆魔晶石加到你的金庫。', svg: '💰' },
  { tplId: 'A_FUND_123_10',  dept: 'GREEN', category: 'DEFENSE', effect: 'GAIN_FUNDS', reqSkills: [1,2,3],   val: 10, count: 2, title: '地下城收稅 +10', origTitle: '資金 +10', desc: '將 10 顆魔晶石加到你的金庫。', svg: '💎' },
  { tplId: 'A_FUND_23_5',    dept: 'GREEN', category: 'DEFENSE', effect: 'GAIN_FUNDS', reqSkills: [2,3],     val: 5,  count: 2, title: '搜刮貢品 +5',  origTitle: '資金 +5',  desc: '將 5 顆魔晶石加到你的金庫。', svg: '💰' },
  { tplId: 'A_FUND_23_10',   dept: 'GREEN', category: 'DEFENSE', effect: 'GAIN_FUNDS', reqSkills: [2,3],     val: 10, count: 2, title: '地下城收稅 +10', origTitle: '資金 +10', desc: '將 10 顆魔晶石加到你的金庫。', svg: '💎' },
  { tplId: 'A_FUND_23_15',   dept: 'GREEN', category: 'DEFENSE', effect: 'GAIN_FUNDS', reqSkills: [2,3],     val: 15, count: 1, title: '掠奪商隊 +15', origTitle: '資金 +15', desc: '將 15 顆魔晶石加到你的金庫。', svg: '👑' },
  { tplId: 'A_FUND_23_20',   dept: 'GREEN', category: 'DEFENSE', effect: 'GAIN_FUNDS', reqSkills: [2,3],     val: 20, count: 1, title: '點石成金 +20', origTitle: '資金 +20', desc: '將 20 顆魔晶石加到你的金庫。', svg: '🌟' },
  { tplId: 'A_FUND_3_5',     dept: 'GREEN', category: 'DEFENSE', effect: 'GAIN_FUNDS', reqSkills: [3],       val: 5,  count: 1, title: '搜刮貢品 +5',  origTitle: '資金 +5',  desc: '將 5 顆魔晶石加到你的金庫。', svg: '💰' },
  { tplId: 'A_FUND_3_10',    dept: 'GREEN', category: 'DEFENSE', effect: 'GAIN_FUNDS', reqSkills: [3],       val: 10, count: 1, title: '地下城收稅 +10', origTitle: '資金 +10', desc: '將 10 顆魔晶石加到你的金庫。', svg: '💎' },
  { tplId: 'A_FUND_3_15',    dept: 'GREEN', category: 'DEFENSE', effect: 'GAIN_FUNDS', reqSkills: [3],       val: 15, count: 1, title: '掠奪商隊 +15', origTitle: '資金 +15', desc: '將 15 顆魔晶石加到你的金庫。', svg: '👑' },
  { tplId: 'A_FUND_3_20',    dept: 'GREEN', category: 'DEFENSE', effect: 'GAIN_FUNDS', reqSkills: [3],       val: 20, count: 1, title: '點石成金 +20', origTitle: '資金 +20', desc: '將 20 顆魔晶石加到你的金庫。', svg: '🌟' },
  { tplId: 'A_REL_0123', dept: 'RED', category: 'DEFENSE', effect: 'RELEASE_CRISIS', reqSkills: [0,1,2,3], val: 1, count: 5, title: '鎮壓危機', origTitle: '原版：解放', desc: '將你魔王城內的 1 個討伐危機移除至棄牌堆。', svg: '🍾' },
  { tplId: 'A_REL_123',  dept: 'RED', category: 'DEFENSE', effect: 'RELEASE_CRISIS', reqSkills: [1,2,3],   val: 1, count: 5, title: '鎮壓危機', origTitle: '原版：解放', desc: '將你魔王城內的 1 個討伐危機移除至棄牌堆。', svg: '🍾' },
  { tplId: 'A_REL_23',   dept: 'RED', category: 'DEFENSE', effect: 'RELEASE_CRISIS', reqSkills: [2,3],     val: 1, count: 3, title: '鎮壓危機', origTitle: '原版：解放', desc: '將你魔王城內的 1 個討伐危機移除至棄牌堆。', svg: '🍾' },
  { tplId: 'A_REL_3',    dept: 'RED', category: 'DEFENSE', effect: 'RELEASE_CRISIS', reqSkills: [3],       val: 1, count: 3, title: '鎮壓危機', origTitle: '原版：解放', desc: '將你魔王城內的 1 個討伐危機移除至棄牌堆。', svg: '🍾' },
  { tplId: 'A_FIRE_0123', dept: 'BLUE', category: 'DEFENSE', effect: 'FIRE_OWN', reqSkills: [0,1,2,3], val: 1, count: 2, title: '獻祭遣散', origTitle: '原版：解僱', desc: '將自己 1 名部下放回牌庫底。*皇室需 2 張。', svg: '🚪' },
  { tplId: 'A_FIRE_123',  dept: 'BLUE', category: 'DEFENSE', effect: 'FIRE_OWN', reqSkills: [1,2,3],   val: 1, count: 4, title: '獻祭遣散', origTitle: '原版：解僱', desc: '將自己 1 名部下放回牌庫底。*皇室需 2 張。', svg: '🚪' },
  { tplId: 'A_FIRE_23',   dept: 'BLUE', category: 'DEFENSE', effect: 'FIRE_OWN', reqSkills: [2,3],     val: 1, count: 2, title: '獻祭遣散', origTitle: '原版：解僱', desc: '將自己 1 名部下放回牌庫底。*皇室需 2 張。', svg: '🚪' },
  { tplId: 'A_FIRE_3',    dept: 'BLUE', category: 'DEFENSE', effect: 'FIRE_OWN', reqSkills: [3],       val: 1, count: 2, title: '獻祭遣散', origTitle: '原版：解僱', desc: '將自己 1 名部下放回牌庫底。*皇室需 2 張。', svg: '🚪' },
  { tplId: 'A_HIRE_0123', dept: 'BLUE', category: 'DEFENSE', effect: 'HIRE_BANK', reqSkills: [0,1,2,3], val: 1, count: 6, title: '契約召喚', origTitle: '原版：聘僱', desc: '從中央魔界人才池召喚 1 名翻開部下。', svg: '🤝' },
  { tplId: 'A_HIRE_123',  dept: 'BLUE', category: 'DEFENSE', effect: 'HIRE_BANK', reqSkills: [1,2,3],   val: 1, count: 4, title: '契約召喚', origTitle: '原版：聘僱', desc: '從中央魔界人才池召喚 1 名翻開部下。', svg: '🤝' },
  { tplId: 'A_HIRE_23',   dept: 'BLUE', category: 'DEFENSE', effect: 'HIRE_BANK', reqSkills: [2,3],     val: 1, count: 2, title: '契約召喚', origTitle: '原版：聘僱', desc: '從中央魔界人才池召喚 1 名翻開部下。', svg: '🤝' },
  { tplId: 'A_HIRE_3',    dept: 'BLUE', category: 'DEFENSE', effect: 'HIRE_BANK', reqSkills: [3],       val: 1, count: 2, title: '契約召喚', origTitle: '原版：聘僱', desc: '從中央魔界人才池召喚 1 名翻開部下。', svg: '🤝' },
  { tplId: 'A_POACH_0',    dept: 'BLUE', category: 'ATTACK', effect: 'POACH_ENEMY', reqSkills: [0],       val: 1, count: 2, title: '魅惑挖角', origTitle: '原版：網羅', desc: '從對手挖角 1 名部下。*挖角皇室須用 2 張。', svg: '🕸️' },
  { tplId: 'A_POACH_01',   dept: 'BLUE', category: 'ATTACK', effect: 'POACH_ENEMY', reqSkills: [0,1],     val: 1, count: 2, title: '魅惑挖角', origTitle: '原版：網羅', desc: '從對手挖角 1 名部下。*挖角皇室須用 2 張。', svg: '🕸️' },
  { tplId: 'A_POACH_012',  dept: 'BLUE', category: 'ATTACK', effect: 'POACH_ENEMY', reqSkills: [0,1,2],   val: 1, count: 3, title: '魅惑挖角', origTitle: '原版：網羅', desc: '從對手挖角 1 名部下。*挖角皇室須用 2 張。', svg: '🕸️' },
  { tplId: 'A_POACH_0123', dept: 'BLUE', category: 'ATTACK', effect: 'POACH_ENEMY', reqSkills: [0,1,2,3], val: 1, count: 2, title: '魅惑挖角', origTitle: '原版：網羅', desc: '從對手挖角 1 名部下。*挖角皇室須用 2 張。', svg: '🕸️' },
  { tplId: 'A_FHIRE_0',    dept: 'BLUE', category: 'ATTACK', effect: 'FORCE_HIRE', reqSkills: [0],       val: 1, count: 2, title: '強塞魔物', origTitle: '原版：爛聘僱', desc: '強制對手從中央人才池召喚 1 名指定部下。', svg: '🪤' },
  { tplId: 'A_FHIRE_01',   dept: 'BLUE', category: 'ATTACK', effect: 'FORCE_HIRE', reqSkills: [0,1],     val: 1, count: 3, title: '強塞魔物', origTitle: '原版：爛聘僱', desc: '強制對手從中央人才池召喚 1 名指定部下。', svg: '🪤' },
  { tplId: 'A_FHIRE_012',  dept: 'BLUE', category: 'ATTACK', effect: 'FORCE_HIRE', reqSkills: [0,1,2],   val: 1, count: 3, title: '強塞魔物', origTitle: '原版：爛聘僱', desc: '強制對手從中央人才池召喚 1 名指定部下。', svg: '🪤' },
  { tplId: 'A_FHIRE_0123', dept: 'BLUE', category: 'ATTACK', effect: 'FORCE_HIRE', reqSkills: [0,1,2,3], val: 1, count: 2, title: '強塞魔物', origTitle: '原版：爛聘僱', desc: '強制對手從中央人才池召喚 1 名指定部下。', svg: '🪤' },
  { tplId: 'A_IDEA_0_1',    dept: 'YELLOW', category: 'CRISIS', effect: 'BAD_IDEA', reqSkills: [0],       val: 1, count: 2, title: '討伐危機 ×1', origTitle: '爛點子 ×1', desc: '菜鳥冒險者闖入：需 1 名苦工應付。', svg: '⚔️' },
  { tplId: 'A_IDEA_0_2',    dept: 'YELLOW', category: 'CRISIS', effect: 'BAD_IDEA', reqSkills: [0],       val: 2, count: 2, title: '討伐危機 ×2', origTitle: '爛點子 ×2', desc: '聖騎士巡邏隊：需 2 名苦工應付。', svg: '🛡️' },
  { tplId: 'A_IDEA_0_3',    dept: 'YELLOW', category: 'CRISIS', effect: 'BAD_IDEA', reqSkills: [0],       val: 3, count: 1, title: '討伐危機 ×3', origTitle: '爛點子 ×3', desc: '皇家大法師轟炸：需 3 名苦工應付。', svg: '☄️' },
  { tplId: 'A_IDEA_0_4',    dept: 'YELLOW', category: 'CRISIS', effect: 'BAD_IDEA', reqSkills: [0],       val: 4, count: 1, title: '討伐危機 ×4', origTitle: '爛點子 ×4', desc: '傳說勇者討伐團：需 4 名苦工應付。', svg: '⚡' },
  { tplId: 'A_IDEA_01_1',   dept: 'YELLOW', category: 'CRISIS', effect: 'BAD_IDEA', reqSkills: [0,1],     val: 1, count: 3, title: '討伐危機 ×1', origTitle: '爛點子 ×1', desc: '吟遊詩人造謠：需 1 名苦工應付。', svg: '⚔️' },
  { tplId: 'A_IDEA_01_2',   dept: 'YELLOW', category: 'CRISIS', effect: 'BAD_IDEA', reqSkills: [0,1],     val: 2, count: 2, title: '討伐危機 ×2', origTitle: '爛點子 ×2', desc: '矮人盜墓爆破團：需 2 名苦工應付。', svg: '🛡️' },
  { tplId: 'A_IDEA_01_3',   dept: 'YELLOW', category: 'CRISIS', effect: 'BAD_IDEA', reqSkills: [0,1],     val: 3, count: 1, title: '討伐危機 ×3', origTitle: '爛點子 ×3', desc: '精靈神射手圍城：需 3 名苦工應付。', svg: '☄️' },
  { tplId: 'A_IDEA_012_1',  dept: 'YELLOW', category: 'CRISIS', effect: 'BAD_IDEA', reqSkills: [0,1,2],   val: 1, count: 2, title: '討伐危機 ×1', origTitle: '爛點子 ×1', desc: '賞金獵人潛入：需 1 名苦工應付。', svg: '⚔️' },
  { tplId: 'A_IDEA_012_2',  dept: 'YELLOW', category: 'CRISIS', effect: 'BAD_IDEA', reqSkills: [0,1,2],   val: 2, count: 2, title: '討伐危機 ×2', origTitle: '爛點子 ×2', desc: '教廷異端審判庭：需 2 名苦工應付。', svg: '🛡️' },
  { tplId: 'A_IDEA_012_3',  dept: 'YELLOW', category: 'CRISIS', effect: 'BAD_IDEA', reqSkills: [0,1,2],   val: 3, count: 1, title: '討伐危機 ×3', origTitle: '爛點子 ×3', desc: '天空龍騎士空襲：需 3 名苦工應付。', svg: '☄️' },
  { tplId: 'A_IDEA_0123_1', dept: 'YELLOW', category: 'CRISIS', effect: 'BAD_IDEA', reqSkills: [0,1,2,3], val: 1, count: 2, title: '討伐危機 ×1', origTitle: '爛點子 ×1', desc: '迷路村民誤闖：需 1 名苦工應付。', svg: '⚔️' },
  { tplId: 'A_IDEA_0123_2', dept: 'YELLOW', category: 'CRISIS', effect: 'BAD_IDEA', reqSkills: [0,1,2,3], val: 2, count: 2, title: '討伐危機 ×2', origTitle: '爛點子 ×2', desc: '重裝傭兵團突襲：需 2 名苦工應付。', svg: '🛡️' },
  { tplId: 'A_VP_CONFLICT', dept: 'PURPLE', category: 'VP_ATTACK',  effect: 'VP_KICK_ENEMY', reqSkills: [], reqVPs: 2, val: 1, count: 1, title: '皇族內鬨',     origTitle: '意見衝突 (≥2副總)', desc: '需≥2名皇室：放逐對手 1 名皇室回牌庫底。', svg: '⚡' },
  { tplId: 'A_VP_PASTURE',  dept: 'PURPLE', category: 'VP_ATTACK',  effect: 'VP_KICK_ENEMY', reqSkills: [], reqVPs: 3, val: 1, count: 1, title: '發配邊疆',     origTitle: '放牛吃草 (≥3副總)', desc: '需≥3名皇室：放逐對手 1 名皇室回牌庫底。', svg: '🌪️' },
  { tplId: 'A_VP_DOUBLE',   dept: 'PURPLE', category: 'VP_ATTACK',  effect: 'VP_DOUBLE_PAY', reqSkills: [], reqVPs: 3, val: 2, count: 1, title: '魔界工會暴動', origTitle: '新營運計劃 (≥3副總)', desc: '需≥3名皇室：對手下回合支付雙倍總供品！', svg: '🔥' },
  { tplId: 'A_VP_LAYOFF',   dept: 'PURPLE', category: 'VP_DEFENSE', effect: 'VP_MASS_LAYOFF',reqSkills: [], reqVPs: 2, val: 1, count: 1, title: '血祭大掃除',   origTitle: '裁員 (≥2副總)',     desc: '需≥2名皇室：遣散任意自家部下(保留≥2皇室)。', svg: '🩸' }
];

let CARDS_BY_ID = {};

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function initCardRegistry() {
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

  // Register Fog-of-War placeholder cards for masked opponent hands / unflipped decks
  CARDS_BY_ID['HIDDEN_ACT'] = {
    uid: 'HIDDEN_ACT',
    tplId: 'HIDDEN_ACT',
    dept: 'PURPLE',
    category: 'DEFENSE',
    effect: 'HIDDEN',
    reqSkills: [],
    val: 0,
    title: '未知法術卡',
    origTitle: '迷霧遮罩',
    desc: '對手未公開之法術手牌。',
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
    title: '未翻開部下',
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

// Initialize card registry immediately so clients joining a room have CARDS_BY_ID ready
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

window.DEPT_META = DEPT_META;
window.EMPLOYEE_RECIPES = EMPLOYEE_RECIPES;
window.ACTION_RECIPES = ACTION_RECIPES;
window.CARDS_BY_ID = CARDS_BY_ID;
window.shuffleArray = shuffleArray;
window.initCardRegistry = initCardRegistry;
window.buildAllDecks = buildAllDecks;
window.playSfx = playSfx;
