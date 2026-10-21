/********************************************************************
 * LAYER 2: PURE GAME ENGINE, PERSPECTIVE HELPERS & FOG-OF-WAR (js/engine.js)
 ********************************************************************/

let gameState = null;
let viewedPlayerId = 'p1';
let uiSelection = {
  mode: 'IDLE', // 'IDLE' | 'MODE_D_SELECT' | 'DISCARD_SELECT'
  sourceCardUid: null,
  step2OpponentId: null,
  discardSet: new Set(),
  layoffSet: new Set()
};

const DEFAULT_AI_NAMES = ['傲慢魔王・貝爾', '鮮血女王・莉莉絲', '深淵暴君・阿薩謝爾'];

// === Dynamic Perspective Helpers (Decouples hardcoded 'p1' / players[0]) ===
function getLocalPlayerId() {
  return (window.gameSession && window.gameSession.localSeatId) ? window.gameSession.localSeatId : 'p1';
}

function getLocalPlayer(state = gameState) {
  if (!state || !state.players) return null;
  const myId = getLocalPlayerId();
  return state.players.find(p => p.id === myId) || state.players[0];
}

function getLocalPlayerIndex(state = gameState) {
  if (!state || !state.players) return 0;
  const myId = getLocalPlayerId();
  const idx = state.players.findIndex(p => p.id === myId);
  return idx >= 0 ? idx : 0;
}

function getClockwiseOpponents(state = gameState) {
  if (!state || !state.players) return [];
  const n = state.players.length;
  const myIdx = getLocalPlayerIndex(state);
  const opps = [];
  for (let offset = 1; offset < n; offset++) {
    opps.push(state.players[(myIdx + offset) % n]);
  }
  return opps;
}

function isLocalPlayerTurn(state = gameState) {
  if (!state || state.phase === 'GAME_OVER') return false;
  const myId = getLocalPlayerId();
  if (state.phase === 'INITIAL_DRAFT') {
    const picker = state.players[state.draft.pickerIndex];
    return Boolean(picker && picker.id === myId && !picker.isAI);
  }
  if (state.phase === 'STEP1_PLAY_OR_DISCARD') {
    const active = state.players[state.turn.activePlayerIndex];
    return Boolean(active && active.id === myId && !active.isAI);
  }
  return false;
}

function getShortPlayerName(name) {
  if (!name) return '魔王';
  return name.includes('・') ? name.split('・')[1] : name.replace(/\s*\(你\)/g, '');
}

// === Initial Game State Builder (Supports Solo AI & Online Hybrid Seats) ===
function createInitialGameState(
  playerCount = 3,
  playDiscardMode = 'STRICT_EITHER',
  quickStart = false,
  customSeats = null,
  fogOfWar = false
) {
  const decks = buildAllDecks();
  const players = [];

  for (let i = 0; i < playerCount; i++) {
    const seatId = `p${i + 1}`;
    const custom = Array.isArray(customSeats) ? customSeats.find(s => s.id === seatId) : null;
    const isAI = custom ? Boolean(custom.isAI) : (i !== 0);
    const tTerms = typeof getThemeTerms === 'function' ? getThemeTerms() : { defaultPlayerName: '深淵領主', aiNames: DEFAULT_AI_NAMES };
    const defaultName = i === 0 ? `${tTerms.defaultPlayerName} (你)` : (tTerms.aiNames[i - 1] || DEFAULT_AI_NAMES[i - 1]);
    players.push({
      id: seatId,
      name: (custom && custom.name) ? custom.name : defaultName,
      isAI,
      isOnlineHuman: custom ? !custom.isAI : (i === 0),
      connected: custom ? (custom.connected !== false) : true,
      isEliminated: false,
      crystals: 100,
      doubleBurnFlag: false,
      departments: { RED: [], YELLOW: [], BLUE: [], GREEN: [] },
      engineers: [],
      crises: [],
      outsourcedCount: 0,
      hand: []
    });
  }

  const state = {
    config: {
      playerCount,
      playDiscardMode,
      fogOfWar: Boolean(fogOfWar),
      themeId: (typeof getActiveTheme === 'function') ? getActiveTheme().id : 'CLASSIC_BURN_RATE'
    },
    phase: quickStart ? 'STEP1_PLAY_OR_DISCARD' : 'INITIAL_DRAFT',
    draft: {
      round: 1,
      pickerIndex: 0,
      totalPicked: 0,
      targetTotal: playerCount * 4
    },
    turn: {
      roundNumber: 1,
      activePlayerIndex: 0,
      actionsUsed: 0,
      maxActions: 4,
      hasPlayedCard: false,
      hasDiscardedCard: false
    },
    jobBank: decks.jobBank,
    actionDeck: decks.actionDeck,
    discardPile: [],
    lastPlayedCard: null,
    players,
    logs: [],
    vfxSeq: 0,
    lastVfxEvent: null
  };

  if (quickStart) {
    const depts = ['RED', 'YELLOW', 'BLUE', 'GREEN'];
    for (let r = 0; r < 4; r++) {
      for (let p = 0; p < playerCount; p++) {
        const pl = state.players[p];
        const availDepts = depts.filter(d => {
          const topUid = state.jobBank[d][0];
          if (!topUid) return false;
          const c = CARDS_BY_ID[topUid];
          return !(c.isVP && hasVPInDept(pl, d));
        });
        const pickDept = availDepts[r % availDepts.length] || availDepts[0];
        if (pickDept) {
          const empUid = state.jobBank[pickDept].shift();
          addEmployeeToPlayer(pl, empUid);
        }
      }
    }
    state.players.forEach(pl => {
      recalcPlayerStats(pl);
      drawCardsForPlayer(state, pl, 6);
    });
    addLog(state, '🏛️ 點擊中央人才池或場上部門卡牌，可放大檢視完整卡面與下屬明細。');
    addLog(state, '⚡ 快速開局完成：點手牌列目標施放；點頂部對手席位彈窗查看敵城！');
  } else {
    addLog(state, '🎲 進入「首輪召喚」階段：請從中央魔界人才池輪流挑選 1 名部下，直到每人召滿 4 名！');
  }

  viewedPlayerId = getLocalPlayerId();
  return state;
}

