/********************************************************************
 * LAYER 3: HOST-AUTHORITATIVE SESSION, PEERJS WEBRTC + BROADCASTCHANNEL
 *          NETWORK ADAPTER & SMART AI STEPPER (js/session.js)
 ********************************************************************/

let aiTimer = null;
let lastPlayedVfxSeq = 0;

function loadStoredString(storageKind, key, fallback) {
  try {
    const st = storageKind === 'session' ? window.sessionStorage : window.localStorage;
    const val = st.getItem(key);
    return val || fallback;
  } catch (e) {
    return fallback;
  }
}

function saveStoredString(storageKind, key, val) {
  try {
    const st = storageKind === 'session' ? window.sessionStorage : window.localStorage;
    st.setItem(key, val);
  } catch (e) {}
}

function generateRandomCode(len = 4) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

const initialClientToken = (() => {
  let tk = loadStoredString('session', 'dbr_v13_client_token', '');
  if (!tk) {
    tk = 'tk_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now().toString(36);
    saveStoredString('session', 'dbr_v13_client_token', tk);
  }
  return tk;
})();

const initialPlayerName = loadStoredString('local', 'dbr_v13_player_name', '深淵領主');

const gameSession = {
  mode: 'SOLO', // 'SOLO' | 'HOST' | 'CLIENT'
  roomCode: '',
  localSeatId: 'p1',
  playerName: initialPlayerName,
  clientToken: initialClientToken,
  hasSimulatedHotSeat: false, // Only true when Host explicitly clicks "+ 同機模擬真人"
  peer: null,
  peerStatus: 'OFFLINE', // 'OFFLINE' | 'CONNECTING' | 'ONLINE' | 'BC_READY'
  peerConns: {}, // seatId -> PeerJS DataConnection
  clientHostConn: null, // Client's PeerJS connection to Host
  bc: null, // BroadcastChannel for zero-latency multi-tab play
  hostMasterState: null, // Authoritative unmasked state on Host (null while waiting in Lobby!)
  lobbyState: {
    roomCode: '',
    playerCount: 3,
    playDiscardMode: 'STRICT_EITHER',
    fogOfWar: true,
    themeId: (typeof getActiveTheme === 'function') ? getActiveTheme().id : 'CLASSIC_BURN_RATE',
    matchStarted: false,
    seats: [
      { id: 'p1', name: initialPlayerName + ' (房主)', role: 'HOST', isAI: false, connected: true, clientToken: initialClientToken },
      { id: 'p2', name: '等待玩家加入...', role: 'OPEN', isAI: false, connected: false, clientToken: null },
      { id: 'p3', name: '鮮血女王・莉莉絲 (AI)', role: 'AI', isAI: true, connected: true, clientToken: null },
      { id: 'p4', name: '深淵暴君・阿薩謝爾 (AI)', role: 'AI', isAI: true, connected: true, clientToken: null }
    ]
  }
};

window.gameSession = gameSession;

function showToast(msg, durationMs = 2400) {
  const existing = document.querySelectorAll('.toast-notification');
  existing.forEach(el => el.remove());
  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 260);
  }, durationMs);
}

let hostKeepAliveTimer = null;
let clientConnectRetryTimer = null;
let clientHelloRetryTimer = null;
let clientRetryCount = 0;

// Packet Deduplication Set so running 4 parallel channels (MQTT WSS + HTTPS SSE + PeerJS + BC) never double-executes
const seenPacketIds = new Set();
function stampPacket(pkt) {
  if (!pkt._pktId) {
    pkt._pktId = 'pkt_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }
  pkt._ts = Date.now();
  return pkt;
}

// Cloud Engine 1: Public MQTT-over-WSS Brokers (Port 8084 / 8884 TLS, supports Retained Room State!)
const CLOUD_MQTT_BROKERS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt'
];
let activeMqttClients = [];

// Cloud Engine 2: Pure HTTPS Port-443 EventSource + POST Relay (100% firewall proof)
let activeSseSource = null;

function getCloudTopics(roomCode) {
  const code = String(roomCode || '').trim().toUpperCase();
  return {
    toHost: `dbr_v14_room/${code}/to_host`,
    toHostJoinPrefix: `dbr_v14_room/${code}/join/`,
    toHostJoinWildcard: `dbr_v14_room/${code}/join/+`,
    toClientState: `dbr_v14_room/${code}/to_client_state`,
    toClientEvent: `dbr_v14_room/${code}/to_client_event`,
    sseChannel: `dbr_v14_net_${code}`
  };
}

function closeCloudRelayChannels() {
  activeMqttClients.forEach(c => {
    try { c.end(true); } catch (e) {}
  });
  activeMqttClients = [];
  if (activeSseSource) {
    try { activeSseSource.close(); } catch (e) {}
    activeSseSource = null;
  }
}

// Connects to Cloud MQTT-over-WSS + HTTPS 443 SSE for the given roomCode
function openCloudRelayForRoom(roomCode) {
  closeCloudRelayChannels();
  const code = String(roomCode || '').trim().toUpperCase();
  if (!code) return;
  const topics = getCloudTopics(code);

  // --- 1. HTTPS Port-443 SSE Relay (ntfy.sh) ---
  if (typeof window.EventSource !== 'undefined') {
    try {
      const sseUrl = `https://ntfy.sh/${topics.sseChannel}/sse?since=10m`;
      const es = new window.EventSource(sseUrl);
      activeSseSource = es;
      es.onopen = () => {
        gameSession.peerStatus = 'ONLINE';
        gameSession.peerDetailMsg = '雲端 HTTPS/WSS 跨網直連通道已就緒（支援所有手機 4G/5G）';
        if (typeof renderLobbyUI === 'function') renderLobbyUI();
      };
      es.onmessage = (ev) => {
        if (!ev || !ev.data) return;
        try {
          const outer = JSON.parse(ev.data);
          if (outer && outer.event === 'message' && outer.message) {
            const pkt = JSON.parse(outer.message);
            handleIncomingNetworkPacket(pkt, 'CLOUD_SSE', null);
          }
        } catch (e) {}
      };
    } catch (e) {}
  }

  // --- 2. Cloud MQTT-over-WSS Multi-Broker Relay (with Retained Room State) ---
  const initMqttBrokers = () => {
    if (typeof window.mqtt === 'undefined' || !window.mqtt.connect) return;
    CLOUD_MQTT_BROKERS.forEach((brokerUrl) => {
      try {
        const client = window.mqtt.connect(brokerUrl, {
          keepalive: 25,
          reconnectPeriod: 2000,
          connectTimeout: 8000,
          clean: true,
          clientId: 'dbr_' + gameSession.clientToken + '_' + Math.random().toString(36).slice(2, 6)
        });
        activeMqttClients.push(client);

        client.on('connect', () => {
          gameSession.peerStatus = 'ONLINE';
          gameSession.peerDetailMsg = '雲端 WSS 高速房間伺服器已連線（支援手機 4G/5G 跨網秒連）';
          if (gameSession.mode === 'HOST') {
            client.subscribe([topics.toHost, topics.toHostJoinWildcard], { qos: 1 });
            // Publish current lobby/game state as retained message so joining phones see it immediately
            broadcastLobbyState();
            if (gameSession.lobbyState.matchStarted) broadcastHostState();
          } else if (gameSession.mode === 'CLIENT') {
            client.subscribe([topics.toClientState, topics.toClientEvent], { qos: 1 });
            // Publish retained HELLO_JOIN on our clientToken subtopic so Host receives it even after returning from LINE
            const helloPkt = stampPacket({
              msgType: 'HELLO_JOIN',
              roomCode: code,
              clientToken: gameSession.clientToken,
              playerName: gameSession.playerName
            });
            try {
              client.publish(topics.toHostJoinPrefix + gameSession.clientToken, JSON.stringify(helloPkt), { qos: 1, retain: true });
              client.publish(topics.toHost, JSON.stringify(helloPkt), { qos: 1, retain: false });
            } catch (e) {}
          }
          if (typeof renderLobbyUI === 'function') renderLobbyUI();
        });

        client.on('message', (_topic, payload) => {
          if (!payload) return;
          try {
            const text = typeof payload === 'string' ? payload : new TextDecoder().decode(payload);
            if (!text) return;
            const pkt = JSON.parse(text);
            handleIncomingNetworkPacket(pkt, 'CLOUD_MQTT', null);
          } catch (e) {}
        });
      } catch (e) {}
    });
  };

  if (typeof window.mqtt !== 'undefined') {
    initMqttBrokers();
  } else {
    let tries = 0;
    const waitMqtt = setInterval(() => {
      tries += 1;
      if (typeof window.mqtt !== 'undefined') {
        clearInterval(waitMqtt);
        if (gameSession.roomCode === code) initMqttBrokers();
      } else if (tries >= 20) {
        clearInterval(waitMqtt);
      }
    }, 250);
  }
}

// Publishes a packet over both Cloud MQTT-WSS and Cloud HTTPS-443 SSE
function publishCloudPacket(pkt, isRetainedState = false) {
  if (!pkt || !gameSession.roomCode) return;
  stampPacket(pkt);
  const code = gameSession.roomCode;
  const topics = getCloudTopics(code);
  const jsonStr = JSON.stringify(pkt);

  // 1. Send via all connected MQTT WSS brokers
  activeMqttClients.forEach(client => {
    if (client && client.connected) {
      try {
        if (gameSession.mode === 'HOST') {
          const targetTopic = isRetainedState ? topics.toClientState : topics.toClientEvent;
          client.publish(targetTopic, jsonStr, { qos: 1, retain: Boolean(isRetainedState) });
        } else if (gameSession.mode === 'CLIENT') {
          if (pkt.msgType === 'HELLO_JOIN') {
            client.publish(topics.toHostJoinPrefix + gameSession.clientToken, jsonStr, { qos: 1, retain: true });
          }
          client.publish(topics.toHost, jsonStr, { qos: 1, retain: false });
        }
      } catch (e) {}
    }
  });

  // 2. Send via HTTPS Port-443 Relay (ntfy.sh)
  if (typeof window.fetch === 'function') {
    try {
      window.fetch(`https://ntfy.sh/${topics.sseChannel}`, {
        method: 'POST',
        body: jsonStr
      }).catch(() => {});
    } catch (e) {}
  }
}


