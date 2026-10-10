/* ============================================================
   OSNote tanıtım sitesi · defterdeki kedi
   ------------------------------------------------------------
   Hızlı Notlar sahnesinin çizimi: patisini kaldırmış bir kedi,
   yanında maviyle "OSNote", altı sarı fosforlu; en son pembeyle
   kulak, yanak, pati yastıkları, kalp, "pati onaylı!" ve pati izi
   damgası. Elle çizilmiş gibi olsun
   diye (Semih: "biraz daha insan çizmiş gibi"):
   - kafa tek kusursuz çizgi değil, üç darbe; birleşme yerlerinde
     küçük taşma ya da boşluk; kulaklar, gözler, bıyıklar asimetrik;
   - her çizgide yavaş bir sapma (titreme yok: tablette kalem çizgisi
     pürüzsüzdür, insan izi biçimde kalır), uçlarda biraz taşma ya da
     eksik kalma, bazen kalkarken küçük bir kıvrım;
   - dolu yerler (pati yastıkları, damga) kalemle karalanmış:
     önce kenar, sonra içi zikzakla; bütün çizim hafif eğik.
   Yollar mutlak SVG komutları (M, L, C, Q, Z); burada noktalara
   çevrilir. Kalınlık tek (uygulamanın kaleminde basınç yok).
   Çizimin kutusu 640 × 380 birim; sahne ekrana göre büyütür.
   ============================================================ */
