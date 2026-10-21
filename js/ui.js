/********************************************************************
 * LAYER 4: MOBILE-FIRST 5-ZONE UI, SYNCHRONIZED VFX & MULTIPLAYER LOBBY (js/ui.js)
 ********************************************************************/

window.lastFlippedDeptKey = null;
let animSpeedMultiplier = 1; // 1 = 1x, 2 = 2x
let deferredPwaPrompt = null;

function isRunningStandalonePWA() {
  return Boolean(
    (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
    (window.matchMedia && window.matchMedia("(display-mode: fullscreen)").matches) ||
    window.navigator.standalone === true
  );
}

function registerPwaServiceWorker() {
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPwaPrompt = e;
    updateSettingsMenuUI();
  });
  window.addEventListener("appinstalled", () => {
    deferredPwaPrompt = null;
    updateSettingsMenuUI();
    if (typeof showToast === "function") {
      showToast("🎉 已成功安裝「深淵魔王城」PWA！從主畫面開啟即可永久隱藏網址列全螢幕遊玩。");
    }
  });
  document.addEventListener("fullscreenchange", () => {
    updateSettingsMenuUI();
  });
}

function toggleFullscreenMode() {
  const docEl = document.documentElement;
  const isFs = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
  if (!isFs) {
    const req = docEl.requestFullscreen || docEl.webkitRequestFullscreen;
    if (req) {
      req.call(docEl).then(() => {
        updateSettingsMenuUI();
      }).catch(() => {
        if (typeof showToast === "function") {
          showToast("📲 若瀏覽器限制全螢幕，請點選瀏覽器選單「新增至主畫面 / 安裝應用程式」以 PWA 全螢幕啟動！");
        }
      });
    } else if (typeof showToast === "function") {
      showToast("📲 請點選 Safari/瀏覽器下方「分享 ➔ 加入主畫面」，即可永久隱藏網址列全螢幕遊玩！");
    }
  } else {
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    if (exit) exit.call(document).catch(() => {});
  }
}

function triggerPwaInstallOrFullscreen() {
  if (deferredPwaPrompt) {
    deferredPwaPrompt.prompt();
    deferredPwaPrompt.userChoice.then(() => {
      deferredPwaPrompt = null;
      updateSettingsMenuUI();
    }).catch(() => {});
    return;
  }
  toggleFullscreenMode();
  if (!isRunningStandalonePWA() && typeof showToast === "function") {
    showToast("📲 已切換全螢幕！亦可點選瀏覽器選單「新增至手機 / 加入主畫面」安裝為獨立 PWA 應用。");
  }
}


function getPlayerAnchorSelector(playerId) {
  return playerId === getLocalPlayerId() ? '#myHeroStatusBar' : `[data-seat-tab="${playerId}"]`;
}

function clearDuelBannersVFX() {
  const root = document.getElementById('vfxOverlayRoot');
  if (!root) return;
  root.querySelectorAll('.vfx-vs-duel-banner, .vfx-cutin-banner').forEach(el => el.remove());
}

function spawnTargetingArrowVFX(fromSelector, toSelector, colorHex = '#f43f5e', actionLabel = '⚔️攻擊') {
  const root = document.getElementById('vfxOverlayRoot');
  if (!root) return;
  const fromEl = typeof fromSelector === 'string' ? document.querySelector(fromSelector) : fromSelector;
  const toEl = typeof toSelector === 'string' ? document.querySelector(toSelector) : toSelector;
  if (!fromEl || !toEl) return;

  const r1 = fromEl.getBoundingClientRect();
  const r2 = toEl.getBoundingClientRect();
  if (r1.width === 0 || r2.width === 0) return;

  const vw = window.innerWidth || 375;
  const x1 = Math.max(48, Math.min(vw - 48, r1.left + r1.width / 2));
  const y1 = r1.top + r1.height / 2;
  const x2 = Math.max(48, Math.min(vw - 48, r2.left + r2.width / 2));
  const y2 = r2.top + r2.height / 2;

  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const cx = mx + (Math.abs(dy) > Math.abs(dx) ? (dx >= 0 ? 32 : -32) : 0);
  const cy = my - (Math.abs(dx) >= Math.abs(dy) ? 34 : 0);

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.style.position = 'fixed';
  svg.style.inset = '0';
  svg.style.pointerEvents = 'none';
  svg.style.zIndex = '9991';

  const markerId = 'arrow_' + Math.random().toString(36).slice(2, 8);
  svg.innerHTML = `
    <defs>
      <marker id="${markerId}" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
        <path d="M 0 1 L 10 5 L 0 9 z" fill="${colorHex}" />
      </marker>
    </defs>
    <path d="M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}" fill="none" stroke="${colorHex}" stroke-width="6" stroke-opacity="0.25" stroke-linecap="round" />
    <path d="M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}" fill="none" stroke="${colorHex}" stroke-width="3" stroke-linecap="round" class="vfx-laser-path" marker-end="url(#${markerId})" />
  `;
  root.appendChild(svg);

  const startTag = document.createElement('div');
  startTag.className = 'vfx-endpoint-tag bg-amber-400 text-slate-950 border border-white';
  startTag.style.left = `${x1}px`;
  startTag.style.top = `${y1}px`;
  startTag.textContent = actionLabel;
  root.appendChild(startTag);

  const duration = animSpeedMultiplier === 2 ? 1050 : 1750;
  setTimeout(() => {
    svg.remove();
    startTag.remove();
  }, duration);
}

// Compact Single-Band Tactical HUD Banner
function showVsDuelBanner(attackerName, cardIcon, cardTitle, defenderName, effectDesc, isSelfBuff = false, actorId = null, defenderId = null) {
  if (uiSelection.mode === 'MODE_D_SELECT') return;

  const root = document.getElementById('vfxOverlayRoot');
  if (!root) return;
  clearDuelBannersVFX();

  const myId = getLocalPlayerId();
  const duration = animSpeedMultiplier === 2 ? 1050 : 1850;
  const banner = document.createElement('div');
  banner.className = 'vfx-vs-duel-banner border-2 ' + (isSelfBuff ? 'border-emerald-400' : 'border-rose-400');
  banner.style.setProperty('--duel-banner-dur', `${duration}ms`);

  const isAtkMe = (actorId && actorId === myId) || (!actorId && attackerName && attackerName.includes('你'));
  const isDefMe = (defenderId && defenderId === myId) || (!defenderId && defenderName && defenderName.includes('你'));

  const shortAtk = isAtkMe ? '👑我方' : ('😈' + getShortPlayerName(attackerName));
  const shortDef = defenderName ? (isDefMe ? '👑我方' : ('😈' + getShortPlayerName(defenderName))) : '';

  if (isSelfBuff) {
    banner.style.background = 'linear-gradient(135deg, rgba(6, 78, 59, 0.96) 0%, rgba(15, 23, 42, 0.98) 100%)';
    banner.style.boxShadow = '0 14px 32px rgba(0,0,0,0.92), 0 0 20px rgba(16, 185, 129, 0.6)';
    banner.innerHTML = `
      <div class="flex items-center justify-between gap-2 min-w-0">
        <span class="px-2 py-1 rounded-lg bg-slate-950 border border-emerald-400 text-xs font-black text-emerald-300 whitespace-nowrap shrink-0">${shortAtk}</span>
        <span class="text-amber-400 font-black text-xs shrink-0">▸</span>
        <div class="flex-1 flex items-center justify-between gap-1.5 bg-slate-950/90 rounded-lg px-2 py-1 border border-emerald-500/40 min-w-0">
          <div class="flex items-center gap-1 min-w-0">
            <span class="text-base leading-none shrink-0">${cardIcon}</span>
            <span class="text-xs font-black text-white truncate">${cardTitle}</span>
          </div>
          <span class="text-[11px] font-extrabold text-emerald-300 truncate shrink-0">${effectDesc}</span>
        </div>
      </div>
    `;
  } else {
    banner.innerHTML = `
      <div class="flex items-center justify-between gap-1.5 min-w-0">
        <div class="px-2 py-1 rounded-lg bg-slate-950 border border-amber-400 text-center shrink-0">
          <div class="text-[9px] text-amber-300 font-bold leading-none">⚔️攻方</div>
          <div class="text-xs font-black text-white mt-0.5 whitespace-nowrap">${shortAtk}</div>
        </div>
        <div class="flex-1 rounded-lg bg-rose-950/95 border border-rose-400 px-2 py-1 flex items-center justify-between gap-1.5 min-w-0">
          <div class="flex items-center gap-1 min-w-0">
            <span class="text-base leading-none shrink-0">${cardIcon}</span>
            <span class="text-xs font-black text-amber-300 truncate">${cardTitle}</span>
          </div>
          <span class="px-1.5 py-0.5 rounded bg-rose-600 text-[10px] font-black text-white whitespace-nowrap shrink-0">${effectDesc}</span>
        </div>
        <div class="px-2 py-1 rounded-lg bg-slate-950 border border-rose-400 text-center shrink-0">
          <div class="text-[9px] text-rose-300 font-bold leading-none">🎯目標</div>
          <div class="text-xs font-black text-white mt-0.5 whitespace-nowrap">${shortDef}</div>
        </div>
      </div>
    `;
  }
  root.appendChild(banner);
  setTimeout(() => banner.remove(), duration);
}

function showTurnHandoverBanner(player, roundNumber) {
  if (!player) return;
  const root = document.getElementById('vfxOverlayRoot');
  if (!root) return;
  root.querySelectorAll('.vfx-turn-handover-backdrop, .vfx-turn-handover').forEach(el => el.remove());

  const duration = animSpeedMultiplier === 2 ? 1150 : 2000;
  const isMe = player.id === getLocalPlayerId();
  const burn = getPlayerBurnRate(player);
  const crisisReq = getCrisisTotalEngineerReq(player);

  let repEmp = null;
  ['RED', 'YELLOW', 'BLUE', 'GREEN'].forEach(d => {
    const topUid = player.departments[d][0];
    if (topUid) {
      const cand = CARDS_BY_ID[topUid];
      if (!repEmp || (cand.isVP && !repEmp.isVP) || (cand.skill || 0) > (repEmp.skill || 0)) {
        repEmp = cand;
      }
    }
  });
  const avatarSrc = repEmp ? GPT_MINI_AVATAR[repEmp.tplId] : null;
  const avatarHTML = avatarSrc
    ? `<img src="${avatarSrc}" class="w-14 h-14 rounded-full object-cover border-2 ${isMe ? 'border-emerald-300' : 'border-amber-300'} shadow-2xl mx-auto" style="width:56px;height:56px;object-position:center 18%;" />`
    : `<div class="w-14 h-14 rounded-full bg-slate-950 border-2 ${isMe ? 'border-emerald-300' : 'border-amber-300'} flex items-center justify-center text-2xl mx-auto shadow-2xl" style="width:56px;height:56px;">${isMe ? '👑' : '😈'}</div>`;

  const backdrop = document.createElement('div');
  backdrop.className = 'vfx-turn-handover-backdrop';
  backdrop.style.setProperty('--turn-banner-dur', `${duration}ms`);

  backdrop.innerHTML = `
    <div class="vfx-turn-handover border-2 ${isMe ? 'border-emerald-400' : 'border-amber-400'}" style="--turn-banner-dur: ${duration}ms;">
      <div class="inline-flex items-center gap-1 px-3 py-0.5 rounded-full ${isMe ? 'bg-emerald-950 border border-emerald-400 text-emerald-300' : 'bg-amber-950/90 border border-amber-400 text-amber-300'} text-xs font-black mb-1.5">
        ⏳ 第 ${roundNumber} 回合・回合交接
      </div>
      ${avatarHTML}
      <div class="text-lg sm:text-xl font-black text-white mt-1.5 leading-tight">
        ${isMe ? `👑 輪到【${player.name}】行動！` : `😈 輪到【${player.name}】行動！`}
      </div>
      <div class="grid grid-cols-3 gap-1.5 mt-2.5 bg-slate-950/90 p-2 rounded-xl border border-slate-700">
        <div class="flex flex-col items-center">
          <span class="text-[10px] text-slate-400 font-bold">魔晶儲備</span>
          <span class="text-sm font-black text-emerald-400 mt-0.5">💎 ${player.crystals}</span>
        </div>
        <div class="flex flex-col items-center border-x border-slate-800">
          <span class="text-[10px] text-slate-400 font-bold">每回燒魔</span>
          <span class="text-sm font-black text-rose-400 mt-0.5">🔥 -${burn}/回</span>
        </div>
        <div class="flex flex-col items-center">
          <span class="text-[10px] text-slate-400 font-bold">討伐危機</span>
          <span class="text-sm font-black text-amber-300 mt-0.5">⚠️ ${player.crises.length} (需${crisisReq})</span>
        </div>
      </div>
    </div>
  `;
  root.appendChild(backdrop);
  setTimeout(() => backdrop.remove(), duration);
}

function spawnShockwaveVFX(x, y, colorHex = '#fbbf24') {
  const root = document.getElementById('vfxOverlayRoot');
  if (!root) return;
  const ring = document.createElement('div');
  ring.className = 'vfx-shockwave-ring';
  ring.style.left = `${x}px`;
  ring.style.top = `${y}px`;
  ring.style.borderColor = colorHex;
  ring.style.boxShadow = `0 0 18px ${colorHex}`;
  root.appendChild(ring);
  setTimeout(() => ring.remove(), 550);
}

function spawnFloatingNumberVFX(targetSelectorOrEl, text, bgClass = 'bg-emerald-600 text-white border border-emerald-300') {
  const root = document.getElementById('vfxOverlayRoot');
  if (!root) return;
  const el = typeof targetSelectorOrEl === 'string' ? document.querySelector(targetSelectorOrEl) : targetSelectorOrEl;
  const vw = window.innerWidth || 375;
  const vh = window.innerHeight || 667;
  let x = vw / 2;
  let y = vh * 0.25;
  if (el) {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0) {
      x = rect.left + rect.width / 2;
      y = Math.max(38, rect.top + 8);
    }
  }
  x = Math.max(82, Math.min(vw - 82, x));

  const duration = animSpeedMultiplier === 2 ? 850 : 1350;
  const badge = document.createElement('div');
  badge.className = `vfx-floating-number ${bgClass}`;
  badge.style.setProperty('--float-num-dur', `${duration}ms`);
  badge.style.left = `${x}px`;
  badge.style.top = `${y}px`;
  badge.textContent = text;
  root.appendChild(badge);
  setTimeout(() => badge.remove(), duration);
}

function spawnFlyingCardVFX(fromSelector, toSelector, labelText, iconEmoji, borderColorHex = '#38bdf8') {
  const root = document.getElementById('vfxOverlayRoot');
  if (!root) return;
  const fromEl = typeof fromSelector === 'string' ? document.querySelector(fromSelector) : fromSelector;
  const toEl = typeof toSelector === 'string' ? document.querySelector(toSelector) : toSelector;

  let startX = window.innerWidth * 0.5;
  let startY = window.innerHeight * 0.82;
  let endX = window.innerWidth * 0.5;
  let endY = window.innerHeight * 0.35;

  if (fromEl) {
    const r1 = fromEl.getBoundingClientRect();
    if (r1.width > 0) { startX = r1.left + r1.width / 2; startY = r1.top + r1.height / 2; }
  }
  if (toEl) {
    const r2 = toEl.getBoundingClientRect();
    if (r2.width > 0) { endX = r2.left + r2.width / 2; endY = r2.top + r2.height / 2; }
  }

  const flyer = document.createElement('div');
  flyer.style.position = 'fixed';
  flyer.style.left = `${startX - 36}px`;
  flyer.style.top = `${startY - 48}px`;
  flyer.style.width = '72px';
  flyer.style.height = '96px';
  flyer.style.borderRadius = '0.55rem';
  flyer.style.background = '#0f172a';
  flyer.style.border = `2px solid ${borderColorHex}`;
  flyer.style.boxShadow = `0 10px 22px rgba(0,0,0,0.85), 0 0 14px ${borderColorHex}`;
  flyer.style.zIndex = '9992';
  flyer.style.display = 'flex';
  flyer.style.flexDirection = 'column';
  flyer.style.alignItems = 'center';
  flyer.style.justifyContent = 'center';
  flyer.style.padding = '3px';
  flyer.style.transition = 'transform 0.44s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.44s ease';
  flyer.innerHTML = `<div class="text-xl">${iconEmoji}</div><div class="text-[9px] font-black text-white text-center mt-0.5 leading-tight truncate w-full">${labelText}</div>`;
  root.appendChild(flyer);

  requestAnimationFrame(() => {
    const dx = endX - startX;
    const dy = endY - startY;
    flyer.style.transform = `translate(${dx}px, ${dy}px) rotate(8deg) scale(0.85)`;
  });

  setTimeout(() => {
    spawnShockwaveVFX(endX, endY, borderColorHex);
    flyer.style.opacity = '0';
    setTimeout(() => flyer.remove(), 160);
  }, 420);
}