// Multi-STUN + Multi-Protocol TURN Relay Configuration for Mobile 4G/5G (Symmetric NAT / CGNAT) Traversal
function getPeerJsConfig() {
  return {
    debug: 1,
    pingInterval: 5000,
    config: {
      iceTransportPolicy: 'all',
      iceCandidatePoolSize: 10,
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun.cloudflare.com:3478' },
        {
          urls: [
            'turn:openrelay.metered.ca:80',
            'turn:openrelay.metered.ca:443',
            'turn:openrelay.metered.ca:443?transport=tcp',
            'turns:openrelay.metered.ca:443?transport=tcp'
          ],
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        {
          urls: [
            'turn:standard.relay.metered.ca:80',
            'turn:standard.relay.metered.ca:80?transport=tcp',
            'turn:standard.relay.metered.ca:443',
            'turns:standard.relay.metered.ca:443?transport=tcp'
          ],
          username: 'openrelayproject',
          credential: 'openrelayproject'
        }
      ]
    }
  };
}

// Ensures window.Peer is loaded even on slow mobile networks before initializing WebRTC
function ensurePeerJsLoaded(callback) {
  if (typeof window.Peer !== 'undefined') {
    callback(true);
    return;
  }
  let attempts = 0;
  const checkTimer = setInterval(() => {
    attempts += 1;
    if (typeof window.Peer !== 'undefined') {
      clearInterval(checkTimer);
      callback(true);
    } else if (attempts === 6) {
      // Inject backup CDN script if primary CDN is slow/blocked
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
      document.head.appendChild(s);
    } else if (attempts >= 25) {
      clearInterval(checkTimer);
      callback(false);
    }
  }, 200);
}

function clearNetworkTimers() {
  clearInterval(hostKeepAliveTimer);
  hostKeepAliveTimer = null;
  clearTimeout(clientConnectRetryTimer);
  clientConnectRetryTimer = null;
  clearInterval(clientHelloRetryTimer);
  clientHelloRetryTimer = null;
}

function cleanupNetworkChannels() {
  clearTimeout(aiTimer);
  clearNetworkTimers();
  closeCloudRelayChannels();
  if (gameSession.bc) {
    try { gameSession.bc.close(); } catch (e) {}
    gameSession.bc = null;
  }
  if (gameSession.clientHostConn) {
    try { gameSession.clientHostConn.close(); } catch (e) {}
    gameSession.clientHostConn = null;
  }
  Object.values(gameSession.peerConns).forEach(conn => {
    try { conn.close(); } catch (e) {}
  });
  gameSession.peerConns = {};
  if (gameSession.peer) {
    try { gameSession.peer.destroy(); } catch (e) {}
    gameSession.peer = null;
  }
  gameSession.peerStatus = 'OFFLINE';
  gameSession.peerDetailMsg = '';
}

function getPeerIdForRoom(roomCode) {
  return `dbr-v13-room-${String(roomCode).trim().toUpperCase()}`;
}

function openBroadcastChannelForRoom(roomCode) {
  if (gameSession.bc) {
    try { gameSession.bc.close(); } catch (e) {}
  }
  if (typeof BroadcastChannel !== 'undefined') {
    const channelName = `dbr_v13_room_${String(roomCode).trim().toUpperCase()}`;
    gameSession.bc = new BroadcastChannel(channelName);
    gameSession.bc.onmessage = (ev) => {
      if (ev && ev.data) {
        handleIncomingNetworkPacket(ev.data, 'BC', null);
      }
    };
    if (gameSession.peerStatus === 'OFFLINE') {
      gameSession.peerStatus = 'BC_READY';
    }
  }
}

// Syncs Host nickname & lobby controls into lobbyState and broadcasts to waiting clients
function syncHostLobbySettingsFromInputs() {
  const nickInput = document.getElementById('inputPlayerNickname');
  if (nickInput && nickInput.value.trim()) {
    gameSession.playerName = nickInput.value.trim();
    saveStoredString('local', 'dbr_v13_player_name', gameSession.playerName);
  }
  if (gameSession.mode === 'HOST') {
    if (gameSession.lobbyState.seats[0]) {
      gameSession.lobbyState.seats[0].name = `${gameSession.playerName} (房主)`;
    }
    const pCountEl = document.getElementById('selectPlayerCount');
    if (pCountEl) {
      gameSession.lobbyState.playerCount = parseInt(pCountEl.value, 10) || 3;
    }
    const ruleRadio = document.querySelector('input[name="playDiscardRule"]:checked');
    if (ruleRadio) {
      gameSession.lobbyState.playDiscardMode = ruleRadio.value;
    }
    const fogChk = document.getElementById('chkFogOfWar');
    if (fogChk) {
      gameSession.lobbyState.fogOfWar = fogChk.checked;
    }
    const lobbyThemeEl = document.getElementById('selectLobbyTheme');
    if (lobbyThemeEl && lobbyThemeEl.value) {
      gameSession.lobbyState.themeId = lobbyThemeEl.value;
      if (typeof applyThemeToRegistry === 'function') applyThemeToRegistry(lobbyThemeEl.value);
    }
    broadcastLobbyState();
  }
}

// Attach Host incoming DataConnection handlers with bidirectional handshake
function bindHostIncomingConnection(conn) {
  if (!conn) return;
  conn.on('data', (data) => {
    handleIncomingNetworkPacket(data, 'PEER', conn);
  });
  conn.on('open', () => {
    // Immediately send a welcome ping so the mobile client knows the TURN/DataChannel pipe is open
    try {
      conn.send({
        msgType: 'HOST_READY_PING',
        roomCode: gameSession.roomCode
      });
    } catch (e) {}
  });
  conn.on('close', () => {
    handlePeerDisconnect(conn);
  });
  conn.on('error', () => {
    handlePeerDisconnect(conn);
  });
}

// Mount or Re-mount the Host PeerJS instance on the signaling server
function mountHostPeerServer(code) {
  if (gameSession.mode !== 'HOST' || gameSession.roomCode !== code) return;

  ensurePeerJsLoaded((loaded) => {
    if (!loaded || gameSession.mode !== 'HOST' || gameSession.roomCode !== code) {
      gameSession.peerStatus = 'BC_READY';
      gameSession.peerDetailMsg = 'PeerJS 載入失敗，僅限同機分頁';
      if (typeof renderLobbyUI === 'function') renderLobbyUI();
      return;
    }

    if (gameSession.peer && !gameSession.peer.destroyed) {
      if (gameSession.peer.disconnected) {
        try { gameSession.peer.reconnect(); } catch (e) {}
      }
      return;
    }

    try {
      gameSession.peerStatus = 'CONNECTING';
      gameSession.peerDetailMsg = '正在註冊跨網房號信令 (含行動網路 TURN 中繼)...';
      if (typeof renderLobbyUI === 'function') renderLobbyUI();

      const peer = new window.Peer(getPeerIdForRoom(code), getPeerJsConfig());
      gameSession.peer = peer;

      peer.on('open', () => {
        gameSession.peerStatus = 'ONLINE';
        gameSession.peerDetailMsg = '跨網連線就緒（支援手機 4G/5G 與跨 Wi-Fi）';
        if (typeof renderLobbyUI === 'function') renderLobbyUI();
        if (typeof renderAll === 'function') renderAll();
      });

      peer.on('connection', (conn) => {
        bindHostIncomingConnection(conn);
      });

      peer.on('disconnected', () => {
        if (gameSession.mode === 'HOST' && peer && !peer.destroyed) {
          gameSession.peerStatus = 'CONNECTING';
          gameSession.peerDetailMsg = '信令背景休眠，正在自動重連...';
          if (typeof renderLobbyUI === 'function') renderLobbyUI();
          setTimeout(() => {
            if (gameSession.mode === 'HOST' && peer && peer.disconnected && !peer.destroyed) {
              try { peer.reconnect(); } catch (e) {}
            }
          }, 600);
        }
      });

      peer.on('error', (err) => {
        const errType = err && err.type ? err.type : 'unknown';
        if (errType === 'unavailable-id') {
          // Previous socket for same room code is still releasing on PeerJS broker; retry in 2s
          gameSession.peerStatus = 'CONNECTING';
          gameSession.peerDetailMsg = '房號信令釋放中，2 秒後自動重試掛載...';
          if (typeof renderLobbyUI === 'function') renderLobbyUI();
          try { peer.destroy(); } catch (e) {}
          gameSession.peer = null;
          setTimeout(() => mountHostPeerServer(code), 2000);
          return;
        }
        if (errType === 'network' || errType === 'server-error' || errType === 'socket-error' || errType === 'socket-closed') {
          gameSession.peerStatus = 'CONNECTING';
          gameSession.peerDetailMsg = `網路切換 (${errType})，正在自動恢復信令...`;
          if (typeof renderLobbyUI === 'function') renderLobbyUI();
          setTimeout(() => {
            if (gameSession.mode === 'HOST') {
              if (gameSession.peer && !gameSession.peer.destroyed && gameSession.peer.disconnected) {
                try { gameSession.peer.reconnect(); } catch (e) {}
              } else if (!gameSession.peer || gameSession.peer.destroyed) {
                mountHostPeerServer(code);
              }
            }
          }, 1500);
          return;
        }
        gameSession.peerDetailMsg = `信令狀態提示：${errType}`;
        if (typeof renderLobbyUI === 'function') renderLobbyUI();
      });
    } catch (e) {
      gameSession.peerStatus = 'BC_READY';
      if (typeof renderLobbyUI === 'function') renderLobbyUI();
    }
  });
}