function recordVfxEvent(state, payload) {
  if (!state) return;
  state.vfxSeq = (state.vfxSeq || 0) + 1;
  state.lastVfxEvent = {
    seq: state.vfxSeq,
    timestamp: Date.now(),
    ...payload
  };
}

function formatLogItemToTickerHTML(rawMsg, isLatest = true) {
  if (!rawMsg) return '';
  const localPl = getLocalPlayer();
  let s = rawMsg;

  if (gameState && gameState.players) {
    gameState.players.forEach((pl, idx) => {
      const escaped = pl.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`【${escaped}】`, 'g');
      const isMe = localPl && pl.id === localPl.id;
      const shortN = getShortPlayerName(pl.name);
      const badgeStyles = [
        'bg-amber-500/20 text-amber-300 font-black',
        'bg-purple-950 text-purple-200 font-bold',
        'bg-rose-950 text-rose-200 font-bold',
        'bg-indigo-950 text-indigo-200 font-bold'
      ];
      const cls = isMe ? 'bg-amber-500/25 text-amber-300 font-black' : badgeStyles[idx % badgeStyles.length];
      const prefix = isMe ? '👑我方' : (pl.isAI ? `😈${shortN}` : `👤${shortN}`);
      s = s.replace(re, `<span class="px-1 rounded ${cls}">${prefix}</span>`);
    });
  }

  s = s
    .replace(/步驟二＆三結算：/g, '<span class="px-1 rounded bg-rose-950 text-rose-300 font-black">結算</span> ')
    .replace(/支付魔力供品 (\d+) 魔晶，剩餘 (-?\d+) 魔晶。/g, '供品 <b class="text-rose-400">-$1💎</b> <span class="text-slate-400">(剩$2💎)</span>')
    .replace(/（需苦工×\d+）/g, '')
    .replace(/對(<span[^>]+>.*?<\/span>)施放/g, '➔ $1 施放')
    .replace(/對(<span[^>]+>.*?<\/span>)打出/g, '➔ $1 打出')
    .replace(/快速開局完成：.*/g, '<span class="text-emerald-300 font-black">[就緒]</span> 點手牌列目標施放；點頂部對手彈窗看敵城')
    .replace(/進入「首輪召喚」階段：.*/g, '<span class="text-amber-300 font-black">[首輪召喚]</span> 請點選中央人才池頂牌招募 4 名部下')
    .replace(/「([^」]+)」/g, '<b class="text-amber-300">「$1」</b>');

  return `
    <div class="flex items-center gap-1.5 leading-tight truncate ${isLatest ? 'text-xs sm:text-sm text-white font-extrabold' : 'text-[11px] text-slate-300 font-semibold'}">
      <span class="shrink-0 ${isLatest ? 'text-amber-400 font-black' : 'text-slate-500'}">${isLatest ? '▶' : '•'}</span>
      <div class="truncate min-w-0 flex-1">${s}</div>
    </div>
  `;
}