function triggerHitShakeOnPlayer(playerId) {
  const targetEl = document.querySelector(getPlayerAnchorSelector(playerId));
  if (targetEl) {
    targetEl.classList.remove('anim-hit-shake');
    void targetEl.offsetWidth;
    targetEl.classList.add('anim-hit-shake');
  }
  if (playerId === getLocalPlayerId()) {
    const stage = document.getElementById('companyStageSection');
    if (stage) {
      stage.classList.remove('anim-hit-shake');
      void stage.offsetWidth;
      stage.classList.add('anim-hit-shake');
    }
  }
}

// === Synchronized Network VFX Player (Runs on Host & Clients) ===
function playSynchronizedVfxEvent(ev) {
  if (!ev) return;
  const myId = getLocalPlayerId();
  if (ev.flippedDeptKey) {
    window.lastFlippedDeptKey = ev.flippedDeptKey;
  }

  if (ev.vfxType === 'DRAFT_PICK') {
    playSfx('card');
    return;
  }

  if (ev.vfxType === 'DISCARD') {
    playSfx('card');
    return;
  }

  if (ev.vfxType === 'SETTLE_BURN') {
    playSfx('burn');
    const actorAnchor = getPlayerAnchorSelector(ev.actorId);
    spawnFloatingNumberVFX(actorAnchor, `🔥供品 -${ev.burnAmount} 💎`, 'bg-rose-700 text-white border border-amber-300');
    showVsDuelBanner(
      ev.actorName,
      '🔥',
      `回合供品 -${ev.burnAmount}💎`,
      null,
      `${ev.wasDouble ? '雙倍×2·' : ''}剩 💎${ev.remainingCrystals}`,
      true,
      ev.actorId,
      null
    );
    return;
  }

  if (ev.vfxType === 'TURN_HANDOVER') {
    if (gameState && gameState.players) {
      const nextPl = gameState.players.find(p => p.id === ev.nextPlayerId);
      if (nextPl) {
        showTurnHandoverBanner(nextPl, ev.roundNumber);
      }
    }
    return;
  }

  if (ev.vfxType !== 'PLAY_CARD') return;

  const actorAnchor = ev.actorId === myId ? '#localHandContainer' : getPlayerAnchorSelector(ev.actorId);
  const actorSelfAnchor = getPlayerAnchorSelector(ev.actorId);
  const oppAnchor = ev.targetPlayerId ? getPlayerAnchorSelector(ev.targetPlayerId) : null;

  if (ev.effect === 'GAIN_FUNDS') {
    playSfx('coin');
    spawnFlyingCardVFX(actorAnchor, actorSelfAnchor, ev.cardTitle, '💎', '#34d399');
    showVsDuelBanner(ev.actorName, '💎', ev.cardTitle, null, `+${ev.val}💎 (現${ev.crystals})`, true, ev.actorId, null);
    spawnFloatingNumberVFX(actorSelfAnchor, `+${ev.val} 💎`, 'bg-emerald-600 text-white border border-emerald-300');
  } else if (ev.effect === 'RELEASE_CRISIS') {
    playSfx('card');
    spawnFlyingCardVFX(actorAnchor, actorSelfAnchor, '鎮壓危機', '🍾', '#38bdf8');
    showVsDuelBanner(ev.actorName, '🍾', '鎮壓危機', null, `解除「${ev.crisisTitle}」`, true, ev.actorId, null);
    spawnFloatingNumberVFX(actorSelfAnchor, `🍾危機 -1`, 'bg-sky-600 text-white border border-sky-300');
  } else if (ev.effect === 'HIRE_BANK') {
    playSfx('card');
    spawnTargetingArrowVFX(`[data-open-bank-dept="${ev.dept}"]`, actorSelfAnchor, '#38bdf8', '🏛️招募');
    spawnFlyingCardVFX(`[data-open-bank-dept="${ev.dept}"]`, actorSelfAnchor, ev.empTitle, '🤝', '#38bdf8');
    showVsDuelBanner(ev.actorName, '🤝', `召喚：${ev.empTitle}`, null, `加入${DEPT_META[ev.dept].short}`, true, ev.actorId, null);
    spawnFloatingNumberVFX(actorSelfAnchor, `🤝+${ev.empTitle}`, 'bg-indigo-600 text-white border border-sky-300');
  } else if (ev.effect === 'FIRE_OWN') {
    playSfx('attack');
    spawnFlyingCardVFX(actorSelfAnchor, `[data-open-bank-dept="${ev.dept}"]`, ev.empTitle, '🚪', '#f59e0b');
    showVsDuelBanner(ev.actorName, '🚪', `${ev.isVP ? '雙卡' : ''}獻祭遣散`, null, `遣散${ev.empTitle}`, true, ev.actorId, null);
    spawnFloatingNumberVFX(actorSelfAnchor, `🚪遣散 ${ev.empTitle}`, 'bg-amber-600 text-white border border-amber-300');
  } else if (ev.effect === 'BAD_IDEA') {
    playSfx('attack');
    spawnTargetingArrowVFX(actorSelfAnchor, oppAnchor, '#f43f5e', `⚔️${ev.actorId === myId ? '我方' : getShortPlayerName(ev.actorName)}`);
    spawnFlyingCardVFX(actorAnchor, oppAnchor, ev.cardTitle, '⚔️', '#f43f5e');
    showVsDuelBanner(ev.actorName, '⚔️', ev.cardTitle, ev.targetName, `需苦工×${ev.val}`, false, ev.actorId, ev.targetPlayerId);
    setTimeout(() => {
      triggerHitShakeOnPlayer(ev.targetPlayerId);
      spawnFloatingNumberVFX(oppAnchor, `⚠️危機 ×${ev.val}`, 'bg-rose-600 text-white border border-white');
    }, 240);
  } else if (ev.effect === 'FORCE_HIRE') {
    playSfx('attack');
    spawnTargetingArrowVFX(actorSelfAnchor, oppAnchor, '#f43f5e', `🪤強塞`);
    spawnFlyingCardVFX(`[data-open-bank-dept="${ev.dept}"]`, oppAnchor, ev.empTitle, '🪤', '#f43f5e');
    showVsDuelBanner(ev.actorName, '🪤', `強塞：${ev.empTitle}`, ev.targetName, `塞入${DEPT_META[ev.dept].short}`, false, ev.actorId, ev.targetPlayerId);
    setTimeout(() => {
      triggerHitShakeOnPlayer(ev.targetPlayerId);
      spawnFloatingNumberVFX(oppAnchor, `🪤強塞 ${ev.empTitle}`, 'bg-rose-600 text-white border border-amber-300');
    }, 240);
  } else if (ev.effect === 'POACH_ENEMY') {
    playSfx('attack');
    spawnTargetingArrowVFX(actorSelfAnchor, oppAnchor, '#c084fc', `🕸️挖角`);
    spawnFlyingCardVFX(oppAnchor, actorSelfAnchor, ev.empTitle, '🕸️', '#c084fc');
    showVsDuelBanner(ev.actorName, '🕸️', `挖角：${ev.empTitle}`, ev.targetName, `奪取${ev.empTitle}`, false, ev.actorId, ev.targetPlayerId);
    setTimeout(() => {
      triggerHitShakeOnPlayer(ev.targetPlayerId);
      spawnFloatingNumberVFX(oppAnchor, `💔被挖 ${ev.empTitle}`, 'bg-purple-800 text-white border border-rose-300');
    }, 220);
  } else if (ev.effect === 'VP_KICK_ENEMY') {
    playSfx('attack');
    spawnTargetingArrowVFX(actorSelfAnchor, oppAnchor, '#c084fc', `⚡放逐`);
    spawnFlyingCardVFX(actorAnchor, oppAnchor, ev.cardTitle, '⚡', '#c084fc');
    showVsDuelBanner(ev.actorName, '⚡', ev.cardTitle, ev.targetName, `放逐${ev.empTitle}`, false, ev.actorId, ev.targetPlayerId);
    setTimeout(() => {
      triggerHitShakeOnPlayer(ev.targetPlayerId);
      spawnFloatingNumberVFX(oppAnchor, `⚡放逐 ${ev.empTitle}`, 'bg-purple-700 text-white border border-amber-300');
    }, 240);
  } else if (ev.effect === 'VP_DOUBLE_PAY') {
    playSfx('burn');
    spawnTargetingArrowVFX(actorSelfAnchor, oppAnchor, '#f43f5e', `🔥雙倍`);
    spawnFlyingCardVFX(actorAnchor, oppAnchor, ev.cardTitle, '🔥', '#f43f5e');
    showVsDuelBanner(ev.actorName, '🔥', '魔界工會暴動', ev.targetName, `下回供品×2`, false, ev.actorId, ev.targetPlayerId);
    setTimeout(() => {
      triggerHitShakeOnPlayer(ev.targetPlayerId);
      spawnFloatingNumberVFX(oppAnchor, `🔥供品 ×2 詛咒!`, 'bg-rose-700 text-amber-300 border border-amber-300');
    }, 240);
  } else if (ev.effect === 'VP_MASS_LAYOFF') {
    playSfx('burn');
    showVsDuelBanner(ev.actorName, '🩸', '血祭大掃除', null, `遣散 ${ev.layoffCount} 人`, true, ev.actorId, null);
    spawnFloatingNumberVFX(actorSelfAnchor, `🩸裁員 ${ev.layoffCount}人`, 'bg-purple-700 text-white border border-amber-300');
  }
}

function attach3DTiltListeners() {
  document.querySelectorAll('.tilt-card-3d').forEach(cardEl => {
    const handleMove = (clientX, clientY) => {
      const rect = cardEl.getBoundingClientRect();
      if (rect.width === 0) return;
      const x = (clientX - rect.left) / rect.width - 0.5;
      const y = (clientY - rect.top) / rect.height - 0.5;
      const rotY = (x * 12).toFixed(1);
      const rotX = (-y * 12).toFixed(1);
      cardEl.style.transform = `perspective(700px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.02)`;
    };
    const resetTilt = () => {
      cardEl.style.transform = '';
    };
    cardEl.addEventListener('mousemove', e => handleMove(e.clientX, e.clientY));
    cardEl.addEventListener('mouseleave', resetTilt);
  });
}

function renderEmployeeCardHTML(empUid, extraClasses = '', badgeLabel = '') {
  const c = CARDS_BY_ID[empUid];
  if (!c) return '';
  const meta = DEPT_META[c.dept] || DEPT_META.RED;
  const fullCardSrc = GPT_FULLCARD_ART[c.tplId] || '';

  if (fullCardSrc) {
    return `
      <div data-emp-uid="${c.uid}" class="relative rounded-xl bg-slate-950 border-2 ${meta.border} ${c.isVP ? 'vp-card-frame' : ''} overflow-hidden shadow-xl transition min-w-0 ${extraClasses}">
        ${getCardImgTag(c.tplId, c.title, "full-gpt-card-img")}
        ${badgeLabel ? `<span class="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-sky-500 text-slate-950 text-[10px] font-black shadow-lg">${badgeLabel}</span>` : ''}
      </div>
    `;
  }

  const skillBadge = c.role === 'ENGINEER'
    ? `<span class="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 text-[10px] font-bold">⚒苦工</span>`
    : `<span class="w-5 h-5 rounded-full bg-slate-950 border ${c.isVP ? 'border-amber-300 text-amber-300' : 'border-white text-white'} flex items-center justify-center text-[11px] font-black">${c.skill}</span>`;

  return `
    <div data-emp-uid="${c.uid}" class="relative rounded-xl bg-slate-900 border ${meta.border} ${c.isVP ? 'vp-card-frame' : ''} overflow-hidden flex flex-col justify-between text-left shadow-lg transition min-w-0 ${extraClasses}">
      <div class="${meta.color} px-2 py-1 flex items-center justify-between gap-1 min-w-0">
        <span class="text-[10px] font-extrabold text-white truncate">${meta.icon}${meta.short}</span>
        <div class="flex items-center gap-1 shrink-0">
          ${c.isVP ? `<span class="text-[9px] font-black bg-amber-400 text-slate-950 px-1 rounded whitespace-nowrap">👑皇室</span>` : `<span class="text-[9px] text-white/80">統領</span>`}
          ${badgeLabel ? `<span class="text-[9px] px-1 rounded bg-sky-400 text-slate-950 font-black whitespace-nowrap">${badgeLabel}</span>` : ''}
        </div>
      </div>
      <div class="flex-1 flex flex-col items-center justify-center py-2 px-1.5 relative min-w-0">
        <div class="absolute top-1 left-1">${skillBadge}</div>
        <div class="text-xl leading-none">${c.svg}</div>
        <div class="text-xs font-black text-white mt-1 text-center leading-tight truncate w-full">${c.title}</div>
        <div class="text-[10px] text-slate-400 truncate w-full text-center">${c.origTitle}</div>
      </div>
      <div class="bg-slate-950/90 border-t border-slate-800 px-2 py-1 flex items-center justify-between text-[10px]">
        <span class="font-black text-rose-400 whitespace-nowrap">💎-${c.salary}/回</span>
        <span class="font-bold text-slate-300 whitespace-nowrap">${c.role === 'ENGINEER' ? '抵1危機' : `技能 ${c.skill}`}</span>
      </div>
    </div>
  `;
}

// V13.2 Ultra-Compact Hand Card (w-[92px] h-[118px] on mobile -> fits ~3.8 cards horizontally, saves vertical space!)
function renderActionCardHTML(actUid, extraClasses = '', playStatus = null, isSelected = false, isDiscardChecked = false) {
  const c = CARDS_BY_ID[actUid];
  if (!c) return '';
  const meta = DEPT_META[c.dept] || DEPT_META.PURPLE;
  const isAttack = c.category === 'ATTACK' || c.category === 'CRISIS' || c.category === 'VP_ATTACK';

  let reqBarHTML = '';
  if (c.dept === 'PURPLE') {
    reqBarHTML = `<div class="text-[9px] font-black text-amber-300 bg-purple-950/90 px-1 py-0.5 rounded-full border border-amber-400 whitespace-nowrap leading-none">👑皇室≥${c.reqVPs || 2}</div>`;
  } else {
    const pills = [0, 1, 2, 3].map(num => {
      const active = c.reqSkills.includes(num);
      return active
        ? `<span class="w-3.5 h-3.5 rounded-full bg-slate-950 border border-white text-white text-[9px] font-black flex items-center justify-center shadow">${num}</span>`
        : `<span class="w-3.5 h-3.5 rounded-full bg-black/30 text-white/40 text-[9px] flex items-center justify-center">${num}</span>`;
    }).join('');
    reqBarHTML = `<div class="flex items-center justify-center gap-0.5">${pills}</div>`;
  }

  const valueBadge = c.effect === 'GAIN_FUNDS'
    ? `<span class="px-1 py-0.5 rounded bg-emerald-950 border border-emerald-400 text-[9px] font-black text-emerald-300 leading-none">+${c.val}💎</span>`
    : c.effect === 'BAD_IDEA'
    ? `<span class="text-[9px] font-black text-amber-300 bg-rose-950/90 px-1 py-0.5 rounded border border-rose-500/50 leading-none">⚒×${c.val}</span>`
    : '';

  const lockFooterHTML = (playStatus && !playStatus.playable && uiSelection.mode !== 'DISCARD_SELECT')
    ? `<div class="bg-rose-950/90 border-t border-rose-500/50 px-1 py-0.5 text-center min-w-0">
         <span class="text-[9px] font-extrabold text-rose-200 block truncate">🔒${playStatus.shortReason}</span>
       </div>`
    : `<div class="bg-slate-950/90 border-t border-slate-800 px-1 py-0.5 min-w-0">
         <p class="text-[9px] text-slate-300 leading-none text-center truncate">${c.desc}</p>
       </div>`;

  return `
    <div data-act-uid="${c.uid}" class="w-[96px] sm:w-[128px] h-[128px] sm:h-[164px] rounded-xl ${isAttack ? 'spell-card-sigil-atk' : 'spell-card-sigil'} border-2 ${meta.border} ${c.dept === 'PURPLE' ? 'vp-card-frame' : ''} ${(playStatus && playStatus.playable && uiSelection.mode !== 'DISCARD_SELECT') ? 'playable-card-glow' : ''} overflow-hidden flex flex-col justify-between text-left shadow-xl cursor-pointer relative shrink-0 snap-start ${extraClasses} ${isSelected ? 'selected-card' : ''}">
      <div class="${meta.color} px-1 py-0.5 flex flex-col items-center gap-0.5 relative min-w-0">
        <div class="w-full flex items-center justify-between text-[9px] font-extrabold text-white gap-0.5 min-w-0 leading-none">
          <span class="truncate">${meta.icon}${meta.short}</span>
          <span class="px-1 rounded text-[9px] whitespace-nowrap shrink-0 ${isAttack ? 'bg-rose-950 text-rose-200' : 'bg-slate-950/80 text-emerald-200'}">${isAttack ? '▲攻' : '🛡️防'}</span>
        </div>
        ${reqBarHTML}
      </div>

      <div class="flex-1 px-1 py-0.5 flex flex-col items-center justify-center relative min-w-0">
        <div class="text-base leading-none">${c.svg}</div>
        <div class="text-[10px] font-black ${isAttack ? 'text-rose-300' : 'text-white'} mt-0.5 text-center leading-tight truncate w-full">${c.title}</div>
        ${valueBadge || `<div class="text-[9px] text-slate-400 truncate w-full text-center">${c.origTitle}</div>`}
      </div>

      ${lockFooterHTML}

      ${isDiscardChecked ? `<div class="absolute inset-0 bg-orange-950/80 flex items-center justify-center border-2 border-orange-400"><span class="px-1.5 py-0.5 rounded bg-orange-600 text-white text-[10px] font-black">🗑️已勾選</span></div>` : ''}
    </div>
  `;
}