// === Host: Create Online Room ===
function createOnlineHostRoom(customCode = null) {
  cleanupNetworkChannels();
  const nickInput = document.getElementById('inputPlayerNickname');
  if (nickInput && nickInput.value.trim()) {
    gameSession.playerName = nickInput.value.trim();
    saveStoredString('local', 'dbr_v13_player_name', gameSession.playerName);
  }

  const code = (customCode ? String(customCode).trim().toUpperCase() : generateRandomCode(4));
  gameSession.mode = 'HOST';
  gameSession.roomCode = code;
  gameSession.localSeatId = 'p1';
  gameSession.hasSimulatedHotSeat = false;
  // Critical: clear hostMasterState while in Lobby so joining clients stay in the Waiting Room until Host clicks Start!
  gameSession.hostMasterState = null;

  const pCount = parseInt(document.getElementById('selectPlayerCount')?.value, 10) || 3;
  const ruleRadio = document.querySelector('input[name="playDiscardRule"]:checked');
  const fogChk = document.getElementById('chkFogOfWar');

  gameSession.lobbyState = {
    roomCode: code,
    playerCount: pCount,
    playDiscardMode: ruleRadio ? ruleRadio.value : 'STRICT_EITHER',
    fogOfWar: fogChk ? fogChk.checked : true,
    themeId: (typeof getActiveTheme === 'function') ? getActiveTheme().id : 'CLASSIC_BURN_RATE',
    matchStarted: false,
    seats: [
      { id: 'p1', name: `${gameSession.playerName} (房主)`, role: 'HOST', isAI: false, connected: true, clientToken: gameSession.clientToken },
      { id: 'p2', name: '等待真人加入...', role: 'OPEN', isAI: false, connected: false, clientToken: null },
      { id: 'p3', name: '鮮血女王・莉莉絲 (AI)', role: 'AI', isAI: true, connected: true, clientToken: null },
      { id: 'p4', name: '深淵暴君・阿薩謝爾 (AI)', role: 'AI', isAI: true, connected: true, clientToken: null }
    ]
  };

  openBroadcastChannelForRoom(code);
  openCloudRelayForRoom(code);
  mountHostPeerServer(code);
  setTimeout(() => broadcastLobbyState(), 250);

  // Periodic keep-alive check so if Host phone wakes up from LINE/WhatsApp, it immediately reconnects
  clearInterval(hostKeepAliveTimer);
  hostKeepAliveTimer = setInterval(() => {
    if (gameSession.mode !== 'HOST' || !gameSession.roomCode) return;
    if (!gameSession.peer || gameSession.peer.destroyed) {
      mountHostPeerServer(gameSession.roomCode);
    } else if (gameSession.peer.disconnected) {
      try { gameSession.peer.reconnect(); } catch (e) {}
    }
  }, 3500);

  if (typeof renderLobbyUI === 'function') renderLobbyUI();
  showToast(`🌐 已建立連線房間【${code}】！傳完連結後請保持此畫面在前景。`);
}

// Helper: Checks if Client has already been accepted into a seat in the current room
function isClientSeatedInLobby() {
  if (gameSession.mode !== 'CLIENT' || !gameSession.roomCode) return false;
  const seats = (gameSession.lobbyState && gameSession.lobbyState.seats) || [];
  return seats.some(s => s.id === gameSession.localSeatId && s.clientToken === gameSession.clientToken);
}

// === Client: Join Online Room (with Mobile TURN Relay + Auto-Retry when Host is in Background App) ===
function joinOnlineRoomAsClient(rawCode, playerName) {
  const code = String(rawCode || '').trim().toUpperCase();
  if (!code) {
    showToast('⚠️ 請輸入有效的房間碼！');
    return;
  }
  if (playerName && playerName.trim()) {
    gameSession.playerName = playerName.trim();
    saveStoredString('local', 'dbr_v13_player_name', gameSession.playerName);
  }

  cleanupNetworkChannels();
  gameSession.mode = 'CLIENT';
  gameSession.roomCode = code;
  gameSession.hasSimulatedHotSeat = false;
  gameSession.lobbyState.roomCode = code;
  gameSession.lobbyState.matchStarted = false;
  gameSession.lobbyState.seats = [];
  gameSession.peerStatus = 'CONNECTING';
  gameSession.peerDetailMsg = '正在啟動行動網路穿透 (STUN/TURN)...';
  clientRetryCount = 0;
  if (typeof renderLobbyUI === 'function') renderLobbyUI();

  const buildHelloPacket = () => ({
    msgType: 'HELLO_JOIN',
    roomCode: code,
    clientToken: gameSession.clientToken,
    playerName: gameSession.playerName
  });

  // 1. BroadcastChannel + Cloud WSS/HTTPS Relay (Instant mobile 4G/5G connection)
  openBroadcastChannelForRoom(code);
  openCloudRelayForRoom(code);
  const initialHello = stampPacket(buildHelloPacket());
  if (gameSession.bc) {
    gameSession.bc.postMessage(initialHello);
  }
  publishCloudPacket(initialHello, false);

  // Retry HELLO_JOIN over Cloud Relay every 2.2s until seated (handles Host returning from LINE/background)
  clearInterval(clientHelloRetryTimer);
  clientHelloRetryTimer = setInterval(() => {
    if (gameSession.mode !== 'CLIENT' || gameSession.roomCode !== code || isClientSeatedInLobby() || gameSession.lobbyState.matchStarted) {
      clearInterval(clientHelloRetryTimer);
      clientHelloRetryTimer = null;
      return;
    }
    publishCloudPacket(stampPacket(buildHelloPacket()), false);
  }, 2200);

  // 2. PeerJS WebRTC with TURN Relay & Automatic Retry Loop
  ensurePeerJsLoaded((loaded) => {
    if (!loaded || gameSession.mode !== 'CLIENT' || gameSession.roomCode !== code) {
      gameSession.peerStatus = 'BC_READY';
      gameSession.peerDetailMsg = 'PeerJS 元件未載入，請檢查網路後點擊重試';
      if (typeof renderLobbyUI === 'function') renderLobbyUI();
      return;
    }

    function startClientPeerAttempt() {
      if (gameSession.mode !== 'CLIENT' || gameSession.roomCode !== code || isClientSeatedInLobby()) return;

      clearTimeout(clientConnectRetryTimer);
      clearInterval(clientHelloRetryTimer);

      if (gameSession.clientHostConn) {
        try { gameSession.clientHostConn.close(); } catch (e) {}
        gameSession.clientHostConn = null;
      }

      const openDataChannelToHost = (peerInstance) => {
        if (gameSession.mode !== 'CLIENT' || gameSession.roomCode !== code || isClientSeatedInLobby()) return;
        clientRetryCount += 1;
        gameSession.peerStatus = 'CONNECTING';
        gameSession.peerDetailMsg = clientRetryCount === 1
          ? `正在連線至房主【${code}】(穿透行動網路中)...`
          : `正在重試連線至房主【${code}】(第 ${clientRetryCount} 次嘗試，請確認房主畫面保持在遊戲內)...`;
        if (typeof renderLobbyUI === 'function') renderLobbyUI();

        const conn = peerInstance.connect(getPeerIdForRoom(code), {
          reliable: true,
          serialization: 'json'
        });
        gameSession.clientHostConn = conn;

        const sendHelloNow = () => {
          if (conn && conn.open) {
            try { conn.send(buildHelloPacket()); } catch (e) {}
          }
          if (gameSession.bc) {
            try { gameSession.bc.postMessage(buildHelloPacket()); } catch (e) {}
          }
        };

        conn.on('open', () => {
          gameSession.peerStatus = 'ONLINE';
          gameSession.peerDetailMsg = '跨網通道已建立，正在同步候戰室席位...';
          sendHelloNow();
          if (typeof renderLobbyUI === 'function') renderLobbyUI();

          // Re-send HELLO_JOIN every 1.4s until JOIN_ACCEPTED arrives (prevents mobile WebRTC first-packet drop)
          clearInterval(clientHelloRetryTimer);
          clientHelloRetryTimer = setInterval(() => {
            if (isClientSeatedInLobby() || gameSession.lobbyState.matchStarted) {
              clearInterval(clientHelloRetryTimer);
              clientHelloRetryTimer = null;
              return;
            }
            sendHelloNow();
          }, 1400);
        });

        conn.on('data', (data) => {
          if (data && data.msgType === 'HOST_READY_PING') {
            sendHelloNow();
            return;
          }
          handleIncomingNetworkPacket(data, 'PEER', conn);
        });

        conn.on('close', () => {
          if (gameSession.mode === 'CLIENT' && gameSession.roomCode === code) {
            showToast('⚠️ 與房主的連線中斷，正在自動嘗試重連...');
            clientConnectRetryTimer = setTimeout(() => startClientPeerAttempt(), 1800);
          }
        });

        // Watchdog: if DataChannel hasn't finished seating within 6.5s, re-attempt connection
        clientConnectRetryTimer = setTimeout(() => {
          if (gameSession.mode === 'CLIENT' && gameSession.roomCode === code && !isClientSeatedInLobby()) {
            if (clientRetryCount < 15) {
              startClientPeerAttempt();
            } else {
              gameSession.peerDetailMsg = `⚠️ 無法連上房主【${code}】。請確認房主手機停留在遊戲畫面（未切去背景 App），並點擊上方「連線入房」重試。`;
              if (typeof renderLobbyUI === 'function') renderLobbyUI();
            }
          }
        }, 6500);
      };

      if (gameSession.peer && !gameSession.peer.destroyed) {
        if (gameSession.peer.disconnected) {
          try { gameSession.peer.reconnect(); } catch (e) {}
          setTimeout(() => openDataChannelToHost(gameSession.peer), 500);
        } else if (gameSession.peer.open) {
          openDataChannelToHost(gameSession.peer);
        }
        return;
      }

      try {
        const peer = new window.Peer(getPeerJsConfig());
        gameSession.peer = peer;

        peer.on('open', () => {
          openDataChannelToHost(peer);
        });

        peer.on('disconnected', () => {
          if (gameSession.mode === 'CLIENT' && peer && !peer.destroyed) {
            try { peer.reconnect(); } catch (e) {}
          }
        });

        peer.on('error', (err) => {
          const errType = err && err.type ? err.type : 'unknown';
          if (errType === 'peer-unavailable') {
            gameSession.peerDetailMsg = `⏳ 尚未找到房主【${code}】(若房主剛切去 LINE 傳連結，請等房主切回遊戲畫面，系統正自動重試第 ${clientRetryCount} 次)...`;
            if (typeof renderLobbyUI === 'function') renderLobbyUI();
            clearTimeout(clientConnectRetryTimer);
            if (clientRetryCount < 15) {
              clientConnectRetryTimer = setTimeout(() => startClientPeerAttempt(), 2200);
            }
            return;
          }
          gameSession.peerDetailMsg = `連線重試中 (${errType})...`;
          if (typeof renderLobbyUI === 'function') renderLobbyUI();
          clearTimeout(clientConnectRetryTimer);
          if (clientRetryCount < 15) {
            clientConnectRetryTimer = setTimeout(() => startClientPeerAttempt(), 2500);
          }
        });
      } catch (e) {}
    }

    startClientPeerAttempt();
  });
}

