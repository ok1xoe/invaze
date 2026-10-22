const H = require('/Users/hyman/EngetoAcademy/TizenOS/_kit/headless.js');
const path = require('path'), root = path.join(__dirname, '..');
const out = process.argv[2] || '/tmp';
const g = H.load([root + '/js/speccy.js', root + '/js/game.js']);
const G = g.sandbox.GAME, assert = require('assert');
const check = () => assert(!g.hasNaN(G), 'NaN ve stavu');
// sprity: shodné rozměry
g.step(30); assert.equal(G.state, 'title'); g.png(out + '/title.png', 3);
g.key(32, true); g.step(2); g.key(32, false); assert.equal(G.state, 'wave');
g.step(85); assert.equal(G.state, 'play');
g.step(120); g.png(out + '/play.png', 3);

// bot: sleduje nejnižšího vetřelce, uhýbá nepřítelovým střelám (zjednodušeně)
function bot() {
    let tx = null, best = -1;
    for (let r = 0; r < 5; r++) for (let c = 0; c < 11; c++) if (G.alive[r][c] && r > best) { best = r; }
    // cíl: nejbližší živý sloupec k hráči v nejnižší řadě
    let bd = 1e9;
    for (let c = 0; c < 11; c++) for (let r = 4; r >= 0; r--) if (G.alive[r][c]) {
        const x = G.ox + c * 16 + 5; if (Math.abs(x - G.px - 6) < bd) { bd = Math.abs(x - G.px - 6); tx = x; } break;
    }
    // únik
    for (const b of G.bullets) if (b.y > 120 && Math.abs(b.x - (G.px + 6)) < 9) { tx = b.x < G.px + 6 ? G.px + 6 + 20 : G.px + 6 - 20; }
    g.release('left'); g.release('right');
    if (tx !== null) { if (tx < G.px + 6 - 1) g.press('left'); else if (tx > G.px + 6 + 1) g.press('right'); }
    let aligned = false;
    for (let c = 0; c < 11; c++) for (let r = 4; r >= 0; r--) if (G.alive[r][c]) { if (Math.abs(G.ox + c * 16 + 5 - (G.px + 6)) <= 3) aligned = true; break; }
    if (aligned || G.saucer) g.press('fire'); else g.release('fire');
}
let waveMax = 1, lostLife = 0, ticks = 0, lastLives = G.lives, sawDying = false, sawSaucer = false;
while (ticks < 60000 && G.wave < 3) {
    bot(); g.step(1); ticks++;
    if (ticks % 50 === 0) check();
    if (G.state === 'dying') sawDying = true;
    if (G.saucer) sawSaucer = true;
    if (G.wave === 1 && ticks === 2500) g.png(out + '/mid1.png', 3);
    if (G.state === 'over') { g.release('fire'); break; }
}
check();
console.log('ticks', ticks, 'wave', G.wave, 'score', G.score, 'lives', G.lives, 'state', G.state, 'dying', sawDying, 'saucer', sawSaucer);
assert(G.wave >= 2, 'bot nedokončil první vlnu');
g.png(out + '/wave2.png', 3);

// konec hry: nech hráče ztratit všechny životy
g.release('fire'); g.release('left'); g.release('right');
let n = 0; while (G.state !== 'over' && n < 40000) { g.step(1); n++; }
assert.equal(G.state, 'over', 'hra nekončí'); g.png(out + '/over.png', 3);
const hi = g.Z.hi.get('invaze'); assert(hi > 0, 'rekord se neuložil');
g.step(130); g.key(32, true); g.step(2); g.key(32, false);
assert.equal(G.state, 'title');
console.log('OK, rekord', hi);
