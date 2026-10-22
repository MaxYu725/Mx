'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');

function gameHarness() {
  const storage = () => ({ getItem: () => null, setItem: () => {} });
  const window = { crypto: webcrypto, localStorage: storage(), sessionStorage: storage() };
  const document = { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] };
  const sandbox = vm.createContext({
    window, document, setTimeout: () => 1, clearTimeout: () => {},
    console, Date, Uint32Array, BroadcastChannel: undefined,
  });
  for (const file of ['js/cards.js', 'js/engine.js', 'js/session.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), sandbox, { filename: file });
  }
  const game = vm.runInContext('({ createInitialGameState, evaluateCardPlayability, consumeHandCard, sanitizeStateForSeat, escapeHtml, validatePlayActionTargets, handleIncomingNetworkPacket, authoritativeDiscardCards, authoritativeSettleAndAdvanceTurn, gameSession, publicLobbyState, CARDS_BY_ID, generateRandomCode, ensurePeerJsReady, createOnlineHostRoom, joinOnlineRoomAsClient })', sandbox);
  game.window = window;
  game.document = document;
  return game;
}

test('unowned cards cannot be played or added to the discard pile', () => {
  const x = gameHarness(), s = x.createInitialGameState(2, 'STRICT_EITHER', true);
  const uid = s.actionDeck[0], count = s.discardPile.length;
  assert.equal(x.evaluateCardPlayability(s, s.players[0], uid).playable, false);
  assert.equal(x.consumeHandCard(s, s.players[0], uid), false);
  assert.equal(s.discardPile.length, count);
});

test('fog of war hides opponents hand and private draw animation data', () => {
  const x = gameHarness(), s = x.createInitialGameState(2, 'STRICT_EITHER', true);
  s.config.fogOfWar = true;
  s.lastVfxEvent = { actorId: 'p1', vfxType: 'SETTLE_BURN', drawnUids: ['act_007'] };
  const opponent = x.sanitizeStateForSeat(s, 'p2');
  assert.ok(opponent.players[0].hand.every(uid => uid === 'HIDDEN_ACT'));
  assert.equal(Object.hasOwn(opponent.lastVfxEvent, 'drawnUids'), false);
  assert.deepEqual(Array.from(x.sanitizeStateForSeat(s, 'p1').lastVfxEvent.drawnUids), ['act_007']);
});

test('royal attacks validate exact ownership; mass layoffs preserve two royal employees', () => {
  const x = gameHarness(), s = x.createInitialGameState(2, 'STRICT_EITHER', true);
  const cards = Object.values(x.CARDS_BY_ID), vp = d => cards.find(c => c.isVP && c.dept === d).uid;
  const a = s.players[0], b = s.players[1];
  a.departments = { RED: [vp('RED')], YELLOW: [vp('YELLOW')], BLUE: [], GREEN: [] };
  b.departments = { RED: [], YELLOW: [], BLUE: [vp('BLUE')], GREEN: [] };
  const kick = cards.find(c => c.effect === 'VP_KICK_ENEMY' && c.reqVPs === 2);
  a.hand = [kick.uid];
  const status = x.evaluateCardPlayability(s, a, kick.uid);
  assert.equal(status.playable, true);
  assert.equal(x.validatePlayActionTargets(s, a, kick, {targetPlayerId: 'p2', targetEmpUid: b.departments.BLUE[0]}, status), true);
  assert.equal(x.validatePlayActionTargets(s, a, kick, {targetPlayerId: 'p1', targetEmpUid: b.departments.BLUE[0]}, status), false);
  const mass = cards.find(c => c.effect === 'VP_MASS_LAYOFF');
  assert.equal(x.validatePlayActionTargets(s, a, mass, {layoffUids: [a.departments.RED[0]]}, {}), false);
});

test('duplicate discard IDs do not affect the game', () => {
  const x = gameHarness(), s = x.createInitialGameState(2, 'STRICT_EITHER', true), uid = s.players[0].hand[0];
  x.authoritativeDiscardCards(s, [uid, uid]);
  assert.equal(s.turn.actionsUsed, 0);
  assert.equal(s.discardPile.includes(uid), false);
});