// Mobile Foreground Wake-Up Listener: Automatically restore PeerJS signaling when user switches back from LINE/WhatsApp!
if (typeof document !== 'undefined' && !window.__dbrVisibilityWakeBound) {
  window.__dbrVisibilityWakeBound = true;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (gameSession.mode === 'HOST' && gameSession.roomCode) {
      if (!gameSession.peer || gameSession.peer.destroyed) {
        mountHostPeerServer(gameSession.roomCode);
      } else if (gameSession.peer.disconnected) {
        try { gameSession.peer.reconnect(); } catch (e) {}
      }
      broadcastLobbyState();
      if (gameSession.lobbyState.matchStarted) broadcastHostState();
    } else if (gameSession.mode === 'CLIENT' && gameSession.roomCode) {
      if (!isClientSeatedInLobby() && !gameSession.lobbyState.matchStarted) {
        joinOnlineRoomAsClient(gameSession.roomCode, gameSession.playerName);
      } else if (gameSession.peer && gameSession.peer.disconnected && !gameSession.peer.destroyed) {
        try { gameSession.peer.reconnect(); } catch (e) {}
      }
    }
  });
}

function handlePeerDisconnect(conn) {
  if (gameSession.mode !== 'HOST') return;
  const seatEntry = Object.entries(gameSession.peerConns).find(([, c]) => c === conn);
  if (!seatEntry) return;
  const [seatId] = seatEntry;
  delete gameSession.peerConns[seatId];

  const lobbySeat = gameSession.lobbyState.seats.find(s => s.id === seatId);
  if (lobbySeat) {
    lobbySeat.connected = false;
  }
  if (gameSession.lobbyState.matchStarted && gameSession.hostMasterState) {
    const pl = gameSession.hostMasterState.players.find(p => p.id === seatId);
    if (pl) {
      pl.connected = false;
      addLog(gameSession.hostMasterState, `⚠️ 玩家【${pl.name}】連線中斷（可使用原房間碼重連，或由房主切換 AI 暫代）。`);
    }
    broadcastHostState();
  }
  broadcastLobbyState();
}

// === Host: Toggle a Lobby Seat between OPEN (Wait for Human) and AI ===
function toggleHostLobbySeatRole(seatId) {
  if (gameSession.mode !== 'HOST' || seatId === 'p1') return;
  const seatIdx = ['p1', 'p2', 'p3', 'p4'].indexOf(seatId);
  if (seatIdx < 0) return;
  const seat = gameSession.lobbyState.seats[seatIdx];
  const aiDefaultName = DEFAULT_AI_NAMES[seatIdx - 1] + ' (AI)';

  if (seat.role === 'AI') {
    seat.role = 'OPEN';
    seat.isAI = false;
    seat.connected = false;
    seat.name = '等待真人加入...';
    seat.clientToken = null;
  } else {
    seat.role = 'AI';
    seat.isAI = true;
    seat.connected = true;
    seat.name = aiDefaultName;
    seat.clientToken = null;
  }
  broadcastLobbyState();
  if (typeof renderLobbyUI === 'function') renderLobbyUI();
}

// === Host: Simulate Local Human Seat in Current Window (Hot-Seat / Single-Window Test Helper) ===
function addSimulatedHumanSeatInRoom() {
  if (gameSession.mode !== 'HOST') {
    createOnlineHostRoom();
  }
  const pCount = gameSession.lobbyState.playerCount;
  const openSeat = gameSession.lobbyState.seats.slice(1, pCount).find(s => s.role === 'OPEN' || s.role === 'AI');
  if (!openSeat) {
    showToast('⚠️ 目前座位皆已由真人玩家入座！');
    return;
  }
  const seatNum = openSeat.id.replace('p', '');
  openSeat.role = 'HUMAN';
  openSeat.isAI = false;
  openSeat.connected = true;
  openSeat.name = `同機玩家${seatNum}`;
  openSeat.clientToken = `sim_tk_${openSeat.id}`;
  gameSession.hasSimulatedHotSeat = true;
  broadcastLobbyState();
  if (typeof renderLobbyUI === 'function') renderLobbyUI();
  showToast(`👤 已新增同機測試席位【${openSeat.id.toUpperCase()}】！開局後頂部將顯示視角切換列。`);
}

// === Host: Toggle Disconnected Player AI Takeover Mid-Game ===
function toggleMidGameAITakeover(seatId) {
  if (gameSession.mode !== 'HOST' || !gameSession.hostMasterState) return;
  const pl = gameSession.hostMasterState.players.find(p => p.id === seatId);
  if (!pl || seatId === 'p1') return;
  pl.isAI = !pl.isAI;
  addLog(gameSession.hostMasterState, `🤖 房主將【${pl.name}】切換為「${pl.isAI ? '智慧 AI 託管' : '真人手動控制'}」模式！`);
  broadcastHostState();
  checkAndScheduleHostAI();
}

function sendPacketToHost(packet) {
  stampPacket(packet);
  publishCloudPacket(packet, false);
  if (gameSession.clientHostConn && gameSession.clientHostConn.open) {
    try { gameSession.clientHostConn.send(packet); } catch (e) {}
  }
  if (gameSession.bc) {
    try { gameSession.bc.postMessage(packet); } catch (e) {}
  }
}

function broadcastLobbyState() {
  if (gameSession.mode !== 'HOST') return;
  const packet = stampPacket({
    msgType: 'LOBBY_SYNC',
    roomCode: gameSession.roomCode,
    lobbyState: gameSession.lobbyState
  });
  publishCloudPacket(packet, true);
  Object.values(gameSession.peerConns).forEach(conn => {
    if (conn && conn.open) {
      try { conn.send(packet); } catch (e) {}
    }
  });
  if (gameSession.bc) {
    try { gameSession.bc.postMessage(packet); } catch (e) {}
  }
  if (typeof renderLobbyUI === 'function') renderLobbyUI();
}

function broadcastHostState() {
  if (gameSession.mode !== 'HOST' || !gameSession.lobbyState.matchStarted || !gameSession.hostMasterState) return;
  const master = gameSession.hostMasterState;

  gameState = sanitizeStateForSeat(master, getLocalPlayerId());

  if (master.lastVfxEvent && master.lastVfxEvent.seq > lastPlayedVfxSeq) {
    lastPlayedVfxSeq = master.lastVfxEvent.seq;
    if (typeof playSynchronizedVfxEvent === 'function') {
      playSynchronizedVfxEvent(master.lastVfxEvent);
    }
  }

  Object.entries(gameSession.peerConns).forEach(([seatId, conn]) => {
    if (conn && conn.open) {
      try {
        conn.send({
          msgType: 'STATE_SYNC',
          roomCode: gameSession.roomCode,
          targetSeatId: seatId,
          state: sanitizeStateForSeat(master, seatId)
        });
      } catch (e) {}
    }
  });

  {
    const viewsBySeat = {};
    const mySeatId = getLocalPlayerId();
    viewsBySeat[mySeatId] = gameState;
    master.players.forEach(p => {
      if (p.id !== mySeatId && (!p.isAI || gameSession.hasSimulatedHotSeat)) {
        viewsBySeat[p.id] = sanitizeStateForSeat(master, p.id);
      }
    });
    const allSeatsPkt = stampPacket({
      msgType: 'STATE_SYNC_ALL_SEATS',
      roomCode: gameSession.roomCode,
      viewsBySeat
    });
    publishCloudPacket(allSeatsPkt, true);
    if (gameSession.bc) {
      try { gameSession.bc.postMessage(allSeatsPkt); } catch (e) {}
    }
  }

  if (typeof renderAll === 'function') renderAll();
  if (master.phase === 'GAME_OVER' && typeof showGameOverModal === 'function') {
    const survivors = master.players.filter(p => !p.isEliminated);
    const winner = survivors[0] || master.players[0];
    showGameOverModal(winner);
  }
}

