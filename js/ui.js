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



// === V13.9 Landscape Tabletop Mode & Orientation Controller ===
let layoutOrientationPref = (function() {
  try {
    return window.localStorage.getItem("dbr_v13_orientation") || "AUTO";
  } catch (e) {
    return "AUTO";
  }
})();

function isLandscapeModeActive() {
  if (layoutOrientationPref === "LANDSCAPE") return true;
  if (layoutOrientationPref === "PORTRAIT") return false;
  const vw = window.innerWidth || 390;
  const vh = window.innerHeight || 844;
  return vw > vh && vw >= 540;
}

function setLayoutOrientationPref(newPref) {
  layoutOrientationPref = newPref;
  try {
    window.localStorage.setItem("dbr_v13_orientation", newPref);
  } catch (e) {}
  syncLayoutOrientationDOM();
  if (typeof renderAll === "function" && typeof gameState !== "undefined" && gameState) {
    renderAll();
  }
}

function toggleLandscapePortraitMode() {
  const curActive = isLandscapeModeActive();
  const nextPref = curActive ? "PORTRAIT" : "LANDSCAPE";
  if (typeof playSfx === "function") playSfx("click");
  setLayoutOrientationPref(nextPref);
  if (typeof showToast === "function") {
    showToast(nextPref === "LANDSCAPE" ? "🖥️ 已切換為「橫屏圓桌牌桌模式」" : "📱 已切換為「直向單手掌機模式」");
  }
}

function syncLayoutOrientationDOM() {
  const lsActive = isLandscapeModeActive();
  const vw = window.innerWidth || 390;
  const vh = window.innerHeight || 844;
  const isRotatedPortrait = Boolean(lsActive && vh > vw);
  const appW = isRotatedPortrait ? vh : vw;
  const appH = isRotatedPortrait ? vw : vh;

  document.documentElement.style.setProperty("--app-w", `${appW}px`);
  document.documentElement.style.setProperty("--app-h", `${appH}px`);

  const pHeader = document.getElementById("portraitHeaderBar");
  const pMain = document.getElementById("portraitMainArena");
  const lsRoot = document.getElementById("landscapeArenaRoot");

  document.body.classList.toggle("is-landscape-active", lsActive);
  document.body.classList.toggle("force-landscape-rotate", isRotatedPortrait);

  document.documentElement.classList.toggle("has-landscape-rotate", isRotatedPortrait);
  if (isRotatedPortrait) {
    document.body.style.setProperty("width", `${vh}px`, "important");
    document.body.style.setProperty("height", `${vw}px`, "important");
    document.body.style.setProperty("max-width", "none", "important");
    document.body.style.setProperty("max-height", "none", "important");
    document.body.style.setProperty("left", `${vw}px`, "important");
    document.body.style.setProperty("top", "0px", "important");
  } else {
    document.body.style.removeProperty("width");
    document.body.style.removeProperty("height");
    document.body.style.removeProperty("max-width");
    document.body.style.removeProperty("max-height");
    document.body.style.removeProperty("left");
    document.body.style.removeProperty("top");
  }

  if (pHeader) pHeader.classList.toggle("hidden", lsActive);
  if (pMain) pMain.classList.toggle("hidden", lsActive);
  if (lsRoot) lsRoot.classList.toggle("hidden", !lsActive);

  const btnHomeOrient = document.getElementById("btnHomeToggleOrientation");
  if (btnHomeOrient) {
    btnHomeOrient.textContent = lsActive ? "📱 切換直向掌機模式" : "🖥️ 切換橫屏牌桌模式";
  }
  const menuOrientText = document.getElementById("menuOrientationText");
  if (menuOrientText) {
    menuOrientText.textContent = lsActive ? "🖥️ 橫屏圓桌牌桌" : "📱 直向單手掌機";
  }
}

window.addEventListener("resize", () => {
  syncLayoutOrientationDOM();
  if (typeof gameState !== "undefined" && gameState && typeof renderAll === "function") {
    renderAll();
  }
});
window.addEventListener("orientationchange", () => {
  setTimeout(() => {
    syncLayoutOrientationDOM();
    if (typeof gameState !== "undefined" && gameState && typeof renderAll === "function") {
      renderAll();
    }
  }, 120);
});

function getPlayerAnchorSelector(playerId) {
  if (isLandscapeModeActive()) {
    return playerId === getLocalPlayerId() ? "#lsMyCompanyPanel" : `[data-ls-seat="${playerId}"]`;
  }
  return playerId === getLocalPlayerId() ? "#myHeroStatusBar" : `[data-seat-tab="${playerId}"]`;
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
  const avatarSrc = repEmp ? getMiniAvatarSrc(repEmp.tplId) : null;
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
  const canHover = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!canHover) return;
  document.querySelectorAll('.tilt-card-3d').forEach(cardEl => {
    if (cardEl.__tiltBound) return;
    cardEl.__tiltBound = true;
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
    cardEl.addEventListener('mousemove', e => handleMove(e.clientX, e.clientY), { passive: true });
    cardEl.addEventListener('mouseleave', resetTilt, { passive: true });
  });
}

function renderEmployeeCardHTML(empUid, extraClasses = '', badgeLabel = '') {
  const c = CARDS_BY_ID[empUid];
  if (!c) return '';
  const meta = DEPT_META[c.dept] || DEPT_META.RED;
  const artKey = c.artKey || c.tplId;

  return `
    <div data-emp-uid="${c.uid}" class="relative rounded-xl bg-slate-950 border-2 ${meta.border} ${c.isVP ? 'vp-card-frame' : ''} overflow-hidden shadow-xl transition min-w-0 ${extraClasses}">
      ${getCardImgTag(artKey, c.title, "full-gpt-card-img")}
      ${badgeLabel ? `<span class="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-sky-500 text-slate-950 text-[10px] font-black shadow-lg z-20">${badgeLabel}</span>` : ''}
    </div>
  `;
}

function renderTalentPoolThumbCardHTML(topCard, d, deckLen) {
  const meta = DEPT_META[d];
  const artKey = topCard.artKey || topCard.tplId;
  return `
    <button data-open-bank-dept="${d}" class="jobbank-thumb-card border-2 ${meta.border} ${topCard.isVP ? 'vp-card-frame' : ''} bg-slate-950">
      ${getCardImgTag(artKey, topCard.title, 'w-full h-full object-cover block')}
      <span class="absolute top-0.5 right-0.5 px-1 py-0.5 rounded bg-slate-950/90 border border-slate-600 text-[8px] font-black text-amber-300 leading-none shadow">剩${deckLen}</span>
    </button>
  `;
}