function addLog(state, msg) {
  state.logs.unshift(msg);
  if (state.logs.length > 60) state.logs.pop();
}

function hasVPInDept(player, dept) {
  return player.departments[dept].some(uid => CARDS_BY_ID[uid] && CARDS_BY_ID[uid].isVP);
}

function getTotalVPCount(player) {
  return ['RED', 'YELLOW', 'BLUE', 'GREEN'].reduce((sum, d) => {
    return sum + (hasVPInDept(player, d) ? 1 : 0);
  }, 0);
}

function sortDepartment(deptArr) {
  deptArr.sort((uidA, uidB) => {
    const a = CARDS_BY_ID[uidA];
    const b = CARDS_BY_ID[uidB];
    if (a.isVP !== b.isVP) return a.isVP ? -1 : 1;
    return (b.skill || 0) - (a.skill || 0);
  });
}

function getEffectiveSkill(player, dept) {
  const arr = player.departments[dept];
  if (!arr || arr.length === 0) return 0;
  return CARDS_BY_ID[arr[0]].skill;
}

function addEmployeeToPlayer(player, empUid) {
  const card = CARDS_BY_ID[empUid];
  if (!card) return;
  if (card.role === 'ENGINEER') {
    player.engineers.push(empUid);
  } else {
    player.departments[card.dept].push(empUid);
    sortDepartment(player.departments[card.dept]);
  }
  recalcPlayerStats(player);
}

function removeEmployeeFromPlayer(player, empUid) {
  const card = CARDS_BY_ID[empUid];
  if (!card) return;
  if (card.role === 'ENGINEER') {
    player.engineers = player.engineers.filter(id => id !== empUid);
  } else {
    player.departments[card.dept] = player.departments[card.dept].filter(id => id !== empUid);
    sortDepartment(player.departments[card.dept]);
  }
  recalcPlayerStats(player);
}

function returnEmployeeToJobBankBottom(state, empUid) {
  const card = CARDS_BY_ID[empUid];
  if (!card) return;
  state.jobBank[card.dept].push(empUid);
}

function getCrisisTotalEngineerReq(player) {
  return player.crises.reduce((sum, uid) => sum + ((CARDS_BY_ID[uid] && CARDS_BY_ID[uid].val) || 0), 0);
}

function recalcPlayerStats(player) {
  const req = getCrisisTotalEngineerReq(player);
  const eng = player.engineers.length;
  player.outsourcedCount = Math.max(0, req - eng);
}

function getPlayerBurnRate(player) {
  recalcPlayerStats(player);
  let base = 0;
  ['RED', 'YELLOW', 'BLUE', 'GREEN'].forEach(d => {
    player.departments[d].forEach(uid => {
      if (CARDS_BY_ID[uid]) base += CARDS_BY_ID[uid].salary;
    });
  });
  base += player.engineers.length * 1;
  base += player.outsourcedCount * 3;
  return player.doubleBurnFlag ? base * 2 : base;
}

function getAllPlayerEmployeeUids(player) {
  const list = [];
  ['RED', 'YELLOW', 'BLUE', 'GREEN'].forEach(d => {
    player.departments[d].forEach(uid => list.push(uid));
  });
  player.engineers.forEach(uid => list.push(uid));
  return list;
}

function drawCardsForPlayer(state, player, targetHandSize = 6) {
  while (player.hand.length < targetHandSize) {
    if (state.actionDeck.length === 0) {
      if (state.discardPile.length === 0) break;
      state.actionDeck = shuffleArray(state.discardPile);
      state.discardPile = [];
      addLog(state, '🔄 功能卡抽牌堆已抽乾，將棄牌堆洗勻成為新牌庫！');
    }
    player.hand.push(state.actionDeck.shift());
  }
}