function resetSelectionState() {
  uiSelection.mode = 'IDLE';
  uiSelection.sourceCardUid = null;
  uiSelection.step2OpponentId = null;
  uiSelection.discardSet.clear();
  uiSelection.layoffSet.clear();
  const drawer = document.getElementById('modeDTargetDrawer');
  if (drawer) drawer.classList.add('hidden');
}

function updateSettingsMenuUI() {
  const isFs = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
  const pwaLabel = document.getElementById('menuPwaLabel');
  if (pwaLabel) {
    pwaLabel.textContent = deferredPwaPrompt ? '📲 安裝PWA' : isRunningStandalonePWA() ? '✔ PWA全螢幕' : isFs ? '✕ 退出全螢幕' : '⛶ 全螢幕/PWA';
  }
  const topFsBtn = document.getElementById('btnHeaderFullscreen');
  if (topFsBtn) {
    if (isRunningStandalonePWA()) {
      topFsBtn.classList.add('hidden');
    } else {
      topFsBtn.classList.remove('hidden');
      topFsBtn.textContent = deferredPwaPrompt ? '📲 安裝App' : isFs ? '✕ 退出全螢幕' : '⛶ 全螢幕';
    }
  }
  const speedLabel = document.getElementById('menuSpeedLabel');
  if (speedLabel) {
    speedLabel.textContent = animSpeedMultiplier === 1 ? '1x 標準速度' : '2x 快轉中';
  }
  const muteIcon = document.getElementById('menuMuteIcon');
  const muteLabel = document.getElementById('menuMuteLabel');
  if (muteIcon && muteLabel) {
    muteIcon.textContent = isMuted ? '🔇' : '🔊';
    muteLabel.textContent = isMuted ? '已靜音' : '音效開啟';
  }
  if (gameState) {
    const modeText = document.getElementById('settingsModeText');
    const ruleText = document.getElementById('settingsRuleText');
    if (modeText) {
      modeText.textContent = gameSession.mode === 'SOLO'
        ? '單機挑戰 AI'
        : `連線房號 ${gameSession.roomCode} (${getLocalPlayerId().toUpperCase()})`;
    }
    if (ruleText) {
      ruleText.textContent = gameState.config.playDiscardMode === 'STRICT_EITHER' ? '標準二選一' : '共用4額度';
    }
    const takeoverBox = document.getElementById('settingsHostTakeoverBox');
    if (takeoverBox) {
      const turnActor = gameState.phase === 'INITIAL_DRAFT'
        ? gameState.players[gameState.draft.pickerIndex]
        : gameState.players[gameState.turn.activePlayerIndex];
      if (gameSession.mode === 'HOST' && turnActor && turnActor.id !== 'p1') {
        takeoverBox.classList.remove('hidden');
        takeoverBox.innerHTML = `
          <button id="btnMenuHostTakeover" data-takeover-seat="${turnActor.id}" class="w-full py-2 px-3 rounded-xl bg-purple-900 border border-purple-400 text-xs font-black text-purple-100">
            🤖 切換【${getShortPlayerName(turnActor.name)}】為 ${turnActor.isAI ? '真人手動控制' : 'AI 自動代打'}
          </button>
        `;
        document.getElementById('btnMenuHostTakeover')?.addEventListener('click', () => {
          toggleMidGameAITakeover(turnActor.id);
          updateSettingsMenuUI();
        });
      } else {
        takeoverBox.classList.add('hidden');
      }
    }
  }
}

/********************************************************************
 * FULL RENDERING PIPELINE (V13.2 Clean Layout + Popup Opponent Modal)
 ********************************************************************/
function renderAll() {
  const state = gameState;
  if (!state) return;

  const myId = getLocalPlayerId();
  const localPlayer = getLocalPlayer(state);
  const activePlayer = state.players[state.turn.activePlayerIndex];
  const isMyTurnNow = isLocalPlayerTurn(state);
  const turnActor = state.phase === 'INITIAL_DRAFT' ? state.players[state.draft.pickerIndex] : activePlayer;

  // Keep viewedPlayerId locked to localPlayer so Central Zone 3 ALWAYS shows our own castle!
  viewedPlayerId = myId;

  // 1. Compact Top Header Status
  document.getElementById('phaseBadge').textContent =
    state.phase === 'INITIAL_DRAFT' ? `首輪 ${state.draft.totalPicked}/${state.draft.targetTotal}` :
    state.phase === 'GAME_OVER' ? '結束' : `R${state.turn.roundNumber}`;

  const activeBadge = document.getElementById('activePlayerBadge');
  if (activeBadge) {
    activeBadge.textContent = isMyTurnNow
      ? `👑我方回合`
      : `⚡${getShortPlayerName(turnActor.name)}行動中`;
    activeBadge.className = isMyTurnNow
      ? 'px-1.5 py-0.5 rounded bg-emerald-950/90 border border-emerald-400 text-[10px] font-black text-emerald-300 truncate'
      : 'px-1.5 py-0.5 rounded bg-amber-950/90 border border-amber-400 text-[10px] font-black text-amber-300 truncate';
  }

  const ruleShort = state.config.playDiscardMode === 'STRICT_EITHER' ? '二選一' : '共用4';
  const netTag = gameSession.mode === 'SOLO'
    ? `單機·${ruleShort}`
    : `🌐${gameSession.roomCode}·${myId.toUpperCase()}`;
  const modeTagEl = document.getElementById('modeIndicatorTag');
  if (modeTagEl) modeTagEl.textContent = netTag;

  updateSettingsMenuUI();

  // Only show Hot-Seat Switcher Bar if Host explicitly added a simulated local human seat
  const perspectiveBar = document.getElementById('hotSeatSwitcherBar');
  if (perspectiveBar) {
    if (gameSession.mode !== 'CLIENT' && gameSession.hasSimulatedHotSeat) {
      perspectiveBar.classList.remove('hidden');
      perspectiveBar.innerHTML = `
        <div class="flex items-center justify-between gap-1 w-full">
          <span class="text-[9px] font-black text-amber-300 truncate">🎮 同機視角：</span>
          <div class="flex items-center gap-1 shrink-0">
            ${state.players.map(p => `
              <button data-switch-seat="${p.id}" class="px-1.5 py-0.5 rounded text-[9px] font-black border ${p.id === myId ? 'bg-emerald-500 text-slate-950 border-white shadow' : 'bg-slate-900 text-slate-300 border-slate-700'}">
                ${p.id.toUpperCase()} ${getShortPlayerName(p.name)}
              </button>
            `).join('')}
          </div>
        </div>
      `;
    } else {
      perspectiveBar.classList.add('hidden');
    }
  }

  // 2-Line Compact Battle Log Ticker
  const tickerEl = document.getElementById('latestLogTicker');
  if (tickerEl) {
    const line1 = formatLogItemToTickerHTML(state.logs[0] || '', true);
    const line2 = state.logs[1] ? formatLogItemToTickerHTML(state.logs[1], false) : '';
    tickerEl.innerHTML = line1 + line2;
  }

  // 2. ZONE 1 (TOP): Enlarged Opponents Row (Click opens Opponent Castle Popup Modal!)
  const seatTabsBar = document.getElementById('seatTabsBar');
  const opponents = getClockwiseOpponents(state);
  const oppCount = opponents.length;
  seatTabsBar.className = `w-full grid ${oppCount === 1 ? 'grid-cols-1' : oppCount === 3 ? 'grid-cols-3' : 'grid-cols-2'} gap-1.5 min-w-0 shrink-0`;

  seatTabsBar.innerHTML = opponents.map((pl) => {
    const idx = state.players.findIndex(p => p.id === pl.id);
    const burn = getPlayerBurnRate(pl);
    const isTurn = (state.phase === 'INITIAL_DRAFT' ? state.draft.pickerIndex === idx : state.turn.activePlayerIndex === idx);
    const isNearBankrupt = !pl.isEliminated && burn > 0 && pl.crystals < burn * 2;
    const cleanShortName = getShortPlayerName(pl.name).replace(/\s*\(AI.*?\)/g, '');
    const totalCrisisReq = getCrisisTotalEngineerReq(pl);
    const handCnt = typeof pl.handCount === 'number' ? pl.handCount : pl.hand.length;
    const vpCnt = getTotalVPCount(pl);

    const skillDots = ['RED', 'YELLOW', 'BLUE', 'GREEN'].map(d => {
      const meta = DEPT_META[d];
      const sk = getEffectiveSkill(pl, d);
      const vp = hasVPInDept(pl, d);
      return `<span class="rounded-md ${meta.badgeBg} border ${meta.border} text-[10px] sm:text-xs font-black text-white text-center py-0.5 whitespace-nowrap shadow">${meta.icon}${sk}級${vp ? '👑' : ''}</span>`;
    }).join('');

    let modeDSeatState = null;
    if (uiSelection.mode === 'MODE_D_SELECT' && uiSelection.sourceCardUid && !pl.isEliminated) {
      const selCard = CARDS_BY_ID[uiSelection.sourceCardUid];
      const selStatus = evaluateCardPlayability(state, localPlayer, selCard.uid);
      if (selStatus.playable && (selCard.effect === 'BAD_IDEA' || selCard.effect === 'VP_DOUBLE_PAY' || (selCard.effect === 'FORCE_HIRE' && !uiSelection.step2OpponentId))) {
        modeDSeatState = (selStatus.validOpponents && selStatus.validOpponents.includes(pl.id)) ? 'VALID_TARGET' : 'IMMUNE_TARGET';
      }
    }

    const turnBadge = pl.isEliminated
      ? `<span class="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-bold">💀破產</span>`
      : modeDSeatState === 'VALID_TARGET'
      ? `<span class="px-2 py-0.5 rounded bg-rose-600 text-white border border-white text-[10px] font-black shadow">🎯點此直擊</span>`
      : modeDSeatState === 'IMMUNE_TARGET'
      ? `<span class="px-1.5 py-0.5 rounded bg-slate-800 text-sky-300 border border-sky-500/50 text-[10px] font-bold">🛡️免疫</span>`
      : isTurn
      ? `<span class="px-2 py-0.5 rounded bg-amber-400 text-slate-950 text-[10px] font-black shadow">⚡${state.phase === 'INITIAL_DRAFT' ? '選牌' : `${state.turn.actionsUsed}/4`}</span>`
      : `<span class="px-2 py-0.5 rounded-md bg-slate-800 text-sky-300 border border-sky-500/40 text-[10px] font-extrabold">🔍偵察·🎴${handCnt}</span>`;

    const activeTurnNotMe = !isMyTurnNow && !isTurn && state.phase !== 'INITIAL_DRAFT';
    const roleIcon = pl.isAI ? '😈' : '👤';

    return `
      <button data-seat-tab="${pl.id}" data-mode-d-seat="${modeDSeatState || ''}" class="rounded-xl p-2 text-left transition flex flex-col justify-between gap-1 border ${pl.isEliminated ? 'bg-slate-950/80 border-slate-800 opacity-40' : modeDSeatState === 'VALID_TARGET' ? 'bg-rose-950/90 border-2 border-rose-400 targetable-seat-glow' : modeDSeatState === 'IMMUNE_TARGET' ? 'bg-slate-950/80 border-slate-700 opacity-60' : isTurn ? 'bg-indigo-950/90 border-2 border-amber-400 active-turn-seat' : 'bg-slate-900/95 border-slate-700'} ${activeTurnNotMe ? 'opacity-80' : ''} ${isNearBankrupt ? 'danger-pulse' : ''} min-w-0 shadow-lg">
        <!-- Row 1: Demon Name + Inspect/Hand Badge -->
        <div class="flex items-center justify-between w-full gap-1 min-w-0">
          <span class="text-xs sm:text-sm font-black ${isTurn ? 'text-amber-300' : 'text-white'} truncate">${roleIcon} ${cleanShortName}</span>
          ${turnBadge}
        </div>
        <!-- Row 2: Enlarged Economy & Royal Pills -->
        <div class="grid grid-cols-3 gap-1 w-full min-w-0">
          <span class="rounded bg-emerald-950/85 border border-emerald-500/40 px-1 py-0.5 text-[11px] font-black text-emerald-400 text-center whitespace-nowrap">💎${pl.crystals}</span>
          <span class="rounded bg-rose-950/85 border border-rose-500/40 px-1 py-0.5 text-[11px] font-black text-rose-400 text-center whitespace-nowrap">🔥-${burn}/回</span>
          <span class="rounded bg-purple-950/85 border border-purple-500/40 px-1 py-0.5 text-[10px] font-black text-purple-200 text-center whitespace-nowrap">👑皇室:${vpCnt}</span>
        </div>
        <!-- Row 3: Clear Workforce & Crisis Strip -->
        <div class="grid grid-cols-3 gap-1 w-full bg-slate-950/90 border border-slate-800 rounded-md px-1.5 py-0.5 text-[10px] font-bold text-center min-w-0">
          <span class="text-red-200 whitespace-nowrap">⚒苦工 <b>${pl.engineers.length}</b></span>
          <span class="${pl.crises.length > 0 ? 'text-amber-300 font-black' : 'text-slate-400'} whitespace-nowrap">⚠️危機 <b>${pl.crises.length}</b>${totalCrisisReq > 0 ? `(${totalCrisisReq})` : ''}</span>
          <span class="${pl.outsourcedCount > 0 ? 'text-rose-300 font-black' : 'text-slate-400'} whitespace-nowrap">👹外包 <b>${pl.outsourcedCount}</b></span>
        </div>
        <!-- Row 4: 4-Department Skill Badges -->
        <div class="grid grid-cols-4 gap-1 w-full min-w-0">
          ${skillDots}
        </div>
      </button>
    `;
  }).join('');

  // 3. ZONE 2: Enlarged Public 4-Column Job Bank Portrait Cards (Expands to fill upper space!)
  const condensedStrip = document.getElementById('condensedJobBankPills');
  condensedStrip.innerHTML = ['RED', 'YELLOW', 'BLUE', 'GREEN'].map(d => {
    const meta = DEPT_META[d];
    const deck = state.jobBank[d];
    const topUid = deck[0];
    if (!topUid) {
      return `
        <div class="jobbank-portrait-card bg-slate-950 border border-slate-800 text-center min-w-0">
          <div class="text-[10px] font-bold text-slate-500 truncate">${meta.icon}${meta.short}(0)</div>
          <div class="text-[10px] text-slate-500 my-auto">已抽乾</div>
        </div>
      `;
    }
    const topCard = CARDS_BY_ID[topUid];
    const avSrc = GPT_MINI_AVATAR[topCard.tplId] || GPT_FULLCARD_ART[topCard.tplId] || '';
    const skillTag = topCard.role === 'ENGINEER' ? '⚒苦工·$1' : `${topCard.isVP ? '👑' : ''}${topCard.skill}級·$${topCard.salary}`;
    return `
      <button data-open-bank-dept="${d}" class="jobbank-portrait-card ${meta.panelBg} border ${meta.border} text-left shadow-md min-w-0">
        <!-- Top Header: Dept Name + Remaining Deck Count -->
        <div class="flex items-center justify-between w-full gap-0.5 min-w-0 shrink-0 mb-0.5">
          <span class="text-[10px] font-black ${meta.text} whitespace-nowrap">${meta.icon}${meta.short}</span>
          <span class="text-[9px] font-bold text-slate-300 whitespace-nowrap">剩${deck.length}</span>
        </div>
        <!-- Middle Portrait Window (Flex-1 expands cleanly to eliminate vertical voids) -->
        <div class="jobbank-portrait-art-wrap">
          ${avSrc ? `<img src="${avSrc}" alt="${topCard.title}" class="jobbank-portrait-art-img" />` : `<div class="w-full h-full flex items-center justify-center text-base">${meta.icon}</div>`}
          <span class="absolute bottom-0.5 right-0.5 px-1 py-0.5 rounded bg-slate-950/90 border border-amber-400/60 text-[9px] font-black text-amber-300 leading-none whitespace-nowrap shadow">${skillTag}</span>
        </div>
        <!-- Bottom Full-Width Character Title (Never clipped by side avatar!) -->
        <div class="text-[10px] sm:text-xs font-black text-white truncate w-full text-center mt-1 shrink-0">${topCard.title}</div>
      </button>
    `;
  }).join('');

  // 4. Handle Initial Draft Stage vs Main Castle Stage
  const draftStage = document.getElementById('draftStageSection');
  const companyStage = document.getElementById('companyStageSection');
  if (state.phase === 'INITIAL_DRAFT') {
    draftStage.classList.remove('hidden');
    companyStage.classList.add('hidden');
    document.getElementById('draftProgressSub').textContent =
      `進度：第 ${state.draft.round}/4 輪（輪到【${state.players[state.draft.pickerIndex].name}】挑選）`;

    document.getElementById('draftBankCardsGrid').innerHTML = ['RED', 'YELLOW', 'BLUE', 'GREEN'].map(d => {
      const topUid = state.jobBank[d][0];
      const meta = DEPT_META[d];
      if (!topUid) return `<div class="dept-card-scroll p-4 text-center text-slate-500">已抽乾</div>`;
      const emp = CARDS_BY_ID[topUid];
      const canPick = isMyTurnNow && !(emp.isVP && hasVPInDept(localPlayer, d));
      return `
        <div data-draft-dept="${d}" class="shrink-0 snap-start flex flex-col gap-1 min-w-0">
          <div class="flex items-center justify-between text-[10px] px-1 shrink-0">
            <span class="font-black ${meta.text} truncate">${meta.icon}${meta.short}</span>
            <span class="text-slate-400 whitespace-nowrap">剩${state.jobBank[d].length}張</span>
          </div>
          ${renderEmployeeCardHTML(topUid, (canPick ? 'cursor-pointer ' : 'opacity-60 ') + 'dept-card-scroll', canPick ? '點擊招募' : '')}
        </div>
      `;
    }).join('');
  } else {
    draftStage.classList.add('hidden');
    companyStage.classList.remove('hidden');
  }

  // 5. ZONE 3 (CENTER): Render Local Player's 4-Department Castle Stage (V13.2 Comfortable Scroll Card Size)
  recalcPlayerStats(localPlayer);
  const deptGrid = document.getElementById('companyDepartmentsGrid');
  deptGrid.className = 'stage-track-scroll no-scrollbar min-w-0';

  deptGrid.innerHTML = ['RED', 'YELLOW', 'BLUE', 'GREEN'].map(d => {
    const meta = DEPT_META[d];
    const deptArr = localPlayer.departments[d];

    if (deptArr.length === 0) {
      return `
        <div data-empty-dept="${d}" class="dept-card-scroll empty-rune-slot rounded-xl border-2 border-dashed ${meta.border} overflow-hidden flex flex-col justify-between p-2.5 min-w-0 relative cursor-pointer transition">
          <div class="flex items-center justify-between w-full gap-1">
            <span class="w-5 h-5 text-[10px] rounded-full bg-slate-950 border border-slate-600 text-slate-400 flex items-center justify-center font-black shadow shrink-0">0</span>
            <span class="text-[11px] font-black ${meta.text} truncate">${meta.icon}${meta.name}</span>
            <span class="px-1 py-0.5 rounded bg-slate-900 border border-slate-700 text-[9px] font-bold text-slate-400 shrink-0">空城</span>
          </div>
          <div class="flex flex-col items-center justify-center text-center my-auto px-1">
            <div class="w-11 h-11 text-xl rounded-full ${meta.panelBg} border ${meta.border} flex items-center justify-center opacity-60 shadow-lg">${meta.icon}</div>
            <span class="text-xs mt-1.5 font-black text-slate-300">缺工空城 (0級)</span>
            <span class="text-[10px] text-slate-400 mt-0.5 leading-tight">無主管駐守，檢定視為 0 級</span>
          </div>
          <div class="bg-slate-950/90 border border-slate-800 rounded-lg py-0.5 px-1.5 flex items-center justify-between text-[9px] text-slate-400">
            <span>💎0</span>
            <span class="text-sky-300 font-bold truncate">點人才池招募 ▸</span>
          </div>
        </div>
      `;
    }

    const headUid = deptArr[0];
    const hCard = CARDS_BY_ID[headUid];
    const subordinates = deptArr.slice(1);
    const isNewlyFlipped = window.lastFlippedDeptKey === `${localPlayer.id}_${d}`;

    return `
      <div data-inspect-dept="${d}" data-inspect-player="${localPlayer.id}" class="dept-card-scroll tilt-card-3d ${isNewlyFlipped ? 'anim-flip-in' : ''} rounded-xl bg-slate-950 border-2 ${meta.border} ${hCard.isVP ? 'vp-card-frame' : ''} overflow-hidden cursor-pointer shadow-xl min-w-0 relative">
        ${getCardImgTag(hCard.tplId, hCard.title, 'w-full h-full object-cover block')}
        <div class="holo-sheen-layer"></div>
        <span class="absolute bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full text-[9px] font-black shadow-lg whitespace-nowrap z-20 bg-slate-950/90 border border-amber-400 text-amber-300">👑我方${subordinates.length > 0 ? ` +${subordinates.length}下屬` : ''}</span>
      </div>
    `;
  }).join('');

  // 5A-2. ZONE 4 (LOWER-MIDDLE): Render My Permanent Hero Status Bar (#myHeroStatusBar)
  const myBurn = getPlayerBurnRate(localPlayer);
  const myCrisisReq = getCrisisTotalEngineerReq(localPlayer);
  const myCrisisCnt = localPlayer.crises.length;
  const myHeroBar = document.getElementById('myHeroStatusBar');
  if (myHeroBar) {
    myHeroBar.className = `w-full rounded-xl bg-slate-950/95 border-2 ${isMyTurnNow ? 'border-amber-400 shadow-lg' : 'border-slate-700'} px-2.5 py-1.5 flex flex-col gap-1 transition min-w-0`;
    myHeroBar.innerHTML = `
      <div class="flex items-center justify-between gap-1.5 min-w-0">
        <div class="flex items-center gap-1.5 min-w-0 flex-1">
          <span class="px-1.5 py-0.5 rounded text-[10px] font-black whitespace-nowrap shrink-0 ${isMyTurnNow ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-amber-300'}">👑 我方 (${myId.toUpperCase()})</span>
          <span class="text-xs font-black text-white truncate">${getShortPlayerName(localPlayer.name)}</span>
          <span class="px-1.5 py-0.5 rounded bg-purple-950 border border-purple-400 text-[9px] font-black text-purple-200 whitespace-nowrap shrink-0">👑皇室:${getTotalVPCount(localPlayer)}</span>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <span class="px-2 py-0.5 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-xs font-black text-emerald-400 whitespace-nowrap">💎${localPlayer.crystals}</span>
          <span class="px-2 py-0.5 rounded-lg bg-rose-950/70 border border-rose-500/50 text-xs font-black text-rose-400 whitespace-nowrap">🔥-${myBurn}/回</span>
        </div>
      </div>
      <div class="grid grid-cols-3 gap-1.5 w-full min-w-0">
        <button data-inspect-eng="${myId}" class="rounded-lg bg-red-950/60 border border-red-500/40 px-2 py-0.5 text-left flex items-center justify-between min-w-0">
          <span class="text-[10px] font-bold text-red-200 truncate">⚒苦工:${localPlayer.engineers.length}</span>
          <span class="text-[10px] font-black text-rose-300 whitespace-nowrap shrink-0">💎-${localPlayer.engineers.length} 🔍</span>
        </button>
        <button data-inspect-crises="${myId}" class="rounded-lg ${myCrisisCnt > 0 ? 'bg-amber-950/80 border border-amber-400' : 'bg-slate-900 border border-slate-700'} px-2 py-0.5 text-left flex items-center justify-between min-w-0">
          <span class="text-[10px] font-bold ${myCrisisCnt > 0 ? 'text-amber-200' : 'text-slate-400'} whitespace-nowrap">⚠️危機:${myCrisisCnt}</span>
          <span class="text-[10px] font-black ${myCrisisCnt > 0 ? 'text-amber-300' : 'text-slate-500'} whitespace-nowrap shrink-0">需${myCrisisReq} 🔍</span>
        </button>
        <button data-inspect-outsourced="${myId}" class="rounded-lg ${localPlayer.outsourcedCount > 0 ? 'bg-rose-950/90 border border-rose-400' : 'bg-slate-900 border border-slate-700'} px-2 py-0.5 text-left flex items-center justify-between min-w-0">
          <span class="text-[10px] font-bold ${localPlayer.outsourcedCount > 0 ? 'text-rose-200' : 'text-slate-400'} truncate">👹外包:${localPlayer.outsourcedCount}</span>
          <span class="text-[10px] font-black ${localPlayer.outsourcedCount > 0 ? 'text-rose-300' : 'text-slate-500'} whitespace-nowrap shrink-0">💎-${localPlayer.outsourcedCount * 3} 🔍</span>
        </button>
      </div>
    `;
  }

  // 6. Render Mode D Tactical Targeting Drawer
  renderModeDDrawer();

  // 7. Render Local Player Compact Hand & Controls
  const isHumanStep1 = state.phase === 'STEP1_PLAY_OR_DISCARD' && isMyTurnNow;
  document.getElementById('quotaCounterText').textContent = `額度: ${state.turn.actionsUsed}/${state.turn.maxActions}`;
  document.getElementById('actionDeckCountText').textContent = state.actionDeck.length;
  document.getElementById('discardPileCountText').textContent = state.discardPile.length;

  const handContainer = document.getElementById('localHandContainer');
  const playableBadge = document.getElementById('playableCountBadge');
  if (localPlayer.hand.length === 0) {
    if (playableBadge) playableBadge.textContent = '無手牌';
    handContainer.innerHTML = `<div class="text-xs text-slate-400 py-3 mx-auto text-center">${state.phase === 'INITIAL_DRAFT' ? '🎲 請先在上方完成「首輪召喚」（挑選 4 名部下），結束後將發放 6 張手牌！' : '目前無手牌'}</div>`;
  } else {
    const evaluatedHand = localPlayer.hand.map(hUid => {
      const status = isHumanStep1 ? evaluateCardPlayability(state, localPlayer, hUid) : { playable: false, shortReason: '等待回合', reason: '非我方出牌階段' };
      return { hUid, status };
    });
    const playableCount = evaluatedHand.filter(item => item.status.playable).length;
    if (playableBadge) {
      playableBadge.textContent = isHumanStep1 ? `✨可出 ${playableCount} 張` : '等待對手';
      playableBadge.className = isHumanStep1 && playableCount > 0
        ? 'px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-400 text-[10px] font-black text-emerald-300 whitespace-nowrap shrink-0'
        : 'px-1.5 py-0.5 rounded bg-slate-800 border border-slate-600 text-[10px] font-bold text-slate-400 whitespace-nowrap shrink-0';
    }
    evaluatedHand.sort((a, b) => (b.status.playable ? 1 : 0) - (a.status.playable ? 1 : 0));

    handContainer.innerHTML = evaluatedHand.map(({ hUid, status }) => {
      const isSelected = uiSelection.sourceCardUid === hUid;
      const isDiscardChecked = uiSelection.discardSet.has(hUid);
      const extraCls = uiSelection.mode === 'DISCARD_SELECT'
        ? 'hand-card'
        : status.playable
        ? 'hand-card'
        : 'hand-card unplayable-card';
      return renderActionCardHTML(hUid, extraCls, status, isSelected, isDiscardChecked);
    }).join('');
  }

  const btnDiscardMode = document.getElementById('btnToggleDiscardMode');
  const btnConfirmDiscard = document.getElementById('btnConfirmDiscard');
  const btnEndTurn = document.getElementById('btnEndTurn');

  const canEnterDiscard = isHumanStep1 &&
    (state.turn.actionsUsed < state.turn.maxActions) &&
    (state.config.playDiscardMode === 'SHARED_QUOTA_4' || !state.turn.hasPlayedCard);

  btnDiscardMode.disabled = !canEnterDiscard;
  btnDiscardMode.classList.toggle('opacity-40', !canEnterDiscard);
  btnDiscardMode.textContent = uiSelection.mode === 'DISCARD_SELECT' ? '↩ 返回出牌' : '🗑️ 棄牌濾牌';

  if (uiSelection.mode === 'DISCARD_SELECT') {
    btnConfirmDiscard.classList.remove('hidden');
    btnConfirmDiscard.textContent = `✔ 確認棄置 (${uiSelection.discardSet.size})`;
  } else {
    btnConfirmDiscard.classList.add('hidden');
  }

  btnEndTurn.disabled = !isHumanStep1;
  btnEndTurn.classList.toggle('opacity-50', !isHumanStep1);
  btnEndTurn.textContent = isHumanStep1 ? '⏭️ 結束出牌 ➔ 發薪' : `⏳ ${getShortPlayerName(turnActor.name)} 行動中...`;
  const handDock = document.getElementById('myHandDockSection');
  if (handDock) {
    handDock.className = `bg-slate-950/90 border-t-2 ${isHumanStep1 ? 'border-amber-400' : 'border-slate-800 opacity-85'} rounded-xl px-2 py-1.5 flex flex-col gap-1 shadow-2xl transition min-w-0`;
  }

  attachDynamicBoardListeners();
}