function renderActionCardHTML(actUid, extraClasses = '', playStatus = null, isSelected = false, isDiscardChecked = false) {
  const c = CARDS_BY_ID[actUid];
  if (!c) return '';
  const meta = DEPT_META[c.dept] || DEPT_META.PURPLE;
  const isAttack = c.category === 'ATTACK' || c.category === 'CRISIS' || c.category === 'VP_ATTACK';

  let reqBarHTML = '';
  if (c.dept === 'PURPLE') {
    const terms = typeof getThemeTerms === 'function' ? getThemeTerms() : { vpIcon: '👑', vpName: '皇室', currencyIcon: '💎', engIcon: '⚒' };
    reqBarHTML = `<div class="text-[9px] font-black text-amber-300 bg-purple-950/90 px-1 py-0.5 rounded-full border border-amber-400 whitespace-nowrap leading-none">${terms.vpIcon}${terms.vpName}≥${c.reqVPs || 2}</div>`;
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
    ? `<span class="px-1 py-0.5 rounded bg-emerald-950 border border-emerald-400 text-[9px] font-black text-emerald-300 leading-none">+${c.val}${(typeof getThemeTerms === 'function' ? getThemeTerms().currencyIcon : '💎')}</span>`
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
  const homeSpeedBtn = document.getElementById('btnHomeToggleSpeed');
  if (homeSpeedBtn) {
    homeSpeedBtn.textContent = animSpeedMultiplier === 1 ? '⏩ 1x 標準速度' : '⏩ 2x 快轉中';
  }
  const homeMuteBtn = document.getElementById('btnHomeToggleMute');
  if (homeMuteBtn) {
    homeMuteBtn.textContent = isMuted ? '🔇 已靜音' : '🔊 音效開啟';
  }
  const homeFsBtn = document.getElementById('btnHomeFullscreen');
  if (homeFsBtn) {
    homeFsBtn.textContent = deferredPwaPrompt ? '📲 安裝PWA' : isRunningStandalonePWA() ? '✔ PWA全螢幕' : isFs ? '✕ 退出全螢幕' : '⛶ 全螢幕/PWA';
  }
  const curTheme = typeof getActiveTheme === 'function' ? getActiveTheme() : null;
  if (curTheme) {
    const menuThemeText = document.getElementById('menuCurrentThemeText');
    if (menuThemeText) menuThemeText.textContent = curTheme.shortLabel;
    const homeThemeSel = document.getElementById('homeSelectTheme');
    if (homeThemeSel && homeThemeSel.value !== curTheme.id) homeThemeSel.value = curTheme.id;
    const lobbyThemeSel = document.getElementById('selectLobbyTheme');
    if (lobbyThemeSel && lobbyThemeSel.value !== curTheme.id) lobbyThemeSel.value = curTheme.id;
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
  const activeTheme = typeof getActiveTheme === 'function' ? getActiveTheme() : { id: 'CLASSIC_BURN_RATE', useFullCardArt: false };
  const terms = typeof getThemeTerms === 'function' ? getThemeTerms() : {};

  const hIconEl = document.getElementById('headerAppIcon');
  if (hIconEl && terms.appIcon && hIconEl.textContent !== terms.appIcon) hIconEl.textContent = terms.appIcon;
  const hTitleEl = document.getElementById('headerAppTitle');
  if (hTitleEl && terms.shortTitle && hTitleEl.textContent !== terms.shortTitle) hTitleEl.textContent = terms.shortTitle;
  const jbTitleEl = document.getElementById('jobBankSectionTitle');
  if (jbTitleEl && terms.jobBankTitle && jbTitleEl.textContent !== terms.jobBankTitle) jbTitleEl.textContent = terms.jobBankTitle;
  const handTitleEl = document.getElementById('handSectionTitle');
  if (handTitleEl && terms.handTitle && handTitleEl.textContent !== terms.handTitle) handTitleEl.textContent = terms.handTitle;

  // 1. Compact Top Header Status
  const phaseBadgeEl = document.getElementById('phaseBadge');
  const nextPhaseText =
    state.phase === 'INITIAL_DRAFT' ? `首輪 ${state.draft.totalPicked}/${state.draft.targetTotal}` :
    state.phase === 'GAME_OVER' ? '結束' : `R${state.turn.roundNumber}`;
  if (phaseBadgeEl && phaseBadgeEl.textContent !== nextPhaseText) {
    phaseBadgeEl.textContent = nextPhaseText;
  }

  const activeBadge = document.getElementById('activePlayerBadge');
  if (activeBadge) {
    const nextActiveText = isMyTurnNow
      ? `👑我方回合`
      : `⚡${getShortPlayerName(turnActor.name)}行動中`;
    if (activeBadge.textContent !== nextActiveText) {
      activeBadge.textContent = nextActiveText;
    }
    const nextActiveCls = isMyTurnNow
      ? 'px-1.5 py-0.5 rounded bg-emerald-950/90 border border-emerald-400 text-[10px] font-black text-emerald-300 truncate'
      : 'px-1.5 py-0.5 rounded bg-amber-950/90 border border-amber-400 text-[10px] font-black text-amber-300 truncate';
    if (activeBadge.className !== nextActiveCls) {
      activeBadge.className = nextActiveCls;
    }
  }

  const ruleShort = state.config.playDiscardMode === 'STRICT_EITHER' ? '二選一' : '共用4';
  const netTag = gameSession.mode === 'SOLO'
    ? `單機·${ruleShort}`
    : `🌐${gameSession.roomCode}·${myId.toUpperCase()}`;
  const modeTagEl = document.getElementById('modeIndicatorTag');
  if (modeTagEl && modeTagEl.textContent !== netTag) modeTagEl.textContent = netTag;

  updateSettingsMenuUI();

  // Only show Hot-Seat Switcher Bar if Host explicitly added a simulated local human seat
  const perspectiveBar = document.getElementById('hotSeatSwitcherBar');
  if (perspectiveBar) {
    if (gameSession.mode !== 'CLIENT' && gameSession.hasSimulatedHotSeat) {
      perspectiveBar.classList.remove('hidden');
      const pSig = `${myId}:${state.players.map(p => p.id + p.name).join(',')}`;
      if (perspectiveBar.getAttribute('data-render-sig') !== pSig) {
        perspectiveBar.setAttribute('data-render-sig', pSig);
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
      }
    } else {
      perspectiveBar.classList.add('hidden');
    }
  }

  // 2-Line Compact Battle Log Ticker (Diffed by top 2 log strings)
  const tickerEl = document.getElementById('latestLogTicker');
  if (tickerEl) {
    const logSig = `${state.logs[0] || ''}||${state.logs[1] || ''}`;
    if (tickerEl.getAttribute('data-render-sig') !== logSig) {
      tickerEl.setAttribute('data-render-sig', logSig);
      const line1 = formatLogItemToTickerHTML(state.logs[0] || '', true);
      const line2 = state.logs[1] ? formatLogItemToTickerHTML(state.logs[1], false) : '';
      tickerEl.innerHTML = line1 + line2;
    }
  }

  // 2. ZONE 1 (TOP): Enlarged Opponents Row (Diffed by opponent state signature)
  const seatTabsBar = document.getElementById('seatTabsBar');
  const opponents = getClockwiseOpponents(state);
  const oppCount = opponents.length;
  const targetGridCls = `w-full grid ${oppCount === 1 ? 'grid-cols-1' : oppCount === 3 ? 'grid-cols-3' : 'grid-cols-2'} gap-1.5 min-w-0 shrink-0`;
  if (seatTabsBar.className !== targetGridCls) {
    seatTabsBar.className = targetGridCls;
  }

  const oppSig = opponents.map(pl => {
    const idx = state.players.findIndex(p => p.id === pl.id);
    const isTurn = (state.phase === 'INITIAL_DRAFT' ? state.draft.pickerIndex === idx : state.turn.activePlayerIndex === idx);
    const handCnt = typeof pl.handCount === 'number' ? pl.handCount : pl.hand.length;
    const deptSkills = ['RED', 'YELLOW', 'BLUE', 'GREEN'].map(d => `${getEffectiveSkill(pl, d)}${hasVPInDept(pl, d) ? 'V' : ''}`).join(',');
    return `${pl.id}:${pl.name}:${pl.crystals}:${getPlayerBurnRate(pl)}:${pl.engineers.length}:${pl.crises.length}:${pl.outsourcedCount}:${handCnt}:${isTurn ? state.turn.actionsUsed : -1}:${pl.isEliminated}:${deptSkills}`;
  }).join('|') + `|modeD:${uiSelection.mode}:${uiSelection.sourceCardUid || ''}:${uiSelection.step2OpponentId || ''}|myTurn:${isMyTurnNow}|theme:${activeTheme.id}`;

  if (seatTabsBar.getAttribute('data-render-sig') !== oppSig) {
    seatTabsBar.setAttribute('data-render-sig', oppSig);
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
          <div class="flex items-center justify-between w-full gap-1 min-w-0">
            <span class="text-xs sm:text-sm font-black ${isTurn ? 'text-amber-300' : 'text-white'} truncate">${roleIcon} ${cleanShortName}</span>
            ${turnBadge}
          </div>
          <div class="grid grid-cols-3 gap-1 w-full min-w-0">
            <span class="rounded bg-emerald-950/85 border border-emerald-500/40 px-1 py-0.5 text-[11px] font-black text-emerald-400 text-center whitespace-nowrap">${terms.currencyIcon || '💎'}${pl.crystals}</span>
            <span class="rounded bg-rose-950/85 border border-rose-500/40 px-1 py-0.5 text-[11px] font-black text-rose-400 text-center whitespace-nowrap">🔥-${burn}/回</span>
            <span class="rounded bg-purple-950/85 border border-purple-500/40 px-1 py-0.5 text-[10px] font-black text-purple-200 text-center whitespace-nowrap">${terms.vpIcon || '👑'}${terms.vpName || '皇室'}:${vpCnt}</span>
          </div>
          <div class="grid grid-cols-3 gap-1 w-full bg-slate-950/90 border border-slate-800 rounded-md px-1.5 py-0.5 text-[10px] font-bold text-center min-w-0">
            <span class="text-red-200 whitespace-nowrap">${terms.engIcon || '⚒'}${terms.engName || '苦工'} <b>${pl.engineers.length}</b></span>
            <span class="${pl.crises.length > 0 ? 'text-amber-300 font-black' : 'text-slate-400'} whitespace-nowrap">${terms.crisisIcon || '⚠️'}${terms.crisisName || '危機'} <b>${pl.crises.length}</b>${totalCrisisReq > 0 ? `(${totalCrisisReq})` : ''}</span>
            <span class="${pl.outsourcedCount > 0 ? 'text-rose-300 font-black' : 'text-slate-400'} whitespace-nowrap">${terms.outIcon || '👹'}${terms.outName || '外包'} <b>${pl.outsourcedCount}</b></span>
          </div>
          <div class="grid grid-cols-4 gap-1 w-full min-w-0">
            ${skillDots}
          </div>
        </button>
      `;
    }).join('');
  }

  // 3. ZONE 2: Per-Column Incremental Diffing for Public 4-Column Job Bank Pure 2:3 Card Thumbnails
  // Displays ONLY the 2:3 character card directly (no redundant top header or bottom name bar)
  const condensedStrip = document.getElementById('condensedJobBankPills');
  if (condensedStrip) {
    if (condensedStrip.children.length !== 4 || !condensedStrip.querySelector('[data-bank-slot]')) {
      condensedStrip.innerHTML = ['RED', 'YELLOW', 'BLUE', 'GREEN'].map(d =>
        `<div data-bank-slot="${d}" class="h-full min-h-0 min-w-0 flex items-center justify-center"></div>`
      ).join('');
    }
    ['RED', 'YELLOW', 'BLUE', 'GREEN'].forEach(d => {
      const slotEl = condensedStrip.querySelector(`[data-bank-slot="${d}"]`);
      if (!slotEl) return;
      const meta = DEPT_META[d];
      const deck = state.jobBank[d];
      const topUid = deck[0];
      const bankSig = `${activeTheme.id}:${topUid || 'EMPTY'}:${deck.length}`;
      if (slotEl.getAttribute('data-bank-sig') === bankSig) return;
      slotEl.setAttribute('data-bank-sig', bankSig);

      if (!topUid) {
        slotEl.innerHTML = `
          <div class="jobbank-thumb-card empty-rune-slot border border-dashed ${meta.border} flex flex-col items-center justify-center text-center p-1">
            <div class="text-[10px] font-bold ${meta.text}">${meta.icon}${meta.short}</div>
            <div class="text-[9px] text-slate-400 mt-0.5">已抽乾</div>
          </div>
        `;
        return;
      }
      const topCard = CARDS_BY_ID[topUid];
      slotEl.innerHTML = renderTalentPoolThumbCardHTML(topCard, d, deck.length);
    });
  }

  // 4. Handle Initial Draft Stage vs Main Castle Stage
  const draftStage = document.getElementById('draftStageSection');
  const companyStage = document.getElementById('companyStageSection');
  if (state.phase === 'INITIAL_DRAFT') {
    draftStage.classList.remove('hidden');
    companyStage.classList.add('hidden');
    document.getElementById('draftProgressSub').textContent =
      `進度：第 ${state.draft.round}/4 輪（輪到【${state.players[state.draft.pickerIndex].name}】挑選）`;

    const draftGrid = document.getElementById('draftBankCardsGrid');
    const draftSig = ['RED', 'YELLOW', 'BLUE', 'GREEN'].map(d => `${state.jobBank[d][0] || 'E'}:${state.jobBank[d].length}`).join('|') + `|turn:${isMyTurnNow}:${localPlayer.id}`;
    if (draftGrid.getAttribute('data-render-sig') !== draftSig) {
      draftGrid.setAttribute('data-render-sig', draftSig);
      draftGrid.innerHTML = ['RED', 'YELLOW', 'BLUE', 'GREEN'].map(d => {
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
    }
  } else {
    draftStage.classList.add('hidden');
    companyStage.classList.remove('hidden');
  }

  // 5. ZONE 3 (CENTER): Per-Department Incremental DOM Diffing for Local Player's 4-Department Castle Stage!
  // Only updates a department slot if its manager (headUid) or subordinate count actually changed!
  // Completely eliminates character card refreshing/flickering and preserves horizontal scrollLeft!
  recalcPlayerStats(localPlayer);
  const deptGrid = document.getElementById('companyDepartmentsGrid');
  if (deptGrid) {
    if (!deptGrid.classList.contains('stage-track-scroll')) {
      deptGrid.className = 'stage-track-scroll no-scrollbar min-w-0';
    }
    if (deptGrid.children.length !== 4 || !deptGrid.querySelector('[data-stage-slot]')) {
      deptGrid.innerHTML = ['RED', 'YELLOW', 'BLUE', 'GREEN'].map(d =>
        `<div data-stage-slot="${d}" class="shrink-0 snap-start flex"></div>`
      ).join('');
    }

    ['RED', 'YELLOW', 'BLUE', 'GREEN'].forEach(d => {
      const slotEl = deptGrid.querySelector(`[data-stage-slot="${d}"]`);
      if (!slotEl) return;

      const meta = DEPT_META[d];
      const deptArr = localPlayer.departments[d];
      const headUid = deptArr[0] || 'EMPTY';
      const subCount = Math.max(0, deptArr.length - 1);
      const slotSig = `${activeTheme.id}:${localPlayer.id}:${headUid}:${subCount}`;

      const flipKey = `${localPlayer.id}_${d}`;
      const isNewlyFlipped = window.lastFlippedDeptKey === flipKey;
      if (isNewlyFlipped) {
        window.lastFlippedDeptKey = null;
      }

      // If this department's card & subordinate count haven't changed, DO NOT touch its DOM node!
      if (slotEl.getAttribute('data-slot-sig') === slotSig && !isNewlyFlipped) {
        return;
      }
      slotEl.setAttribute('data-slot-sig', slotSig);

      if (deptArr.length === 0) {
        slotEl.innerHTML = `
          <div data-empty-dept="${d}" class="dept-card-scroll empty-rune-slot rounded-xl border-2 border-dashed ${meta.border} overflow-hidden flex flex-col justify-between p-2.5 min-w-0 relative cursor-pointer transition">
            <div class="flex items-center justify-between w-full gap-1">
              <span class="w-5 h-5 text-[10px] rounded-full bg-slate-950 border border-slate-600 text-slate-400 flex items-center justify-center font-black shadow shrink-0">0</span>
              <span class="text-[11px] font-black ${meta.text} truncate">${meta.icon}${meta.name}</span>
              <span class="px-1 py-0.5 rounded bg-slate-900 border border-slate-700 text-[9px] font-bold text-slate-400 shrink-0">0級</span>
            </div>
            <div class="flex flex-col items-center justify-center text-center my-auto px-1">
              <div class="w-11 h-11 text-xl rounded-full ${meta.panelBg} border ${meta.border} flex items-center justify-center opacity-60 shadow-lg">${meta.icon}</div>
              <span class="text-xs mt-1.5 font-black text-slate-300">${terms.emptySlotTitle || '部門懸缺 (0級)'}</span>
              <span class="text-[10px] text-slate-400 mt-0.5 leading-tight">${terms.emptySlotSub || '無主管駐守，檢定視為 0 級'}</span>
            </div>
            <div class="bg-slate-950/90 border border-slate-800 rounded-lg py-0.5 px-1.5 flex items-center justify-between text-[9px] text-slate-400">
              <span>${terms.currencyIcon || '💵'}0</span>
              <span class="text-sky-300 font-bold truncate">點擊招募 ▸</span>
            </div>
          </div>
        `;
        return;
      }

      const hCard = CARDS_BY_ID[headUid];
      const badgeStr = `👑我方${subCount > 0 ? ` +${subCount}${terms.empName || '下屬'}` : ''}`;
      slotEl.innerHTML = `
        <div data-inspect-dept="${d}" data-inspect-player="${localPlayer.id}" class="dept-card-scroll tilt-card-3d ${isNewlyFlipped ? 'anim-flip-in' : ''} rounded-xl bg-slate-950 border-2 ${meta.border} ${hCard.isVP ? 'vp-card-frame' : ''} overflow-hidden cursor-pointer shadow-xl min-w-0 relative">
          ${getCardImgTag(hCard.artKey || hCard.tplId, hCard.title, 'w-full h-full object-cover block')}
          <div class="holo-sheen-layer"></div>
          <span class="absolute bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full text-[9px] font-black shadow-lg whitespace-nowrap z-20 bg-slate-950/90 border border-amber-400 text-amber-300">${badgeStr}</span>
        </div>
      `;
      const insertedCard = slotEl.firstElementChild;
      if (insertedCard && isNewlyFlipped) {
        insertedCard.addEventListener('animationend', () => {
          insertedCard.classList.remove('anim-flip-in');
        }, { once: true });
      }
    });
  }

  // Clear any leftover flipped key if it belonged to an opponent
  window.lastFlippedDeptKey = null;

  // 5A-2. ZONE 4 (LOWER-MIDDLE): Render My Permanent Hero Status Bar (#myHeroStatusBar) (Diffed)
  const myBurn = getPlayerBurnRate(localPlayer);
  const myCrisisReq = getCrisisTotalEngineerReq(localPlayer);
  const myCrisisCnt = localPlayer.crises.length;
  const myHeroBar = document.getElementById('myHeroStatusBar');
  if (myHeroBar) {
    const heroCls = `w-full rounded-xl bg-slate-950/95 border-2 ${isMyTurnNow ? 'border-amber-400 shadow-lg' : 'border-slate-700'} px-2.5 py-1.5 flex flex-col gap-1 transition min-w-0`;
    if (myHeroBar.className !== heroCls && !myHeroBar.classList.contains('anim-hit-shake')) {
      myHeroBar.className = heroCls;
    }
    const heroSig = `${activeTheme.id}:${myId}:${localPlayer.name}:${isMyTurnNow}:${getTotalVPCount(localPlayer)}:${localPlayer.crystals}:${myBurn}:${localPlayer.engineers.length}:${myCrisisCnt}:${myCrisisReq}:${localPlayer.outsourcedCount}`;
    if (myHeroBar.getAttribute('data-render-sig') !== heroSig) {
      myHeroBar.setAttribute('data-render-sig', heroSig);
      myHeroBar.innerHTML = `
        <div class="flex items-center justify-between gap-1.5 min-w-0">
          <div class="flex items-center gap-1.5 min-w-0 flex-1">
            <span class="px-1.5 py-0.5 rounded text-[10px] font-black whitespace-nowrap shrink-0 ${isMyTurnNow ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-amber-300'}">👑 我方 (${myId.toUpperCase()})</span>
            <span class="text-xs font-black text-white truncate">${getShortPlayerName(localPlayer.name)}</span>
            <span class="px-1.5 py-0.5 rounded bg-purple-950 border border-purple-400 text-[9px] font-black text-purple-200 whitespace-nowrap shrink-0">${terms.vpIcon || '👑'}${terms.vpName || '皇室'}:${getTotalVPCount(localPlayer)}</span>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            <span class="px-2 py-0.5 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-xs font-black text-emerald-400 whitespace-nowrap">${terms.currencyIcon || '💎'}${localPlayer.crystals}</span>
            <span class="px-2 py-0.5 rounded-lg bg-rose-950/70 border border-rose-500/50 text-xs font-black text-rose-400 whitespace-nowrap">🔥-${myBurn}/回</span>
          </div>
        </div>
        <div class="grid grid-cols-3 gap-1.5 w-full min-w-0">
          <div class="rounded-lg bg-red-950/60 border border-red-500/40 px-2 py-0.5 text-left flex items-center justify-between min-w-0">
            <span class="text-[10px] font-bold text-red-200 truncate">${terms.engIcon || '⚒'}${terms.engName || '工程師'}:${localPlayer.engineers.length}</span>
            <span class="text-[10px] font-black text-rose-300 whitespace-nowrap shrink-0">${terms.currencyIcon || '💵'}-${localPlayer.engineers.length}</span>
          </div>
          <button data-inspect-crises="${myId}" class="rounded-lg ${myCrisisCnt > 0 ? 'bg-amber-950/80 border border-amber-400' : 'bg-slate-900 border border-slate-700'} px-2 py-0.5 text-left flex items-center justify-between min-w-0">
            <span class="text-[10px] font-bold ${myCrisisCnt > 0 ? 'text-amber-200' : 'text-slate-400'} whitespace-nowrap">${terms.crisisIcon || '⚠️'}${terms.crisisName || '危機'}:${myCrisisCnt}</span>
            <span class="text-[10px] font-black ${myCrisisCnt > 0 ? 'text-amber-300' : 'text-slate-500'} whitespace-nowrap shrink-0">需${myCrisisReq} 🔍</span>
          </button>
          <div class="rounded-lg ${localPlayer.outsourcedCount > 0 ? 'bg-rose-950/90 border border-rose-400' : 'bg-slate-900 border border-slate-700'} px-2 py-0.5 text-left flex items-center justify-between min-w-0">
            <span class="text-[10px] font-bold ${localPlayer.outsourcedCount > 0 ? 'text-rose-200' : 'text-slate-400'} truncate">${terms.outIcon || '💸'}${terms.outName || '外包'}:${localPlayer.outsourcedCount}</span>
            <span class="text-[10px] font-black ${localPlayer.outsourcedCount > 0 ? 'text-rose-300' : 'text-slate-500'} whitespace-nowrap shrink-0">${terms.currencyIcon || '💵'}-${localPlayer.outsourcedCount * 3}</span>
          </div>
        </div>
      `;
    }
  }

  // 5B. Sync Orientation & Render Landscape Tabletop Arena when active
  syncLayoutOrientationDOM();
  if (isLandscapeModeActive()) {
    renderLandscapeArena();
  }

  // 6. Render Mode D Tactical Targeting Drawer
  renderModeDDrawer();

  // 7. Render Local Player Compact Hand & Controls (Diffed + Scroll Preserved)
  const isHumanStep1 = state.phase === 'STEP1_PLAY_OR_DISCARD' && isMyTurnNow;
  document.getElementById('quotaCounterText').textContent = `額度: ${state.turn.actionsUsed}/${state.turn.maxActions}`;
  document.getElementById('actionDeckCountText').textContent = state.actionDeck.length;
  document.getElementById('discardPileCountText').textContent = state.discardPile.length;

  const handContainer = document.getElementById('localHandContainer');
  const playableBadge = document.getElementById('playableCountBadge');
  if (localPlayer.hand.length === 0) {
    if (playableBadge) playableBadge.textContent = '無手牌';
    const emptySig = `EMPTY:${state.phase}`;
    if (handContainer.getAttribute('data-render-sig') !== emptySig) {
      handContainer.setAttribute('data-render-sig', emptySig);
      handContainer.innerHTML = `<div class="text-xs text-slate-400 py-3 mx-auto text-center">${state.phase === 'INITIAL_DRAFT' ? '🎲 請先在上方完成「首輪召喚」（挑選 4 名部下），結束後將發放 6 張手牌！' : '目前無手牌'}</div>`;
    }
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

    const handSig = activeTheme.id + '||' + evaluatedHand.map(({ hUid, status }) =>
      `${hUid}:${status.playable ? 1 : 0}:${status.shortReason || ''}:${uiSelection.sourceCardUid === hUid ? 1 : 0}:${uiSelection.discardSet.has(hUid) ? 1 : 0}:${uiSelection.mode}`
    ).join('|');

    if (handContainer.getAttribute('data-render-sig') !== handSig) {
      const prevScrollLeft = handContainer.scrollLeft;
      handContainer.setAttribute('data-render-sig', handSig);
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
      handContainer.scrollLeft = prevScrollLeft;
    }
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
    const nextHandDockCls = `bg-slate-950/90 border-t-2 ${isHumanStep1 ? 'border-amber-400' : 'border-slate-800 opacity-85'} rounded-xl px-2 py-1.5 flex flex-col gap-1 shadow-2xl transition min-w-0 shrink-0`;
    if (handDock.className !== nextHandDockCls) handDock.className = nextHandDockCls;
  }

  attachDynamicBoardListeners();
}


// ============================================================================
// V13.9.2 LANDSCAPE TABLETOP MODE RENDERER (橫屏圓桌模式 — 純淨卡面 + 零溢出雙欄指揮窗)
// ============================================================================
const LS_DEPT_ORDER = ['BLUE', 'RED', 'YELLOW', 'GREEN'];

const LS_EMPTY_DEPT_STYLE = {
  BLUE:   { bg: 'bg-sky-950/60',     border: 'border-sky-500/45',     text: 'text-sky-200',     headerBg: 'bg-sky-700' },
  RED:    { bg: 'bg-rose-950/60',    border: 'border-rose-500/45',    text: 'text-rose-200',    headerBg: 'bg-rose-700' },
  YELLOW: { bg: 'bg-amber-950/60',   border: 'border-amber-500/45',   text: 'text-amber-200',   headerBg: 'bg-amber-700' },
  GREEN:  { bg: 'bg-emerald-950/60', border: 'border-emerald-500/45', text: 'text-emerald-200', headerBg: 'bg-emerald-700' }
};

function renderLsDeptSlotHTML(player, d, opts = {}) {
  const meta = DEPT_META[d];
  const st = LS_EMPTY_DEPT_STYLE[d] || LS_EMPTY_DEPT_STYLE.RED;
  const list = player.departments[d] || [];
  const headUid = list[0];
  const subCount = Math.max(0, list.length - 1);
  const effSkill = getEffectiveSkill(player, d);
  const isHighlighted = opts.highlightDept === d;
  const isComp = Boolean(opts.isComp);
  const baseCardCls = isComp ? 'ls-comp-dept-card' : 'ls-dept-card';
  const glowCls = isHighlighted ? 'ls-dept-target-glow' : `border ${st.border}`;
  const clickAttrs = opts.noInspect ? '' : (headUid ? `data-inspect-dept="${d}" data-inspect-player="${player.id}"` : `data-empty-dept="${d}"`);

  if (!headUid) {
    return `
      <div ${clickAttrs} class="${baseCardCls} ${st.bg} ${glowCls} flex flex-col justify-between items-center p-0.5 select-none">
        <div class="w-full text-center text-[7px] font-black ${st.text} opacity-85 truncate">${meta.short}</div>
        <div class="text-[10px] font-black ${st.text} opacity-80 my-auto">缺</div>
        <div class="w-full text-center text-[7px] font-bold ${isHighlighted ? 'text-amber-300 font-black' : 'text-slate-400/80'}">0級</div>
      </div>
    `;
  }

  const hCard = CARDS_BY_ID[headUid];
  const artKey = hCard.artKey || hCard.tplId;

  // Pure 2:3 Card Art (No redundant top bar or bottom orbs covering the card art!)
  return `
    <div ${clickAttrs} class="${baseCardCls} ${glowCls} bg-slate-950 select-none">
      ${getCardImgTag(artKey, hCard.title, 'w-full h-full object-cover block')}
      ${isHighlighted ? `<span class="absolute top-0.5 left-0.5 px-1 py-0.2 rounded bg-amber-400 text-slate-950 text-[8px] font-black leading-none z-20 shadow">${effSkill}級</span>` : ''}
      ${subCount > 0 ? `<span class="absolute bottom-0.5 left-1/2 -translate-x-1/2 px-1 py-0.2 rounded bg-slate-950/90 border border-amber-400/80 text-[8px] font-black text-amber-300 leading-none z-20 whitespace-nowrap">+${subCount}</span>` : ''}
    </div>
  `;
}

function renderLsBankCardHTML(d, topUid, deckLen) {
  const meta = DEPT_META[d];
  const st = LS_EMPTY_DEPT_STYLE[d] || LS_EMPTY_DEPT_STYLE.RED;
  if (!topUid) {
    return `
      <div class="ls-dept-card ${st.bg} border border-dashed ${st.border} flex flex-col items-center justify-center p-1 opacity-60">
        <span class="text-[9px] font-black ${st.text}">${meta.short}</span>
        <span class="text-[8px] text-slate-400 mt-0.5">抽乾</span>
      </div>
    `;
  }
  const c = CARDS_BY_ID[topUid];
  return `
    <button data-open-bank-dept="${d}" class="ls-dept-card border ${st.border} bg-slate-950">
      ${getCardImgTag(c.artKey || c.tplId, c.title, 'w-full h-full object-cover block')}
      <span class="absolute top-0.5 right-0.5 px-1 py-0.2 rounded bg-slate-950/90 border border-amber-400/70 text-[8px] font-black text-amber-300 leading-none z-20 shadow">剩${deckLen}</span>
    </button>
  `;
}

function renderLsOpponentSeatHTML(opp) {
  if (!opp) return '';
  const state = gameState;
  const activePlayer = state.players[state.turn.activePlayerIndex];
  const isTurn = activePlayer && activePlayer.id === opp.id && state.phase !== 'GAME_OVER';
  const burn = getPlayerBurnRate(opp);
  const crisisReq = getCrisisTotalEngineerReq(opp);
  const shortName = getShortPlayerName(opp.name);
  const roleTag = opp.isAI ? '電腦' : '真人';
  const terms = typeof getThemeTerms === 'function' ? getThemeTerms() : {};

  let modeDSeatAttr = '';
  let targetRingCls = '';
  if (uiSelection.mode === 'MODE_D_SELECT' && uiSelection.sourceCardUid) {
    const selCard = CARDS_BY_ID[uiSelection.sourceCardUid];
    const localPlayer = getLocalPlayer(state);
    const status = evaluateCardPlayability(state, localPlayer, selCard.uid);
    const isValidOpp = (status.validOpponents && status.validOpponents.includes(opp.id)) ||
      (status.targetableByOpponent && status.targetableByOpponent[opp.id] && status.targetableByOpponent[opp.id].length > 0) ||
      (status.targetVPs && status.targetVPs.some(t => t.opponentId === opp.id));
    if (isValidOpp) {
      modeDSeatAttr = 'data-mode-d-seat="VALID_TARGET"';
      targetRingCls = 'ring-2 ring-rose-400 border-rose-400';
    }
  }

  return `
    <div data-ls-seat="${opp.id}" data-seat-tab="${opp.id}" ${modeDSeatAttr} class="ls-seat-panel ${isTurn ? 'ls-seat-active' : ''} ${targetRingCls} ${opp.isEliminated ? 'opacity-45 grayscale' : ''} w-full h-full flex flex-col justify-between gap-0.5 cursor-pointer min-w-0 overflow-hidden">
      <div class="flex items-center justify-between gap-1 min-w-0 shrink-0 px-0.5">
        <div class="flex items-center gap-1 min-w-0">
          <span class="text-[11px] font-black text-stone-200 truncate">${shortName}·${roleTag}</span>
          <span class="text-sm sm:text-base font-black text-amber-300 leading-none whitespace-nowrap">${opp.crystals}</span>
          <span class="text-[10px] font-bold text-stone-400 whitespace-nowrap">手${opp.hand.length}</span>
        </div>
        <div class="flex items-center gap-1 shrink-0 text-[9px] font-black">
          <span class="px-1 py-0.2 rounded bg-rose-950/90 border border-rose-500/40 text-rose-300 whitespace-nowrap">🔥-${burn}</span>
          <span class="px-1 py-0.2 rounded bg-red-950/80 border border-red-500/35 text-red-200 whitespace-nowrap">${terms.engIcon || '⚒'}${opp.engineers.length}</span>
          ${opp.crises.length > 0 ? `<span class="px-1 py-0.2 rounded bg-amber-950/90 border border-amber-400 text-amber-300 whitespace-nowrap">${terms.crisisIcon || '💥'}${opp.crises.length}(需${crisisReq})</span>` : ''}
          ${opp.outsourcedCount > 0 ? `<span class="px-1 py-0.2 rounded bg-rose-700 text-white whitespace-nowrap">包${opp.outsourcedCount}</span>` : ''}
        </div>
      </div>

      <div class="ls-dept-row py-0.5">
        ${LS_DEPT_ORDER.map(d => renderLsDeptSlotHTML(opp, d, { noInspect: true })).join('')}
      </div>
    </div>
  `;
}

function getActionCategoryVisuals(card) {
  const terms = typeof getThemeTerms === 'function' ? getThemeTerms() : {};
  if (card.effect === 'BAD_IDEA') {
    return { tag: '攻擊', headerBg: 'bg-amber-600', artBg: 'ls-act-art-atk', badge: `×${card.val}`, border: 'border-amber-400', checkDept: 'YELLOW' };
  }
  if (card.effect === 'RELEASE_CRISIS') {
    return { tag: '防守', headerBg: 'bg-rose-700', artBg: 'ls-act-art-def', badge: `清×${card.val}`, border: 'border-rose-400', checkDept: 'RED' };
  }
  if (card.effect === 'GAIN_FUNDS') {
    return { tag: '財務', headerBg: 'bg-emerald-700', artBg: 'ls-act-art-fin', badge: `+${card.val}`, border: 'border-emerald-400', checkDept: 'GREEN' };
  }
  if (card.effect === 'HIRE_BANK') {
    return { tag: '聘僱', headerBg: 'bg-sky-700', artBg: 'ls-act-art-hire', badge: '請人', border: 'border-sky-400', checkDept: null };
  }
  if (card.effect === 'FIRE_OWN') {
    return { tag: '解僱', headerBg: 'bg-slate-700', artBg: 'ls-act-art-fire', badge: '裁員', border: 'border-slate-400', checkDept: null };
  }
  if (card.effect === 'FORCE_HIRE') {
    return { tag: '陷害', headerBg: 'bg-orange-700', artBg: 'ls-act-art-force', badge: '塞人', border: 'border-orange-400', checkDept: 'BLUE' };
  }
  if (card.effect === 'POACH_ENEMY') {
    return { tag: '挖角', headerBg: 'bg-indigo-700', artBg: 'ls-act-art-poach', badge: '奪才', border: 'border-indigo-400', checkDept: 'BLUE' };
  }
  return { tag: `${terms.vpName || '副總'}大招`, headerBg: 'bg-purple-700', artBg: 'ls-act-art-vp', badge: '大招', border: 'border-purple-400', checkDept: null };
}

function renderLsTableMiniActionCardHTML(card, countBadge = null, topSubLabel = '') {
  if (!card) return '';
  const vis = getActionCategoryVisuals(card);
  return `
    <div class="ls-table-pile-card bg-ivory-card border-2 ${vis.border} overflow-hidden flex flex-col justify-between select-none">
      <div class="${vis.headerBg} px-1 py-0.5 text-[7px] font-black text-white flex items-center justify-between leading-none">
        <span>${vis.tag}</span>
        ${topSubLabel ? `<span class="truncate max-w-[38px] text-amber-200">${topSubLabel}</span>` : `<span>${vis.badge}</span>`}
      </div>
      <div class="flex-1 ${vis.artBg} flex flex-col items-center justify-center p-0.5 text-center relative">
        <span class="text-base sm:text-lg leading-none drop-shadow">${card.svg}</span>
        <span class="text-[8px] font-black text-white mt-0.5 drop-shadow">${vis.badge}</span>
      </div>
      <div class="bg-ivory-card px-1 py-0.5 text-center">
        <div class="text-[8px] font-black text-slate-900 truncate leading-tight">${card.title}</div>
      </div>
      ${countBadge !== null ? `<span class="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-full bg-stone-950 border border-amber-400/80 text-[9px] font-black text-amber-300 z-20 shadow">${countBadge}</span>` : ''}
    </div>
  `;
}

function renderLsHandCardHTML(card, status, isSelected, isDiscardSel, isHumanStep1) {
  const vis = getActionCategoryVisuals(card);
  const reqOrbs = (card.reqSkills && card.reqSkills.length > 0)
    ? `<div class="flex items-center justify-center gap-0.5">${card.reqSkills.map(s => `<span class="w-3.5 h-3.5 rounded-full bg-amber-600 text-white text-[8px] font-black flex items-center justify-center leading-none">${s}</span>`).join('')}</div>`
    : `<span class="text-[7px] font-extrabold text-slate-600">${card.dept === 'PURPLE' ? '2副總' : '免檢定'}</span>`;

  const dimCls = (isHumanStep1 && uiSelection.mode !== 'DISCARD_SELECT' && !status.playable) ? 'opacity-45 grayscale-[35%]' : '';
  const selCls = isSelected ? 'ls-hand-selected' : isDiscardSel ? 'ls-hand-discard-sel' : '';

  return `
    <div data-act-uid="${card.uid}" class="ls-hand-card ${selCls} ${dimCls} select-none">
      <div class="${vis.headerBg} px-1 py-0.5 text-[8px] font-black text-white flex items-center justify-between leading-none shrink-0">
        <span class="truncate">${vis.tag}</span>
        <span class="shrink-0">${vis.badge}</span>
      </div>
      <div class="flex-1 min-h-0 ${vis.artBg} flex flex-col items-center justify-center p-0.5 relative overflow-hidden">
        <div class="text-lg sm:text-xl leading-none drop-shadow-md">${card.svg}</div>
        <div class="mt-0.5 px-1 py-0.2 rounded bg-black/50 text-[8px] font-black text-amber-200 whitespace-nowrap">${vis.badge}</div>
        ${isDiscardSel ? `<div class="absolute inset-0 bg-orange-600/85 flex items-center justify-center text-[10px] font-black text-white">🗑️待棄</div>` : ''}
      </div>
      <div class="bg-ivory-card px-1 py-0.5 flex flex-col gap-0.5 shrink-0 border-t border-stone-300 text-center">
        <div class="text-[8px] sm:text-[9px] font-black text-slate-900 truncate leading-tight">${card.title}</div>
        <div class="flex items-center justify-between min-h-[13px]">
          <span class="text-[7px] font-black ${status.playable ? 'text-emerald-700' : 'text-rose-700'} truncate">${status.playable ? '●可出' : status.shortReason}</span>
          ${reqOrbs}
        </div>
      </div>
    </div>
  `;
}

function renderLandscapeArena() {
  const state = gameState;
  if (!state) return;
  const activeTheme = typeof getActiveTheme === 'function' ? getActiveTheme() : { id: 'CLASSIC_BURN_RATE' };
  const terms = typeof getThemeTerms === 'function' ? getThemeTerms() : {};
  const localPlayer = getLocalPlayer(state);
  const myId = localPlayer.id;
  const isMyTurnNow = isLocalPlayerTurn(state);
  const activePlayer = state.players[state.turn.activePlayerIndex];

  // 1. Top-Left: Phase Badge & 3-Line Live Log
  const lsPhaseEl = document.getElementById('lsPhaseBadge');
  if (lsPhaseEl) {
    lsPhaseEl.textContent = state.phase === 'INITIAL_DRAFT' ? '首輪選秀' : `R${state.turn.roundNumber}`;
  }
  const lsTurnEl = document.getElementById('lsActiveTurnBadge');
  if (lsTurnEl) {
    lsTurnEl.textContent = isMyTurnNow ? '👑 我方回合' : `⏳ ${getShortPlayerName(activePlayer.name)}`;
    lsTurnEl.className = isMyTurnNow
      ? 'px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 text-[10px] font-black truncate'
      : 'px-1.5 py-0.5 rounded bg-stone-800 border border-stone-600 text-[10px] font-bold text-amber-300 truncate';
  }
  const lsLogLinesEl = document.getElementById('lsLiveLogLines');
  if (lsLogLinesEl) {
    const top3 = state.logs.slice(0, 3);
    lsLogLinesEl.innerHTML = top3.map((line, idx) => {
      const cleanLine = line.replace(/^\[R\d+\]\s*/, '');
      if (idx === 0) {
        return `<div class="text-xs sm:text-sm font-black text-amber-300 truncate leading-tight">${cleanLine}</div>`;
      }
      return `<div class="text-[10px] sm:text-[11px] font-semibold text-stone-400 truncate leading-tight">${cleanLine}</div>`;
    }).join('');
  }

  // 2. Top-Right: Talent Pool 1x4
  const lsBankGrid = document.getElementById('lsJobBankGrid');
  if (lsBankGrid) {
    const bankSig = `${activeTheme.id}:${LS_DEPT_ORDER.map(d => `${d}_${state.jobBank[d][0] || 'NONE'}_${state.jobBank[d].length}`).join('|')}`;
    if (lsBankGrid.getAttribute('data-bank-sig') !== bankSig) {
      lsBankGrid.setAttribute('data-bank-sig', bankSig);
      lsBankGrid.innerHTML = LS_DEPT_ORDER.map(d => renderLsBankCardHTML(d, state.jobBank[d][0], state.jobBank[d].length)).join('');
    }
  }

  // 3. Opponents Around the Table (Left 9:00, Top 12:00, Right 3:00)
  const opponents = getClockwiseOpponents(state);
  let leftOpp = null, topOpp = null, rightOpp = null;
  if (opponents.length === 1) {
    topOpp = opponents[0];
  } else if (opponents.length === 2) {
    leftOpp = opponents[0];
    topOpp = opponents[1];
  } else if (opponents.length >= 3) {
    leftOpp = opponents[0];
    topOpp = opponents[1];
    rightOpp = opponents[2];
  }

  const seatTopEl = document.getElementById('lsSeatTop');
  const seatLeftEl = document.getElementById('lsSeatLeft');
  const seatRightEl = document.getElementById('lsSeatRight');
  if (seatTopEl) seatTopEl.innerHTML = topOpp ? renderLsOpponentSeatHTML(topOpp) : '';
  if (seatLeftEl) {
    seatLeftEl.innerHTML = leftOpp ? renderLsOpponentSeatHTML(leftOpp) : '';
    seatLeftEl.classList.toggle('invisible', !leftOpp);
  }
  if (seatRightEl) {
    seatRightEl.innerHTML = rightOpp ? renderLsOpponentSeatHTML(rightOpp) : '';
    seatRightEl.classList.toggle('invisible', !rightOpp);
  }

  // 4. Center Oval Table (Initial Draft OR Discard / Just Played / Draw Deck)
  const centerEl = document.getElementById('lsCenterOvalTable');
  if (centerEl) {
    if (state.phase === 'INITIAL_DRAFT') {
      const draftHero = state.players[state.draft.Order ? state.draft.Order[state.draft.pickIndex] : 0] || activePlayer;
      centerEl.innerHTML = `
        <div class="ls-oval-felt flex flex-col items-center justify-center px-6 py-1.5 gap-1">
          <div class="text-[10px] sm:text-xs font-black text-amber-300 truncate">
            🎲 首輪選秀（${state.draft.pickIndex + 1}/${state.draft.totalPicks}）：${isMyTurnNow ? '請點選下方部門頂牌招募' : `等待 ${getShortPlayerName(draftHero.name)} 挑選...`}
          </div>
          <div class="ls-dept-row py-0.5">
            ${LS_DEPT_ORDER.map(d => {
              const topUid = state.jobBank[d][0];
              if (!topUid) return '';
              const c = CARDS_BY_ID[topUid];
              const st = LS_EMPTY_DEPT_STYLE[d];
              return `
                <button data-draft-dept="${d}" class="ls-dept-card border-2 ${st.border} bg-slate-950 ${isMyTurnNow ? 'ring-1 ring-amber-400' : 'opacity-70'}">
                  ${getCardImgTag(c.artKey || c.tplId, c.title, 'w-full h-full object-cover block')}
                </button>
              `;
            }).join('')}
          </div>
        </div>
      `;
    } else {
      const topDiscardUid = state.discardPile[0];
      const topDiscardCard = topDiscardUid ? CARDS_BY_ID[topDiscardUid] : null;
      const lastPlayedObj = state.lastPlayedCard;
      const lastPlayedCard = (lastPlayedObj && lastPlayedObj.uid) ? CARDS_BY_ID[lastPlayedObj.uid] : null;
      const lastActorShort = lastPlayedObj ? getShortPlayerName(lastPlayedObj.actorName) : '';

      centerEl.innerHTML = `
        <div class="ls-oval-felt flex items-center justify-center gap-5 sm:gap-7 px-6 py-1.5">
          <div class="h-full flex flex-col items-center justify-center gap-0.5">
            <span class="text-[10px] font-bold text-stone-400 leading-none">棄牌</span>
            ${topDiscardCard
              ? renderLsTableMiniActionCardHTML(topDiscardCard, state.discardPile.length)
              : `<div class="ls-table-pile-card bg-stone-900/70 border border-stone-700/80 flex items-center justify-center text-[10px] font-bold text-stone-500 relative">空<span class="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-full bg-stone-950 border border-stone-700 text-[9px] font-black text-amber-300">0</span></div>`
            }
          </div>

          <div class="h-full flex flex-col items-center justify-center gap-0.5">
            <span class="text-[10px] font-bold text-amber-300/90 leading-none">剛出</span>
            ${lastPlayedCard
              ? renderLsTableMiniActionCardHTML(lastPlayedCard, null, lastActorShort)
              : `<div class="ls-table-pile-card bg-stone-900/50 border border-dashed border-amber-500/30 flex items-center justify-center text-[9px] font-bold text-stone-500">待出牌</div>`
            }
          </div>

          <div class="h-full flex flex-col items-center justify-center gap-0.5">
            <span class="text-[10px] font-bold text-stone-400 leading-none">抽牌</span>
            <div class="ls-table-pile-card bg-gradient-to-br border-2 border-stone-600/80 flex flex-col items-center justify-center relative shadow-xl">
              <span class="text-base opacity-45">${terms.appIcon || '💼'}</span>
              <span class="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-full bg-stone-950 border border-amber-400/80 text-[9px] font-black text-amber-300 z-20 shadow">${state.actionDeck.length}</span>
            </div>
          </div>
        </div>
      `;
    }
  }

  // 5. Bottom-Left: My Company Panel (1x4 Departments + Status Pills)
  const myPanelEl = document.getElementById('lsMyCompanyPanel');
  const myBurn = getPlayerBurnRate(localPlayer);
  const myCrisisReq = getCrisisTotalEngineerReq(localPlayer);
  const myCrisisCnt = localPlayer.crises.length;
  if (myPanelEl) {
    const mySig = `${activeTheme.id}:${myId}:${localPlayer.name}:${isMyTurnNow}:${localPlayer.crystals}:${myBurn}:${localPlayer.hand.length}:${localPlayer.engineers.length}:${myCrisisCnt}:${myCrisisReq}:${localPlayer.outsourcedCount}:${LS_DEPT_ORDER.map(d => (localPlayer.departments[d] || []).join(',')).join('|')}`;
    if (myPanelEl.getAttribute('data-render-sig') !== mySig) {
      myPanelEl.setAttribute('data-render-sig', mySig);
      myPanelEl.innerHTML = `
        <div class="ls-seat-panel ${isMyTurnNow ? 'ls-seat-active' : ''} w-full h-full flex flex-col justify-between gap-0.5 overflow-hidden">
          <div class="flex items-center justify-between gap-1 px-0.5 shrink-0">
            <div class="flex items-center gap-1 min-w-0">
              <span class="text-xs font-black text-stone-100 truncate">你·${getShortPlayerName(localPlayer.name)}</span>
              <span class="text-sm sm:text-base font-black text-amber-300 leading-none whitespace-nowrap">${localPlayer.crystals}</span>
              <span class="text-[10px] font-bold text-stone-400 whitespace-nowrap">手${localPlayer.hand.length}</span>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <span class="px-1 py-0.2 rounded bg-purple-950/90 border border-purple-400/60 text-[9px] font-black text-purple-200 whitespace-nowrap">${terms.vpIcon || '👑'}${terms.vpName || '副總'}:${getTotalVPCount(localPlayer)}</span>
              <span class="px-1 py-0.2 rounded bg-rose-950/90 border border-rose-500/60 text-[9px] font-black text-rose-300 whitespace-nowrap">🔥-${myBurn}/回</span>
            </div>
          </div>

          <div class="ls-dept-row py-0.5">
            ${LS_DEPT_ORDER.map(d => renderLsDeptSlotHTML(localPlayer, d)).join('')}
          </div>

          <div class="grid grid-cols-3 gap-1 w-full shrink-0">
            <div class="rounded bg-red-950/70 border border-red-500/40 px-1.5 py-0.2 flex items-center justify-between text-[9px] font-bold text-red-200">
              <span class="truncate">${terms.engIcon || '⚒'}${terms.engName || '工程師'}:${localPlayer.engineers.length}</span>
              <span class="text-rose-300 font-black">-${localPlayer.engineers.length}</span>
            </div>
            <button data-inspect-crises="${myId}" class="rounded ${myCrisisCnt > 0 ? 'bg-amber-950/90 border border-amber-400 text-amber-200' : 'bg-stone-900 border border-stone-700 text-stone-400'} px-1.5 py-0.2 flex items-center justify-between text-[9px] font-bold">
              <span class="truncate">${terms.crisisIcon || '💥'}${terms.crisisName || '爛點子'}:${myCrisisCnt}</span>
              <span class="font-black">需${myCrisisReq}🔍</span>
            </button>
            <div class="rounded ${localPlayer.outsourcedCount > 0 ? 'bg-rose-900/90 border border-rose-400 text-white' : 'bg-stone-900 border border-stone-700 text-stone-400'} px-1.5 py-0.2 flex items-center justify-between text-[9px] font-bold">
              <span class="truncate">${terms.outIcon || '💸'}${terms.outName || '外包'}:${localPlayer.outsourcedCount}</span>
              <span class="font-black">-${localPlayer.outsourcedCount * 3}</span>
            </div>
          </div>
        </div>
      `;
    }
  }

  // 6. Bottom-Right: 6 Vertical Hand Cards (100% visible side-by-side) + Right-Side Action Controls
  const lsHandEl = document.getElementById('lsHandContainer');
  const lsCtrlCol = document.getElementById('lsActionControlsCol');
  const isHumanStep1 = state.phase === 'STEP1_PLAY_OR_DISCARD' && isMyTurnNow;

  if (lsHandEl) {
    if (localPlayer.hand.length === 0) {
      lsHandEl.innerHTML = `<div class="text-xs font-bold text-stone-400 m-auto text-center">${state.phase === 'INITIAL_DRAFT' ? '🎲 請先在中央牌桌完成「首輪選秀」（挑選 4 名人員），結束後發放 6 張手牌！' : '目前無手牌'}</div>`;
    } else {
      const statuses = localPlayer.hand.map(uid => ({
        uid,
        card: CARDS_BY_ID[uid],
        status: evaluateCardPlayability(state, localPlayer, uid)
      }));
      const lsHandSig = `${activeTheme.id}:${state.phase}:${isHumanStep1}:${uiSelection.mode}:${uiSelection.sourceCardUid || ''}:${[...uiSelection.discardSet].join(',')}:${statuses.map(s => `${s.uid}_${s.status.playable}_${s.status.shortReason}`).join('|')}`;
      if (lsHandEl.getAttribute('data-render-sig') !== lsHandSig) {
        lsHandEl.setAttribute('data-render-sig', lsHandSig);
        lsHandEl.innerHTML = statuses.map(({ uid, card, status }) => {
          const isSelected = uiSelection.mode === 'MODE_D_SELECT' && uiSelection.sourceCardUid === uid;
          const isDiscardSel = uiSelection.mode === 'DISCARD_SELECT' && uiSelection.discardSet.has(uid);
          return renderLsHandCardHTML(card, status, isSelected, isDiscardSel, isHumanStep1);
        }).join('');
      }
    }
  }

  if (lsCtrlCol) {
    const remainingActions = Math.max(0, state.turn.maxActions - state.turn.actionsUsed);
    const canDiscard = isHumanStep1 && (state.config.playDiscardMode === 'SHARED_QUOTA_4' || !state.turn.hasPlayedCard) && remainingActions > 0;
    const isDiscardMode = uiSelection.mode === 'DISCARD_SELECT';
    const discardCnt = uiSelection.discardSet.size;

    lsCtrlCol.innerHTML = `
      <div class="text-center">
        <div class="text-lg sm:text-xl font-black text-amber-300 leading-none">${remainingActions}</div>
        <div class="text-[9px] font-bold text-stone-400 mt-0.5">剩餘額度</div>
      </div>

      ${isDiscardMode && discardCnt > 0 ? `
        <button data-ls-ctrl="CONFIRM_DISCARD" class="w-full py-1.5 px-1.5 rounded-full bg-orange-600 border border-orange-300 text-[11px] font-black text-white shadow-lg">
          確認棄(${discardCnt})
        </button>
      ` : `
        <button data-ls-ctrl="TOGGLE_DISCARD" ${!canDiscard ? 'disabled' : ''} class="w-full py-1.5 px-1.5 rounded-full ${isDiscardMode ? 'bg-orange-900 border-2 border-orange-400 text-orange-200' : 'bg-stone-900 border border-stone-600 text-stone-200'} text-xs font-black ${!canDiscard ? 'opacity-40 cursor-not-allowed' : 'hover:border-amber-400'}">
          ${isDiscardMode ? '取消棄牌' : '棄牌'}
        </button>
      `}

      <button data-ls-ctrl="END_TURN" ${!isHumanStep1 ? 'disabled' : ''} class="w-full py-1.5 px-1.5 rounded-full bg-gradient-to-b border border-amber-200 text-slate-950 text-xs font-black shadow-lg ${!isHumanStep1 ? 'opacity-40 cursor-not-allowed' : 'hover:brightness-110'}">
        ${state.turn.hasPlayedCard || state.turn.hasDiscardedCard ? `發薪 ${myBurn}` : '結束'}
      </button>
    `;
  }
}

function renderLsModeDLeftCardColumnHTML(card) {
  const vis = getActionCategoryVisuals(card);
  const reqOrbs = (card.reqSkills && card.reqSkills.length > 0)
    ? `<div class="flex items-center justify-center gap-0.5">${card.reqSkills.map(s => `<span class="w-3.5 h-3.5 rounded-full bg-amber-600 text-white text-[9px] font-black flex items-center justify-center leading-none">${s}</span>`).join('')}</div>`
    : `<span class="text-[8px] font-bold text-slate-600">${card.dept === 'PURPLE' ? '需 2 副總' : '免檢定'}</span>`;

  return `
    <div class="ls-moded-left-col shrink-0 flex flex-col gap-1.5">
      <div class="w-full aspect-[2/3] rounded-xl overflow-hidden bg-ivory-card border-2 ${vis.border} flex flex-col justify-between shadow-xl">
        <div class="${vis.headerBg} px-1.5 py-0.5 text-[9px] font-black text-white flex items-center justify-between">
          <span>${vis.tag}</span>
          <span>${vis.badge}</span>
        </div>
        <div class="flex-1 ${vis.artBg} flex flex-col items-center justify-center p-1.5 relative">
          <div class="text-2xl sm:text-3xl leading-none drop-shadow-lg">${card.svg}</div>
          <div class="mt-1 px-1.5 py-0.2 rounded bg-black/50 text-[10px] font-black text-amber-200">${vis.badge}</div>
        </div>
        <div class="bg-ivory-card px-1.5 py-1 flex flex-col gap-0.5 border-t border-stone-300 text-center">
          <div class="text-[10px] font-black text-slate-900 truncate">${card.title}</div>
          <div class="flex items-center justify-center">${reqOrbs}</div>
        </div>
      </div>
      <div class="text-[10px] font-semibold text-stone-300 leading-tight line-clamp-3">
        ${card.desc || ''}
      </div>
    </div>
  `;
}

function renderLsOpponentComparisonCardHTML(opp, checkDept, isValid, actionAttr, subFooterText, btnLabel) {
  const shortOpp = getShortPlayerName(opp.name);
  const deptStrip = LS_DEPT_ORDER.map(d => renderLsDeptSlotHTML(opp, d, { highlightDept: checkDept, noInspect: true, isComp: true })).join('');

  if (!isValid) {
    return `
      <div class="rounded-xl bg-stone-900/75 border border-stone-700 p-1.5 opacity-60 flex flex-col justify-between gap-1 min-w-0 overflow-hidden">
        <div class="flex items-center justify-between gap-1 px-0.5">
          <span class="text-xs font-black text-stone-200 truncate">${shortOpp}</span>
          <span class="text-xs font-black text-amber-300 whitespace-nowrap">💵${opp.crystals}</span>
        </div>
        <div class="ls-comp-dept-grid">
          ${deptStrip}
        </div>
        <div class="text-[9px] font-bold text-stone-400 truncate px-0.5">${subFooterText}</div>
        <div class="w-full py-1 rounded-lg bg-stone-800 text-center text-[10px] font-bold text-sky-300 truncate px-1">${btnLabel}</div>
      </div>
    `;
  }

  return `
    <button ${actionAttr} class="rounded-xl bg-stone-950/95 border-2 border-amber-400/85 hover:border-amber-300 p-1.5 text-left shadow-xl flex flex-col justify-between gap-1 min-w-0 overflow-hidden transition hover:-translate-y-0.5">
      <div class="flex items-center justify-between gap-1 w-full px-0.5">
        <span class="text-xs font-black text-white truncate">🎯 ${shortOpp}</span>
        <span class="text-xs font-black text-amber-300 whitespace-nowrap">💵${opp.crystals}</span>
      </div>
      <div class="ls-comp-dept-grid pointer-events-none">
        ${deptStrip}
      </div>
      <div class="text-[9px] font-bold text-stone-200 truncate w-full px-0.5">${subFooterText}</div>
      <div class="w-full py-1 rounded-lg bg-gradient-to-r text-center text-[10px] font-black text-slate-950 shadow truncate px-1">
        ${btnLabel}
      </div>
    </button>
  `;
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
    const avSrc = getMiniAvatarSrc(empCard.artKey || empCard.tplId);
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

  // In Landscape Tabletop Mode, render custom 2-column non-overlapping target pickers for ALL 9 card effect types
  if (isLandscapeModeActive()) {
    const terms = typeof getThemeTerms === 'function' ? getThemeTerms() : {};
    let rightPanelHTML = '';

    if (card.effect === 'BAD_IDEA') {
      const oppGridHTML = aliveOpponents.map(opp => {
        const oppSkill = getEffectiveSkill(opp, 'YELLOW');
        const isValid = status.validOpponents.includes(opp.id);
        const curBurn = getPlayerBurnRate(opp);
        const curReq = getCrisisTotalEngineerReq(opp);
        const newReq = curReq + card.val;
        const newOutsourced = Math.max(0, newReq - opp.engineers.length);
        const addedOutsourced = newOutsourced - opp.outsourcedCount;
        const projBurn = curBurn + addedOutsourced * (opp.doubleBurnFlag ? 6 : 3);
        const subText = `${terms.engIcon || '⚒'}${opp.engineers.length} · 🔥-${curBurn}➔-${projBurn}/回`;
        const btnLabel = isValid ? `⚔️ 攻擊 ${getShortPlayerName(opp.name)} (×${card.val})` : `🛡️ ${DEPT_META.YELLOW.short}${oppSkill}級免疫`;
        return renderLsOpponentComparisonCardHTML(opp, 'YELLOW', isValid, `data-d-action="CONFIRM_BAD_IDEA" data-opp-id="${opp.id}"`, subText, btnLabel);
      }).join('');
      rightPanelHTML = `
        <div class="text-[11px] font-bold text-amber-200 truncate">看對方的【${DEPT_META.YELLOW.name}】（亮黃框部門），點選目標立即施放：</div>
        <div class="grid ${aliveOpponents.length >= 3 ? 'grid-cols-3' : aliveOpponents.length === 2 ? 'grid-cols-2' : 'grid-cols-1'} gap-2 w-full min-w-0 my-auto">
          ${oppGridHTML}
        </div>
      `;
    } else if (card.effect === 'FORCE_HIRE' && !uiSelection.step2OpponentId) {
      const oppGridHTML = aliveOpponents.map(opp => {
        const oppSkill = getEffectiveSkill(opp, 'BLUE');
        const isValid = status.validOpponents.includes(opp.id);
        const curBurn = getPlayerBurnRate(opp);
        const subText = `${terms.engIcon || '⚒'}${opp.engineers.length} · ${terms.vpIcon || '👑'}${getTotalVPCount(opp)} · 🔥-${curBurn}/回`;
        const btnLabel = isValid ? `🪤 選 ${getShortPlayerName(opp.name)} ➔ 挑人` : `🛡️ ${DEPT_META.BLUE.short}${oppSkill}級免疫`;
        return renderLsOpponentComparisonCardHTML(opp, 'BLUE', isValid, `data-d-action="STEP2_FORCE_HIRE_OPP" data-opp-id="${opp.id}"`, subText, btnLabel);
      }).join('');
      rightPanelHTML = `
        <div class="text-[11px] font-bold text-amber-200 truncate">步驟 1/2：看對方的【${DEPT_META.BLUE.name}】（亮黃框部門），點選要強塞人員的對手：</div>
        <div class="grid ${aliveOpponents.length >= 3 ? 'grid-cols-3' : aliveOpponents.length === 2 ? 'grid-cols-2' : 'grid-cols-1'} gap-2 w-full min-w-0 my-auto">
          ${oppGridHTML}
        </div>
      `;
    } else if (card.effect === 'FORCE_HIRE' && uiSelection.step2OpponentId) {
      const opp = state.players.find(p => p.id === uiSelection.step2OpponentId);
      const allowedDepts = status.validBankByOpponent[opp.id] || [];
      const bankCardsHTML = LS_DEPT_ORDER.map(d => {
        const topUid = state.jobBank[d][0];
        const meta = DEPT_META[d];
        if (!topUid) return '';
        const emp = CARDS_BY_ID[topUid];
        const isAllowed = allowedDepts.includes(d);
        const oppCurSkill = getEffectiveSkill(opp, d);
        const isSabotageVP = emp.isVP && emp.skill < oppCurSkill;
        if (!isAllowed) {
          return `
            <div class="rounded-xl bg-stone-900/70 border border-stone-700 p-1.5 opacity-45 flex flex-col items-center gap-1 min-w-0">
              <div class="w-full aspect-[2/3] rounded-lg overflow-hidden bg-slate-950 relative">
                ${getCardImgTag(emp.artKey || emp.tplId, emp.title, 'w-full h-full object-cover block')}
              </div>
              <div class="w-full py-0.5 rounded bg-stone-800 text-center text-[9px] font-bold text-rose-300 truncate">🔒 已有${terms.vpName || '副總'}</div>
            </div>
          `;
        }
        return `
          <button data-d-action="CONFIRM_FORCE_HIRE" data-opp-id="${opp.id}" data-dept="${d}" class="rounded-xl bg-stone-950 border-2 border-amber-400 p-1.5 text-left shadow-lg flex flex-col justify-between gap-1 min-w-0 transition hover:-translate-y-0.5">
            <div class="w-full aspect-[2/3] rounded-lg overflow-hidden bg-slate-950 relative pointer-events-none">
              ${getCardImgTag(emp.artKey || emp.tplId, emp.title, 'w-full h-full object-cover block')}
            </div>
            <div class="text-[9px] font-bold text-amber-200 truncate text-center w-full">${isSabotageVP ? `😈壓低至${emp.skill}級!` : `🔥害他-${emp.salary}/回`}</div>
            <div class="w-full py-1 rounded-lg bg-rose-600 text-center text-[10px] font-black text-white shadow truncate">🪤 強塞 ${emp.title}</div>
          </button>
        `;
      }).join('');
      rightPanelHTML = `
        <div class="flex items-center justify-between gap-2">
          <span class="text-[11px] font-bold text-amber-200 truncate">步驟 2/2：點選人才池頂牌強塞給【${getShortPlayerName(opp.name)}】：</span>
          <button data-d-action="BACK_FORCE_STEP1" class="px-2 py-0.5 rounded bg-stone-800 border border-stone-600 text-[10px] font-bold text-sky-300 shrink-0">⬅ 重選對手</button>
        </div>
        <div class="grid grid-cols-4 gap-2 w-full min-w-0 my-auto">
          ${bankCardsHTML}
        </div>
      `;
    } else if (card.effect === 'HIRE_BANK') {
      const bankCardsHTML = LS_DEPT_ORDER.map(d => {
        const topUid = state.jobBank[d][0];
        const meta = DEPT_META[d];
        if (!topUid) return '';
        const emp = CARDS_BY_ID[topUid];
        const isValid = status.validBankDepts.includes(d);
        const curSkill = getEffectiveSkill(localPlayer, d);
        let impactHint = emp.role === 'ENGINEER'
          ? (localPlayer.outsourcedCount > 0 ? '🔥抵1外包(省3)!' : `⚒${terms.engName || '工程師'}+1`)
          : emp.isVP ? `👑空降(${emp.skill}級)` : (!hasVPInDept(localPlayer, d) && emp.skill > curSkill ? `✨升${emp.skill}級!` : `➕納入下屬`);

        if (!isValid) {
          return `
            <div class="rounded-xl bg-stone-900/70 border border-stone-700 p-1.5 opacity-45 flex flex-col items-center gap-1 min-w-0">
              <div class="w-full aspect-[2/3] rounded-lg overflow-hidden bg-slate-950 relative">
                ${getCardImgTag(emp.artKey || emp.tplId, emp.title, 'w-full h-full object-cover block')}
              </div>
              <div class="w-full py-0.5 rounded bg-stone-800 text-center text-[9px] font-bold text-rose-300 truncate">🔒 已有${terms.vpName || '副總'}</div>
            </div>
          `;
        }
        return `
          <button data-d-action="CONFIRM_HIRE" data-dept="${d}" class="rounded-xl bg-stone-950 border-2 border-emerald-400 p-1.5 text-left shadow-lg flex flex-col justify-between gap-1 min-w-0 transition hover:-translate-y-0.5">
            <div class="w-full aspect-[2/3] rounded-lg overflow-hidden bg-slate-950 relative pointer-events-none">
              ${getCardImgTag(emp.artKey || emp.tplId, emp.title, 'w-full h-full object-cover block')}
            </div>
            <div class="text-[9px] font-bold text-emerald-300 truncate text-center w-full">${impactHint}</div>
            <div class="w-full py-1 rounded-lg bg-emerald-600 text-center text-[10px] font-black text-white shadow truncate">⚡ 招募 ${emp.title}</div>
          </button>
        `;
      }).join('');
      rightPanelHTML = `
        <div class="text-[11px] font-bold text-amber-200 truncate">點選中央人才池翻開的應徵者加入我方部門：</div>
        <div class="grid grid-cols-4 gap-2 w-full min-w-0 my-auto">
          ${bankCardsHTML}
        </div>
      `;
    } else if (card.effect === 'VP_DOUBLE_PAY') {
      const oppGridHTML = aliveOpponents.map(opp => {
        const burn = getPlayerBurnRate(opp);
        const subText = `${terms.engIcon || '⚒'}${opp.engineers.length} · 🔥-${burn} ➔ 🔥-${burn * 2}/回`;
        const btnLabel = `🔥 翻倍 ${getShortPlayerName(opp.name)} (-${burn * 2})`;
        return renderLsOpponentComparisonCardHTML(opp, null, true, `data-d-action="CONFIRM_DOUBLE_PAY" data-opp-id="${opp.id}"`, subText, btnLabel);
      }).join('');
      rightPanelHTML = `
        <div class="text-[11px] font-bold text-amber-200 truncate">點選一名對手，使其下回合發薪支出強制翻倍（×2）：</div>
        <div class="grid ${aliveOpponents.length >= 3 ? 'grid-cols-3' : aliveOpponents.length === 2 ? 'grid-cols-2' : 'grid-cols-1'} gap-2 w-full min-w-0 my-auto">
          ${oppGridHTML}
        </div>
      `;
    } else {
      // FIRE_OWN, POACH_ENEMY, VP_KICK_ENEMY, RELEASE_CRISIS, GAIN_FUNDS: use 3 columns for multi-item lists in Landscape Mode
      const rightContent = container.innerHTML;
      const itemCount = (container.children && container.children.length) || 2;
      const lsGridCls = card.effect === 'GAIN_FUNDS'
        ? 'grid grid-cols-1 gap-2 w-full'
        : `grid ${itemCount >= 3 ? 'grid-cols-3' : 'grid-cols-2'} gap-1.5 w-full`;
      rightPanelHTML = `
        <div class="${lsGridCls} max-h-[68vh] overflow-y-auto pr-1 my-auto">
          ${rightContent}
        </div>
      `;
    }

    container.className = 'w-full min-w-0';
    container.innerHTML = `
      <div class="flex items-stretch gap-2.5 w-full min-w-0">
        ${renderLsModeDLeftCardColumnHTML(card)}
        <div class="flex-1 min-w-0 flex flex-col justify-between gap-1.5">
          ${rightPanelHTML}
        </div>
      </div>
    `;
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
      } else if (actType === 'BACK_FORCE_STEP1') {
        uiSelection.step2OpponentId = null;
        renderAll();
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
  // Bind desktop-only 3D tilt on any newly inserted card elements
  attach3DTiltListeners();

  // Bind one-time global event delegation for all dynamic board elements (zero per-render listener allocation!)
  if (window.__delegatedBoardListenersBound) return;
  window.__delegatedBoardListenersBound = true;

  const modeDBackdrop = document.getElementById('modeDTargetDrawer');
  if (modeDBackdrop) {
    modeDBackdrop.addEventListener('click', (e) => {
      if (e.target === modeDBackdrop) {
        resetSelectionState();
        renderAll();
      }
    });
  }

  document.addEventListener('click', (e) => {
    const state = gameState;
    if (!state) return;
    const localPlayer = getLocalPlayer(state);
    const isMyTurnNow = isLocalPlayerTurn(state);

    const segBtn = e.target.closest('[data-seg-select]');
    if (segBtn) {
      const selId = segBtn.getAttribute('data-seg-select');
      const val = segBtn.getAttribute('data-seg-val');
      const selEl = document.getElementById(selId);
      if (selEl) {
        selEl.value = val;
        syncSegmentedPillButtonsUI();
        selEl.dispatchEvent(new Event('change', { bubbles: true }));
      }
      return;
    }

    const switchBtn = e.target.closest('[data-switch-seat]');
    if (switchBtn) {
      switchLocalSeatPerspective(switchBtn.getAttribute('data-switch-seat'));
      return;
    }

    const seatBtn = e.target.closest('[data-seat-tab]');
    if (seatBtn) {
      const clickedId = seatBtn.getAttribute('data-seat-tab');
      const modeDSeat = seatBtn.getAttribute('data-mode-d-seat');
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
      return;
    }

    const bankBtn = e.target.closest('[data-open-bank-dept]');
    if (bankBtn) {
      const dept = bankBtn.getAttribute('data-open-bank-dept');
      if (state.phase === 'INITIAL_DRAFT' && isMyTurnNow) {
        handleDraftPickDepartment(dept);
      } else {
        openJobBankModal();
      }
      return;
    }

    const draftEl = e.target.closest('[data-draft-dept]');
    if (draftEl) {
      if (state.phase === 'INITIAL_DRAFT' && isMyTurnNow) {
        handleDraftPickDepartment(draftEl.getAttribute('data-draft-dept'));
      }
      return;
    }

    const lsCtrlBtn = e.target.closest('[data-ls-ctrl]');
    if (lsCtrlBtn) {
      const ctrlAct = lsCtrlBtn.getAttribute('data-ls-ctrl');
      if (ctrlAct === 'TOGGLE_DISCARD') {
        document.getElementById('btnToggleDiscardMode')?.click();
      } else if (ctrlAct === 'CONFIRM_DISCARD') {
        document.getElementById('btnConfirmDiscard')?.click();
      } else if (ctrlAct === 'END_TURN') {
        document.getElementById('btnEndTurn')?.click();
      }
      return;
    }

    const handCardEl = e.target.closest('#localHandContainer [data-act-uid], #lsHandContainer [data-act-uid]');
    if (handCardEl) {
      const actUid = handCardEl.getAttribute('data-act-uid');
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
          tickerEl.removeAttribute('data-render-sig');
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
      return;
    }

    const emptyDeptEl = e.target.closest('[data-empty-dept]');
    if (emptyDeptEl) {
      openJobBankModal();
      return;
    }

    const inspectDeptEl = e.target.closest('[data-inspect-dept]');
    if (inspectDeptEl) {
      openDepartmentInspectorModal(inspectDeptEl.getAttribute('data-inspect-player'), inspectDeptEl.getAttribute('data-inspect-dept'));
      return;
    }

    const inspectEngEl = e.target.closest('[data-inspect-eng]');
    if (inspectEngEl) {
      openEngineersInspectorModal(inspectEngEl.getAttribute('data-inspect-eng'));
      return;
    }

    const inspectCrisesEl = e.target.closest('[data-inspect-crises]');
    if (inspectCrisesEl) {
      openCrisesInspectorModal(inspectCrisesEl.getAttribute('data-inspect-crises'));
      return;
    }

    const inspectOutEl = e.target.closest('[data-inspect-outsourced]');
    if (inspectOutEl) {
      openOutsourcedInspectorModal(inspectOutEl.getAttribute('data-inspect-outsourced'));
      return;
    }
  });
}

// === Job Bank Modal (Pure 2:3 Character Cards Only — No Redundant Text Boxes) ===
function openJobBankModal() {
  const terms = typeof getThemeTerms === 'function' ? getThemeTerms() : {};
  document.getElementById('jobBankModalTitle').textContent = terms.jobBankModalTitle || '🏢 中央人力銀行（四大部門翻開頂牌）';
  document.getElementById('jobBankModalSub').textContent = terms.jobBankModalSub || '打出聘僱卡時可選取此處翻開的人員。';
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
      return `
        <div class="modal-pure-card empty-rune-slot rounded-xl border-2 border-dashed ${meta.border} p-3 flex flex-col items-center justify-center text-center">
          <div class="w-10 h-10 rounded-full ${meta.panelBg} border ${meta.border} flex items-center justify-center text-lg opacity-60">${meta.icon}</div>
          <div class="text-xs font-black ${meta.text} mt-1.5">${meta.name}</div>
          <div class="text-[11px] font-bold text-slate-400 mt-0.5">已抽乾 (0張)</div>
        </div>
      `;
    }
    return `
      <div class="modal-pure-card">
        ${renderEmployeeCardHTML(topUid, 'w-full h-full', `剩${deck.length}張`)}
      </div>
    `;
  }).join('');
  document.getElementById('jobBankModal').classList.remove('hidden');
}

// === Opponent Castle Popup Modal: Enlarged Opponent Overview + Pure 2:3 Character Cards Only! ===
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
  document.getElementById('jobBankModalSub').textContent = '點擊危機專案或任一角色卡可查看下屬與完整卡牌清單';

  const summaryEl = document.getElementById('jobBankOpponentSummary');
  if (summaryEl) {
    summaryEl.classList.remove('hidden');
    summaryEl.innerHTML = `
      <div class="space-y-2 w-full">
        <!-- Part 1: Enlarged 4-Column Core Economy & Status Dashboard -->
        <div class="grid grid-cols-4 gap-1.5 w-full">
          <div class="rounded-xl bg-emerald-950/75 border border-emerald-500/50 p-2 text-center">
            <div class="text-[10px] sm:text-xs font-bold text-emerald-200">${(typeof getThemeTerms === 'function' ? getThemeTerms().currencyIcon : '💎')} ${(typeof getThemeTerms === 'function' ? getThemeTerms().currencyName : '魔晶')}儲備</div>
            <div class="text-sm sm:text-lg font-black text-emerald-400 mt-0.5">${opp.crystals}</div>
            <div class="text-[10px] font-bold text-slate-300">${burn > 0 ? `約撐 ${roundsLeft} 回` : '零消耗'}</div>
          </div>
          <div class="rounded-xl bg-rose-950/75 border border-rose-500/50 p-2 text-center">
            <div class="text-[10px] sm:text-xs font-bold text-rose-200">🔥 每回${(typeof getThemeTerms === 'function' ? getThemeTerms().burnName : '燒魔')}</div>
            <div class="text-sm sm:text-lg font-black text-rose-400 mt-0.5">-${burn}/回</div>
            <div class="text-[10px] font-bold ${opp.doubleBurnFlag ? 'text-amber-300 font-black' : 'text-slate-300'}">${opp.doubleBurnFlag ? '⚠️下回雙倍!' : '正常支出'}</div>
          </div>
          <div class="rounded-xl bg-purple-950/75 border border-purple-500/50 p-2 text-center">
            <div class="text-[10px] sm:text-xs font-bold text-purple-200">${(typeof getThemeTerms === 'function' ? getThemeTerms().vpIcon : '👑')} 在職${(typeof getThemeTerms === 'function' ? getThemeTerms().vpName : '皇室')}</div>
            <div class="text-sm sm:text-lg font-black text-purple-300 mt-0.5">${vpCount} 名</div>
            <div class="text-[10px] font-bold text-slate-300">${vpCount >= 2 ? '⚡可放大招' : `差${2 - vpCount}名開大招`}</div>
          </div>
          <div class="rounded-xl bg-slate-950 border border-sky-500/40 p-2 text-center">
            <div class="text-[10px] sm:text-xs font-bold text-sky-200">🎴 手牌數量</div>
            <div class="text-sm sm:text-lg font-black text-sky-300 mt-0.5">${handCnt} 張</div>
            <div class="text-[10px] font-bold text-slate-300">總人員 ${totalEmps}人</div>
          </div>
        </div>

        <!-- Part 2: Enlarged 3-Column Workforce & Crisis Inspection Cards -->
        <div class="grid grid-cols-3 gap-1.5 w-full">
          <div class="rounded-xl bg-red-950/75 border border-red-500/50 p-2 text-left flex flex-col justify-between gap-0.5 shadow">
            <div class="flex items-center justify-between w-full">
              <span class="text-[11px] sm:text-xs font-extrabold text-red-200 whitespace-nowrap">${(typeof getThemeTerms === 'function' ? getThemeTerms().engIcon : '⚒️')} ${(typeof getThemeTerms === 'function' ? getThemeTerms().engFull : '工程師')}</span>
            </div>
            <div class="flex items-baseline justify-between w-full mt-0.5">
              <span class="text-xs sm:text-sm font-black text-white whitespace-nowrap">${opp.engineers.length} 人</span>
              <span class="text-[11px] font-black text-rose-300 whitespace-nowrap">${(typeof getThemeTerms === 'function' ? getThemeTerms().currencyIcon : '💵')}-${opp.engineers.length}/回</span>
            </div>
            <div class="text-[10px] text-slate-300 font-semibold truncate">可抵銷 ${opp.engineers.length} 點${(typeof getThemeTerms === 'function' ? getThemeTerms().crisisName : '爛點子')}</div>
          </div>

          <button data-opp-modal-crises="${opp.id}" class="rounded-xl ${opp.crises.length > 0 ? 'bg-amber-950/85 border border-amber-400' : 'bg-slate-950 border border-slate-700'} p-2 text-left flex flex-col justify-between gap-0.5 shadow">
            <div class="flex items-center justify-between w-full">
              <span class="text-[11px] sm:text-xs font-extrabold ${opp.crises.length > 0 ? 'text-amber-200' : 'text-slate-300'} whitespace-nowrap">${(typeof getThemeTerms === 'function' ? getThemeTerms().crisisIcon : '💥')} ${(typeof getThemeTerms === 'function' ? getThemeTerms().crisisFull : '爛點子專案')}</span>
              <span class="text-[10px] font-black text-sky-300">🔍</span>
            </div>
            <div class="flex items-baseline justify-between w-full mt-0.5">
              <span class="text-xs sm:text-sm font-black text-white whitespace-nowrap">${opp.crises.length} 張</span>
              <span class="text-[11px] font-black ${opp.crises.length > 0 ? 'text-amber-300' : 'text-slate-400'} whitespace-nowrap">需人力 ${crisisReq}</span>
            </div>
            <div class="text-[10px] text-slate-300 font-semibold truncate">${opp.crises.length > 0 ? '點擊檢視明細' : '場上無危機專案'}</div>
          </button>

          <div class="rounded-xl ${opp.outsourcedCount > 0 ? 'bg-rose-950/90 border border-rose-400' : 'bg-slate-950 border border-slate-700'} p-2 text-left flex flex-col justify-between gap-0.5 shadow">
            <div class="flex items-center justify-between w-full">
              <span class="text-[11px] sm:text-xs font-extrabold ${opp.outsourcedCount > 0 ? 'text-rose-200' : 'text-slate-300'} whitespace-nowrap">${(typeof getThemeTerms === 'function' ? getThemeTerms().outIcon : '💸')} ${(typeof getThemeTerms === 'function' ? getThemeTerms().outFull : '高價外包顧問')}</span>
            </div>
            <div class="flex items-baseline justify-between w-full mt-0.5">
              <span class="text-xs sm:text-sm font-black text-white whitespace-nowrap">${opp.outsourcedCount} 人</span>
              <span class="text-[11px] font-black ${opp.outsourcedCount > 0 ? 'text-rose-400' : 'text-slate-400'} whitespace-nowrap">${(typeof getThemeTerms === 'function' ? getThemeTerms().currencyIcon : '💵')}-${opp.outsourcedCount * 3}/回</span>
            </div>
            <div class="text-[10px] text-slate-300 font-semibold truncate">${opp.outsourcedCount > 0 ? '每名每回耗3資金!' : '無外包赤字'}</div>
          </div>
        </div>
      </div>
    `;
    summaryEl.querySelector('[data-opp-modal-crises]')?.addEventListener('click', () => openCrisesInspectorModal(opp.id));
  }

  // Part 3: 4 Departments — Pure 2:3 Character Cards Only (No redundant outer box, header, or footer text!)
  const grid = document.getElementById('jobBankModalGrid');
  grid.innerHTML = ['RED', 'YELLOW', 'BLUE', 'GREEN'].map(d => {
    const meta = DEPT_META[d];
    const deptArr = opp.departments[d];

    if (deptArr.length === 0) {
      return `
        <div class="modal-pure-card empty-rune-slot rounded-xl border-2 border-dashed ${meta.border} p-2.5 flex flex-col items-center justify-center text-center">
          <div class="w-10 h-10 rounded-full ${meta.panelBg} border ${meta.border} flex items-center justify-center text-lg opacity-60">${meta.icon}</div>
          <div class="text-xs font-black ${meta.text} mt-1.5">${meta.name}</div>
          <div class="text-[11px] font-bold text-slate-400 mt-0.5">缺工空城 (0級)</div>
        </div>
      `;
    }

    const headUid = deptArr[0];
    const subordinates = deptArr.slice(1);
    const badgeText = subordinates.length > 0 ? `+${subordinates.length}下屬 🔍` : '';

    return `
      <div data-opp-dept-detail="${d}" data-opp-id="${opp.id}" class="modal-pure-card cursor-pointer">
        ${renderEmployeeCardHTML(headUid, 'w-full h-full', badgeText)}
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
  const theme = typeof getActiveTheme === 'function' ? getActiveTheme() : { useFullCardArt: true };
  const terms = typeof getThemeTerms === 'function' ? getThemeTerms() : { currencyIcon: '💵', outFull: '高價外包顧問', outIcon: '💸' };
  document.getElementById('inspectorCardsGrid').innerHTML = Array.from({ length: count }).map((_, i) => {
    const badge = player.outsourcedCount > 0 ? `外包 #${i+1} (${terms.currencyIcon}-3)` : '外包卡預覽';
    if (theme.useFullCardArt && getCardArtSrc('OUTSOURCED')) {
      return `
        <div class="relative rounded-xl bg-slate-950 border-2 border-slate-500 overflow-hidden shadow-xl modal-pure-card">
          ${getCardImgTag("OUTSOURCED", terms.outFull, "full-gpt-card-img")}
          <span class="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-rose-600 text-white text-[10px] font-black shadow-lg">${badge}</span>
        </div>
      `;
    }
    return `
      <div class="burnrate-css-card aspect-card-2-3 rounded-xl border-2 border-rose-500 modal-pure-card text-left">
        <div class="bg-rose-700 px-2 py-1 flex items-center justify-between gap-1 border-b border-white/20">
          <span class="text-[10px] font-black text-white truncate">${terms.outIcon} 外部緊急人力</span>
          <span class="text-[9px] font-black bg-slate-950/90 text-rose-300 px-1.5 py-0.5 rounded">外包</span>
        </div>
        <div class="flex-1 flex flex-col items-center justify-center p-2 relative">
          <span class="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-rose-600 text-white text-[9px] font-black shadow">${badge}</span>
          <div class="burnrate-emblem-circle">${terms.outIcon}</div>
          <div class="text-xs sm:text-sm font-black text-white mt-1.5 text-center">${terms.outFull}</div>
          <div class="text-[9px] font-bold text-rose-300 text-center mt-0.5">Outsourced Consultant</div>
        </div>
        <div class="bg-slate-950/95 border-t border-slate-800 px-2 py-1.5 flex items-center justify-between text-[10px]">
          <span class="font-black text-rose-400">${terms.currencyIcon}-3/回</span>
          <span class="font-bold text-amber-300">自動填補人力缺口</span>
        </div>
      </div>
    `;
  }).join('');
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
    if (getCardArtSrc('OUTSOURCED')) {
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

  syncSegmentedPillButtonsUI();
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


window.hasStartedActiveMatch = false;

function switchGameTheme(newThemeId) {
  if (typeof applyThemeToRegistry !== 'function') return;
  applyThemeToRegistry(newThemeId);
  const terms = getThemeTerms();

  // Update player default name if still on a theme default
  if (gameSession.playerName === '深淵領主' || gameSession.playerName === '新創執行長') {
    gameSession.playerName = terms.defaultPlayerName;
    const homeNick = document.getElementById('homeInputNickname');
    if (homeNick) homeNick.value = gameSession.playerName;
    const lobbyNick = document.getElementById('inputPlayerNickname');
    if (lobbyNick) lobbyNick.value = gameSession.playerName;
  }

  // Update AI names in current gameState if in SOLO or HOST
  if (gameState && gameState.players && gameSession.mode !== 'CLIENT') {
    if (gameState.config) gameState.config.themeId = newThemeId;
    gameState.players.forEach((p, idx) => {
      if (idx === 0 && !p.isAI) {
        p.name = `${gameSession.playerName} (你)`;
      } else if (p.isAI && terms.aiNames[idx - 1]) {
        p.name = terms.aiNames[idx - 1];
      }
    });
  }

  if (gameSession.mode === 'HOST') {
    gameSession.lobbyState.themeId = newThemeId;
    if (gameSession.hostMasterState && gameSession.hostMasterState.config) {
      gameSession.hostMasterState.config.themeId = newThemeId;
    }
    broadcastLobbyState();
    if (gameSession.lobbyState.matchStarted) {
      broadcastHostState();
    }
  }

  renderHomeScreenUI();
  renderLobbyUI();
  renderAll();
}


function syncSegmentedPillButtonsUI() {
  document.querySelectorAll('[data-seg-select]').forEach(btn => {
    const selId = btn.getAttribute('data-seg-select');
    const val = btn.getAttribute('data-seg-val');
    const selEl = document.getElementById(selId);
    if (selEl) {
      btn.classList.toggle('seg-pill-active', String(selEl.value) === String(val));
    }
  });
}

function renderHomeScreenUI() {
  const theme = typeof getActiveTheme === 'function' ? getActiveTheme() : { id: 'CLASSIC_BURN_RATE', useFullCardArt: false };
  const terms = typeof getThemeTerms === 'function' ? getThemeTerms() : {};

  const titleEl = document.getElementById('homeAppTitle');
  if (titleEl && terms.appTitle) titleEl.textContent = `${terms.appIcon || '💼'} ${terms.appTitle}`;
  const subEl = document.getElementById('homeAppSubtitle');
  if (subEl && terms.subtitle) subEl.textContent = terms.subtitle;
  const lordLabelEl = document.getElementById('homeLordLabel');
  if (lordLabelEl && terms.lordTitle) lordLabelEl.textContent = `${terms.vpIcon || '👔'} ${terms.lordTitle}：`;

  const fanContainer = document.getElementById('homeHeroCardsFan');
  if (fanContainer && fanContainer.getAttribute('data-theme-sig') !== theme.id) {
    fanContainer.setAttribute('data-theme-sig', theme.id);
    const heroSamples = [
      { tplId: 'E_R_VP3', dept: 'RED', cls: 'home-hero-fan-card home-hero-fan-left border-2 border-red-400' },
      { tplId: 'E_G_VP3', dept: 'GREEN', cls: 'home-hero-fan-card home-hero-fan-center border-2 border-amber-400' },
      { tplId: 'E_B_VP3', dept: 'BLUE', cls: 'home-hero-fan-card home-hero-fan-right border-2 border-blue-400' }
    ];
    fanContainer.innerHTML = heroSamples.map(item => (
      `<div class="${item.cls} bg-slate-950">${getCardImgTag(item.tplId, item.tplId, 'w-full h-full object-cover block')}</div>`
    )).join('');
  }

  const homeNick = document.getElementById('homeInputNickname');
  if (homeNick && document.activeElement !== homeNick) {
    homeNick.value = gameSession.playerName || '深淵領主';
  }

  const resumeBtn = document.getElementById('btnHomeResumeGame');
  if (resumeBtn) {
    resumeBtn.classList.toggle('hidden', !window.hasStartedActiveMatch);
  }

  syncSegmentedPillButtonsUI();
  updateSettingsMenuUI();
}

function syncHomeSetupToLobbyControls() {
  const homeNick = document.getElementById('homeInputNickname');
  const lobbyNick = document.getElementById('inputPlayerNickname');
  if (homeNick && homeNick.value.trim()) {
    gameSession.playerName = homeNick.value.trim();
    if (lobbyNick) lobbyNick.value = gameSession.playerName;
  }

  const homePCount = document.getElementById('homeSelectPlayerCount');
  const lobbyPCount = document.getElementById('selectPlayerCount');
  if (homePCount && lobbyPCount) {
    lobbyPCount.value = homePCount.value;
    gameSession.lobbyState.playerCount = parseInt(homePCount.value, 10) || 3;
  }

  const homeRule = document.getElementById('homeSelectRule');
  if (homeRule) {
    const val = homeRule.value;
    gameSession.lobbyState.playDiscardMode = val;
    document.querySelectorAll('input[name="playDiscardRule"]').forEach(r => {
      r.checked = (r.value === val);
    });
  }

  syncHostLobbySettingsFromInputs();
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

  renderHomeScreenUI();

  if (urlRoom) {
    document.getElementById('homeScreenModal')?.classList.add('hidden');
    activeLobbyTab = 'CLIENT';
    const joinInput = document.getElementById('inputJoinRoomCode');
    if (joinInput) joinInput.value = urlRoom.toUpperCase();
    document.getElementById('lobbyModal')?.classList.remove('hidden');
    renderLobbyUI();
    joinOnlineRoomAsClient(urlRoom, gameSession.playerName);
  } else {
    document.getElementById('homeScreenModal')?.classList.remove('hidden');
  }

  // Landscape Tabletop Mode Controls
  document.getElementById('btnHeaderLandscape')?.addEventListener('click', () => {
    toggleLandscapePortraitMode();
  });
  document.getElementById('btnLsToPortrait')?.addEventListener('click', () => {
    toggleLandscapePortraitMode();
  });
  document.getElementById('btnHomeToggleOrientation')?.addEventListener('click', () => {
    toggleLandscapePortraitMode();
  });
  document.getElementById('btnMenuToggleOrientation')?.addEventListener('click', () => {
    toggleLandscapePortraitMode();
    document.getElementById('settingsMenuModal')?.classList.add('hidden');
  });
  document.getElementById('btnLsFullscreen')?.addEventListener('click', () => {
    triggerPwaInstallOrFullscreen();
  });
  document.getElementById('btnLsRoomMenu')?.addEventListener('click', () => {
    updateSettingsMenuUI();
    document.getElementById('settingsMenuModal')?.classList.remove('hidden');
  });
  document.getElementById('lsLogPanel')?.addEventListener('click', () => {
    renderFullBattleLog();
    document.getElementById('logModal')?.classList.remove('hidden');
  });

  // Home Screen & Theme Switcher Controls
  document.getElementById('homeSelectTheme')?.addEventListener('change', (e) => {
    switchGameTheme(e.target.value);
  });
  document.getElementById('selectLobbyTheme')?.addEventListener('change', (e) => {
    switchGameTheme(e.target.value);
  });
  document.getElementById('btnMenuSwitchTheme')?.addEventListener('click', () => {
    const curId = (typeof getActiveTheme === 'function') ? getActiveTheme().id : 'CLASSIC_BURN_RATE';
    const nextId = curId === 'CLASSIC_BURN_RATE' ? 'DEMON_CASTLE' : 'CLASSIC_BURN_RATE';
    switchGameTheme(nextId);
    if (typeof showToast === 'function') {
      showToast(`🎨 已切換主題為【${getActiveTheme().shortLabel}】！`);
    }
  });
  document.getElementById('homeInputNickname')?.addEventListener('input', () => {
    syncHomeSetupToLobbyControls();
  });
  document.getElementById('homeSelectPlayerCount')?.addEventListener('change', () => {
    syncHomeSetupToLobbyControls();
  });
  document.getElementById('homeSelectRule')?.addEventListener('change', () => {
    syncHomeSetupToLobbyControls();
  });
  document.getElementById('btnHomeToggleSpeed')?.addEventListener('click', () => {
    animSpeedMultiplier = animSpeedMultiplier === 1 ? 2 : 1;
    updateSettingsMenuUI();
  });
  document.getElementById('btnHomeToggleMute')?.addEventListener('click', () => {
    isMuted = !isMuted;
    updateSettingsMenuUI();
  });
  document.getElementById('btnHomeFullscreen')?.addEventListener('click', () => {
    triggerPwaInstallOrFullscreen();
  });
  document.getElementById('btnHomeQuickStart')?.addEventListener('click', () => {
    syncHomeSetupToLobbyControls();
    gameSession.mode = 'SOLO';
    window.hasStartedActiveMatch = true;
    document.getElementById('homeScreenModal')?.classList.add('hidden');
    startMatchFromLobby(true);
  });
  document.getElementById('btnHomeDraftStart')?.addEventListener('click', () => {
    syncHomeSetupToLobbyControls();
    gameSession.mode = 'SOLO';
    window.hasStartedActiveMatch = true;
    document.getElementById('homeScreenModal')?.classList.add('hidden');
    startMatchFromLobby(false);
  });
  document.getElementById('btnHomeOpenLobby')?.addEventListener('click', () => {
    syncHomeSetupToLobbyControls();
    document.getElementById('homeScreenModal')?.classList.add('hidden');
    syncSegmentedPillButtonsUI();
  if (activeLobbyTab === 'SOLO') {
      activeLobbyTab = 'HOST';
      if (gameSession.mode !== 'HOST' || !gameSession.roomCode) {
        createOnlineHostRoom();
      }
    }
    renderLobbyUI();
    document.getElementById('lobbyModal')?.classList.remove('hidden');
  });
  document.getElementById('btnHomeResumeGame')?.addEventListener('click', () => {
    syncHomeSetupToLobbyControls();
    document.getElementById('homeScreenModal')?.classList.add('hidden');
  });
  document.getElementById('btnHomeOpenRules')?.addEventListener('click', () => {
    document.getElementById('rulesModal')?.classList.remove('hidden');
  });
  document.getElementById('btnHomeOpenGallery')?.addEventListener('click', () => {
    renderGallery('ALL');
    document.getElementById('galleryModal')?.classList.remove('hidden');
  });
  document.getElementById('btnMenuGoHome')?.addEventListener('click', () => {
    document.getElementById('settingsMenuModal')?.classList.add('hidden');
    renderHomeScreenUI();
    document.getElementById('homeScreenModal')?.classList.remove('hidden');
  });
  document.getElementById('btnGameOverHome')?.addEventListener('click', () => {
    document.getElementById('gameOverModal')?.classList.add('hidden');
    renderHomeScreenUI();
    document.getElementById('homeScreenModal')?.classList.remove('hidden');
  });

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
  const closeRulesFn = () => {
    document.getElementById('rulesModal')?.classList.add('hidden');
  };
  document.getElementById('btnCloseRules')?.addEventListener('click', closeRulesFn);
  document.getElementById('btnCloseRulesBottom')?.addEventListener('click', closeRulesFn);

  // Backdrop click-to-close for all reference/inspector modals
  ['rulesModal', 'jobBankModal', 'inspectorModal', 'galleryModal', 'logModal', 'lobbyModal'].forEach(modalId => {
    const mEl = document.getElementById(modalId);
    if (mEl) {
      mEl.addEventListener('click', (e) => {
        if (e.target === mEl) mEl.classList.add('hidden');
      });
    }
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