// === Network Packet Router ===
function handleIncomingNetworkPacket(packet, transport, peerConn) {
  if (!packet || packet.roomCode !== gameSession.roomCode) return;
  if (packet._pktId && packet.msgType !== 'HELLO_JOIN') {
    if (seenPacketIds.has(packet._pktId)) return;
    seenPacketIds.add(packet._pktId);
    if (seenPacketIds.size > 600) {
      const firstId = seenPacketIds.values().next().value;
      seenPacketIds.delete(firstId);
    }
  }

  // --- HOST HANDLERS ---
  if (gameSession.mode === 'HOST') {
    if (packet.msgType === 'HELLO_JOIN') {
      const { clientToken, playerName } = packet;
      const pCount = gameSession.lobbyState.playerCount;
      const activeSeats = gameSession.lobbyState.seats.slice(0, pCount);
      const isMatchRunning = Boolean(gameSession.lobbyState.matchStarted && gameSession.hostMasterState);

      // 1. Check if returning client reconnecting with same clientToken
      let assignedSeat = activeSeats.find(s => s.clientToken && s.clientToken === clientToken);

      // 2. Otherwise find first OPEN seat, or convert an AI seat to HUMAN if match hasn't started yet
      if (!assignedSeat) {
        assignedSeat = activeSeats.find(s => s.id !== 'p1' && s.role === 'OPEN');
      }
      if (!assignedSeat && !isMatchRunning) {
        assignedSeat = activeSeats.find(s => s.id !== 'p1' && s.role === 'AI');
      }
      // 3. Or allow claiming a disconnected human seat mid-game
      if (!assignedSeat && isMatchRunning) {
        assignedSeat = activeSeats.find(s => s.id !== 'p1' && !s.isAI && !s.connected);
      }

      if (!assignedSeat) {
        const rejectMsg = {
          msgType: 'JOIN_REJECTED',
          roomCode: gameSession.roomCode,
          targetToken: clientToken,
          reason: '房間座位已滿（目前無空缺席位）'
        };
        if (peerConn && peerConn.open) peerConn.send(rejectMsg);
        if (gameSession.bc) gameSession.bc.postMessage(rejectMsg);
        return;
      }

      assignedSeat.role = 'HUMAN';
      assignedSeat.isAI = false;
      assignedSeat.connected = true;
      assignedSeat.clientToken = clientToken;
      assignedSeat.name = playerName || `深淵魔王 (${assignedSeat.id.toUpperCase()})`;

      if (peerConn) {
        gameSession.peerConns[assignedSeat.id] = peerConn;
      }

      // Only mutate live game state if the Host has ALREADY started the match (mid-game reconnect)
      if (isMatchRunning) {
        const pl = gameSession.hostMasterState.players.find(p => p.id === assignedSeat.id);
        if (pl) {
          pl.name = assignedSeat.name;
          pl.isAI = false;
          pl.isOnlineHuman = true;
          pl.connected = true;
          addLog(gameSession.hostMasterState, `🌐 玩家【${pl.name}】已重新連線入座 (${assignedSeat.id.toUpperCase()})！`);
        }
      }

      const acceptPacket = {
        msgType: 'JOIN_ACCEPTED',
        roomCode: gameSession.roomCode,
        targetToken: clientToken,
        assignedSeatId: assignedSeat.id,
        lobbyState: gameSession.lobbyState,
        // Crucial: null while waiting in Lobby, non-null only if reconnecting to an already-started match!
        state: isMatchRunning ? sanitizeStateForSeat(gameSession.hostMasterState, assignedSeat.id) : null
      };

      if (peerConn) {
        const trySendAccept = () => {
          try { peerConn.send(acceptPacket); } catch (e) {}
        };
        if (peerConn.open) {
          trySendAccept();
          setTimeout(trySendAccept, 250);
        } else {
          peerConn.on('open', trySendAccept);
        }
      }
      publishCloudPacket(acceptPacket, false);
      if (gameSession.bc) gameSession.bc.postMessage(acceptPacket);

      broadcastLobbyState();
      if (isMatchRunning) {
        broadcastHostState();
      }
      showToast(`🎉 玩家【${assignedSeat.name}】已入座 ${assignedSeat.id.toUpperCase()}！`);
      return;
    }

    if (packet.msgType === 'CLIENT_ACTION') {
      const { seatId, action } = packet;
      handleHostReceiveAction(seatId, action);
      return;
    }
  }

  // --- CLIENT HANDLERS ---
  if (gameSession.mode === 'CLIENT') {
    if (packet.msgType === 'JOIN_ACCEPTED' && packet.targetToken === gameSession.clientToken) {
      clearNetworkTimers();
      gameSession.localSeatId = packet.assignedSeatId;
      viewedPlayerId = packet.assignedSeatId;
      gameSession.lobbyState = packet.lobbyState;
      if (packet.lobbyState && packet.lobbyState.themeId && typeof applyThemeToRegistry === 'function') {
        applyThemeToRegistry(packet.lobbyState.themeId);
      }
      gameSession.peerStatus = transport === 'PEER' ? 'ONLINE' : 'BC_READY';

      // Only transition to board if the match has ALREADY started; otherwise stay in the Lobby Waiting Room!
      if (packet.lobbyState && packet.lobbyState.matchStarted && packet.state) {
        gameState = packet.state;
        lastPlayedVfxSeq = packet.state.vfxSeq || 0;
        document.getElementById('lobbyModal')?.classList.add('hidden');
        if (typeof renderAll === 'function') renderAll();
        showToast(`✅ 已重連返回房間【${gameSession.roomCode}】牌桌 (${packet.assignedSeatId.toUpperCase()})！`);
      } else {
        document.getElementById('lobbyModal')?.classList.remove('hidden');
        if (typeof renderLobbyUI === 'function') renderLobbyUI();
        showToast(`✅ 成功入座房間【${gameSession.roomCode}】座位 ${packet.assignedSeatId.toUpperCase()}！請等待房主啟動對局。`);
      }
      return;
    }

    if (packet.msgType === 'JOIN_REJECTED' && packet.targetToken === gameSession.clientToken) {
      showToast(`❌ 加入失敗：${packet.reason}`);
      return;
    }

    if (packet.msgType === 'LOBBY_SYNC') {
      const wasSeated = isClientSeatedInLobby();
      gameSession.lobbyState = packet.lobbyState;
      const mySeatInSync = (packet.lobbyState && packet.lobbyState.seats || []).find(s => s.clientToken === gameSession.clientToken);
      if (mySeatInSync) {
        clearNetworkTimers();
        gameSession.localSeatId = mySeatInSync.id;
        viewedPlayerId = mySeatInSync.id;
        gameSession.peerStatus = 'ONLINE';
        if (!wasSeated) {
          showToast(`✅ 成功入座房間【${gameSession.roomCode}】座位 ${mySeatInSync.id.toUpperCase()}！`);
        }
      }
      if (packet.lobbyState && packet.lobbyState.themeId && typeof applyThemeToRegistry === 'function') {
        applyThemeToRegistry(packet.lobbyState.themeId);
        if (typeof renderAll === 'function') renderAll();
      }
      if (!gameSession.lobbyState.matchStarted) {
        document.getElementById('lobbyModal')?.classList.remove('hidden');
      }
      if (typeof renderLobbyUI === 'function') renderLobbyUI();
      return;
    }

    if (packet.msgType === 'STATE_SYNC' && (!packet.targetSeatId || packet.targetSeatId === gameSession.localSeatId)) {
      applyClientReceivedState(packet.state);
      return;
    }

    if (packet.msgType === 'STATE_SYNC_ALL_SEATS' && packet.viewsBySeat) {
      const myView = packet.viewsBySeat[gameSession.localSeatId];
      if (myView) {
        applyClientReceivedState(myView);
      }
      return;
    }
  }
}

function applyClientReceivedState(newState) {
  if (!newState) return;
  window.hasStartedActiveMatch = true;
  document.getElementById('homeScreenModal')?.classList.add('hidden');
  gameSession.lobbyState.matchStarted = true;
  const lobbyModal = document.getElementById('lobbyModal');
  const wasInLobby = lobbyModal && !lobbyModal.classList.contains('hidden');
  if (wasInLobby) {
    lobbyModal.classList.add('hidden');
    viewedPlayerId = gameSession.localSeatId;
    showToast(`⚔️ 房主已啟動對局！你的座位為 ${gameSession.localSeatId.toUpperCase()}`);
  }
  if (newState.config && newState.config.themeId && typeof applyThemeToRegistry === 'function') {
    applyThemeToRegistry(newState.config.themeId);
  }
  gameState = newState;

  if (newState.lastVfxEvent && newState.lastVfxEvent.seq > lastPlayedVfxSeq) {
    lastPlayedVfxSeq = newState.lastVfxEvent.seq;
    if (typeof playSynchronizedVfxEvent === 'function') {
      playSynchronizedVfxEvent(newState.lastVfxEvent);
    }
  }

  if (typeof resetSelectionState === 'function' && !isLocalPlayerTurn(gameState)) {
    resetSelectionState();
  }
  if (typeof renderAll === 'function') renderAll();

  if (newState.phase === 'GAME_OVER' && typeof showGameOverModal === 'function') {
    const survivors = newState.players.filter(p => !p.isEliminated);
    const winner = survivors[0] || newState.players[0];
    showGameOverModal(winner);
  }
}

// === Unified Action Dispatcher (Called by UI or Host AI) ===
function dispatchPlayerAction(action) {
  if (gameSession.mode === 'CLIENT') {
    sendPacketToHost({
      msgType: 'CLIENT_ACTION',
      roomCode: gameSession.roomCode,
      seatId: gameSession.localSeatId,
      clientToken: gameSession.clientToken,
      action
    });
    return;
  }
  const actorSeatId = getLocalPlayerId();
  handleHostReceiveAction(actorSeatId, action);
}

function getActiveMasterState() {
  return gameSession.mode === 'HOST' && gameSession.hostMasterState
    ? gameSession.hostMasterState
    : gameState;
}

function syncMasterStateToClientsAndRender() {
  if (gameSession.mode === 'HOST' && gameSession.hostMasterState) {
    broadcastHostState();
  } else {
    if (gameState && gameState.lastVfxEvent && gameState.lastVfxEvent.seq > lastPlayedVfxSeq) {
      lastPlayedVfxSeq = gameState.lastVfxEvent.seq;
      if (typeof playSynchronizedVfxEvent === 'function') {
        playSynchronizedVfxEvent(gameState.lastVfxEvent);
      }
    }
    if (typeof renderAll === 'function') renderAll();
  }
}

function handleHostReceiveAction(actorSeatId, action) {
  const state = getActiveMasterState();
  if (!state || state.phase === 'GAME_OVER') return;

  if (action.type === 'DRAFT_PICK') {
    const picker = state.players[state.draft.pickerIndex];
    if (!picker || (picker.id !== actorSeatId && !action.fromAI)) return;
    authoritativeDraftPick(state, action.dept);
    return;
  }

  if (state.phase !== 'STEP1_PLAY_OR_DISCARD') return;
  const activePlayer = state.players[state.turn.activePlayerIndex];
  if (!activePlayer || (activePlayer.id !== actorSeatId && !action.fromAI)) return;

  if (action.type === 'PLAY_CARD') {
    authoritativePlayCard(state, action);
  } else if (action.type === 'DISCARD_CARDS') {
    authoritativeDiscardCards(state, action.cardUids || []);
  } else if (action.type === 'END_TURN') {
    authoritativeSettleAndAdvanceTurn(state);
  }
}

// === Authoritative Rule Mutations on Master State ===
function authoritativeDraftPick(state, dept) {
  if (!state || state.phase !== 'INITIAL_DRAFT') return;
  const picker = state.players[state.draft.pickerIndex];
  const topUid = state.jobBank[dept] ? state.jobBank[dept][0] : null;
  if (!topUid) return;
  const emp = CARDS_BY_ID[topUid];

  if (emp.isVP && hasVPInDept(picker, dept)) {
    addLog(state, `⚠️ 每個部門最多只能有 1 名皇室，無法重複召喚同部門皇室！`);
    syncMasterStateToClientsAndRender();
    return;
  }

  state.jobBank[dept].shift();
  addEmployeeToPlayer(picker, topUid);
  addLog(state, `🎲 首輪召喚：【${picker.name}】挑選了【${DEPT_META[dept].name}・${emp.title}】！`);

  const isFinalPick = (state.draft.totalPicked + 1) >= state.draft.targetTotal;
  recordVfxEvent(state, {
    vfxType: 'DRAFT_PICK',
    actorId: picker.id,
    actorName: picker.name,
    dept,
    empUid: topUid,
    empTitle: emp.title,
    isFinalPick,
    flippedDeptKey: `${picker.id}_${emp.dept}`
  });

  state.draft.totalPicked += 1;
  if (state.draft.totalPicked >= state.draft.targetTotal) {
    state.players.forEach(pl => drawCardsForPlayer(state, pl, 6));
    state.phase = 'STEP1_PLAY_OR_DISCARD';
    state.turn.activePlayerIndex = 0;
    addLog(state, `🔥 首輪召喚完成！每位魔王獲發 6 張功能卡，正式進入回合對決！`);
    syncMasterStateToClientsAndRender();
    if (typeof window.runLsPostDraftDealSequence === 'function' && typeof isLandscapeModeActive === 'function' && isLandscapeModeActive()) {
      window.runLsPostDraftDealSequence(state, () => checkAndScheduleHostAI());
    } else {
      checkAndScheduleHostAI();
    }
  } else {
    state.draft.pickerIndex = (state.draft.pickerIndex + 1) % state.players.length;
    state.draft.round = Math.floor(state.draft.totalPicked / state.players.length) + 1;
    syncMasterStateToClientsAndRender();
    checkAndScheduleHostAI();
  }
}