function renderModeDDrawer() {
  const drawer = document.getElementById('modeDTargetDrawer');
  const container = document.getElementById('modeDTargetsContainer');
  const titleEl = document.getElementById('modeDTitle');
  const pillEl = document.getElementById('modeDPillTag');

  if (uiSelection.mode !== 'MODE_D_SELECT' || !uiSelection.sourceCardUid) {
    drawer.classList.add('hidden');
    return;
  }

  clearDuelBannersVFX();

  const state = gameState;
  const localPlayer = getLocalPlayer(state);
  const card = CARDS_BY_ID[uiSelection.sourceCardUid];
  const status = evaluateCardPlayability(state, localPlayer, card.uid);
  if (!status.playable) {
    resetSelectionState();
    return;
  }

  drawer.classList.remove('hidden');
  const aliveOpponents = getClockwiseOpponents(state).filter(p => !p.isEliminated);

  const getPortraitHTML = (empCard) => {
    if (!empCard) {
      return `<div class="portrait-target-avatar bg-slate-950 border border-dashed border-slate-600 flex items-center justify-center text-sm">🏰</div>`;
    }
    const avSrc = GPT_MINI_AVATAR[empCard.tplId];
    return avSrc
      ? `<img src="${avSrc}" alt="${empCard.title}" class="portrait-target-avatar" />`
      : `<div class="portrait-target-avatar bg-slate-950 flex items-center justify-center text-base">${empCard.svg}</div>`;
  };

  if (card.effect === 'GAIN_FUNDS') {
    if (pillEl) {
      pillEl.textContent = '💎 徵收魔晶';
      pillEl.className = 'px-1.5 py-0.5 rounded bg-emerald-400 text-slate-950 font-black text-[10px] whitespace-nowrap shrink-0';
    }
    titleEl.textContent = `「${card.title}」— 點擊入帳（或再點一次手牌秒出）`;
    const gHeadUid = localPlayer.departments.GREEN[0];
    const gHeadCard = gHeadUid ? CARDS_BY_ID[gHeadUid] : null;
    const gSkill = getEffectiveSkill(localPlayer, 'GREEN');
    const nextCrystals = localPlayer.crystals + card.val;

    container.className = 'w-full min-w-0';
    container.innerHTML = `
      <button data-d-action="CONFIRM_FUNDS" class="w-full rounded-xl bg-emerald-950/80 border-2 border-emerald-400 p-2 text-left shadow-xl flex items-center justify-between gap-2 min-w-0">
        <div class="flex items-center gap-2 min-w-0 flex-1">
          ${getPortraitHTML(gHeadCard)}
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1">
              <span class="px-1.5 py-0.5 rounded bg-emerald-700 text-white text-[9px] font-black">💎金庫 ${gSkill}級認證</span>
              <span class="text-[10px] text-emerald-200 truncate">${gHeadCard ? gHeadCard.title : '缺工空城 (0級)'}</span>
            </div>
            <div class="text-xs font-black text-white mt-0.5 truncate">⚡ 立即施放：${card.title}</div>
            <div class="text-[11px] font-extrabold text-amber-300 mt-0.5">
              金庫儲備：💎 ${localPlayer.crystals} ➔ <b class="text-emerald-300">💎 ${nextCrystals}</b>
            </div>
          </div>
        </div>
        <div class="px-2.5 py-1.5 rounded-xl bg-emerald-600 border border-white text-center shrink-0 shadow-lg">
          <div class="text-xs font-black text-white">+${card.val} 💎</div>
          <div class="text-[9px] font-bold text-emerald-100">點擊入帳</div>
        </div>
      </button>
    `;
  } else if (card.effect === 'RELEASE_CRISIS') {
    if (pillEl) {
      pillEl.textContent = '🍾 鎮壓危機';
      pillEl.className = 'px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-black text-[10px] whitespace-nowrap shrink-0';
    }
    titleEl.textContent = `「${card.title}」— 點選要解除的討伐危機：`;
    container.className = `grid ${status.validCrises.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-1.5 w-full min-w-0`;
    container.innerHTML = status.validCrises.map(cUid => {
      const c = CARDS_BY_ID[cUid];
      return `
        <button data-d-action="CONFIRM_RELEASE" data-crisis-uid="${cUid}" class="rounded-xl bg-amber-950/80 border-2 border-amber-400 p-2 text-left shadow-lg flex items-center justify-between gap-2 min-w-0">
          <div class="min-w-0 flex-1">
            <div class="text-xs font-black text-white truncate">${c.svg} ${c.title}</div>
            <div class="text-[10px] text-amber-200 truncate mt-0.5">${c.desc}</div>
            <div class="text-[10px] font-black text-emerald-300 mt-0.5">✨ 省苦工 ×${c.val}</div>
          </div>
          <span class="px-2 py-1 rounded-lg bg-amber-500 text-slate-950 text-[10px] font-black shrink-0 shadow">🍾解除</span>
        </button>
      `;
    }).join('');
  } else if (card.effect === 'HIRE_BANK') {
    if (pillEl) {
      pillEl.textContent = '🤝 契約召喚';
      pillEl.className = 'px-1.5 py-0.5 rounded bg-sky-400 text-slate-950 font-black text-[10px] whitespace-nowrap shrink-0';
    }
    titleEl.textContent = `「契約召喚」— 點選人才池部下加入主城：`;
    container.className = 'grid grid-cols-2 gap-1.5 w-full min-w-0';
    container.innerHTML = ['RED', 'YELLOW', 'BLUE', 'GREEN'].map(d => {
      const topUid = state.jobBank[d][0];
      const meta = DEPT_META[d];
      if (!topUid) return '';
      const emp = CARDS_BY_ID[topUid];
      const isValid = status.validBankDepts.includes(d);
      const curSkill = getEffectiveSkill(localPlayer, d);

      let impactHint = '';
      if (emp.role === 'ENGINEER') {
        impactHint = localPlayer.outsourcedCount > 0 ? '🔥 抵1外包(省2💎)!' : '⚒ 苦工 +1';
      } else if (emp.isVP) {
        impactHint = `👑 空降主管(${emp.skill}級)`;
      } else if (!hasVPInDept(localPlayer, d) && emp.skill > curSkill) {
        impactHint = `✨ ${meta.short}升${emp.skill}級!`;
      } else {
        impactHint = `➕ 納入${meta.short}下屬`;
      }

      if (!isValid) {
        return `
          <div class="rounded-xl bg-slate-900/75 border border-slate-700 p-1.5 opacity-50 flex items-center gap-1.5 min-w-0">
            ${getPortraitHTML(emp)}
            <div class="min-w-0 flex-1">
              <div class="text-[11px] font-bold text-slate-400 truncate">🔒 ${emp.title}</div>
              <div class="text-[9px] text-rose-300">同部門已有皇室</div>
            </div>
          </div>
        `;
      }
      return `
        <button data-d-action="CONFIRM_HIRE" data-dept="${d}" class="rounded-xl ${meta.panelBg} border-2 ${meta.border} p-1.5 text-left shadow-lg flex flex-col justify-between gap-1 min-w-0">
          <div class="flex items-center gap-1.5 min-w-0">
            ${getPortraitHTML(emp)}
            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between gap-0.5">
                <span class="text-[9px] font-extrabold ${meta.text}">${meta.icon}${meta.short}</span>
                <span class="px-1 rounded bg-slate-950 text-amber-300 text-[9px] font-black">${emp.role === 'ENGINEER' ? '⚒苦工' : `${emp.isVP ? '👑' : ''}${emp.skill}級`}</span>
              </div>
              <div class="text-[11px] font-black text-white truncate mt-0.5">${emp.title}</div>
              <div class="text-[9px] font-bold text-rose-300">💎-${emp.salary}/回</div>
            </div>
          </div>
          <div class="w-full flex items-center justify-between bg-slate-950/90 rounded-lg px-1.5 py-0.5 border border-slate-800">
            <span class="text-[9px] font-bold text-emerald-300 truncate">${impactHint}</span>
            <span class="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-black shrink-0">⚡召喚</span>
          </div>
        </button>
      `;
    }).join('');
  } else if (card.effect === 'FIRE_OWN') {
    if (pillEl) {
      pillEl.textContent = '🚪 獻祭遣散';
      pillEl.className = 'px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-black text-[10px] whitespace-nowrap shrink-0';
    }
    titleEl.textContent = `「獻祭遣散」— 點選要遣散的自家部下：`;
    container.className = 'grid grid-cols-2 gap-1.5 w-full min-w-0';
    container.innerHTML = status.validOwnEmployees.map(eUid => {
      const emp = CARDS_BY_ID[eUid];
      const meta = DEPT_META[emp.dept];
      return `
        <button data-d-action="CONFIRM_FIRE" data-emp-uid="${eUid}" class="rounded-xl bg-slate-900 border-2 ${meta.border} p-1.5 text-left shadow-lg flex items-center gap-1.5 min-w-0">
          ${getPortraitHTML(emp)}
          <div class="min-w-0 flex-1">
            <div class="text-[11px] font-black text-white truncate">${emp.title}</div>
            <div class="text-[9px] text-slate-300">${emp.role === 'ENGINEER' ? '⚒苦工' : `${meta.short}·技能${emp.skill}`}｜省💎-${emp.salary}</div>
            <div class="mt-0.5">
              <span class="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[9px] font-black">${emp.isVP ? '👑耗2張遣散' : '🚪遣散'}</span>
            </div>
          </div>
        </button>
      `;
    }).join('');
  } else if (card.effect === 'BAD_IDEA') {
    if (pillEl) {
      pillEl.textContent = '⚔️ 討伐危機';
      pillEl.className = 'px-1.5 py-0.5 rounded bg-rose-500 text-white font-black text-[10px] whitespace-nowrap shrink-0';
    }
    titleEl.textContent = `「${card.title} (對手黑魔 ${card.reqSkills.join('/')} 級)」— 點選目標：`;
    container.className = `grid ${aliveOpponents.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-1.5 w-full min-w-0`;
    container.innerHTML = aliveOpponents.map(opp => {
      const oppSkill = getEffectiveSkill(opp, 'YELLOW');
      const headUid = opp.departments.YELLOW[0];
      const headCard = headUid ? CARDS_BY_ID[headUid] : null;
      const isValid = status.validOpponents.includes(opp.id);
      const curBurn = getPlayerBurnRate(opp);
      const curReq = getCrisisTotalEngineerReq(opp);
      const newReq = curReq + card.val;
      const newOutsourced = Math.max(0, newReq - opp.engineers.length);
      const addedOutsourced = newOutsourced - opp.outsourcedCount;
      const projBurn = curBurn + addedOutsourced * (opp.doubleBurnFlag ? 6 : 3);
      const shortOpp = getShortPlayerName(opp.name);

      if (!isValid) {
        return `
          <div class="rounded-xl bg-slate-900/75 border border-slate-700 p-1.5 opacity-60 flex flex-col justify-between gap-1 min-w-0">
            <div class="flex items-center justify-between gap-1">
              <span class="text-xs font-black text-slate-300 truncate">😈 ${shortOpp}</span>
              <span class="px-1 py-0.5 rounded bg-slate-800 text-sky-300 text-[9px] font-bold shrink-0">🛡️黑魔${oppSkill}級免疫</span>
            </div>
            <div class="flex items-center gap-1.5 bg-slate-950/80 rounded-lg p-1 border border-slate-800">
              ${getPortraitHTML(headCard)}
              <div class="min-w-0 flex-1">
                <div class="text-[10px] font-bold text-slate-300 truncate">${headCard ? headCard.title : '空城(0級)'}</div>
                <div class="text-[9px] text-sky-300">不符 [${card.reqSkills.join(',')}]</div>
              </div>
            </div>
          </div>
        `;
      }

      return `
        <button data-d-action="CONFIRM_BAD_IDEA" data-opp-id="${opp.id}" class="rounded-xl bg-rose-950/90 border-2 border-rose-400 p-1.5 text-left shadow-xl flex flex-col justify-between gap-1 min-w-0">
          <div class="flex items-center justify-between gap-1 w-full">
            <span class="text-xs font-black text-white truncate">🎯 ${shortOpp}</span>
            <span class="px-1 py-0.5 rounded bg-rose-600 text-white text-[9px] font-black shrink-0">黑魔${oppSkill}級可攻</span>
          </div>
          <div class="flex items-center gap-1.5 bg-slate-950/80 rounded-lg p-1 border border-rose-500/50">
            ${getPortraitHTML(headCard)}
            <div class="min-w-0 flex-1">
              <div class="text-[9px] text-amber-300 font-bold truncate">${headCard ? headCard.title : '空城(0級)'}</div>
              <div class="text-[10px] font-extrabold text-white">💎${opp.crystals} ｜ ⚒苦工:${opp.engineers.length}</div>
              <div class="text-[10px] font-black text-rose-300">🔥-${curBurn} ➔ <b class="text-amber-300">🔥-${projBurn}/回</b></div>
            </div>
          </div>
          <div class="w-full py-1 rounded-lg bg-rose-600 text-center text-[10px] font-black text-white shadow">
            ⚔️ 施放討伐危機 ×${card.val}
          </div>
        </button>
      `;
    }).join('');
  } else if (card.effect === 'FORCE_HIRE') {
    if (pillEl) {
      pillEl.textContent = '🪤 強塞魔物';
      pillEl.className = 'px-1.5 py-0.5 rounded bg-rose-500 text-white font-black text-[10px] whitespace-nowrap shrink-0';
    }
    if (!uiSelection.step2OpponentId) {
      titleEl.textContent = `步驟1/2：「強塞魔物 (對手召喚 ${card.reqSkills.join('/')} 級)」— 選對手：`;
      container.className = `grid ${aliveOpponents.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-1.5 w-full min-w-0`;
      container.innerHTML = aliveOpponents.map(opp => {
        const oppSkill = getEffectiveSkill(opp, 'BLUE');
        const bHeadUid = opp.departments.BLUE[0];
        const bHeadCard = bHeadUid ? CARDS_BY_ID[bHeadUid] : null;
        const isValid = status.validOpponents.includes(opp.id);
        const shortOpp = getShortPlayerName(opp.name);
        if (!isValid) {
          return `
            <div class="rounded-xl bg-slate-900/75 border border-slate-700 p-1.5 opacity-60 flex items-center gap-1.5 min-w-0">
              ${getPortraitHTML(bHeadCard)}
              <div class="min-w-0 flex-1">
                <div class="text-xs font-bold text-slate-300 truncate">🛡️ ${shortOpp} (免疫)</div>
                <div class="text-[10px] text-sky-300">召喚祭壇 ${oppSkill}級不符</div>
              </div>
            </div>
          `;
        }
        return `
          <button data-d-action="STEP2_FORCE_HIRE_OPP" data-opp-id="${opp.id}" class="rounded-xl bg-rose-950/90 border-2 border-rose-400 p-1.5 text-left shadow-lg flex flex-col justify-between gap-1 min-w-0">
            <div class="flex items-center gap-1.5 min-w-0">
              ${getPortraitHTML(bHeadCard)}
              <div class="min-w-0 flex-1">
                <div class="text-xs font-black text-white truncate">🎯 ${shortOpp}</div>
                <div class="text-[10px] text-amber-200">召喚：${oppSkill}級 (可強塞)</div>
                <div class="text-[10px] text-rose-300 font-bold">💎${opp.crystals} ｜ 🔥-${getPlayerBurnRate(opp)}/回</div>
              </div>
            </div>
            <div class="w-full py-1 rounded-lg bg-rose-600 text-center text-[10px] font-black text-white shadow">下一步：選人才池魔物 ➔</div>
          </button>
        `;
      }).join('');
    } else {
      const opp = state.players.find(p => p.id === uiSelection.step2OpponentId);
      const allowedDepts = status.validBankByOpponent[opp.id] || [];
      titleEl.textContent = `步驟2/2：點選要強塞給【${getShortPlayerName(opp.name)}】的魔物：`;
      container.className = 'grid grid-cols-2 gap-1.5 w-full min-w-0';
      container.innerHTML = allowedDepts.map(d => {
        const emp = CARDS_BY_ID[state.jobBank[d][0]];
        const meta = DEPT_META[d];
        const oppCurSkill = getEffectiveSkill(opp, d);
        const isSabotageVP = emp.isVP && emp.skill < oppCurSkill;
        return `
          <button data-d-action="CONFIRM_FORCE_HIRE" data-opp-id="${opp.id}" data-dept="${d}" class="rounded-xl ${meta.panelBg} border-2 ${meta.border} p-1.5 text-left shadow-lg flex flex-col justify-between gap-1 min-w-0">
            <div class="flex items-center gap-1.5 min-w-0">
              ${getPortraitHTML(emp)}
              <div class="min-w-0 flex-1">
                <div class="text-[9px] font-bold ${meta.text}">${meta.icon}${meta.short}</div>
                <div class="text-[11px] font-black text-white truncate">${emp.title} ${emp.isVP ? '👑' : ''}</div>
                <div class="text-[9px] text-amber-200">${emp.role === 'ENGINEER' ? '⚒苦工' : `技能 ${emp.skill}`}｜害他💎-${emp.salary}/回</div>
              </div>
            </div>
            <div class="w-full flex items-center justify-between bg-slate-950/90 rounded-lg px-1.5 py-0.5">
              <span class="text-[9px] font-bold text-rose-300 truncate">${isSabotageVP ? `😈壓低至${emp.skill}級!` : `🔥燒魔+${emp.salary}`}</span>
              <span class="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[9px] font-black">🪤強塞</span>
            </div>
          </button>
        `;
      }).join('');
    }
  } else if (card.effect === 'POACH_ENEMY') {
    if (pillEl) {
      pillEl.textContent = '🕸️ 魅惑挖角';
      pillEl.className = 'px-1.5 py-0.5 rounded bg-purple-500 text-white font-black text-[10px] whitespace-nowrap shrink-0';
    }
    titleEl.textContent = `「魅惑挖角 (對手召喚 ${card.reqSkills.join('/')} 級)」— 點選部下：`;
    container.className = 'grid grid-cols-2 gap-1.5 w-full min-w-0';
    const buttons = [];
    aliveOpponents.forEach(opp => {
      const emps = status.targetableByOpponent[opp.id];
      const shortOpp = getShortPlayerName(opp.name);
      if (!emps || emps.length === 0) return;
      emps.forEach(eUid => {
        const emp = CARDS_BY_ID[eUid];
        const meta = DEPT_META[emp.dept];
        buttons.push(`
          <button data-d-action="CONFIRM_POACH" data-opp-id="${opp.id}" data-emp-uid="${eUid}" class="rounded-xl bg-slate-900 border-2 ${meta.border} p-1.5 text-left shadow-lg flex items-center gap-1.5 min-w-0">
            ${getPortraitHTML(emp)}
            <div class="min-w-0 flex-1">
              <div class="text-[9px] font-bold text-rose-300 truncate">🎯奪自：${shortOpp}</div>
              <div class="text-[11px] font-black text-white truncate">${emp.title}</div>
              <div class="flex items-center justify-between mt-0.5">
                <span class="text-[9px] text-amber-300 font-bold">${emp.role === 'ENGINEER' ? '⚒苦工' : `${emp.skill}級`}</span>
                <span class="px-1.5 py-0.5 rounded bg-sky-600 text-white text-[9px] font-black">${emp.isVP ? '👑耗2張' : '🕸️挖角'}</span>
              </div>
            </div>
          </button>
        `);
      });
    });
    container.innerHTML = buttons.join('');
  } else if (card.effect === 'VP_KICK_ENEMY') {
    if (pillEl) {
      pillEl.textContent = '⚡ 皇室放逐';
      pillEl.className = 'px-1.5 py-0.5 rounded bg-purple-500 text-white font-black text-[10px] whitespace-nowrap shrink-0';
    }
    titleEl.textContent = `皇室大招「${card.title}」— 點選要放逐的對手皇室：`;
    container.className = 'grid grid-cols-2 gap-1.5 w-full min-w-0';
    container.innerHTML = status.targetVPs.map(t => {
      const opp = state.players.find(p => p.id === t.opponentId);
      const emp = CARDS_BY_ID[t.empUid];
      const meta = DEPT_META[emp.dept];
      const shortOpp = getShortPlayerName(opp.name);
      return `
        <button data-d-action="CONFIRM_VP_KICK" data-opp-id="${opp.id}" data-emp-uid="${emp.uid}" class="rounded-xl bg-purple-950/90 border-2 border-purple-400 p-1.5 text-left shadow-lg flex items-center gap-1.5 min-w-0">
          ${getPortraitHTML(emp)}
          <div class="min-w-0 flex-1">
            <div class="text-[9px] font-bold text-amber-300 truncate">🎯 ${shortOpp} · ${meta.short}</div>
            <div class="text-[11px] font-black text-white truncate">👑 ${emp.title}</div>
            <div class="mt-0.5 flex items-center justify-between">
              <span class="text-[9px] text-purple-200">${emp.skill}級/💎-${emp.salary}</span>
              <span class="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[9px] font-black">⚡放逐</span>
            </div>
          </div>
        </button>
      `;
    }).join('');
  } else if (card.effect === 'VP_DOUBLE_PAY') {
    if (pillEl) {
      pillEl.textContent = '🔥 工會暴動';
      pillEl.className = 'px-1.5 py-0.5 rounded bg-rose-500 text-white font-black text-[10px] whitespace-nowrap shrink-0';
    }
    titleEl.textContent = `「魔界工會暴動」— 點選下回雙倍供品 (×2) 的對手：`;
    container.className = `grid ${aliveOpponents.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-1.5 w-full min-w-0`;
    container.innerHTML = aliveOpponents.map(opp => {
      const burn = getPlayerBurnRate(opp);
      const shortOpp = getShortPlayerName(opp.name);
      return `
        <button data-d-action="CONFIRM_DOUBLE_PAY" data-opp-id="${opp.id}" class="rounded-xl bg-rose-950/90 border-2 border-rose-400 p-2 text-left shadow-lg flex flex-col justify-between gap-1 min-w-0">
          <div class="flex items-center justify-between">
            <span class="text-xs font-black text-white">🔥 ${shortOpp}</span>
            <span class="text-[10px] font-black text-emerald-300">💎${opp.crystals}</span>
          </div>
          <div class="text-[10px] text-amber-200 font-bold">原燒魔 🔥-${burn} ➔ <b class="text-rose-300">翻倍扣 🔥-${burn * 2}！</b></div>
          <div class="w-full py-1 rounded-lg bg-rose-600 text-center text-[10px] font-black text-white shadow">🔥 施放雙倍暴動 ×2</div>
        </button>
      `;
    }).join('');
  }

  container.querySelectorAll('[data-d-action]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const actType = btn.getAttribute('data-d-action');
      if (actType === 'CONFIRM_FUNDS') {
        executePlayCard({ cardUid: card.uid });
      } else if (actType === 'CONFIRM_RELEASE') {
        executePlayCard({ cardUid: card.uid, targetCrisisUid: btn.getAttribute('data-crisis-uid') });
      } else if (actType === 'CONFIRM_HIRE') {
        executePlayCard({ cardUid: card.uid, targetDept: btn.getAttribute('data-dept') });
      } else if (actType === 'CONFIRM_FIRE') {
        const empUid = btn.getAttribute('data-emp-uid');
        const emp = CARDS_BY_ID[empUid];
        executePlayCard({
          cardUid: card.uid,
          targetEmpUid: empUid,
          secondaryCardUid: emp.isVP ? status.companionFireUids[0] : null
        });
      } else if (actType === 'CONFIRM_BAD_IDEA') {
        executePlayCard({ cardUid: card.uid, targetPlayerId: btn.getAttribute('data-opp-id') });
      } else if (actType === 'STEP2_FORCE_HIRE_OPP') {
        uiSelection.step2OpponentId = btn.getAttribute('data-opp-id');
        renderAll();
      } else if (actType === 'CONFIRM_FORCE_HIRE') {
        executePlayCard({
          cardUid: card.uid,
          targetPlayerId: btn.getAttribute('data-opp-id'),
          targetDept: btn.getAttribute('data-dept')
        });
      } else if (actType === 'CONFIRM_POACH') {
        const oppId = btn.getAttribute('data-opp-id');
        const empUid = btn.getAttribute('data-emp-uid');
        const emp = CARDS_BY_ID[empUid];
        const companions = status.companionsByOpponent[oppId] || [];
        executePlayCard({
          cardUid: card.uid,
          targetPlayerId: oppId,
          targetEmpUid: empUid,
          secondaryCardUid: emp.isVP ? companions[0] : null
        });
      } else if (actType === 'CONFIRM_VP_KICK') {
        executePlayCard({
          cardUid: card.uid,
          targetPlayerId: btn.getAttribute('data-opp-id'),
          targetEmpUid: btn.getAttribute('data-emp-uid')
        });
      } else if (actType === 'CONFIRM_DOUBLE_PAY') {
        executePlayCard({ cardUid: card.uid, targetPlayerId: btn.getAttribute('data-opp-id') });
      }
    });
  });
}