test('network actions require seat token and bound peer connection', () => {
  const x = gameHarness(), s = x.createInitialGameState(2, 'STRICT_EITHER', false);
  const token = 'tk_aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', conn = {open: true, send() {}};
  x.gameSession.mode = 'HOST'; x.gameSession.roomCode = 'AB88QX27';
  x.gameSession.lobbyState.matchStarted = true; x.gameSession.lobbyState.fogOfWar = true;
  x.gameSession.lobbyState.seats[1] = {id:'p2', role:'HUMAN', isAI:false, connected:true, clientToken:token, name:'Guest'};
  x.gameSession.peerConns.p2 = conn; x.gameSession.hostMasterState = s; s.draft.pickerIndex = 1;
  function send(seatId, clientToken, peerConn, extra = {}) {
    x.handleIncomingNetworkPacket({msgType:'CLIENT_ACTION', roomCode:'AB88QX27', seatId, clientToken,
      action: {type:'DRAFT_PICK', dept:'RED', ...extra}}, 'PEER', peerConn);
  }
  send('p2','wrong',conn);
  send('p2',token,{open:true,send(){}});
  send('p2',token,conn,{fromAI:true});
  send('p1',token,conn);
  assert.equal(s.draft.totalPicked, 0);
  send('p2',token,conn);
  assert.equal(s.draft.totalPicked, 1);
  assert.equal(JSON.stringify(x.publicLobbyState()).includes(token), false);
});

test('settlement is applied only once before the next turn', () => {
  const x = gameHarness(), s = x.createInitialGameState(2, 'STRICT_EITHER', true);
  x.gameSession.mode = 'SOLO';
  const before = s.players[0].crystals;
  x.authoritativeSettleAndAdvanceTurn(s);
  const after = s.players[0].crystals;
  x.authoritativeSettleAndAdvanceTurn(s);
  assert.equal(s.players[0].crystals, after);
  assert.ok(after < before);
});

test('HTML encoding and stronger room-code format', () => {
  const x = gameHarness();
  assert.match(x.escapeHtml('<img onerror="bad">'), /^&lt;img /);
  assert.match(x.generateRandomCode(8), /^[A-HJ-NP-Z2-9]{8}$/);
});

test('PeerJS loader retries another CDN before reporting failure', async () => {
  const x = gameHarness();
  const scripts = [];
  class FakePeer {}
  x.document.createElement = () => ({ remove() {}, style: {} });
  x.document.head = {
    appendChild(script) {
      scripts.push(script.src);
      if (scripts.length === 1) script.onerror();
      else { x.window.Peer = FakePeer; script.onload(); }
    },
  };
  const loaded = await x.ensurePeerJsReady();
  assert.equal(loaded, FakePeer);
  assert.equal(scripts.length, 2);
  assert.match(scripts[0], /cdn\\.jsdelivr\\.net/);
  assert.match(scripts[1], /unpkg\\.com/);
});

test('a simulated encrypted PeerJS transport can admit a fog-protected guest', async () => {
  const nodes = new Map();
  let guestSequence = 0;
  class Connection {
    constructor() { this.listeners = {}; this.open = false; }
    on(type, handler) { this.listeners[type] = handler; }
    send(packet) {
      if (this.remote.listeners.data) this.remote.listeners.data(packet);
    }
    close() { this.open = false; if (this.listeners.close) this.listeners.close(); }
  }
  class FakePeer {
    constructor(id) {
      this.id = id || 'guest-' + ++guestSequence;
      this.listeners = {};
      nodes.set(this.id, this);
    }
    on(type, handler) { this.listeners[type] = handler; }
    emit(type, ...args) { if (this.listeners[type]) this.listeners[type](...args); }
    connect(id) {
      const host = nodes.get(id);
      if (!host) throw new Error('host not registered');
      const mine = new Connection(), theirs = new Connection();
      mine.remote = theirs;
      theirs.remote = mine;
      host.emit('connection', theirs);
      Promise.resolve().then(() => {
        mine.open = theirs.open = true;
        if (mine.listeners.open) mine.listeners.open();
      });
      return mine;
    }
    destroy() { nodes.delete(this.id); }
  }
  function prepare(x) {
    x.window.Peer = FakePeer;
    x.document.createElement = () => ({ style: {}, remove() {}, className: '', textContent: '' });
    x.document.body = { appendChild() {} };
  }
  const host = gameHarness(), guest = gameHarness();
  prepare(host); prepare(guest);
  host.createOnlineHostRoom('AB88QX27');
  await Promise.resolve();
  const room = nodes.get('dbr-v13-room-AB88QX27');
  assert.ok(room);
  room.emit('open');
  assert.equal(host.gameSession.peerStatus, 'ONLINE');
  assert.equal(host.gameSession.lobbyState.fogOfWar, true);
  guest.joinOnlineRoomAsClient('AB88QX27', 'Guest Player');
  await Promise.resolve();
  const guestPeer = nodes.get('guest-1');
  assert.ok(guestPeer);
  guestPeer.emit('open');
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(guest.gameSession.peerStatus, 'ONLINE');
  assert.equal(guest.gameSession.localSeatId, 'p2');
  assert.equal(host.gameSession.lobbyState.seats[1].role, 'HUMAN');
  assert.equal(guest.gameSession.lobbyState.fogOfWar, true);
  assert.equal(JSON.stringify(guest.gameSession.lobbyState).includes(host.gameSession.clientToken), false);
});