function evaluateCardPlayability(state, player, handUid) {
  const card = CARDS_BY_ID[handUid];
  if (!card || card.effect === 'HIDDEN') return { playable: false, shortReason: '無效卡牌', reason: '無效卡牌' };

  const turn = state.turn;
  const remainingQuota = turn.maxActions - turn.actionsUsed;
  if (remainingQuota <= 0) return { playable: false, shortReason: '額度已滿', reason: '本回合 4 張行動額度已用盡' };

  if (state.config.playDiscardMode === 'STRICT_EITHER' && turn.hasDiscardedCard) {
    return { playable: false, shortReason: '已棄牌鎖定', reason: '標準模式下本回合已選擇棄牌，不可再出牌' };
  }

  const aliveOpponents = state.players.filter(p => p.id !== player.id && !p.isEliminated);

  if (card.effect === 'GAIN_FUNDS') {
    const mySkill = getEffectiveSkill(player, 'GREEN');
    if (!card.reqSkills.includes(mySkill)) {
      return { playable: false, shortReason: `需金庫[${card.reqSkills.join(',')}](現${mySkill}級)`, reason: `需掠奪金庫部主管技能 [${card.reqSkills.join(',')}]，你目前為 ${mySkill} 級` };
    }
    return { playable: true };
  }

  if (card.effect === 'RELEASE_CRISIS') {
    const mySkill = getEffectiveSkill(player, 'RED');
    if (!card.reqSkills.includes(mySkill)) {
      return { playable: false, shortReason: `需防禦[${card.reqSkills.join(',')}](現${mySkill}級)`, reason: `需防禦鍊金部主管技能 [${card.reqSkills.join(',')}]，你目前為 ${mySkill} 級` };
    }
    if (player.crises.length === 0) {
      return { playable: false, shortReason: '自家無危機', reason: '你場上目前沒有任何「討伐危機」可移除' };
    }
    return { playable: true, validCrises: [...player.crises] };
  }

  if (card.effect === 'HIRE_BANK') {
    const mySkill = getEffectiveSkill(player, 'BLUE');
    if (!card.reqSkills.includes(mySkill)) {
      return { playable: false, shortReason: `需召喚[${card.reqSkills.join(',')}](現${mySkill}級)`, reason: `需魔物召喚祭壇主管技能 [${card.reqSkills.join(',')}]，你目前為 ${mySkill} 級` };
    }
    const validDepts = ['RED', 'YELLOW', 'BLUE', 'GREEN'].filter(d => {
      const topUid = state.jobBank[d][0];
      if (!topUid) return false;
      const emp = CARDS_BY_ID[topUid];
      return !(emp.isVP && hasVPInDept(player, d));
    });
    if (validDepts.length === 0) {
      return { playable: false, shortReason: '無可招部下', reason: '中央人才池目前無可合法召喚的部下' };
    }
    return { playable: true, validBankDepts: validDepts };
  }

  if (card.effect === 'FIRE_OWN') {
    const mySkill = getEffectiveSkill(player, 'BLUE');
    if (!card.reqSkills.includes(mySkill)) {
      return { playable: false, shortReason: `需召喚[${card.reqSkills.join(',')}](現${mySkill}級)`, reason: `需魔物召喚祭壇主管技能 [${card.reqSkills.join(',')}]，你目前為 ${mySkill} 級` };
    }
    const companionFireUids = player.hand.filter(uid =>
      uid !== handUid &&
      CARDS_BY_ID[uid] &&
      CARDS_BY_ID[uid].effect === 'FIRE_OWN' &&
      CARDS_BY_ID[uid].reqSkills.includes(mySkill)
    );
    const canFireVP = remainingQuota >= 2 && companionFireUids.length > 0;
    const allOwnEmps = getAllPlayerEmployeeUids(player);
    const validEmpUids = allOwnEmps.filter(eUid => {
      const emp = CARDS_BY_ID[eUid];
      return emp.isVP ? canFireVP : true;
    });
    if (validEmpUids.length === 0) {
      return { playable: false, shortReason: allOwnEmps.length === 0 ? '無在職部下' : '皇室需2張遣散', reason: '場上僅有皇室，需剩餘至少2額度且手牌有第2張合法遣散卡' };
    }
    return { playable: true, validOwnEmployees: validEmpUids, companionFireUids };
  }

  if (card.effect === 'BAD_IDEA') {
    const validOpponents = aliveOpponents.filter(opp => {
      const oppSkill = getEffectiveSkill(opp, 'YELLOW');
      return card.reqSkills.includes(oppSkill);
    });
    if (validOpponents.length === 0) {
      return { playable: false, shortReason: `對手黑魔免疫`, reason: `無對手的黑魔法情報部主管符合技能 [${card.reqSkills.join(',')}]` };
    }
    return { playable: true, validOpponents: validOpponents.map(o => o.id) };
  }

  if (card.effect === 'FORCE_HIRE') {
    const validMap = {};
    aliveOpponents.forEach(opp => {
      const oppSkill = getEffectiveSkill(opp, 'BLUE');
      if (!card.reqSkills.includes(oppSkill)) return;
      const deptsForOpp = ['RED', 'YELLOW', 'BLUE', 'GREEN'].filter(d => {
        const topUid = state.jobBank[d][0];
        if (!topUid) return false;
        const emp = CARDS_BY_ID[topUid];
        return !(emp.isVP && hasVPInDept(opp, d));
      });
      if (deptsForOpp.length > 0) validMap[opp.id] = deptsForOpp;
    });
    const validOpponents = Object.keys(validMap);
    if (validOpponents.length === 0) {
      return { playable: false, shortReason: `對手召喚免疫`, reason: `無對手的召喚祭壇主管符合技能 [${card.reqSkills.join(',')}]` };
    }
    return { playable: true, validOpponents, validBankByOpponent: validMap };
  }

  if (card.effect === 'POACH_ENEMY') {
    const targetableByOpponent = {};
    const companionsByOpponent = {};

    aliveOpponents.forEach(opp => {
      const oppSkill = getEffectiveSkill(opp, 'BLUE');
      if (!card.reqSkills.includes(oppSkill)) return;

      const companionPoachUids = player.hand.filter(uid =>
        uid !== handUid &&
        CARDS_BY_ID[uid] &&
        CARDS_BY_ID[uid].effect === 'POACH_ENEMY' &&
        CARDS_BY_ID[uid].reqSkills.includes(oppSkill)
      );
      const canPoachThisOppVP = remainingQuota >= 2 && companionPoachUids.length > 0;

      const oppEmps = getAllPlayerEmployeeUids(opp).filter(eUid => {
        const emp = CARDS_BY_ID[eUid];
        if (!emp.isVP) return true;
        if (hasVPInDept(player, emp.dept)) return false;
        return canPoachThisOppVP;
      });

      if (oppEmps.length > 0) {
        targetableByOpponent[opp.id] = oppEmps;
        companionsByOpponent[opp.id] = companionPoachUids;
      }
    });

    const validOpponents = Object.keys(targetableByOpponent);
    if (validOpponents.length === 0) {
      return { playable: false, shortReason: `對手召喚免疫`, reason: `無可挖角之合法對手部下（檢定對手召喚祭壇等級 [${card.reqSkills.join(',')}]）` };
    }
    return { playable: true, validOpponents, targetableByOpponent, companionsByOpponent };
  }

  if (card.effect === 'VP_KICK_ENEMY') {
    const myVPs = getTotalVPCount(player);
    if (myVPs < card.reqVPs) {
      return { playable: false, shortReason: `需皇室≥${card.reqVPs}(現${myVPs}名)`, reason: `需自己場上有至少 ${card.reqVPs} 名皇室（目前 ${myVPs} 名）` };
    }
    const targetVPs = [];
    aliveOpponents.forEach(opp => {
      ['RED', 'YELLOW', 'BLUE', 'GREEN'].forEach(d => {
        opp.departments[d].forEach(eUid => {
          if (CARDS_BY_ID[eUid] && CARDS_BY_ID[eUid].isVP) {
            targetVPs.push({ opponentId: opp.id, empUid: eUid });
          }
        });
      });
    });
    if (targetVPs.length === 0) {
      return { playable: false, shortReason: '對手無皇室', reason: '對手場上目前沒有任何皇室可供放逐' };
    }
    return { playable: true, validOpponents: [...new Set(targetVPs.map(t => t.opponentId))], targetVPs };
  }

  if (card.effect === 'VP_DOUBLE_PAY') {
    const myVPs = getTotalVPCount(player);
    if (myVPs < card.reqVPs) {
      return { playable: false, shortReason: `需皇室≥${card.reqVPs}(現${myVPs}名)`, reason: `需自己場上有至少 ${card.reqVPs} 名皇室（目前 ${myVPs} 名）` };
    }
    const validOpponents = aliveOpponents.map(o => o.id);
    return { playable: validOpponents.length > 0, validOpponents };
  }

  if (card.effect === 'VP_MASS_LAYOFF') {
    const myVPs = getTotalVPCount(player);
    if (myVPs < card.reqVPs) {
      return { playable: false, shortReason: `需皇室≥${card.reqVPs}(現${myVPs}名)`, reason: `需自己場上有至少 ${card.reqVPs} 名皇室（目前 ${myVPs} 名）` };
    }
    const totalEmps = getAllPlayerEmployeeUids(player).length;
    if (totalEmps <= 2) {
      return { playable: false, shortReason: '無多餘部下', reason: '須保留至少 2 名皇室，目前無多餘部下可遣散' };
    }
    return { playable: true };
  }

  return { playable: false, shortReason: '條件未達', reason: '條件未達' };
}