function attachDynamicBoardListeners() {
  const state = gameState;
  const localPlayer = getLocalPlayer(state);
  const isMyTurnNow = isLocalPlayerTurn(state);

  document.querySelectorAll('[data-switch-seat]').forEach(btn => {
    btn.addEventListener('click', () => {
      switchLocalSeatPerspective(btn.getAttribute('data-switch-seat'));
    });
  });

  // Clicking an opponent seat tab:
  // - If in Mode D targeting a valid opponent, fires the spell directly
  // - Otherwise opens the Job-Bank-style Opponent Castle Popup Modal!
  document.querySelectorAll('[data-seat-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const clickedId = btn.getAttribute('data-seat-tab');
      const modeDSeat = btn.getAttribute('data-mode-d-seat');
      if (modeDSeat === 'VALID_TARGET' && uiSelection.mode === 'MODE_D_SELECT' && uiSelection.sourceCardUid) {
        const selCard = CARDS_BY_ID[uiSelection.sourceCardUid];
        if (selCard.effect === 'BAD_IDEA' || selCard.effect === 'VP_DOUBLE_PAY') {
          executePlayCard({ cardUid: selCard.uid, targetPlayerId: clickedId });
          return;
        } else if (selCard.effect === 'FORCE_HIRE' && !uiSelection.step2OpponentId) {
          uiSelection.step2OpponentId = clickedId;
          renderAll();
          return;
        }
      }
      playSfx('card');
      openOpponentCastleModal(clickedId);
    });
  });

  const modeDBackdrop = document.getElementById('modeDTargetDrawer');
  if (modeDBackdrop) {
    modeDBackdrop.onclick = (e) => {
      if (e.target === modeDBackdrop) {
        resetSelectionState();
        renderAll();
      }
    };
  }

  document.querySelectorAll('[data-open-bank-dept]').forEach(btn => {
    btn.addEventListener('click', () => {
      const dept = btn.getAttribute('data-open-bank-dept');
      if (state.phase === 'INITIAL_DRAFT' && isMyTurnNow) {
        handleDraftPickDepartment(dept);
      } else {
        openJobBankModal();
      }
    });
  });

  document.querySelectorAll('[data-draft-dept]').forEach(el => {
    el.addEventListener('click', () => {
      if (state.phase === 'INITIAL_DRAFT' && isMyTurnNow) {
        handleDraftPickDepartment(el.getAttribute('data-draft-dept'));
      }
    });
  });

  document.querySelectorAll('#localHandContainer [data-act-uid]').forEach(el => {
    el.addEventListener('click', () => {
      const actUid = el.getAttribute('data-act-uid');
      if (state.phase !== 'STEP1_PLAY_OR_DISCARD' || !isMyTurnNow) return;

      if (uiSelection.mode === 'DISCARD_SELECT') {
        const maxAllowed = state.turn.maxActions - state.turn.actionsUsed;
        if (uiSelection.discardSet.has(actUid)) {
          uiSelection.discardSet.delete(actUid);
        } else if (uiSelection.discardSet.size < maxAllowed) {
          uiSelection.discardSet.add(actUid);
        }
        renderAll();
        return;
      }

      const status = evaluateCardPlayability(state, localPlayer, actUid);
      const card = CARDS_BY_ID[actUid];
      if (!status.playable) {
        playSfx('burn');
        const tickerEl = document.getElementById('latestLogTicker');
        if (tickerEl) {
          tickerEl.innerHTML = `<div class='text-[11px] text-rose-300 font-bold truncate'>🔒 <b class='text-amber-300'>「${card.title}」</b>不可出：${status.reason}</div>`;
        }
        return;
      }

      if (uiSelection.mode === 'MODE_D_SELECT' && uiSelection.sourceCardUid === actUid) {
        if (card.effect === 'GAIN_FUNDS') {
          executePlayCard({ cardUid: card.uid });
        } else {
          resetSelectionState();
          renderAll();
        }
        return;
      }

      if (card.effect === 'VP_MASS_LAYOFF') {
        openMassLayoffModal(actUid);
        return;
      }

      clearDuelBannersVFX();
      uiSelection.mode = 'MODE_D_SELECT';
      uiSelection.sourceCardUid = actUid;
      uiSelection.step2OpponentId = null;
      playSfx('card');
      renderAll();
    });
  });

  attach3DTiltListeners();
  document.querySelectorAll('[data-empty-dept]').forEach(el => {
    el.addEventListener('click', () => openJobBankModal());
  });
  document.querySelectorAll('[data-inspect-dept]').forEach(el => {
    el.addEventListener('click', () => {
      openDepartmentInspectorModal(el.getAttribute('data-inspect-player'), el.getAttribute('data-inspect-dept'));
    });
  });
  document.querySelectorAll('[data-inspect-eng]').forEach(el => {
    el.addEventListener('click', () => {
      openEngineersInspectorModal(el.getAttribute('data-inspect-eng'));
    });
  });
  document.querySelectorAll('[data-inspect-crises]').forEach(el => {
    el.addEventListener('click', () => {
      openCrisesInspectorModal(el.getAttribute('data-inspect-crises'));
    });
  });
  document.querySelectorAll('[data-inspect-outsourced]').forEach(el => {
    el.addEventListener('click', () => {
      openOutsourcedInspectorModal(el.getAttribute('data-inspect-outsourced'));
    });
  });
}