function authoritativePlayCard(state, action) {
  const player = state.players[state.turn.activePlayerIndex];
  const card = CARDS_BY_ID[action.cardUid];
  if (!card) return;

  const status = evaluateCardPlayability(state, player, card.uid);
  if (!status.playable) return;

  state.turn.hasPlayedCard = true;
  state.lastPlayedCard = { uid: card.uid, tplId: card.tplId, actorId: player.id, actorName: player.name };

  if (card.effect === 'GAIN_FUNDS') {
    consumeHandCard(state, player, card.uid, true);
    player.crystals += card.val;
    state.turn.actionsUsed += 1;
    addLog(state, `💎 【${player.name}】打出「${card.title}」，金庫增加 ${card.val} 魔晶（目前 ${player.crystals}）！`);
    recordVfxEvent(state, {
      vfxType: 'PLAY_CARD',
      effect: 'GAIN_FUNDS',
      cardUid: card.uid,
      actorId: player.id,
      actorName: player.name,
      cardTitle: card.title,
      val: card.val,
      crystals: player.crystals
    });
  } else if (card.effect === 'RELEASE_CRISIS') {
    const crisisUid = action.targetCrisisUid;
    if (!player.crises.includes(crisisUid)) return;
    consumeHandCard(state, player, card.uid, true);
    const cTitle = CARDS_BY_ID[crisisUid].title;
    const cVal = CARDS_BY_ID[crisisUid].val;
    player.crises = player.crises.filter(id => id !== crisisUid);
    state.discardPile.unshift(crisisUid);
    recalcPlayerStats(player);
    state.turn.actionsUsed += 1;
    addLog(state, `🍾 【${player.name}】打出「鎮壓危機」，成功解除「${cTitle}」！`);
    recordVfxEvent(state, {
      vfxType: 'PLAY_CARD',
      effect: 'RELEASE_CRISIS',
      cardUid: card.uid,
      crisisUid,
      actorId: player.id,
      actorName: player.name,
      crisisTitle: cTitle,
      crisisVal: cVal
    });
  } else if (card.effect === 'HIRE_BANK') {
    const dept = action.targetDept;
    if (!status.validBankDepts || !status.validBankDepts.includes(dept)) return;
    consumeHandCard(state, player, card.uid, true);
    const empUid = state.jobBank[dept].shift();
    const emp = CARDS_BY_ID[empUid];
    addEmployeeToPlayer(player, empUid);
    state.turn.actionsUsed += 1;
    addLog(state, `🤝 【${player.name}】打出「契約召喚」，從人才池招募了【${DEPT_META[dept].name}・${emp.title}】！`);
    recordVfxEvent(state, {
      vfxType: 'PLAY_CARD',
      effect: 'HIRE_BANK',
      cardUid: card.uid,
      empUid,
      actorId: player.id,
      actorName: player.name,
      dept,
      empTitle: emp.title,
      flippedDeptKey: `${player.id}_${emp.dept}`
    });
  } else if (card.effect === 'FIRE_OWN') {
    const empUid = action.targetEmpUid;
    const emp = CARDS_BY_ID[empUid];
    if (!emp || !status.validOwnEmployees.includes(empUid)) return;
    consumeHandCard(state, player, card.uid, true);
    if (emp.isVP) {
      const secUid = action.secondaryCardUid || status.companionFireUids[0];
      if (!secUid) return;
      consumeHandCard(state, player, secUid, true);
      state.turn.actionsUsed += 2;
    } else {
      state.turn.actionsUsed += 1;
    }
    removeEmployeeFromPlayer(player, empUid);
    returnEmployeeToJobBankBottom(state, empUid);
    addLog(state, `🚪 【${player.name}】打出${emp.isVP ? '雙重' : ''}「獻祭遣散」，將自己的【${emp.title}】放回人才池底部！`);
    recordVfxEvent(state, {
      vfxType: 'PLAY_CARD',
      effect: 'FIRE_OWN',
      cardUid: card.uid,
      empUid,
      actorId: player.id,
      actorName: player.name,
      dept: emp.dept,
      empTitle: emp.title,
      empSalary: emp.salary,
      isVP: emp.isVP
    });
  } else if (card.effect === 'BAD_IDEA') {
    const opp = state.players.find(p => p.id === action.targetPlayerId);
    if (!opp || !status.validOpponents.includes(opp.id)) return;
    consumeHandCard(state, player, card.uid, false);
    opp.crises.push(card.uid);
    recalcPlayerStats(opp);
    state.turn.actionsUsed += 1;
    addLog(state, `⚔️ 【${player.name}】對【${opp.name}】施放「${card.title}（需苦工×${card.val}）」！`);
    recordVfxEvent(state, {
      vfxType: 'PLAY_CARD',
      effect: 'BAD_IDEA',
      cardUid: card.uid,
      actorId: player.id,
      actorName: player.name,
      targetPlayerId: opp.id,
      targetName: opp.name,
      cardTitle: card.title,
      val: card.val
    });
  } else if (card.effect === 'FORCE_HIRE') {
    const opp = state.players.find(p => p.id === action.targetPlayerId);
    const dept = action.targetDept;
    if (!opp || !status.validBankByOpponent[opp.id] || !status.validBankByOpponent[opp.id].includes(dept)) return;
    const empUid = state.jobBank[dept].shift();
    const emp = CARDS_BY_ID[empUid];
    consumeHandCard(state, player, card.uid, true);
    addEmployeeToPlayer(opp, empUid);
    state.turn.actionsUsed += 1;
    addLog(state, `🪤 【${player.name}】對【${opp.name}】打出「強塞魔物」，強制塞入【${DEPT_META[dept].name}・${emp.title}】！`);
    recordVfxEvent(state, {
      vfxType: 'PLAY_CARD',
      effect: 'FORCE_HIRE',
      cardUid: card.uid,
      empUid,
      actorId: player.id,
      actorName: player.name,
      targetPlayerId: opp.id,
      targetName: opp.name,
      dept,
      empTitle: emp.title,
      empSalary: emp.salary,
      flippedDeptKey: `${opp.id}_${emp.dept}`
    });
  } else if (card.effect === 'POACH_ENEMY') {
    const opp = state.players.find(p => p.id === action.targetPlayerId);
    const empUid = action.targetEmpUid;
    const emp = CARDS_BY_ID[empUid];
    if (!opp || !emp || !status.targetableByOpponent[opp.id] || !status.targetableByOpponent[opp.id].includes(empUid)) return;
    consumeHandCard(state, player, card.uid, true);
    if (emp.isVP) {
      const companions = status.companionsByOpponent[opp.id] || [];
      const secUid = action.secondaryCardUid || companions[0];
      if (!secUid) return;
      consumeHandCard(state, player, secUid, true);
      state.turn.actionsUsed += 2;
    } else {
      state.turn.actionsUsed += 1;
    }
    removeEmployeeFromPlayer(opp, empUid);
    addEmployeeToPlayer(player, empUid);
    addLog(state, `🕸️ 【${player.name}】打出${emp.isVP ? '雙重' : ''}「魅惑挖角」，從【${opp.name}】奪取了【${emp.title}】！`);
    recordVfxEvent(state, {
      vfxType: 'PLAY_CARD',
      effect: 'POACH_ENEMY',
      cardUid: card.uid,
      empUid,
      dept: emp.dept,
      actorId: player.id,
      actorName: player.name,
      targetPlayerId: opp.id,
      targetName: opp.name,
      empTitle: emp.title,
      isVP: emp.isVP,
      flippedDeptKey: `${player.id}_${emp.dept}`
    });
  } else if (card.effect === 'VP_KICK_ENEMY') {
    const opp = state.players.find(p => p.id === action.targetPlayerId);
    const empUid = action.targetEmpUid;
    const emp = CARDS_BY_ID[empUid];
    if (!opp || !emp) return;
    consumeHandCard(state, player, card.uid, true);
    removeEmployeeFromPlayer(opp, empUid);
    returnEmployeeToJobBankBottom(state, empUid);
    state.turn.actionsUsed += 1;
    addLog(state, `⚡ 皇室大招！【${player.name}】打出「${card.title}」，直接將【${opp.name}】的皇室【${emp.title}】放逐回人才池底！`);
    recordVfxEvent(state, {
      vfxType: 'PLAY_CARD',
      effect: 'VP_KICK_ENEMY',
      cardUid: card.uid,
      empUid,
      dept: emp.dept,
      actorId: player.id,
      actorName: player.name,
      targetPlayerId: opp.id,
      targetName: opp.name,
      cardTitle: card.title,
      empTitle: emp.title
    });
  } else if (card.effect === 'VP_DOUBLE_PAY') {
    const opp = state.players.find(p => p.id === action.targetPlayerId);
    if (!opp) return;
    consumeHandCard(state, player, card.uid, true);
    opp.doubleBurnFlag = true;
    state.turn.actionsUsed += 1;
    addLog(state, `🔥 皇室大招！【${player.name}】對【${opp.name}】施放「魔界工會暴動」，下回合總供品翻倍（×2）！`);
    recordVfxEvent(state, {
      vfxType: 'PLAY_CARD',
      effect: 'VP_DOUBLE_PAY',
      cardUid: card.uid,
      actorId: player.id,
      actorName: player.name,
      targetPlayerId: opp.id,
      targetName: opp.name,
      cardTitle: card.title
    });
  } else if (card.effect === 'VP_MASS_LAYOFF') {
    const layoffUids = action.layoffUids || [];
    if (layoffUids.length === 0) return;
    consumeHandCard(state, player, card.uid, true);
    layoffUids.forEach(eUid => {
      removeEmployeeFromPlayer(player, eUid);
      returnEmployeeToJobBankBottom(state, eUid);
    });
    state.turn.actionsUsed += 1;
    addLog(state, `🩸 皇室大招！【${player.name}】發動「血祭大掃除」，一口氣遣散了 ${layoffUids.length} 名部下！`);
    recordVfxEvent(state, {
      vfxType: 'PLAY_CARD',
      effect: 'VP_MASS_LAYOFF',
      cardUid: card.uid,
      layoffUids,
      actorId: player.id,
      actorName: player.name,
      layoffCount: layoffUids.length
    });
  }

  if (typeof resetSelectionState === 'function') resetSelectionState();
  syncMasterStateToClientsAndRender();

  if (!player.isAI && state.turn.actionsUsed >= state.turn.maxActions) {
    const settleDelay = (typeof animSpeedMultiplier !== 'undefined' && animSpeedMultiplier === 2) ? 1050 : 1900;
    clearTimeout(aiTimer);
    aiTimer = setTimeout(() => authoritativeSettleAndAdvanceTurn(state), settleDelay);
  }
}