function consumeHandCard(state, player, handUid, moveToDiscard = true) {
  player.hand = player.hand.filter(id => id !== handUid);
  if (moveToDiscard) state.discardPile.unshift(handUid);
}

// === Fog-of-War Sanitizer for Network State Broadcast ===
function sanitizeStateForSeat(fullState, viewerSeatId) {
  if (!fullState) return null;
  const applyFog = Boolean(fullState.config && fullState.config.fogOfWar && fullState.phase !== 'GAME_OVER');

  const players = fullState.players.map(p => ({
    id: p.id,
    name: p.name,
    isAI: p.isAI,
    isOnlineHuman: p.isOnlineHuman,
    connected: p.connected,
    isEliminated: p.isEliminated,
    crystals: p.crystals,
    doubleBurnFlag: p.doubleBurnFlag,
    departments: {
      RED: [...p.departments.RED],
      YELLOW: [...p.departments.YELLOW],
      BLUE: [...p.departments.BLUE],
      GREEN: [...p.departments.GREEN]
    },
    engineers: [...p.engineers],
    crises: [...p.crises],
    outsourcedCount: p.outsourcedCount,
    handCount: p.hand.length,
    hand: (applyFog && p.id !== viewerSeatId) ? p.hand.map(() => 'HIDDEN_ACT') : [...p.hand]
  }));

  const jobBank = {};
  ['RED', 'YELLOW', 'BLUE', 'GREEN'].forEach(d => {
    const srcDeck = fullState.jobBank[d] || [];
    if (applyFog && srcDeck.length > 1) {
      jobBank[d] = [srcDeck[0], ...srcDeck.slice(1).map(() => 'HIDDEN_EMP')];
    } else {
      jobBank[d] = [...srcDeck];
    }
  });

  return {
    config: { ...fullState.config },
    phase: fullState.phase,
    draft: { ...fullState.draft },
    turn: { ...fullState.turn },
    jobBank,
    actionDeck: applyFog ? fullState.actionDeck.map(() => 'HIDDEN_ACT') : [...fullState.actionDeck],
    discardPile: [...fullState.discardPile],
    lastPlayedCard: fullState.lastPlayedCard ? { ...fullState.lastPlayedCard } : null,
    players,
    logs: [...fullState.logs],
    vfxSeq: fullState.vfxSeq,
    lastVfxEvent: fullState.lastVfxEvent ? { ...fullState.lastVfxEvent } : null
  };
}