// === Job Bank Modal (Compact 2:3 Card + Enlarged Info Panel) ===
function openJobBankModal() {
  document.getElementById('jobBankModalTitle').textContent = '🏛️ 中央魔界人才池（四大部門翻開頂牌）';
  document.getElementById('jobBankModalSub').textContent = '打出「契約召喚」或「強塞魔物」時可選取此處翻開的部下。';
  const summaryEl = document.getElementById('jobBankOpponentSummary');
  if (summaryEl) {
    summaryEl.classList.add('hidden');
    summaryEl.innerHTML = '';
  }

  const grid = document.getElementById('jobBankModalGrid');
  grid.innerHTML = ['RED', 'YELLOW', 'BLUE', 'GREEN'].map(d => {
    const meta = DEPT_META[d];
    const deck = gameState.jobBank[d];
    const topUid = deck[0];
    if (!topUid) {
      return `<div class="rounded-xl bg-slate-950 border border-slate-800 p-4 text-center text-slate-500">${meta.name} 已抽乾</div>`;
    }
    const c = CARDS_BY_ID[topUid];
    const roleLabel = c.role === 'ENGINEER' ? '⚒ 哥布林苦工 (抵1危機)' : c.isVP ? `👑 魔族皇室 (${c.skill}級主管)` : `⚡ 部門統領 (技能 ${c.skill}級)`;
    return `
      <div class="rounded-xl bg-slate-950/90 border-2 ${meta.border} p-2 flex flex-col justify-between gap-1.5 min-w-0 shadow-lg">
        <div class="flex items-center justify-between text-xs px-0.5">
          <span class="font-black ${meta.text} truncate">${meta.icon}${meta.name}</span>
          <span class="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] font-bold text-slate-300">剩 ${deck.length} 張</span>
        </div>
        <div class="bank-modal-card-wrap">
          ${renderEmployeeCardHTML(topUid, 'w-full', '頂牌')}
        </div>
        <div class="rounded-lg bg-slate-900/95 border border-slate-800 p-1.5 text-left space-y-0.5">
          <div class="text-xs font-black text-white truncate">${c.isVP ? '👑 ' : ''}${c.title}</div>
          <div class="text-[11px] font-bold text-amber-300 truncate">${roleLabel}</div>
          <div class="flex items-center justify-between text-[11px] font-extrabold pt-0.5 border-t border-slate-800">
            <span class="text-rose-400">每回供品：💎-${c.salary}</span>
            <span class="text-sky-300">${c.role === 'ENGINEER' ? '苦工池' : `${meta.short}${c.skill}級`}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
  document.getElementById('jobBankModal').classList.remove('hidden');
}

// === Opponent Castle Popup Modal: Shrunk 2:3 Character Cards + Enlarged Opponent & Department Info! ===
function openOpponentCastleModal(oppId) {
  const opp = gameState.players.find(p => p.id === oppId);
  if (!opp) return;
  recalcPlayerStats(opp);
  const burn = getPlayerBurnRate(opp);
  const crisisReq = getCrisisTotalEngineerReq(opp);
  const handCnt = typeof opp.handCount === 'number' ? opp.handCount : opp.hand.length;
  const vpCount = getTotalVPCount(opp);
  const totalEmps = getAllPlayerEmployeeUids(opp).length;
  const roundsLeft = burn > 0 ? Math.max(0, Math.ceil(opp.crystals / burn)) : 99;

  document.getElementById('jobBankModalTitle').textContent = `🎯 對手偵察：【${opp.name}】主城編制`;
  document.getElementById('jobBankModalSub').textContent = '點擊苦工、危機、外包或任一部門可查看完整卡牌清單';

  const summaryEl = document.getElementById('jobBankOpponentSummary');
  if (summaryEl) {
    summaryEl.classList.remove('hidden');
    summaryEl.innerHTML = `
      <div class="space-y-2 w-full">
        <!-- Part 1: Enlarged 4-Column Core Economy & Status Dashboard -->
        <div class="grid grid-cols-4 gap-1.5 w-full">
          <div class="rounded-xl bg-emerald-950/75 border border-emerald-500/50 p-2 text-center">
            <div class="text-[10px] sm:text-xs font-bold text-emerald-200">💎 魔晶儲備</div>
            <div class="text-sm sm:text-lg font-black text-emerald-400 mt-0.5">${opp.crystals}</div>
            <div class="text-[10px] font-bold text-slate-300">${burn > 0 ? `約撐 ${roundsLeft} 回` : '零消耗'}</div>
          </div>
          <div class="rounded-xl bg-rose-950/75 border border-rose-500/50 p-2 text-center">
            <div class="text-[10px] sm:text-xs font-bold text-rose-200">🔥 每回燒魔</div>
            <div class="text-sm sm:text-lg font-black text-rose-400 mt-0.5">-${burn}/回</div>
            <div class="text-[10px] font-bold ${opp.doubleBurnFlag ? 'text-amber-300 font-black' : 'text-slate-300'}">${opp.doubleBurnFlag ? '⚠️下回雙倍!' : '正常供品'}</div>
          </div>
          <div class="rounded-xl bg-purple-950/75 border border-purple-500/50 p-2 text-center">
            <div class="text-[10px] sm:text-xs font-bold text-purple-200">👑 在職皇室</div>
            <div class="text-sm sm:text-lg font-black text-purple-300 mt-0.5">${vpCount} 名</div>
            <div class="text-[10px] font-bold text-slate-300">${vpCount >= 2 ? '⚡可放紫卡' : `差${2 - vpCount}名開大招`}</div>
          </div>
          <div class="rounded-xl bg-slate-950 border border-sky-500/40 p-2 text-center">
            <div class="text-[10px] sm:text-xs font-bold text-sky-200">🎴 手牌數量</div>
            <div class="text-sm sm:text-lg font-black text-sky-300 mt-0.5">${handCnt} 張</div>
            <div class="text-[10px] font-bold text-slate-300">總部下 ${totalEmps}人</div>
          </div>
        </div>

        <!-- Part 2: Enlarged 3-Column Workforce & Crisis Inspection Cards (Zero awkward line wrapping!) -->
        <div class="grid grid-cols-3 gap-1.5 w-full">
          <button data-opp-modal-eng="${opp.id}" class="rounded-xl bg-red-950/75 border border-red-500/50 p-2 text-left flex flex-col justify-between gap-0.5 shadow">
            <div class="flex items-center justify-between w-full">
              <span class="text-[11px] sm:text-xs font-extrabold text-red-200 whitespace-nowrap">⚒️ 哥布林苦工</span>
              <span class="text-[10px] font-black text-sky-300">🔍</span>
            </div>
            <div class="flex items-baseline justify-between w-full mt-0.5">
              <span class="text-xs sm:text-sm font-black text-white whitespace-nowrap">${opp.engineers.length} 人</span>
              <span class="text-[11px] font-black text-rose-300 whitespace-nowrap">💎-${opp.engineers.length}/回</span>
            </div>
            <div class="text-[10px] text-slate-300 font-semibold truncate">可抵銷 ${opp.engineers.length} 點危機</div>
          </button>

          <button data-opp-modal-crises="${opp.id}" class="rounded-xl ${opp.crises.length > 0 ? 'bg-amber-950/85 border border-amber-400' : 'bg-slate-950 border border-slate-700'} p-2 text-left flex flex-col justify-between gap-0.5 shadow">
            <div class="flex items-center justify-between w-full">
              <span class="text-[11px] sm:text-xs font-extrabold ${opp.crises.length > 0 ? 'text-amber-200' : 'text-slate-300'} whitespace-nowrap">⚠️ 討伐危機</span>
              <span class="text-[10px] font-black text-sky-300">🔍</span>
            </div>
            <div class="flex items-baseline justify-between w-full mt-0.5">
              <span class="text-xs sm:text-sm font-black text-white whitespace-nowrap">${opp.crises.length} 張</span>
              <span class="text-[11px] font-black ${opp.crises.length > 0 ? 'text-amber-300' : 'text-slate-400'} whitespace-nowrap">需苦工 ${crisisReq}</span>
            </div>
            <div class="text-[10px] text-slate-300 font-semibold truncate">${opp.crises.length > 0 ? '點擊檢視危機卡' : '場上無討伐危機'}</div>
          </button>

          <button data-opp-modal-outsourced="${opp.id}" class="rounded-xl ${opp.outsourcedCount > 0 ? 'bg-rose-950/90 border border-rose-400' : 'bg-slate-950 border border-slate-700'} p-2 text-left flex flex-col justify-between gap-0.5 shadow">
            <div class="flex items-center justify-between w-full">
              <span class="text-[11px] sm:text-xs font-extrabold ${opp.outsourcedCount > 0 ? 'text-rose-200' : 'text-slate-300'} whitespace-nowrap">👹 高利貸外包</span>
              <span class="text-[10px] font-black text-sky-300">🔍</span>
            </div>
            <div class="flex items-baseline justify-between w-full mt-0.5">
              <span class="text-xs sm:text-sm font-black text-white whitespace-nowrap">${opp.outsourcedCount} 人</span>
              <span class="text-[11px] font-black ${opp.outsourcedCount > 0 ? 'text-rose-400' : 'text-slate-400'} whitespace-nowrap">💎-${opp.outsourcedCount * 3}/回</span>
            </div>
            <div class="text-[10px] text-slate-300 font-semibold truncate">${opp.outsourcedCount > 0 ? '每名每回燒3魔晶!' : '無外包赤字'}</div>
          </button>
        </div>
      </div>
    `;
    summaryEl.querySelector('[data-opp-modal-eng]')?.addEventListener('click', () => openEngineersInspectorModal(opp.id));
    summaryEl.querySelector('[data-opp-modal-crises]')?.addEventListener('click', () => openCrisesInspectorModal(opp.id));
    summaryEl.querySelector('[data-opp-modal-outsourced]')?.addEventListener('click', () => openOutsourcedInspectorModal(opp.id));
  }

  // Part 3: 4 Departments with Shrunk Character Card (.opp-modal-card-wrap) + Enlarged Tactical & Subordinate Info
  const grid = document.getElementById('jobBankModalGrid');
  grid.innerHTML = ['RED', 'YELLOW', 'BLUE', 'GREEN'].map(d => {
    const meta = DEPT_META[d];
    const deptArr = opp.departments[d];
    const effSkill = getEffectiveSkill(opp, d);
    const deptSalary = deptArr.reduce((s, uid) => s + ((CARDS_BY_ID[uid] && CARDS_BY_ID[uid].salary) || 0), 0);

    const tacticalNote =
      d === 'YELLOW' ? `🎯 弱點：吃 [${effSkill}級] 討伐危機` :
      d === 'BLUE' ? `🎯 弱點：吃 [${effSkill}級] 強塞/挖角` :
      d === 'RED' ? `🛡️ 可鎮壓 [${effSkill}級] 討伐危機` :
      `💰 可徵收 [${effSkill}級] 金庫魔晶`;

    if (deptArr.length === 0) {
      return `
        <div class="rounded-xl bg-slate-950/90 border-2 border-dashed ${meta.border} p-2 flex flex-col justify-between gap-1.5 min-w-0">
          <div class="flex items-center justify-between px-0.5">
            <span class="text-xs sm:text-sm font-black ${meta.text} truncate">${meta.icon}${meta.name}</span>
            <span class="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-xs font-black text-slate-400">0 級</span>
          </div>
          <div class="opp-modal-card-wrap empty-rune-slot rounded-xl border border-dashed ${meta.border} p-2 flex flex-col items-center justify-center text-center">
            <div class="w-9 h-9 rounded-full ${meta.panelBg} border ${meta.border} flex items-center justify-center text-base opacity-60">${meta.icon}</div>
            <div class="text-[11px] font-black text-slate-400 mt-1">缺工空城</div>
          </div>
          <div class="rounded-lg bg-slate-900/95 border border-slate-800 p-1.5 text-left space-y-0.5">
            <div class="text-xs font-black text-slate-400">無主管駐守 (視為 0 級)</div>
            <div class="flex items-center justify-between text-[11px] font-bold">
              <span class="text-slate-400">編制 0 人</span>
              <span class="text-emerald-400">💎-0/回</span>
            </div>
            <div class="text-[10px] font-extrabold text-amber-300 truncate pt-0.5 border-t border-slate-800">${tacticalNote}</div>
          </div>
        </div>
      `;
    }

    const headUid = deptArr[0];
    const hCard = CARDS_BY_ID[headUid];
    const subordinates = deptArr.slice(1);
    const subNames = subordinates.map(u => CARDS_BY_ID[u]?.title).filter(Boolean).join('、');

    return `
      <div data-opp-dept-detail="${d}" data-opp-id="${opp.id}" class="rounded-xl bg-slate-950/95 border-2 ${meta.border} p-2 flex flex-col justify-between gap-1.5 min-w-0 cursor-pointer shadow-lg">
        <!-- Enlarged Dept Title & Skill Level Header -->
        <div class="flex items-center justify-between gap-1 px-0.5">
          <span class="text-xs sm:text-sm font-black ${meta.text} truncate">${meta.icon}${meta.name}</span>
          <span class="px-2 py-0.5 rounded-md ${meta.badgeBg} border ${meta.border} text-xs font-black text-white whitespace-nowrap shrink-0">⚡ ${effSkill} 級</span>
        </div>

        <!-- Shrunk 2:3 Character Card (.opp-modal-card-wrap: 88px wide on mobile) -->
        <div class="opp-modal-card-wrap">
          ${renderEmployeeCardHTML(headUid, 'w-full', hCard.isVP ? '👑皇室主管' : '👑主管')}
        </div>

        <!-- Enlarged Department Details Footer -->
        <div class="rounded-lg bg-slate-900/95 border border-slate-700 p-1.5 text-left space-y-0.5">
          <div class="flex items-center justify-between gap-1">
            <span class="text-xs font-black text-white truncate">${hCard.isVP ? '👑 ' : ''}${hCard.title}</span>
            <span class="text-[11px] font-black text-rose-400 whitespace-nowrap shrink-0">💎-${deptSalary}/回</span>
          </div>
          <div class="text-[11px] font-bold ${subordinates.length > 0 ? 'text-amber-300' : 'text-slate-400'} truncate">
            ${subordinates.length > 0 ? `➕ 下屬(${subordinates.length})：${subNames} 🔍` : `編制 1 人（無下屬·點此放大🔍）`}
          </div>
          <div class="text-[10px] font-extrabold text-sky-300 truncate pt-0.5 border-t border-slate-800">${tacticalNote}</div>
        </div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('[data-opp-dept-detail]').forEach(el => {
    el.addEventListener('click', () => {
      openDepartmentInspectorModal(el.getAttribute('data-opp-id'), el.getAttribute('data-opp-dept-detail'));
    });
  });

  document.getElementById('jobBankModal').classList.remove('hidden');
}

function openOutsourcedInspectorModal(playerId) {
  const player = gameState.players.find(p => p.id === playerId);
  if (!player) return;
  const isSelf = player.id === getLocalPlayerId();
  document.getElementById('inspectorModalTitle').textContent = `${isSelf ? '👑【我方主城】' : `🎯【敵方：${player.name}】`}— 高價外援：深淵惡魔高利貸傭兵 (${player.outsourcedCount}人)`;
  document.getElementById('inspectorModalSubtitle').textContent = '當場上「討伐危機」所需苦工總數大於在職哥布林苦工時，差額將自動雇傭深淵惡魔高利貸傭兵（每名每回合索取 3 魔晶，不可被遣散，僅能透過招募苦工或鎮壓危機退回）。';
  document.getElementById('inspectorModalFooter').classList.add('hidden');
  const count = Math.max(1, player.outsourcedCount);
  document.getElementById('inspectorCardsGrid').innerHTML = Array.from({ length: count }).map((_, i) => `
    <div class="relative rounded-xl bg-slate-950 border-2 border-slate-500 overflow-hidden shadow-xl">
      ${getCardImgTag("OUTSOURCED", "深淵惡魔高利貸傭兵", "full-gpt-card-img")}
      <span class="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-rose-600 text-white text-[10px] font-black shadow-lg">${player.outsourcedCount > 0 ? `外包 #${i+1} (💎-3)` : '外包卡預覽'}</span>
    </div>
  `).join('');
  document.getElementById('inspectorModal').classList.remove('hidden');
}

function openDepartmentInspectorModal(playerId, dept) {
  const player = gameState.players.find(p => p.id === playerId);
  if (!player) return;
  const meta = DEPT_META[dept];
  const arr = player.departments[dept];
  const isSelf = player.id === getLocalPlayerId();

  document.getElementById('inspectorModalTitle').textContent = `${isSelf ? '👑【我方主城】' : `🎯【敵方偵察：${player.name}】`}— ${meta.icon}${meta.name} (${arr.length}人)`;
  document.getElementById('inspectorModalSubtitle').textContent =
    arr.length === 0
      ? '此部門目前缺工（空城），有效技能等級視為 0。'
      : `置頂第 1 張為現任主管（有效技能 ${getEffectiveSkill(player, dept)} 級），其餘為下屬。`;
  document.getElementById('inspectorModalFooter').classList.add('hidden');

  const grid = document.getElementById('inspectorCardsGrid');
  grid.innerHTML = arr.map((uid, idx) => renderEmployeeCardHTML(uid, '', idx === 0 ? '👑主管' : `下屬#${idx}`)).join('');
  document.getElementById('inspectorModal').classList.remove('hidden');
}

function openCrisesInspectorModal(playerId) {
  const player = gameState.players.find(p => p.id === playerId);
  if (!player) return;
  document.getElementById('inspectorModalTitle').textContent = `⚠️ 【${player.name}】— 場上討伐危機 (${player.crises.length}張，共需苦工 ${getCrisisTotalEngineerReq(player)} 人)`;
  document.getElementById('inspectorModalSubtitle').textContent = '每張討伐危機自身維護費為 0，但若在職哥布林苦工不足，差額將自動補入每回合消耗 3 魔晶的「深淵傭兵（外包）」。可打出紅部門「鎮壓危機（解放）」將其移除。';
  document.getElementById('inspectorModalFooter').classList.add('hidden');
  document.getElementById('inspectorCardsGrid').innerHTML =
    player.crises.length === 0
      ? `<div class="text-xs text-slate-400 py-4">目前場上沒有任何討伐危機！</div>`
      : player.crises.map(uid => renderActionCardHTML(uid)).join('');
  document.getElementById('inspectorModal').classList.remove('hidden');
}

function openEngineersInspectorModal(playerId) {
  const player = gameState.players.find(p => p.id === playerId);
  if (!player) return;
  document.getElementById('inspectorModalTitle').textContent = `⚒ 【${player.name}】— 在職哥布林苦工 (${player.engineers.length}人)`;
  document.getElementById('inspectorModalSubtitle').textContent = '每位苦工每回消耗 1 魔晶，可抵銷 1 點「討伐危機」人力需求。';
  document.getElementById('inspectorModalFooter').classList.add('hidden');
  document.getElementById('inspectorCardsGrid').innerHTML =
    player.engineers.length === 0
      ? `<div class="text-xs text-slate-400 py-4">目前無在職苦工</div>`
      : player.engineers.map((uid, i) => renderEmployeeCardHTML(uid, '', `苦工#${i+1}`)).join('');
  document.getElementById('inspectorModal').classList.remove('hidden');
}

function openMassLayoffModal(cardUid) {
  const localPlayer = getLocalPlayer(gameState);
  uiSelection.layoffSet.clear();
  const allEmps = getAllPlayerEmployeeUids(localPlayer);
  const totalVPs = getTotalVPCount(localPlayer);

  document.getElementById('inspectorModalTitle').textContent = '🩸 血祭大掃除（裁員）：請勾選要遣散的部下';
  document.getElementById('inspectorModalSubtitle').textContent = `須保留至少 2 名在職皇室（目前你有 ${totalVPs} 名皇室）。`;
  document.getElementById('inspectorModalFooter').classList.remove('hidden');

  function renderLayoffGrid() {
    const selectedVPs = [...uiSelection.layoffSet].filter(id => CARDS_BY_ID[id].isVP).length;
    const canSelectMoreVP = (totalVPs - selectedVPs) > 2;
    document.getElementById('inspectorFooterHint').textContent = `已選 ${uiSelection.layoffSet.size} 人（保留皇室：${totalVPs - selectedVPs} 名）`;

    const grid = document.getElementById('inspectorCardsGrid');
    grid.innerHTML = allEmps.map(eUid => {
      const emp = CARDS_BY_ID[eUid];
      const checked = uiSelection.layoffSet.has(eUid);
      const lockedVP = emp.isVP && !checked && !canSelectMoreVP;
      return `
        <div data-layoff-uid="${eUid}" class="relative ${lockedVP ? 'opacity-40' : 'cursor-pointer'}">
          ${renderEmployeeCardHTML(eUid, checked ? 'ring-4 ring-rose-500' : '', checked ? '✔已勾選' : lockedVP ? '🔒保留' : '點擊勾選')}
        </div>
      `;
    }).join('');

    grid.querySelectorAll('[data-layoff-uid]').forEach(el => {
      el.addEventListener('click', () => {
        const eUid = el.getAttribute('data-layoff-uid');
        const emp = CARDS_BY_ID[eUid];
        if (uiSelection.layoffSet.has(eUid)) {
          uiSelection.layoffSet.delete(eUid);
        } else {
          if (emp.isVP && !canSelectMoreVP) return;
          uiSelection.layoffSet.add(eUid);
        }
        renderLayoffGrid();
      });
    });
  }

  renderLayoffGrid();
  document.getElementById('btnConfirmMassLayoff').onclick = () => {
    if (uiSelection.layoffSet.size === 0) return;
    document.getElementById('inspectorModal').classList.add('hidden');
    executePlayCard({ cardUid, layoffUids: [...uiSelection.layoffSet] });
  };
  document.getElementById('inspectorModal').classList.remove('hidden');
}

function showGameOverModal(winner) {
  const isMe = winner.id === getLocalPlayerId();
  document.getElementById('gameOverTitle').textContent = isMe ? '🏆 恭喜！你的深淵魔王城稱霸魔界！' : `💀 【${winner.name}】獲得最終勝利！`;
  document.getElementById('gameOverDesc').textContent = `在經歷 ${gameState.turn.roundNumber} 回合的激烈燒魔競爭後，【${winner.name}】以剩餘 ${winner.crystals} 顆魔晶石成為最後屹立不搖的魔王城！`;
  document.getElementById('gameOverModal').classList.remove('hidden');
}

function renderGallery(filter = 'ALL') {
  const grid = document.getElementById('galleryGrid');
  const items = [];

  if (filter === 'ALL' || filter === 'EMP') {
    EMPLOYEE_RECIPES.forEach(r => {
      const sampleUid = Object.keys(CARDS_BY_ID).find(k => CARDS_BY_ID[k].tplId === r.tplId);
      if (sampleUid) {
        items.push(`
          <div class="flex flex-col items-center min-w-0">
            ${renderEmployeeCardHTML(sampleUid, 'w-full', `共${r.count}張`)}
          </div>
        `);
      }
    });
    if (GPT_FULLCARD_ART['OUTSOURCED']) {
      items.push(`
        <div class="flex flex-col items-center min-w-0">
          <div class="relative rounded-xl bg-slate-950 border-2 border-slate-500 overflow-hidden shadow-xl w-full">
            ${getCardImgTag("OUTSOURCED", "深淵惡魔高利貸傭兵", "full-gpt-card-img")}
            <span class="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-rose-600 text-white text-[10px] font-black shadow-lg">外包無限</span>
          </div>
        </div>
      `);
    }
  }

  ACTION_RECIPES.forEach(r => {
    if (filter === 'EMP') return;
    if (filter === 'DEF' && r.category !== 'DEFENSE') return;
    if (filter === 'ATK' && r.category !== 'ATTACK' && r.category !== 'CRISIS') return;
    if (filter === 'VP' && r.dept !== 'PURPLE') return;

    const sampleUid = Object.keys(CARDS_BY_ID).find(k => CARDS_BY_ID[k].tplId === r.tplId);
    if (sampleUid) {
      items.push(`
        <div class="flex flex-col items-center min-w-0">
          ${renderActionCardHTML(sampleUid)}
          <span class="text-[11px] font-bold text-amber-300 mt-1">共 ${r.count} 張</span>
        </div>
      `);
    }
  });

  grid.innerHTML = items.join('');
}

/********************************************************************
 * V13.2 MULTIPLAYER LOBBY & WAITING ROOM UI RENDERER
 ********************************************************************/
let activeLobbyTab = 'SOLO'; // 'SOLO' | 'HOST' | 'CLIENT'

function copyTextSafe(text, successMsg) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => showToast(successMsg)).catch(() => fallbackCopy(text, successMsg));
      return;
    }
  } catch (e) {}
  fallbackCopy(text, successMsg);
}

