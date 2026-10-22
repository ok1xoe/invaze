// Invaze z vesmíru – hra ve stylu Space Invaders (vlastní grafika, ZX Spectrum paleta)
(function () {
    'use strict';
    var ROWS = 5, COLS = 11, CELLW = 16, CELLH = 10, AW = 11, AH = 8;
    var CANNON_Y = 174, SHIELD_Y = 148, SW = 22, SH = 16;

    var A = [
        [[
            '...XXXXX...', '..XXXXXXX..', '.XXX.X.XXX.', '.XXXXXXXXX.',
            '...XX.XX...', '..XX.X.XX..', '.XX.....XX.', 'X.........X'
        ], [
            '...XXXXX...', '..XXXXXXX..', '.XXX.X.XXX.', '.XXXXXXXXX.',
            '...XX.XX...', '..X.XXX.X..', '.X.X...X.X.', '..X.....X..'
        ]],
        [[
            '..X.....X..', '...X...X...', '..XXXXXXX..', '.XX.XXX.XX.',
            'XXXXXXXXXXX', 'X.XXXXXXX.X', 'X.X.....X.X', '...XX.XX...'
        ], [
            '..X.....X..', 'X..X...X..X', 'X.XXXXXXX.X', 'XXX.XXX.XXX',
            'XXXXXXXXXXX', '.XXXXXXXXX.', '..X.....X..', '.X.......X.'
        ]],
        [[
            '...XXXXX...', '.XXXXXXXXX.', 'XXXXXXXXXXX', 'XXX..X..XXX',
            'XXXXXXXXXXX', '..XX...XX..', '.XX.XXX.XX.', 'XX.......XX'
        ], [
            '...XXXXX...', '.XXXXXXXXX.', 'XXXXXXXXXXX', 'XXX..X..XXX',
            'XXXXXXXXXXX', '...XX.XX...', '..XX...XX..', '...XX.XX...'
        ]]
    ];
    var TYPE_OF_ROW = [0, 1, 1, 2, 2];
    var TYPE_COL = [13, 11, 14];
    var TYPE_PTS = [30, 20, 10];
    var CANNON = [
        '......X......', '.....XXX.....', '.....XXX.....', '.XXXXXXXXXXX.',
        'XXXXXXXXXXXXX', 'XXXXXXXXXXXXX', 'XXXXXXXXXXXXX', 'XXXXXXXXXXXXX'
    ];
    var SAUCER = [
        '.....XXXXXX.....', '...XXXXXXXXXX...', '..XXXXXXXXXXXX..', '.XX.XX.XX.XX.XX.',
        'XXXXXXXXXXXXXXXX', '..XXX..XX..XXX..', '...X........X...'
    ];
    var BOOM = [
        '.X...X...X.', '..X..X..X..', '...X...X...', 'XX..XXX..XX',
        '...X...X...', '..X..X..X..', '.X...X...X.', '...........'
    ];

    var G = window.GAME = {
        state: 'title', t: 0, score: 0, lives: 3, wave: 1, hi: 0, nextLife: 1500
    };
    var rnd = Math.random;

    function resetFormation() {
        var w = G.wave;
        G.alive = [];
        for (var r = 0; r < ROWS; r++) { G.alive.push([]); for (var c = 0; c < COLS; c++) { G.alive[r].push(true); } }
        G.count = ROWS * COLS;
        G.ox = 8; G.oy = 26 + Math.min(w - 1, 5) * 8;
        G.dir = 1; G.frame = 0; G.moveT = 0; G.sndI = 0;
        G.booms = [];
        G.bullets = []; G.pb = null; G.saucer = null; G.saucerMsg = null;
        G.saucerT = 600 + (rnd() * 600 | 0);
        G.shots = 0;
    }

    function buildShields() {
        G.shields = [];
        for (var i = 0; i < 4; i++) {
            var g = [];
            for (var y = 0; y < SH; y++) {
                var row = [];
                for (var x = 0; x < SW; x++) {
                    var on = true;
                    var cut = y < 4 ? 4 - y : 0;                      // seříznuté horní rohy
                    if (x < cut || x >= SW - cut) { on = false; }
                    if (y >= 11 && x >= 7 && x < SW - 7) { on = false; }  // výřez dole
                    row.push(on ? 1 : 0);
                }
                g.push(row);
            }
            G.shields.push({ x: 24 + i * 56, y: SHIELD_Y, g: g });
        }
    }

    function newGame() {
        G.score = 0; G.lives = 3; G.wave = 1; G.nextLife = 1500;
        G.px = 121; G.cool = 0;
        resetFormation(); buildShields();
        G.state = 'wave'; G.t = 0;
    }

    function nextWave() {
        G.wave++;
        resetFormation(); buildShields();
        G.state = 'wave'; G.t = 0;
    }

    function addScore(n) {
        G.score += n;
        if (G.score >= G.nextLife) { G.nextLife += 1500; G.lives++; Z.snd.win(); }
    }

    function erode(sh, cx, cy, r) {
        for (var y = cy - r; y <= cy + r; y++) {
            for (var x = cx - r; x <= cx + r; x++) {
                if (y < 0 || x < 0 || y >= SH || x >= SW) { continue; }
                var d = (x - cx) * (x - cx) + (y - cy) * (y - cy);
                if (d <= r * r + (rnd() < 0.5 ? 1 : -1)) { sh.g[y][x] = 0; }
            }
        }
    }
    // zásah pixelu štítu; vrací true a poškodí
    function shieldHit(px, py, r) {
        for (var i = 0; i < G.shields.length; i++) {
            var s = G.shields[i], lx = px - s.x, ly = py - s.y;
            if (lx >= 0 && ly >= 0 && lx < SW && ly < SH && s.g[ly][lx]) { erode(s, lx, ly, r); return true; }
        }
        return false;
    }

    function interval() {
        var v = Math.round(1 + G.count * 0.24) - (G.wave - 1);
        return Math.max(1, v);
    }

    function bounds() {
        var minC = COLS, maxC = -1, maxR = -1;
        for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
            if (G.alive[r][c]) { if (c < minC) { minC = c; } if (c > maxC) { maxC = c; } if (r > maxR) { maxR = r; } }
        }
        return { minC: minC, maxC: maxC, maxR: maxR };
    }

    function moveFormation() {
        var b = bounds(), step = 3;
        var left = G.ox + b.minC * CELLW, right = G.ox + b.maxC * CELLW + AW;
        if ((G.dir > 0 && right + step > 253) || (G.dir < 0 && left - step < 3)) {
            G.dir = -G.dir; G.oy += 6;
        } else {
            G.ox += G.dir * step;
        }
        G.frame ^= 1;
        Z.snd.beep([130, 116, 103, 97][G.sndI++ & 3], 0.06, 0, 0.05);
        // vetřelci ničí štíty
        var bt = bounds(), bottom = G.oy + bt.maxR * CELLH + AH;
        if (bottom >= SHIELD_Y) {
            for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
                if (!G.alive[r][c]) { continue; }
                var ax = G.ox + c * CELLW, ay = G.oy + r * CELLH;
                for (var i = 0; i < G.shields.length; i++) {
                    var s = G.shields[i];
                    if (!Z.hit(ax, ay, AW, AH, s.x, s.y, SW, SH)) { continue; }
                    for (var y = 0; y < SH; y++) for (var x = 0; x < SW; x++) {
                        if (s.g[y][x] && Z.hit(ax, ay, AW, AH, s.x + x, s.y + y, 1, 1)) { s.g[y][x] = 0; }
                    }
                }
            }
        }
        if (bottom >= CANNON_Y - 2) { G.lives = 1; killPlayer(); }
    }

    function killPlayer() {
        G.state = 'dying'; G.t = 0; G.pb = null;
        Z.snd.die();
        Z.pauseOk = false;
    }

    function alienFire() {
        var maxB = Math.min(1 + G.wave, 4);
        if (G.bullets.length >= maxB) { return; }
        if (rnd() > 0.018 + 0.003 * G.wave) { return; }
        // sloupec: občas ten nad hráčem
        var c;
        if (rnd() < 0.35) { c = Z.clamp(Math.floor((G.px + 6 - G.ox) / CELLW), 0, COLS - 1); } else { c = rnd() * COLS | 0; }
        for (var k = 0; k < COLS; k++) {
            var cc = (c + k) % COLS;
            for (var r = ROWS - 1; r >= 0; r--) {
                if (G.alive[r][cc]) {
                    G.bullets.push({ x: G.ox + cc * CELLW + 5, y: G.oy + r * CELLH + AH, a: 0 });
                    return;
                }
            }
        }
    }

    function killAlien(r, c) {
        G.alive[r][c] = false; G.count--;
        addScore(TYPE_PTS[TYPE_OF_ROW[r]]);
        G.booms.push({ x: G.ox + c * CELLW, y: G.oy + r * CELLH, t: 10 });
        Z.snd.boom();
    }

    function playerBullet() {
        var b = G.pb;
        for (var s = 0; s < 4 && b; s++) {
            b.y -= 1;
            if (b.y < 11) { G.pb = null; return; }
            // štít
            if (shieldHit(b.x, b.y, 2)) { G.pb = null; return; }
            // vetřelec
            var c = Math.floor((b.x - G.ox) / CELLW), r = Math.floor((b.y - G.oy) / CELLH);
            if (c >= 0 && c < COLS && r >= 0 && r < ROWS && G.alive[r][c]) {
                var lx = b.x - (G.ox + c * CELLW), ly = b.y - (G.oy + r * CELLH);
                if (lx < AW && ly < AH) { killAlien(r, c); G.pb = null; return; }
            }
            // talíř
            var u = G.saucer;
            if (u && Z.hit(b.x, b.y, 1, 2, u.x, 10, 16, 7)) {
                var pts = [50, 100, 150, 300][rnd() * 4 | 0];
                addScore(pts);
                G.saucerMsg = { x: u.x, t: 50, pts: pts };
                G.booms.push({ x: u.x + 2, y: 10, t: 12 });
                G.saucer = null; G.pb = null; Z.snd.win(); return;
            }
        }
    }

    function tickPlay() {
        // pohyb děla
        if (Z.input.down('left')) { G.px -= 2; }
        if (Z.input.down('right')) { G.px += 2; }
        G.px = Z.clamp(G.px, 4, 239);
        if (G.cool > 0) { G.cool--; }
        if (Z.input.down('fire') && !G.pb && G.cool <= 0) {
            G.pb = { x: G.px + 6, y: CANNON_Y - 2 }; G.cool = 8; G.shots++;
            Z.snd.shoot();
        }
        if (G.pb) { playerBullet(); }

        // formace
        if (++G.moveT >= interval()) { G.moveT = 0; moveFormation(); if (G.state !== 'play') { return; } }
        alienFire();

        // střely vetřelců
        for (var i = G.bullets.length - 1; i >= 0; i--) {
            var b = G.bullets[i], dead = false;
            for (var s = 0; s < 2 && !dead; s++) {
                b.y += 1;
                if (b.y >= 186) { dead = true; break; }
                if (shieldHit(b.x, b.y + 4, 2)) { dead = true; break; }
                if (G.pb && Z.hit(b.x - 1, b.y, 3, 5, G.pb.x, G.pb.y, 1, 3)) { dead = true; G.pb = null; break; }
                if (Z.hit(b.x, b.y, 1, 5, G.px + 1, CANNON_Y, 11, 8)) {
                    G.bullets.splice(i, 1); G.lives--; killPlayer(); return;
                }
            }
            b.a++;
            if (dead) { G.bullets.splice(i, 1); }
        }

        // talíř
        if (G.saucer) {
            var u = G.saucer; u.x += u.d * 1;
            if (G.tt % 8 === 0) { Z.snd.beep(u.hi ? 880 : 700, 0.05, 0, 0.03); u.hi = !u.hi; }
            if (u.x < -18 || u.x > 258) { G.saucer = null; }
        } else if (--G.saucerT <= 0 && G.count > 8) {
            var d = rnd() < 0.5 ? 1 : -1;
            G.saucer = { x: d > 0 ? -16 : 256, d: d, hi: false };
            G.saucerT = 900 + (rnd() * 900 | 0);
        }
        if (G.saucerMsg && --G.saucerMsg.t <= 0) { G.saucerMsg = null; }
        for (var k = G.booms.length - 1; k >= 0; k--) { if (--G.booms[k].t <= 0) { G.booms.splice(k, 1); } }

        if (G.count === 0 && G.state === 'play') {
            G.state = 'clear'; G.t = 0; Z.snd.win();
        }
    }

    function tick() {
        G.tt = (G.tt || 0) + 1;
        G.t++;
        if (G.state === 'title') {
            Z.pauseOk = false;
            if (Z.input.hit('fire')) { newGame(); Z.snd.win(); }
        } else if (G.state === 'wave') {
            Z.pauseOk = true;
            if (G.t > 80) { G.state = 'play'; G.t = 0; }
        } else if (G.state === 'play') {
            Z.pauseOk = true;
            tickPlay();
        } else if (G.state === 'clear') {
            Z.pauseOk = true;
            for (var k = G.booms.length - 1; k >= 0; k--) { if (--G.booms[k].t <= 0) { G.booms.splice(k, 1); } }
            if (G.t > 70) { nextWave(); }
        } else if (G.state === 'dying') {
            if (G.t > 90) {
                if (G.lives > 0) {
                    G.bullets = []; G.px = 121; G.state = 'play'; G.t = 0; G.pb = null;
                } else {
                    G.hi = Z.hi.submit('invaze', G.score);
                    G.newHi = G.score >= G.hi && G.score > 0;
                    G.state = 'over'; G.t = 0; Z.snd.over();
                }
            }
        } else if (G.state === 'over') {
            if (G.t > 120 && (Z.input.hit('fire') || G.t > 600)) { G.state = 'title'; G.t = 0; }
        }
    }

    // ---------- kreslení
    function pal(c) { return { 'X': c }; }
    var PALS = TYPE_COL.map(pal);

    function drawHud() {
        Z.text(4, 1, 'SKÓRE ' + Z.pad(G.score, 5), 15);
        Z.text(128, 1, 'REKORD ' + Z.pad(Math.max(G.hi, G.score), 5), 14, { align: 'center' });
        Z.text(252, 1, 'VLNA ' + G.wave, 11, { align: 'right' });
        Z.rect(0, 184, 256, 1, 4);
        for (var i = 0; i < Math.max(0, G.lives - (G.state === 'dying' ? 0 : 1)) && i < 8; i++) {
            Z.spriteC(22 + i * 15, 186, CANNON.slice(0, 6), pal(12));
        }
        Z.text(4, 185, String(G.lives), 15);
    }

    function drawWorld() {
        var r, c, i;
        for (r = 0; r < ROWS; r++) for (c = 0; c < COLS; c++) {
            if (G.alive[r][c]) {
                var t = TYPE_OF_ROW[r];
                Z.spriteC(G.ox + c * CELLW, G.oy + r * CELLH, A[t][G.frame], PALS[t]);
            }
        }
        for (i = 0; i < G.booms.length; i++) { Z.spriteC(G.booms[i].x, G.booms[i].y, BOOM, pal(G.booms[i].t % 2 ? 15 : 14)); }
        for (i = 0; i < G.shields.length; i++) {
            var s = G.shields[i];
            for (var y = 0; y < SH; y++) for (var x = 0; x < SW; x++) { if (s.g[y][x]) { Z.pix(s.x + x, s.y + y, y < 3 ? 12 : 4); } }
        }
        if (G.saucer) { Z.spriteC(G.saucer.x, 10, SAUCER, { 'X': 10 }); }
        if (G.saucerMsg) { Z.text(Z.clamp(G.saucerMsg.x + 8, 16, 240), 10, String(G.saucerMsg.pts), 15, { align: 'center' }); }
        if (G.pb) { Z.rect(G.pb.x, G.pb.y, 1, 3, 15); }
        for (i = 0; i < G.bullets.length; i++) {
            var b = G.bullets[i], o = (b.a >> 2) & 1;
            Z.rect(b.x + o, b.y, 1, 2, 10); Z.rect(b.x + 1 - o, b.y + 2, 1, 2, 10); Z.rect(b.x + o, b.y + 4, 1, 1, 10);
        }
        if (G.state === 'dying') {
            if (G.t < 80 && ((G.t >> 3) & 1) === 0) {
                for (var yy = 0; yy < 8; yy++) for (var xx = 0; xx < 13; xx++) {
                    if (CANNON[yy].charAt(xx) === 'X' && rnd() < 0.6) { Z.pix(G.px + xx, CANNON_Y + yy, rnd() < 0.5 ? 12 : 14); }
                }
            } else if (G.t < 80) {
                for (var q = 0; q < 14; q++) { Z.pix(G.px + (rnd() * 13 | 0), CANNON_Y + (rnd() * 8 | 0), 12); }
            }
        } else {
            Z.spriteC(G.px, CANNON_Y, CANNON, pal(12));
        }
    }

    function drawTitle() {
        Z.cls(0, 7);
        Z.text(128, 10, 'INVAZE', 10, { scale: 3, align: 'center' });
        Z.text(128, 36, 'Z VESMÍRU', 14, { scale: 2, align: 'center' });
        var f = (G.tt >> 5) & 1;
        Z.spriteC(70, 60, A[0][f], PALS[0]); Z.text(90, 61, '= 30 BODŮ', 15);
        Z.spriteC(70, 74, A[1][f], PALS[1]); Z.text(90, 75, '= 20 BODŮ', 15);
        Z.spriteC(70, 88, A[2][f], PALS[2]); Z.text(90, 89, '= 10 BODŮ', 15);
        Z.spriteC(68, 102, SAUCER, { 'X': 10 }); Z.text(90, 103, '= ZÁHADA', 15);
        Z.text(128, 122, 'SESTŘEL VŠECHNY VETŘELCE,', 7, { align: 'center' });
        Z.text(128, 132, 'KRYJ SE ZA ŠTÍTY. NEPUSŤ JE DOLŮ!', 7, { align: 'center' });
        Z.text(128, 146, 'ŠIPKY / A D = POHYB, MEZERNÍK = OHEŇ', 11, { align: 'center' });
        Z.text(128, 156, 'P = PAUZA   M = ZVUK', 11, { align: 'center' });
        Z.text(128, 168, 'REKORD ' + Z.pad(G.hi, 5), 14, { align: 'center' });
        if ((G.tt >> 4) & 1) { Z.text(128, 180, 'STISKNI MEZERNÍK', 15, { align: 'center' }); }
    }

    function draw() {
        if (G.state === 'title') { G.hi = Z.hi.get('invaze'); drawTitle(); return; }
        Z.cls(0, 7);
        drawHud();
        drawWorld();
        if (G.state === 'wave') {
            Z.rect(64, 96, 128, 22, 0); Z.frame(64, 96, 128, 22, 14);
            Z.text(128, 100, 'VLNA ' + G.wave, 14, { align: 'center', scale: 2 });
        } else if (G.state === 'over') {
            Z.rect(48, 80, 160, 44, 0); Z.frame(48, 80, 160, 44, 2);
            Z.text(128, 86, 'KONEC HRY', 10, { align: 'center', scale: 2 });
            Z.text(128, 104, 'SKÓRE ' + Z.pad(G.score, 5), 15, { align: 'center' });
            Z.text(128, 114, G.newHi ? 'NOVÝ REKORD!' : 'REKORD ' + Z.pad(G.hi, 5), 14, { align: 'center' });
        }
    }

    Z.init({
        title: 'Invaze z vesmíru',
        touch: [{ act: 'left', label: '◀' }, { act: 'fire', label: 'OHEŇ', cls: 'big' }, { act: 'right', label: '▶' }]
    });
    G.hi = Z.hi.get('invaze');
    G.tt = 0; G.px = 121; G.cool = 0;
    resetFormation(); buildShields();
    Z.border = 0;
    Z.run({ tick: tick, draw: draw });
})();