(function () {
  'use strict';
  var OSN = window.OSN || (window.OSN = {});

  function rastgele(tohum) {
    var s = (tohum * 9301 + 49297) % 233280 || 1;
    return function () { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  }
  function ornekle(d, adim) {
    var t = d.match(/[MLCQZ]|-?\d*\.?\d+(?:e-?\d+)?/gi), i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0, out = [], cur = null;
    function n() { return parseFloat(t[i++]); }
    function bez(p) {
      var L = 0;
      for (var k = 2; k < p.length; k += 2) L += Math.hypot(p[k] - p[k - 2], p[k + 1] - p[k - 1]);
      var m = Math.max(2, Math.ceil(L / adim));
      for (var j = 1; j <= m; j++) {
        var u = j / m, q;
        if (p.length === 8) {
          var a = (1 - u) * (1 - u) * (1 - u), b = 3 * u * (1 - u) * (1 - u), c = 3 * u * u * (1 - u), e = u * u * u;
          q = [a * p[0] + b * p[2] + c * p[4] + e * p[6], a * p[1] + b * p[3] + c * p[5] + e * p[7]];
        } else if (p.length === 6) {
          var a2 = (1 - u) * (1 - u), b2 = 2 * u * (1 - u), c2 = u * u;
          q = [a2 * p[0] + b2 * p[2] + c2 * p[4], a2 * p[1] + b2 * p[3] + c2 * p[5]];
        } else q = [p[0] + (p[2] - p[0]) * u, p[1] + (p[3] - p[1]) * u];
        cur.push(q[0], q[1]);
      }
    }
    while (i < t.length) {
      if (/[MLCQZ]/i.test(t[i])) cmd = t[i++].toUpperCase();
      if (cmd === 'M') { x = n(); y = n(); sx = x; sy = y; cur = [x, y]; out.push(cur); cmd = 'L'; }
      else if (cmd === 'L') { var x1 = n(), y1 = n(); bez([x, y, x1, y1]); x = x1; y = y1; }
      else if (cmd === 'C') { var a1 = n(), b1 = n(), a3 = n(), b3 = n(), x3 = n(), y3 = n(); bez([x, y, a1, b1, a3, b3, x3, y3]); x = x3; y = y3; }
      else if (cmd === 'Q') { var q1 = n(), r1 = n(), x4 = n(), y4 = n(); bez([x, y, q1, r1, x4, y4]); x = x4; y = y4; }
      else if (cmd === 'Z') { bez([x, y, sx, sy]); x = sx; y = sy; }
    }
    return out;
  }

  /* ---------------------------------------------------------- el
     Bir çizgiyi elle çizilmiş gibi yapar: yola dik yavaş sapma (uzun dalga; istenirse kısa dalgalı titreme);
     baştan ve sondan biraz taşma ya da eksik kalma; istenirse sonunda kalkarken küçük bir kıvrım. */
  function el(p, tohum, ayar) {
    ayar = ayar || {};
    var r = rastgele(tohum), n = p.length / 2;
    if (n < 2) return p.slice();
    var A = ayar.sapma == null ? 1.4 : ayar.sapma, T = ayar.titreme || 0;
    var f1 = 1 / (80 + r() * 60), f2 = 1 / (28 + r() * 12), f3 = 1 / (5 + r() * 2), a1 = r() * 6.3, a2 = r() * 6.3, a3 = r() * 6.3;
    var o = [], s = 0;
    for (var i = 0; i < n; i++) {
      var i0 = Math.max(0, i - 1), i1 = Math.min(n - 1, i + 1);
      var tx = p[i1 * 2] - p[i0 * 2], ty = p[i1 * 2 + 1] - p[i0 * 2 + 1], tl = Math.hypot(tx, ty) || 1;
      if (i) s += Math.hypot(p[i * 2] - p[i * 2 - 2], p[i * 2 + 1] - p[i * 2 - 1]);
      // uçlarda sapma azalır: kalem başladığı ve bittiği yere bağlı
      var u = Math.min(1, s / 14, 1);
      var d = A * u * (0.85 * Math.sin(s * f1 * 6.283 + a1) + 0.15 * Math.sin(s * f2 * 6.283 + a2)) + T * Math.sin(s * f3 * 6.283 + a3);
      o.push(p[i * 2] - ty / tl * d, p[i * 2 + 1] + tx / tl * d);
    }
    // uçlar: biraz taşar ya da eksik kalır
    var bas = ayar.bas == null ? (r() - 0.35) * 3.2 : ayar.bas, son = ayar.son == null ? (r() - 0.3) * 4 : ayar.son;
    o = uzat(o, bas, true);
    o = uzat(o, son, false);
    // kalkarken küçük kıvrım
    if (ayar.kivrim) {
      var m = o.length, ex = o[m - 2], ey = o[m - 1], dx = ex - o[m - 6], dy = ey - o[m - 5], dl = Math.hypot(dx, dy) || 1;
      dx /= dl; dy /= dl;
      var yon = ayar.kivrim > 0 ? 1 : -1, L = Math.abs(ayar.kivrim);
      for (var k = 1; k <= 4; k++) {
        var a = yon * 0.32 * k, c = Math.cos(a), si = Math.sin(a);
        ex += (dx * c - dy * si) * L / 4; ey += (dx * si + dy * c) * L / 4;
        o.push(ex, ey);
      }
    }
    return o;
  }
  // yolu baştan (bas) ya da sondan d birim uzatır (eksi: kısaltır)
  function uzat(p, d, bas) {
    var n = p.length / 2;
    if (n < 3 || Math.abs(d) < 0.05) return p;
    if (d > 0) {
      var i = bas ? 0 : n - 1, j = bas ? Math.min(2, n - 1) : Math.max(0, n - 3);
      var x = p[i * 2], y = p[i * 2 + 1], dx = x - p[j * 2], dy = y - p[j * 2 + 1], l = Math.hypot(dx, dy) || 1;
      var q = [x + dx / l * d, y + dy / l * d];
      return bas ? q.concat(p) : p.concat(q);
    }
    // kısalt: uzunluk boyunca -d kadarını at
    var kalan = -d, o = p.slice();
    while (kalan > 0 && o.length > 6) {
      var a = bas ? 0 : o.length - 2, b = bas ? 2 : o.length - 4, seg = Math.hypot(o[a] - o[b], o[a + 1] - o[b + 1]);
      if (seg <= kalan) { kalan -= seg; if (bas) o.splice(0, 2); else o.splice(o.length - 2, 2); }
      else {
        var t = kalan / seg, nx = o[a] + (o[b] - o[a]) * t, ny = o[a + 1] + (o[b + 1] - o[a + 1]) * t;
        o[a] = nx; o[a + 1] = ny; kalan = 0;
      }
    }
    return o;
  }

  /* ---------------------------------------------------------- karalama dolgu
     Kapalı bir şeklin içi zikzakla: verilen açıda tarama çizgileri, uç uca bağlı (kalem kalkmaz). Uçlar kenara tam
     değmez ya da biraz taşar; aralık kalemin kalınlığından biraz az (boşluk kalmasın). */
  function zikzak(p, aralik, aci, tohum) {
    var r = rastgele(tohum), c = Math.cos(aci), s = Math.sin(aci), n = p.length / 2;
    // döndürülmüş koordinatta (u boyunca tarama, v boyunca ilerle)
    var U = [], V = [];
    for (var i = 0; i < n; i++) { U.push(p[i * 2] * c + p[i * 2 + 1] * s); V.push(-p[i * 2] * s + p[i * 2 + 1] * c); }
    var v0 = Math.min.apply(null, V), v1 = Math.max.apply(null, V), o = [], ileri = true;
    for (var v = v0 + aralik * 0.55; v < v1 - aralik * 0.3; v += aralik) {
      var kes = [];
      for (var j = 0; j < n; j++) {
        var k = (j + 1) % n, va = V[j], vb = V[k];
        if ((va <= v && vb > v) || (vb <= v && va > v)) kes.push(U[j] + (U[k] - U[j]) * (v - va) / (vb - va));
      }
      if (kes.length < 2) continue;
      kes.sort(function (a, b) { return a - b; });
      var ua = kes[0] + 0.6 - r() * 1.1, ub = kes[kes.length - 1] - 0.6 + r() * 1.1;
      if (ub < ua) continue;
      var x1 = ileri ? ua : ub, x2 = ileri ? ub : ua;
      o.push(x1 * c - v * s, x1 * s + v * c, x2 * c - v * s, x2 * s + v * c);
      ileri = !ileri;
    }
    return o;
  }
  function elips(cx, cy, rx, ry, a) {
    var o = [], c = Math.cos(a || 0), si = Math.sin(a || 0);
    for (var i = 0; i <= 20; i++) { var t = i / 20 * Math.PI * 2, u = Math.cos(t) * rx, v = Math.sin(t) * ry; o.push(cx + u * c - v * si, cy + u * si + v * c); }
    return o;
  }
  // kenar + içi karalanmış (tek darbe): kenarı çizer, içeriden zikzakla döner
  function dolu(kenar, aralik, aci, tohum) { return kenar.concat(zikzak(kenar, aralik, aci, tohum)); }
  function donustur(ps, dx, dy, s, a, ox, oy) {
    var c = Math.cos(a || 0), si = Math.sin(a || 0);
    ox = ox || 0; oy = oy || 0;
    return ps.map(function (p) {
      var o = [];
      for (var i = 0; i < p.length; i += 2) { var u = (p[i] - ox) * s, v = (p[i + 1] - oy) * s; o.push(dx + u * c - v * si, dy + u * si + v * c); }
      return o;
    });
  }

  /* ---------------------------------------------------------- kedi
     Yerel birim (yaklaşık 30..320 × 8..300). Her öğe: ad, sonra yollar; ayar (el): uçlar ve kıvrım. */
  var KEDI = [
    // kafa: sol yanak ve sol kulak, sonra kafanın tepesi, sağ kulak ve sağ yan, en sonda çene (başlangıcı biraz geçer)
    ['kafa', ['M 112,167 C 82,160 60,136 61,104 C 62,88 67,77 73,67 C 68,49 65,30 68,12 C 69,7 74,7 78,10 C 92,20 106,31 117,41', { son: 1.5 }],
      ['M 113,42.5 C 136,35 160,34 184,40.5 C 196,32 210,24 226,18 C 232,16 236,19 235,24 C 236,39 233,53 229,69 C 236,80 241,93 242,109 C 243,141 219,166 184,170', { bas: 0.5, son: 0 }],
      ['M 186.5,169.5 C 163,173 138,172 109.5,165.5', { son: 2.4, kivrim: -2 }]],
    ['goz', ['M 103,103.5 C 108,93 124,92 130,103', { kivrim: 1.4 }], ['M 171.5,101.5 C 175,90 189,90 194.5,102', { kivrim: 1.2 }]],
    ['agiz', ['M 150,121 C 150.5,127.5 143,130 137.5,125.5', {}], ['M 150.5,121.5 C 150,128 157.5,131 163.5,126', { kivrim: 1 }]],
    ['biyik', ['M 57,107 C 49,104 41,103 33,102', { son: 2 }], ['M 57,118 C 48,118 40,119 31,121', { son: 1 }],
      ['M 245,107 C 252,104.5 259,102.5 266,101', { son: 2.5 }], ['M 246,118 C 254,118 262,119.5 272,122.5', { son: 1 }]],
    ['cizgi', ['M 140,47 L 142,58', {}], ['M 150,45 L 150.5,57', {}], ['M 160,46.5 L 157.5,58', {}]],
    ['govde', ['M 207,167 C 214,172 220,180 226,190 C 238,184 250,176 260,166 C 258,152 268,142 278,146 C 282,136 298,136 300,147 C 312,148 318,162 310,172 C 314,188 300,200 284,196 C 272,206 256,216 238,228 C 246,246 248,266 244,280 C 238,294 226,298 210,298 C 190,300 160,300 140,298 C 116,298 94,290 86,268 C 76,238 82,192 107,168', { son: 2.5 }]],
    ['ayak', ['M 124,298 C 122,284 148,281 151,297', { kivrim: -1.4 }]],
    ['kuyruk', ['M 93,283 C 62,294 38,274 38,250 C 38,230 56,222 66,234', { kivrim: 1.6 }]]
  ];
  var PEMBE_KISIM = [
    ['kulak', ['M 79,22 C 78,33 82,45 91,53', {}], ['M 225,27 C 225,37 220,47 211,54', {}]],
    ['burun', ['M 145,113 C 148,115.5 152,115.5 155,113 C 154,118 151,120.5 150,120.5 C 148.5,120.5 146,118 145.5,113.5', { son: 0.6 }]],
    ['yanak', ['M 91,120 L 87,128.5', {}], ['M 98.5,119.5 L 94.5,127', {}], ['M 106,120.5 L 102.5,127.5', {}],
      ['M 194,119 L 190.5,127', {}], ['M 201.5,120 L 197,128.5', {}], ['M 208.5,121 L 205,127.5', {}]]
  ];
  // patinin yastıkları: ana yastık (kenar + karalama) ve üç küçük yastık [x, y, eğim]
  var YASTIK = 'M 280,181 C 281,171 297,171 299,181 C 300,188 294,190 289,188 C 284,190 278,188 280,181 Z';
  var FASULYE = [[272.6, 159, -0.5], [288, 152.5, -0.1], [302, 161.5, 0.45]];
  var DAMGA = 'M -12,7 C -13,-4 -5,-9 0,-9 C 5,-9 13,-4 12,7 C 11,13 4,13 0,11 C -4,13 -11,13 -12,7 Z';
  var PARMAK = [[-14, -13, -0.5], [-5, -21, -0.15], [5.5, -20.5, 0.18], [14, -12, 0.55]];
  var KALP = 'M 0.5,6 C -9,0 -9,-8 -3,-8 C 0,-8 0,-5 0,-4 C 0,-5 0.5,-8 3.5,-8 C 9,-8 9,0 -0.8,6.8';

  /**
   * Çizimin parçaları, çiziliş sırasıyla, çizim biriminde (640 × 380). Her öğe: { ad, kalem: 'siyah' | 'pembe' |
   * 'mavi' | 'sari', p: [nokta dizileri], yazi?: { anahtar, x, y, boy, egim } }. Yazılar sahnede el yazısından kurulur.
   * olc(anahtar, boy): el yazısının genişliği (sahne verir: OSN.sahne.yaziEn).
   */
  function parcalar(en, olc) {
    var out = [], kx = 6, ky = 34, tohum = 11;
    // kedi hafif eğik (insan eli dik tutmaz), kendi ortası çevresinde
    var EG = -0.026, OX = 175, OY = 160;
    function kedi(ps) { return donustur(ps, kx + OX, ky + OY, 1, EG, OX, OY); }
    function ekle(ad, kalem, ps, ek) { var o = { ad: ad, kalem: kalem, p: ps }; for (var k in ek) o[k] = ek[k]; out.push(o); }
    function cizgiler(q, adim) {
      var ps = [];
      for (var i = 1; i < q.length; i++) {
        var yol = ornekle(q[i][0], adim)[0];
        ps.push(el(yol, tohum++, q[i][1]));
      }
      return ps;
    }
    KEDI.forEach(function (q) { ekle(q[0], 'siyah', kedi(cizgiler(q, 1.5))); });
    PEMBE_KISIM.forEach(function (q) { ekle(q[0], 'pembe', kedi(cizgiler(q, 1.2))); });
    // pati yastıkları: kenarı çizip içini karalar; küçük yastıklar birer dolu elips
    var yastik = [el(dolu(ornekle(YASTIK, 1)[0], 2.7, -0.5, 71), 72, { sapma: 0.25, bas: 0, son: 0 })];
    FASULYE.forEach(function (f, i) { yastik.push(el(dolu(elips(f[0], f[1], 2.5 + i * 0.25, 3.4 + (i % 2) * 0.3, f[2]), 1.9, f[2] + 0.4, 80 + i), 90 + i, { sapma: 0.12, bas: 0, son: 0 })); });
    ekle('yastik', 'pembe', kedi(yastik));
    // OSNote (mavi), patinin sağında; altından geçen sarı fosforlu (elle çekilmiş: hafif yay, uçları eğik)
    var boy = 70, tx = 362, ty = 168, egim = -0.06, w = olc('c_osnote', boy);
    ekle('osnote', 'mavi', [], { yazi: { anahtar: 'c_osnote', x: tx, y: ty, boy: boy, egim: egim } });
    var yy = ty - 14, e = Math.tan(-egim);
    ekle('fosforlu', 'sari', [el([tx - 9, yy + 3, tx + w * 0.25, yy - w * 0.25 * e + 0.2, tx + w * 0.5, yy - w * 0.5 * e - 1.2, tx + w * 0.75, yy - w * 0.75 * e - 1.6, tx + w + 11, yy - w * e - 2.4], 123, { sapma: 0.7, titreme: 0.1, bas: 0, son: 0 })]);
    // kalp, pati onaylı!, pati izi damgası (pembe)
    ekle('kalp', 'pembe', donustur([el(ornekle(KALP, 1)[0], 140, { sapma: 0.35, bas: 0, son: 0.6 })], 334, 128, 1.45, 0.2));
    var anahtar = en ? 'c_pati_en' : 'c_pati', py = 262, pb = 34, pw = olc(anahtar, pb);
    ekle('pati', 'pembe', [], { yazi: { anahtar: anahtar, x: 372, y: py, boy: pb, egim: -0.04 } });
    var dx = 372 + pw + 30, dy = py - 8, a = -0.22, s = 1.15;
    var damga = [el(dolu(ornekle(DAMGA, 1)[0], 2.8, 0.6, 150), 151, { sapma: 0.25, bas: 0, son: 0 })];
    PARMAK.forEach(function (p, i) { damga.push(el(dolu(elips(p[0], p[1], 3.2 + (i % 2) * 0.4, 4.4 - (i % 3) * 0.3, p[2]), 2, p[2] + 0.5, 160 + i), 170 + i, { sapma: 0.12, bas: 0, son: 0 })); });
    ekle('damga', 'pembe', donustur(damga, dx, dy, s, a));
    // çiziliş sırası: siyah kedi; maviyle OSNote ve sarı fosforlu; en son pembe kalem (kulak, burun, yanak, yastıklar,
    // kalp, yazı, damga): üç kalem değişimi. Şekiller yukarıdaki sırayla kurulur, tohumlar değişmesin.
    var SIRA = ['kafa', 'goz', 'agiz', 'biyik', 'cizgi', 'govde', 'ayak', 'kuyruk', 'osnote', 'fosforlu', 'kulak', 'burun', 'yanak', 'yastik', 'kalp', 'pati', 'damga'];
    out.sort(function (a, b) { return SIRA.indexOf(a.ad) - SIRA.indexOf(b.ad); });
    return out;
  }

  OSN.kedi = { parcalar: parcalar, ornekle: ornekle, el: el, EN: 640, BOY: 380 };
})();