function fallbackCopy(text, successMsg) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    showToast(successMsg);
  } catch (e) {
    showToast(`請手動複製：${text}`);
  }
}

function renderLobbyUI() {
  document.querySelectorAll('[data-lobby-tab]').forEach(btn => {
    const tab = btn.getAttribute('data-lobby-tab');
    if (tab === activeLobbyTab) {
      btn.className = 'flex-1 py-2 px-2 rounded-xl font-black text-xs border mp-mode-tab-active transition';
    } else {
      btn.className = 'flex-1 py-2 px-2 rounded-xl font-bold text-xs border border-slate-700 bg-slate-950 text-slate-300 transition';
    }
  });

  const hostPanel = document.getElementById('lobbyHostPanel');
  const clientPanel = document.getElementById('lobbyClientPanel');
  const hostStartControls = document.getElementById('lobbyHostStartControls');

  if (activeLobbyTab === 'SOLO') {
    hostPanel?.classList.add('hidden');
    clientPanel?.classList.add('hidden');
    hostStartControls?.classList.remove('hidden');
  } else if (activeLobbyTab === 'HOST') {
    hostPanel?.classList.remove('hidden');
    clientPanel?.classList.add('hidden');
    hostStartControls?.classList.remove('hidden');

    const codeDisplay = document.getElementById('hostRoomCodeText');
    if (codeDisplay) codeDisplay.textContent = gameSession.roomCode || '----';

    const statusBadge = document.getElementById('hostNetStatusBadge');
    if (statusBadge) {
      const st = gameSession.peerStatus;
      statusBadge.innerHTML = st === 'ONLINE'
        ? `<span class="online-dot-pulse mr-1"></span>PeerJS 跨網 ＋ 跨分頁雙軌就緒`
        : `<span class="online-dot-pulse mr-1"></span>跨分頁即時通道就緒 (PeerJS ${st === 'CONNECTING' ? '連線中' : '待機'})`;
    }

    const pCount = parseInt(document.getElementById('selectPlayerCount')?.value, 10) || gameSession.lobbyState.playerCount || 3;
    gameSession.lobbyState.playerCount = pCount;
    if (gameSession.lobbyState.seats[0]) {
      gameSession.lobbyState.seats[0].name = `${gameSession.playerName} (房主)`;
    }

    const rosterEl = document.getElementById('hostSeatsRosterGrid');
    if (rosterEl) {
      const visibleSeats = gameSession.lobbyState.seats.slice(0, pCount);
      rosterEl.innerHTML = visibleSeats.map(s => {
        if (s.id === 'p1') {
          return `
            <div class="rounded-xl p-2 seat-card-human flex items-center justify-between gap-2">
              <div class="min-w-0">
                <div class="text-[10px] font-black text-emerald-300">👑 座位 P1 (房主本人)</div>
                <div class="text-xs font-black text-white truncate">${gameSession.playerName}</div>
              </div>
              <span class="px-2 py-0.5 rounded bg-emerald-500 text-slate-950 text-[10px] font-black shrink-0">✔ 已就緒</span>
            </div>
          `;
        }
        const isHumanJoined = s.role === 'HUMAN' && s.connected;
        const isAI = s.role === 'AI';
        const cardCls = isHumanJoined ? 'seat-card-human' : isAI ? 'seat-card-ai' : 'seat-card-waiting';
        const badgeText = isHumanJoined ? '👤 真人已連線' : isAI ? '🤖 智慧 AI 補位' : '⏳ 等待真人加入';

        return `
          <div class="rounded-xl p-2 ${cardCls} flex items-center justify-between gap-2">
            <div class="min-w-0 flex-1">
              <div class="text-[10px] font-black ${isHumanJoined ? 'text-emerald-300' : isAI ? 'text-indigo-300' : 'text-amber-300'}">座位 ${s.id.toUpperCase()} · ${badgeText}</div>
              <div class="text-xs font-bold text-white truncate">${s.name}</div>
            </div>
            <button data-toggle-seat-role="${s.id}" class="px-2 py-1 rounded-lg bg-slate-950 border border-slate-600 text-[10px] font-black text-amber-300 shrink-0">
              ${isAI ? '改為等待真人' : '改由 AI 補位'}
            </button>
          </div>
        `;
      }).join('');

      rosterEl.querySelectorAll('[data-toggle-seat-role]').forEach(btn => {
        btn.addEventListener('click', () => {
          toggleHostLobbySeatRole(btn.getAttribute('data-toggle-seat-role'));
        });
      });
    }
  } else if (activeLobbyTab === 'CLIENT') {
    hostPanel?.classList.add('hidden');
    clientPanel?.classList.remove('hidden');
    hostStartControls?.classList.add('hidden');

    const statusBox = document.getElementById('clientJoinStatusBox');
    if (statusBox) {
      if (gameSession.mode === 'CLIENT' && gameSession.roomCode) {
        const pCount = gameSession.lobbyState.playerCount || 3;
        const visibleSeats = (gameSession.lobbyState.seats || []).slice(0, pCount);
        const mySeat = visibleSeats.find(s => s.id === gameSession.localSeatId && s.clientToken === gameSession.clientToken);

        if (mySeat) {
          const ruleLabel = gameSession.lobbyState.playDiscardMode === 'STRICT_EITHER' ? '標準二選一' : '流暢共用4額度';
          const fogLabel = gameSession.lobbyState.fogOfWar ? '🔒 戰爭迷霧開啟' : '🔓 公開牌庫';
          const seatsHTML = visibleSeats.map(s => {
            const isMe = s.id === gameSession.localSeatId;
            const isHost = s.id === 'p1';
            const isAI = s.role === 'AI';
            const isHuman = s.role === 'HOST' || (s.role === 'HUMAN' && s.connected);
            const cardCls = isMe ? 'seat-card-human border-2 border-amber-400' : isHuman ? 'seat-card-human' : isAI ? 'seat-card-ai' : 'seat-card-waiting';
            const roleBadge = isHost ? '👑 房主' : isMe ? '🙋‍♂️ 你本人' : isHuman ? '👤 真人已連線' : isAI ? '🤖 智慧 AI' : '⏳ 等待加入';
            return `
              <div class="rounded-xl p-2 ${cardCls} flex items-center justify-between gap-2">
                <div class="min-w-0">
                  <div class="text-[10px] font-black ${isMe ? 'text-amber-300' : isHuman ? 'text-emerald-300' : isAI ? 'text-indigo-300' : 'text-slate-400'}">座位 ${s.id.toUpperCase()} · ${roleBadge}</div>
                  <div class="text-xs font-black text-white truncate">${s.name}</div>
                </div>
                <span class="px-2 py-0.5 rounded ${isHuman || isAI ? 'bg-emerald-950 border border-emerald-400 text-emerald-300' : 'bg-slate-900 text-amber-300'} text-[10px] font-black shrink-0">
                  ${isHuman || isAI ? '✔ 就緒' : '等待中'}
                </span>
              </div>
            `;
          }).join('');

          statusBox.innerHTML = `
            <div class="space-y-2 pt-1">
              <div class="rounded-xl p-2.5 bg-emerald-950/70 border border-emerald-400 flex items-center justify-between gap-2">
                <div>
                  <div class="text-xs font-black text-emerald-300"><span class="online-dot-pulse mr-1"></span>已進入房間【${gameSession.roomCode}】候戰室</div>
                  <div class="text-[10px] text-slate-200 mt-0.5">${pCount} 人局 ｜ ${ruleLabel} ｜ ${fogLabel}</div>
                </div>
                <span class="px-2 py-1 rounded-lg bg-amber-400 text-slate-950 text-xs font-black shrink-0">座位 ${gameSession.localSeatId.toUpperCase()}</span>
              </div>
              <div class="text-[11px] font-bold text-amber-300">🪑 房間即時席位列表（等待房主點擊啟動對局...）：</div>
              <div class="space-y-1.5">${seatsHTML}</div>
            </div>
          `;
        } else {
          statusBox.innerHTML = `
            <div class="rounded-xl p-2.5 seat-card-waiting text-xs text-amber-200 font-bold">
              🔄 正在連線至房間【${gameSession.roomCode}】並同步候戰室席位...
            </div>
          `;
        }
      } else {
        statusBox.innerHTML = `<div class="text-[11px] text-slate-400">輸入房主提供的 4 碼房間通行碼，即可進入房間候戰室並即時查看席位狀態。</div>`;
      }
    }
  }
}