function authoritativeDiscardCards(state, cardUids) {
  if (!state || !cardUids || cardUids.length === 0) return;
  const player = state.players[state.turn.activePlayerIndex];
  const canDiscard = state.config.playDiscardMode === 'SHARED_QUOTA_4' || !state.turn.hasPlayedCard;
  if (!canDiscard) return;

  const remaining = state.turn.maxActions - state.turn.actionsUsed;
  const validToDiscard = cardUids.filter(uid => player.hand.includes(uid)).slice(0, remaining);
  if (validToDiscard.length === 0) return;

  validToDiscard.forEach(uid => consumeHandCard(state, player, uid, true));
  state.turn.actionsUsed += validToDiscard.length;
  state.turn.hasDiscardedCard = true;
  addLog(state, `🗑️ 【${player.name}】棄置了 ${validToDiscard.length} 張手牌。`);
  recordVfxEvent(state, {
    vfxType: 'DISCARD',
    actorId: player.id,
    actorName: player.name,
    count: validToDiscard.length,
    cardUids: [...validToDiscard]
  });

  if (typeof resetSelectionState === 'function') resetSelectionState();
  syncMasterStateToClientsAndRender();

  if (state.config.playDiscardMode === 'STRICT_EITHER' || state.turn.actionsUsed >= state.turn.maxActions) {
    const settleDelay = (typeof animSpeedMultiplier !== 'undefined' && animSpeedMultiplier === 2) ? 750 : 1300;
    clearTimeout(aiTimer);
    aiTimer = setTimeout(() => authoritativeSettleAndAdvanceTurn(state), settleDelay);
  }
}

function authoritativeSettleAndAdvanceTurn(state) {
  if (!state || state.phase === 'GAME_OVER') return;
  clearTimeout(aiTimer);
  const player = state.players[state.turn.activePlayerIndex];

  recalcPlayerStats(player);
  const burnAmount = getPlayerBurnRate(player);
  const wasDouble = player.doubleBurnFlag;
  player.crystals -= burnAmount;
  player.doubleBurnFlag = false;

  addLog(state, `🔥 步驟二＆三結算：【${player.name}】支付魔力供品 ${burnAmount} 魔晶${wasDouble ? ' (含雙倍暴動×2!)' : ''}，剩餘 ${player.crystals} 魔晶。`);

  let drawnUids = [];
  if (player.crystals < 0) {
    player.isEliminated = true;
    getAllPlayerEmployeeUids(player).forEach(eUid => {
      removeEmployeeFromPlayer(player, eUid);
      returnEmployeeToJobBankBottom(state, eUid);
    });
    player.crises.forEach(cUid => state.discardPile.unshift(cUid));
    player.crises = [];
    player.hand.forEach(hUid => state.discardPile.unshift(hUid));
    player.hand = [];
    player.outsourcedCount = 0;
    addLog(state, `💥 破產崩潰！【${player.name}】魔晶跌破零點，魔王城倒閉退出競爭！`);
  } else {
    drawnUids = drawCardsForPlayer(state, player, 6) || [];
  }

  recordVfxEvent(state, {
    vfxType: 'SETTLE_BURN',
    actorId: player.id,
    actorName: player.name,
    burnAmount,
    wasDouble,
    remainingCrystals: player.crystals,
    eliminated: player.isEliminated,
    drawnUids
  });

  const survivors = state.players.filter(p => !p.isEliminated);
  if (survivors.length <= 1) {
    state.phase = 'GAME_OVER';
    const winner = survivors[0] || player;
    addLog(state, `🏆 遊戲結束！【${winner.name}】成為唯一存活的深淵霸主！`);
    if (typeof resetSelectionState === 'function') resetSelectionState();
    syncMasterStateToClientsAndRender();
    if (typeof showGameOverModal === 'function') showGameOverModal(winner);
    return;
  }

  if (typeof resetSelectionState === 'function') resetSelectionState();
  syncMasterStateToClientsAndRender();

  const speedMult = (typeof animSpeedMultiplier !== 'undefined') ? animSpeedMultiplier : 1;
  const handoffDelay = speedMult === 2 ? 900 : 1650;
  const postHandoffWait = speedMult === 2 ? 1250 : 2300;

  aiTimer = setTimeout(() => {
    const activeState = getActiveMasterState();
    if (!activeState || activeState.phase === 'GAME_OVER') return;

    let nextIdx = (activeState.turn.activePlayerIndex + 1) % activeState.players.length;
    while (activeState.players[nextIdx].isEliminated) {
      nextIdx = (nextIdx + 1) % activeState.players.length;
    }
    if (nextIdx <= activeState.turn.activePlayerIndex) {
      activeState.turn.roundNumber += 1;
    }

    activeState.turn.activePlayerIndex = nextIdx;
    activeState.turn.actionsUsed = 0;
    activeState.turn.hasPlayedCard = false;
    activeState.turn.hasDiscardedCard = false;

    const nextPlayer = activeState.players[nextIdx];
    recordVfxEvent(activeState, {
      vfxType: 'TURN_HANDOVER',
      nextPlayerId: nextPlayer.id,
      nextPlayerName: nextPlayer.name,
      roundNumber: activeState.turn.roundNumber
    });

    if (typeof resetSelectionState === 'function') resetSelectionState();
    syncMasterStateToClientsAndRender();

    if (nextPlayer.isAI) {
      scheduleNextAITick(postHandoffWait);
    }
  }, handoffDelay);
}

// === Backwards-Compatible Entry Points for UI & AI ===
function executePlayCard(action) {
  dispatchPlayerAction({ type: 'PLAY_CARD', ...action });
}

function handleDraftPickDepartment(dept) {
  dispatchPlayerAction({ type: 'DRAFT_PICK', dept });
}

function endPlayPhaseAndSettleTurn() {
  dispatchPlayerAction({ type: 'END_TURN' });
}

// === Smart AI Stepper (Runs on SOLO or HOST for any seat with isAI === true) ===
function checkAndScheduleHostAI(customDelayMs = null) {
  if (gameSession.mode === 'CLIENT') return;
  const state = getActiveMasterState();
  if (!state || state.phase === 'GAME_OVER') return;

  if (state.phase === 'INITIAL_DRAFT') {
    const picker = state.players[state.draft.pickerIndex];
    if (picker && picker.isAI) {
      scheduleNextAITick(customDelayMs || 900);
    }
  } else if (state.phase === 'STEP1_PLAY_OR_DISCARD') {
    const active = state.players[state.turn.activePlayerIndex];
    if (active && active.isAI) {
      scheduleNextAITick(customDelayMs);
    }
  }
}

function scheduleNextAITick(customDelayMs = null) {
  if (gameSession.mode === 'CLIENT') return;
  clearTimeout(aiTimer);
  const speedMult = (typeof animSpeedMultiplier !== 'undefined') ? animSpeedMultiplier : 1;
  const delay = customDelayMs !== null
    ? customDelayMs
    : (speedMult === 2 ? 1400 : 2500);
  aiTimer = setTimeout(() => runAIStep(), delay);
}