window.getLocalPlayerId = getLocalPlayerId;
window.getLocalPlayer = getLocalPlayer;
window.getLocalPlayerIndex = getLocalPlayerIndex;
window.getClockwiseOpponents = getClockwiseOpponents;
window.isLocalPlayerTurn = isLocalPlayerTurn;
window.getShortPlayerName = getShortPlayerName;
window.createInitialGameState = createInitialGameState;
window.recordVfxEvent = recordVfxEvent;
window.formatLogItemToTickerHTML = formatLogItemToTickerHTML;
window.addLog = addLog;
window.hasVPInDept = hasVPInDept;
window.getTotalVPCount = getTotalVPCount;
window.sortDepartment = sortDepartment;
window.getEffectiveSkill = getEffectiveSkill;
window.addEmployeeToPlayer = addEmployeeToPlayer;
window.removeEmployeeFromPlayer = removeEmployeeFromPlayer;
window.returnEmployeeToJobBankBottom = returnEmployeeToJobBankBottom;
window.getCrisisTotalEngineerReq = getCrisisTotalEngineerReq;
window.recalcPlayerStats = recalcPlayerStats;
window.getPlayerBurnRate = getPlayerBurnRate;
window.getAllPlayerEmployeeUids = getAllPlayerEmployeeUids;
window.drawCardsForPlayer = drawCardsForPlayer;
window.evaluateCardPlayability = evaluateCardPlayability;
window.consumeHandCard = consumeHandCard;
window.sanitizeStateForSeat = sanitizeStateForSeat;