function initAppOnLoad() {
  if (window.__dbrV13Initialized) return;
  window.__dbrV13Initialized = true;

  const params = new URLSearchParams(window.location.search);
  const urlRoom = params.get('room');
  const nicknameInput = document.getElementById('inputPlayerNickname');
  if (nicknameInput) {
    nicknameInput.value = gameSession.playerName;
    nicknameInput.addEventListener('input', () => {
      syncHostLobbySettingsFromInputs();
      if (gameSession.mode === 'HOST') renderLobbyUI();
    });
  }

  gameState = createInitialGameState(3, 'STRICT_EITHER', true);
  gameSession.hostMasterState = null;
  renderAll();

  if (urlRoom) {
    activeLobbyTab = 'CLIENT';
    const joinInput = document.getElementById('inputJoinRoomCode');
    if (joinInput) joinInput.value = urlRoom.toUpperCase();
    document.getElementById('lobbyModal')?.classList.remove('hidden');
    renderLobbyUI();
    joinOnlineRoomAsClient(urlRoom, gameSession.playerName);
  }

  document.getElementById('btnCancelModeD').addEventListener('click', () => {
    resetSelectionState();
    renderAll();
  });

  registerPwaServiceWorker();
  document.getElementById('btnHeaderFullscreen')?.addEventListener('click', () => {
    triggerPwaInstallOrFullscreen();
  });
  document.getElementById('btnMenuInstallPwa')?.addEventListener('click', () => {
    triggerPwaInstallOrFullscreen();
  });

  // Settings Menu Modal
  const settingsModal = document.getElementById('settingsMenuModal');
  document.getElementById('btnOpenSettingsMenu')?.addEventListener('click', () => {
    updateSettingsMenuUI();
    settingsModal?.classList.remove('hidden');
  });
  document.getElementById('btnCloseSettingsMenu')?.addEventListener('click', () => {
    settingsModal?.classList.add('hidden');
  });
  if (settingsModal) {
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) settingsModal.classList.add('hidden');
    });
  }

  document.getElementById('btnToggleAnimSpeed')?.addEventListener('click', () => {
    animSpeedMultiplier = animSpeedMultiplier === 1 ? 2 : 1;
    updateSettingsMenuUI();
    renderAll();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      resetSelectionState();
      document.getElementById('settingsMenuModal')?.classList.add('hidden');
      document.getElementById('jobBankModal').classList.add('hidden');
      document.getElementById('inspectorModal').classList.add('hidden');
      document.getElementById('galleryModal').classList.add('hidden');
      document.getElementById('logModal').classList.add('hidden');
      renderAll();
    }
  });

  document.getElementById('btnExpandJobBankModal').addEventListener('click', () => openJobBankModal());
  document.getElementById('btnCloseJobBankModal').addEventListener('click', () => {
    document.getElementById('jobBankModal').classList.add('hidden');
  });

  const openLogFn = () => {
    document.getElementById('settingsMenuModal')?.classList.add('hidden');
    document.getElementById('battleLogModalList').innerHTML = gameState.logs
      .map((l, i) => `<div class="${i === 0 ? 'text-amber-300 font-bold' : 'text-slate-300'} border-b border-slate-800 pb-1">${l}</div>`)
      .join('');
    document.getElementById('logModal').classList.remove('hidden');
  };
  document.getElementById('btnOpenLogModal').addEventListener('click', openLogFn);
  document.getElementById('liveTickerBanner').addEventListener('click', openLogFn);
  document.getElementById('btnCloseLogModal').addEventListener('click', () => {
    document.getElementById('logModal').classList.add('hidden');
  });

  document.getElementById('btnToggleDiscardMode').addEventListener('click', () => {
    if (uiSelection.mode === 'DISCARD_SELECT') {
      resetSelectionState();
    } else {
      resetSelectionState();
      uiSelection.mode = 'DISCARD_SELECT';
    }
    renderAll();
  });

  document.getElementById('btnConfirmDiscard').addEventListener('click', () => {
    if (uiSelection.discardSet.size === 0) return;
    const cardUids = [...uiSelection.discardSet];
    resetSelectionState();
    dispatchPlayerAction({ type: 'DISCARD_CARDS', cardUids });
  });

  document.getElementById('btnEndTurn').addEventListener('click', () => {
    if (gameState.phase === 'STEP1_PLAY_OR_DISCARD' && isLocalPlayerTurn(gameState)) {
      endPlayPhaseAndSettleTurn();
    }
  });

  document.getElementById('btnOpenGallery').addEventListener('click', () => {
    document.getElementById('settingsMenuModal')?.classList.add('hidden');
    renderGallery('ALL');
    document.getElementById('galleryModal').classList.remove('hidden');
  });
  document.getElementById('btnCloseGallery').addEventListener('click', () => {
    document.getElementById('galleryModal').classList.add('hidden');
  });
  document.querySelectorAll('.gallery-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.gallery-tab').forEach(b => {
        b.classList.remove('bg-indigo-600', 'text-white');
        b.classList.add('bg-slate-800', 'text-slate-300');
      });
      btn.classList.remove('bg-slate-800', 'text-slate-300');
      btn.classList.add('bg-indigo-600', 'text-white');
      renderGallery(btn.getAttribute('data-gallery-filter'));
    });
  });

  document.getElementById('btnOpenRules').addEventListener('click', () => {
    document.getElementById('settingsMenuModal')?.classList.add('hidden');
    document.getElementById('rulesModal').classList.remove('hidden');
  });
  document.getElementById('btnCloseRules').addEventListener('click', () => {
    document.getElementById('rulesModal').classList.add('hidden');
  });

  document.getElementById('btnToggleMute').addEventListener('click', () => {
    isMuted = !isMuted;
    updateSettingsMenuUI();
  });

  document.getElementById('btnOpenLobby').addEventListener('click', () => {
    document.getElementById('settingsMenuModal')?.classList.add('hidden');
    renderLobbyUI();
    document.getElementById('lobbyModal').classList.remove('hidden');
  });
  document.getElementById('btnCloseLobby').addEventListener('click', () => {
    document.getElementById('lobbyModal').classList.add('hidden');
  });

  document.querySelectorAll('[data-lobby-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-lobby-tab');
      activeLobbyTab = tab;
      if (tab === 'HOST' && (gameSession.mode !== 'HOST' || !gameSession.roomCode)) {
        createOnlineHostRoom();
      } else if (tab === 'SOLO') {
        gameSession.mode = 'SOLO';
      }
      renderLobbyUI();
    });
  });

  document.getElementById('selectPlayerCount')?.addEventListener('change', () => {
    syncHostLobbySettingsFromInputs();
    renderLobbyUI();
  });

  document.querySelectorAll('input[name="playDiscardRule"]').forEach(radio => {
    radio.addEventListener('change', () => {
      syncHostLobbySettingsFromInputs();
    });
  });

  document.getElementById('chkFogOfWar')?.addEventListener('change', () => {
    syncHostLobbySettingsFromInputs();
  });

  document.getElementById('btnCopyRoomCode')?.addEventListener('click', () => {
    if (!gameSession.roomCode) return;
    copyTextSafe(gameSession.roomCode, `📋 已複製房間碼【${gameSession.roomCode}】！`);
  });

  document.getElementById('btnCopyInviteLink')?.addEventListener('click', () => {
    if (!gameSession.roomCode) return;
    const baseUrl = window.location.href.split('?')[0];
    const inviteUrl = `${baseUrl}?room=${gameSession.roomCode}`;
    copyTextSafe(inviteUrl, `🔗 已複製邀請連結！傳給朋友打開即可自動入房。`);
  });

  document.getElementById('btnAddSimulatedHuman')?.addEventListener('click', () => {
    addSimulatedHumanSeatInRoom();
  });

  document.getElementById('btnConnectJoinRoom')?.addEventListener('click', () => {
    const code = document.getElementById('inputJoinRoomCode')?.value || '';
    const nick = document.getElementById('inputPlayerNickname')?.value || gameSession.playerName;
    joinOnlineRoomAsClient(code, nick);
  });

  document.getElementById('btnStartWithDraft').addEventListener('click', () => startMatchFromLobby(false));
  document.getElementById('btnStartQuickMatch').addEventListener('click', () => startMatchFromLobby(true));
  document.getElementById('btnPlayAgain').addEventListener('click', () => {
    document.getElementById('gameOverModal').classList.add('hidden');
    if (gameSession.mode === 'HOST') {
      gameSession.lobbyState.matchStarted = false;
      gameSession.hostMasterState = null;
      broadcastLobbyState();
    }
    renderLobbyUI();
    document.getElementById('lobbyModal').classList.remove('hidden');
  });

  document.getElementById('btnCloseInspector').addEventListener('click', () => {
    document.getElementById('inspectorModal').classList.add('hidden');
  });
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initAppOnLoad);
} else {
  initAppOnLoad();
}

window.playSynchronizedVfxEvent = playSynchronizedVfxEvent;
window.openOpponentCastleModal = openOpponentCastleModal;
window.renderAll = renderAll;
window.renderLobbyUI = renderLobbyUI;
window.resetSelectionState = resetSelectionState;
window.showGameOverModal = showGameOverModal;