function runAIStep() {
  if (gameSession.mode === 'CLIENT') return;
  const state = getActiveMasterState();
  if (!state || state.phase === 'GAME_OVER') return;

  if (state.phase === 'INITIAL_DRAFT') {
    const picker = state.players[state.draft.pickerIndex];
    if (!picker || !picker.isAI) return;
    const depts = ['RED', 'YELLOW', 'BLUE', 'GREEN'];
    let bestDept = null;
    let bestScore = -999;

    depts.forEach(d => {
      const topUid = state.jobBank[d][0];
      if (!topUid) return;
      const c = CARDS_BY_ID[topUid];
      if (c.isVP && hasVPInDept(picker, d)) return;
      let score = (c.skill !== null ? c.skill * 3 : 2) - c.salary;
      if (picker.departments[d].length === 0 && c.role !== 'ENGINEER') score += 2;
      if (c.isVP && c.skill === 0) score = -10;
      if (score > bestScore) { bestScore = score; bestDept = d; }
    });

    if (bestDept) {
      authoritativeDraftPick(state, bestDept);
    }
    return;
  }

  const ai = state.players[state.turn.activePlayerIndex];
  if (!ai || !ai.isAI) return;

  if (state.turn.actionsUsed >= state.turn.maxActions) {
    authoritativeSettleAndAdvanceTurn(state);
    return;
  }

  function pickFairAITarget(candidateIds) {
    if (!candidateIds || candidateIds.length === 0) return null;
    if (candidateIds.length === 1) return candidateIds[0];
    const scored = candidateIds.map(id => {
      const opp = state.players.find(p => p.id === id);
      const burn = getPlayerBurnRate(opp);
      const crisisLoad = getCrisisTotalEngineerReq(opp);
      let threatScore = opp.crystals * 1.2 - burn * 4.5 - crisisLoad * 8;
      if (opp.isAI) threatScore += 18;
      threatScore += (Math.random() * 26 - 13);
      return { id, threatScore };
    });
    scored.sort((a, b) => b.threatScore - a.threatScore);
    return scored[0].id;
  }

  for (const hUid of ai.hand) {
    const card = CARDS_BY_ID[hUid];
    const status = evaluateCardPlayability(state, ai, hUid);
    if (!status.playable) continue;

    if (card.effect === 'RELEASE_CRISIS') {
      const sortedCrises = [...status.validCrises].sort((a, b) => (CARDS_BY_ID[b].val || 0) - (CARDS_BY_ID[a].val || 0));
      authoritativePlayCard(state, { cardUid: hUid, targetCrisisUid: sortedCrises[0] });
      scheduleNextAITick();
      return;
    }
    if (card.effect === 'GAIN_FUNDS') {
      authoritativePlayCard(state, { cardUid: hUid });
      scheduleNextAITick();
      return;
    }
    if (card.effect === 'BAD_IDEA') {
      const targetOppId = pickFairAITarget(status.validOpponents);
      authoritativePlayCard(state, { cardUid: hUid, targetPlayerId: targetOppId });
      scheduleNextAITick();
      return;
    }
    if (card.effect === 'FORCE_HIRE') {
      const orderedOpps = [...status.validOpponents].sort((a, b) => (pickFairAITarget([a, b]) === a ? -1 : 1));
      for (const oppId of orderedOpps) {
        const depts = status.validBankByOpponent[oppId];
        const badDept = depts.find(d => {
          const emp = CARDS_BY_ID[state.jobBank[d][0]];
          return (emp.isVP && emp.skill <= 1) || emp.salary >= 2;
        });
        if (badDept) {
          authoritativePlayCard(state, { cardUid: hUid, targetPlayerId: oppId, targetDept: badDept });
          scheduleNextAITick();
          return;
        }
      }
    }
    if (card.effect === 'POACH_ENEMY') {
      const orderedOpps = [...status.validOpponents].sort((a, b) => (pickFairAITarget([a, b]) === a ? -1 : 1));
      for (const oppId of orderedOpps) {
        const emps = status.targetableByOpponent[oppId] || [];
        const goodEmpUid = emps.find(eUid => {
          const emp = CARDS_BY_ID[eUid];
          if (emp.role === 'ENGINEER' && ai.outsourcedCount > 0) return true;
          if (!emp.isVP && emp.skill >= 2 && getEffectiveSkill(ai, emp.dept) < emp.skill) return true;
          return false;
        });
        if (goodEmpUid) {
          authoritativePlayCard(state, { cardUid: hUid, targetPlayerId: oppId, targetEmpUid: goodEmpUid });
          scheduleNextAITick();
          return;
        }
      }
    }
    if (card.effect === 'VP_DOUBLE_PAY') {
      const targetOppId = pickFairAITarget(status.validOpponents);
      authoritativePlayCard(state, { cardUid: hUid, targetPlayerId: targetOppId });
      scheduleNextAITick();
      return;
    }
    if (card.effect === 'VP_KICK_ENEMY') {
      const highSkillVPs = [...status.targetVPs].sort((a, b) => (CARDS_BY_ID[b.empUid].skill || 0) - (CARDS_BY_ID[a.empUid].skill || 0));
      const t = highSkillVPs[0];
      authoritativePlayCard(state, { cardUid: hUid, targetPlayerId: t.opponentId, targetEmpUid: t.empUid });
      scheduleNextAITick();
      return;
    }
    if (card.effect === 'HIRE_BANK') {
      const goodDept = status.validBankDepts.find(d => {
        const emp = CARDS_BY_ID[state.jobBank[d][0]];
        if (emp.role === 'ENGINEER' && ai.outsourcedCount > 0) return true;
        if (emp.skill >= 2 && getEffectiveSkill(ai, d) < emp.skill) return true;
        return false;
      });
      if (goodDept) {
        authoritativePlayCard(state, { cardUid: hUid, targetDept: goodDept });
        scheduleNextAITick();
        return;
      }
    }
    if (card.effect === 'FIRE_OWN') {
      const redundantUid = status.validOwnEmployees.find(eUid => {
        const emp = CARDS_BY_ID[eUid];
        if (emp.isVP && emp.skill === 0) return true;
        if (emp.role === 'MANAGER' && ai.departments[emp.dept][0] !== eUid) return true;
        return false;
      });
      if (redundantUid) {
        const emp = CARDS_BY_ID[redundantUid];
        authoritativePlayCard(state, {
          cardUid: hUid,
          targetEmpUid: redundantUid,
          secondaryCardUid: emp.isVP ? status.companionFireUids[0] : null
        });
        scheduleNextAITick();
        return;
      }
    }
  }

  const canDiscard = state.config.playDiscardMode === 'SHARED_QUOTA_4' || !state.turn.hasPlayedCard;
  if (canDiscard && ai.hand.length > 0) {
    const remaining = state.turn.maxActions - state.turn.actionsUsed;
    const toDiscard = ai.hand.slice(0, Math.min(remaining, 3));
    if (toDiscard.length > 0) {
      toDiscard.forEach(uid => consumeHandCard(state, ai, uid, true));
      state.turn.actionsUsed += toDiscard.length;
      state.turn.hasDiscardedCard = true;
      addLog(state, `🗑️ 【${ai.name}】棄置了 ${toDiscard.length} 張手牌以更新法術牌組。`);
      recordVfxEvent(state, {
        vfxType: 'DISCARD',
        actorId: ai.id,
        actorName: ai.name,
        count: toDiscard.length,
        cardUids: [...toDiscard]
      });
      syncMasterStateToClientsAndRender();
      const dDelay = (typeof animSpeedMultiplier !== 'undefined' && animSpeedMultiplier === 2) ? 450 : 750;
      clearTimeout(aiTimer);
      aiTimer = setTimeout(() => authoritativeSettleAndAdvanceTurn(state), dDelay);
      return;
    }
  }

  authoritativeSettleAndAdvanceTurn(state);
}

// === Start Match from Lobby (Solo or Host Online) ===
function startMatchFromLobby(quickStart = false) {
  clearTimeout(aiTimer);
  window.hasStartedActiveMatch = true;
  document.getElementById('homeScreenModal')?.classList.add('hidden');
  syncHostLobbySettingsFromInputs();

  const pCount = gameSession.lobbyState.playerCount || 3;
  const mode = gameSession.lobbyState.playDiscardMode || 'STRICT_EITHER';
  const fogOfWar = gameSession.lobbyState.fogOfWar;

  if (gameSession.mode === 'HOST') {
    gameSession.lobbyState.seats[0].name = `${gameSession.playerName} (房主)`;
    const customSeats = gameSession.lobbyState.seats.slice(0, pCount).map((s, idx) => {
      if (s.role === 'OPEN') {
        return {
          id: s.id,
          name: DEFAULT_AI_NAMES[idx - 1] + ' (AI)',
          isAI: true,
          connected: true
        };
      }
      return {
        id: s.id,
        name: s.name,
        isAI: Boolean(s.isAI),
        connected: s.connected
      };
    });

    gameSession.lobbyState.matchStarted = true;
    gameSession.localSeatId = 'p1';
    gameSession.hostMasterState = createInitialGameState(pCount, mode, quickStart, customSeats, fogOfWar);
    lastPlayedVfxSeq = 0;
    if (typeof resetSelectionState === 'function') resetSelectionState();
    document.getElementById('lobbyModal')?.classList.add('hidden');
    document.getElementById('gameOverModal')?.classList.add('hidden');
    broadcastLobbyState();
    broadcastHostState();
    if (typeof window.startLsOpeningCeremony === 'function' && typeof isLandscapeModeActive === 'function' && isLandscapeModeActive()) {
      window.startLsOpeningCeremony(gameSession.hostMasterState, quickStart, () => checkAndScheduleHostAI());
    } else {
      checkAndScheduleHostAI();
    }
  } else {
    cleanupNetworkChannels();
    gameSession.mode = 'SOLO';
    gameSession.localSeatId = 'p1';
    gameSession.hasSimulatedHotSeat = false;
    const aiPool = (typeof getThemeTerms === 'function' && getThemeTerms().aiNames) ? getThemeTerms().aiNames : DEFAULT_AI_NAMES;
    const soloSeats = [
      { id: 'p1', name: `${gameSession.playerName} (你)`, isAI: false, connected: true },
      { id: 'p2', name: aiPool[0], isAI: true, connected: true },
      { id: 'p3', name: aiPool[1], isAI: true, connected: true },
      { id: 'p4', name: aiPool[2], isAI: true, connected: true }
    ].slice(0, pCount);
    gameState = createInitialGameState(pCount, mode, quickStart, soloSeats, false);
    gameSession.hostMasterState = null;
    lastPlayedVfxSeq = 0;
    if (typeof resetSelectionState === 'function') resetSelectionState();
    document.getElementById('lobbyModal')?.classList.add('hidden');
    document.getElementById('gameOverModal')?.classList.add('hidden');
    if (typeof window.startLsOpeningCeremony === 'function' && typeof isLandscapeModeActive === 'function' && isLandscapeModeActive()) {
      window.startLsOpeningCeremony(gameState, quickStart, () => checkAndScheduleHostAI());
    } else {
      if (typeof renderAll === 'function') renderAll();
      checkAndScheduleHostAI();
    }
  }
}

// === Perspective Switcher for Hot-Seat / Local Multiplayer Testing ===
function switchLocalSeatPerspective(newSeatId) {
  const master = getActiveMasterState();
  if (!master) return;
  if (!master.players.some(p => p.id === newSeatId)) return;
  gameSession.localSeatId = newSeatId;
  viewedPlayerId = newSeatId;
  if (gameSession.mode === 'HOST' && gameSession.hostMasterState) {
    gameState = sanitizeStateForSeat(gameSession.hostMasterState, newSeatId);
  }
  if (typeof resetSelectionState === 'function') resetSelectionState();
  if (typeof renderAll === 'function') renderAll();
  const pl = master.players.find(p => p.id === newSeatId);
  showToast(`👁️ 已切換操控視角至【${pl ? pl.name : newSeatId.toUpperCase()}】`);
}

window.showToast = showToast;
window.syncHostLobbySettingsFromInputs = syncHostLobbySettingsFromInputs;
window.createOnlineHostRoom = createOnlineHostRoom;
window.joinOnlineRoomAsClient = joinOnlineRoomAsClient;
window.toggleHostLobbySeatRole = toggleHostLobbySeatRole;
window.addSimulatedHumanSeatInRoom = addSimulatedHumanSeatInRoom;
window.toggleMidGameAITakeover = toggleMidGameAITakeover;
window.dispatchPlayerAction = dispatchPlayerAction;
window.executePlayCard = executePlayCard;
window.handleDraftPickDepartment = handleDraftPickDepartment;
window.endPlayPhaseAndSettleTurn = endPlayPhaseAndSettleTurn;
window.startMatchFromLobby = startMatchFromLobby;
window.switchLocalSeatPerspective = switchLocalSeatPerspective;
window.scheduleNextAITick = scheduleNextAITick;
window.runAIStep = runAIStep;
