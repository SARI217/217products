/* ============================================================
   OSNote tanıtım sitesi · kalem kutuları
   ------------------------------------------------------------
   Uygulamanın iki çubuğunun tarayıcıdaki karşılığı, uygulamanın
   kendi çizim kodundan birebir (sayılar, yollar, renk formülleri):
   - Grafit araçları (GrafitTools.kt): kurşun kalem, fosforlu, silgi,
     şekil şablonu, kement, yeni kalem yuvası. Renkler OKLab'da:
     Çiz modunda parlak (lift), Dokun modunda kuyuya doğru soluk (dim).
   - Kalem Kutusu (PenTrayToolbar.kt): ekran kaleminin çubuğu. Kenara
     yapışık kapsül; mod, kalemler ve eylemler üç bölmede. Seçili
     araç kutudan ekranın ortasına doğru kalkar, dış duvarda çentik.
   - Defterin kalem kutusu, "Karma" (KarmaBar.kt): hızlı notların
     çubuğu. Kâğıt renginde zemin, titrek kurşun kalem kenarları,
     taramalı ön duvar, ad etiketi, seçili kalemin ucunda pembe halka.
   Hepsi SVG; ölçüler dp (cihazın içinde --dp ile tasarım pikseline).
   Modül değil düz betik: sayfa dosyadan da açılsın.
   ============================================================ */
(function () {
  'use strict';
  var OSN = window.OSN || (window.OSN = {});
  var dil = OSN.dil || function (tr) { return tr; };
  var NS = 'http://www.w3.org/2000/svg';

  /* ---------------------------------------------------------- renk: OKLab (GrafitTools.kt › Ok) */
  function hexRgb(h) {
    h = h.replace('#', '');
    return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255];
  }
  function rgbHex(c) {
    var s = '#';
    for (var i = 0; i < 3; i++) { var v = Math.round(Math.max(0, Math.min(1, c[i])) * 255); s += (v < 16 ? '0' : '') + v.toString(16); }
    return s.toUpperCase();
  }
  function toLin(c) { return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function toSrgb(c) { var v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; return Math.max(0, Math.min(1, v)); }
  function lab(hex) {
    var c = hexRgb(hex), r = toLin(c[0]), g = toLin(c[1]), b = toLin(c[2]);
    var l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    var m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    var s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
      1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
      0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
  }
  function fromLab(L, A, B) {
    var l = Math.pow(L + 0.3963377774 * A + 0.2158037573 * B, 3);
    var m = Math.pow(L - 0.1055613458 * A - 0.0638541728 * B, 3);
    var s = Math.pow(L - 0.0894841775 * A - 1.2914855480 * B, 3);
    return rgbHex([toSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
      toSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
      toSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s)]);
  }
  // Işık: açıklık artar, doygunluk azalır (beyaza doğru). Gölge: açıklık azalır, ton korunur.
  function tint(c, t) { var x = lab(c), k = 1 - t * 0.9; return fromLab(x[0] + (1 - x[0]) * t, x[1] * k, x[2] * k); }
  function shade(c, t) { var x = lab(c), k = 1 - t * 0.35; return fromLab(x[0] * (1 - t), x[1] * k, x[2] * k); }
  // Çiz modunun parlak hâli (Grafit.lift): koyular korunur (açıklık 0,28 altı), 0,5'e kadar yumuşakça devreye girer
  function lift(c, t) {
    var x = lab(c), q = Math.max(0, Math.min(1, (x[0] - 0.28) / 0.22)), w = q * q * (3 - 2 * q), k = 1 + 0.3 * t * w;
    return fromLab(x[0] + (1 - x[0]) * t * w, x[1] * k, x[2] * k);
  }
  // Dokun modunun soluk hâli (Grafit.dim): renk kuyunun rengine doğru, sRGB kodlu değerlerde karışır
  var KUYU = '#221E20';
  function toward(c, a) {
    var x = hexRgb(c), w = hexRgb(KUYU);
    return rgbHex([x[0] * a + w[0] * (1 - a), x[1] * a + w[1] * (1 - a), x[2] * a + w[2] * (1 - a)]);
  }
  function koyuMu(c) { return lab(c)[0] < 0.34; }
  function acikMi(c) { return lab(c)[0] > 0.93; }

  /* ---------------------------------------------------------- Grafit araçları
     Araç birimi (dp), (0,0) = aracın tepesi, x ortada, y aşağı. Parça: { d, fill, a } dolgu,
     { d, stroke, sw, a, dash } çizgi, { clip, ops } kırpılmış parçalar. */
  var BEYAZ = '#FFFFFF', DELIK = '#141113', AHSAP_L = '#F0CFA0', AHSAP_R = '#D9AE78', FILDISI = '#F2EEE8';
  function r2(v) { return Math.round(v * 100) / 100; }
  function rect(x, y, w, h) { return 'M' + r2(x) + ',' + r2(y) + 'h' + r2(w) + 'v' + r2(h) + 'h' + r2(-w) + 'Z'; }
  function rrect(x, y, w, h, tl, tr, br, bl) {
    if (tr == null) tr = tl; if (br == null) br = tl; if (bl == null) bl = tl;
    return 'M' + r2(x + tl) + ',' + r2(y) + 'H' + r2(x + w - tr) + (tr ? 'A' + tr + ',' + tr + ' 0 0 1 ' + r2(x + w) + ',' + r2(y + tr) : '') +
      'V' + r2(y + h - br) + (br ? 'A' + br + ',' + br + ' 0 0 1 ' + r2(x + w - br) + ',' + r2(y + h) : '') +
      'H' + r2(x + bl) + (bl ? 'A' + bl + ',' + bl + ' 0 0 1 ' + r2(x) + ',' + r2(y + h - bl) : '') +
      'V' + r2(y + tl) + (tl ? 'A' + tl + ',' + tl + ' 0 0 1 ' + r2(x + tl) + ',' + r2(y) : '') + 'Z';
  }
  function daire(cx, cy, r) { return 'M' + r2(cx - r) + ',' + r2(cy) + 'a' + r + ',' + r + ' 0 1 0 ' + r2(2 * r) + ',0a' + r + ',' + r + ' 0 1 0 ' + r2(-2 * r) + ',0Z'; }
  function poly(n) { var s = 'M' + r2(n[0]) + ',' + r2(n[1]); for (var i = 2; i < n.length; i += 2) s += 'L' + r2(n[i]) + ',' + r2(n[i + 1]); return s + 'Z'; }

  function yuzler(c) { var k = koyuMu(c), a = acikMi(c); return [tint(c, k ? 0.16 : 0.24), c, shade(c, a ? 0.14 : 0.22)]; }
  function yuzeyler(hw, a, c, y0, y1) {
    var f = yuzler(c), h = y1 - y0;
    return [{ d: rect(-hw, y0, hw - a, h), fill: f[0] }, { d: rect(-a, y0, 2 * a, h), fill: f[1] }, { d: rect(a, y0, hw - a, h), fill: f[2] }];
  }
  var TIRTIK_LTR = 'M-6.2,17.2 Q-4.14,12 -2.07,17.2 Q0,12 2.07,17.2 Q4.14,12 6.2,17.2';
  var TIRTIK_RTL = 'L6.2,17.2 Q4.14,12 2.07,17.2 Q0,12 -2.07,17.2 Q-4.14,12 -6.2,17.2';
  var KONI = 'M-1.6,5 L1.6,5 ' + TIRTIK_RTL + ' Z';
  var UC = 'M0,0.2 L1.6,5.2 L-1.6,5.2 Z';
  function kalem(c) {
    var koyu = koyuMu(c), lc = koyu ? '#5A5861' : c;
    var o = [
      { clip: TIRTIK_LTR + ' L6.2,80 L-6.2,80 Z', ops: yuzeyler(6.2, 2.07, c, 12, 80) },
      { d: KONI, fill: AHSAP_L },
      { clip: KONI, ops: [{ d: rect(0, 0, 8, 20), fill: AHSAP_R }] },
      { d: UC, fill: lc },
      { clip: UC, ops: [{ d: rect(0, 0, 2, 6), fill: shade(lc, 0.22) }] }
    ];
    if (koyu) o.push({ d: 'M-6.2,17.2 V80 M6.2,17.2 V80', stroke: BEYAZ, sw: 0.6, a: 0.28 });
    return o;
  }
  function yaka(w0, y0, w1, y1, c) {
    var f = yuzler(c), a0 = w0 / 3, a1 = w1 / 3;
    return [{ d: poly([-w1, y1, -w0, y0, -a0, y0, -a1, y1]), fill: f[0] }, { d: poly([-a1, y1, -a0, y0, a0, y0, a1, y1]), fill: f[1] },
      { d: poly([a1, y1, a0, y0, w0, y0, w1, y1]), fill: f[2] }];
  }
  function kece(a, yb, yl, yr, t, c) {
    var x2 = a / 3, ym = yl + (yr - yl) * (x2 + a) / (2 * a), sh = shade(c, 0.22);
    return [{ d: poly([-a, yl + t, x2, ym + t, x2, yb, -a, yb]), fill: c }, { d: poly([x2, ym + t, a, yr + t, a, yb, x2, yb]), fill: sh },
      { d: poly([-a, yl, x2, ym, x2, ym + t, -a, yl + t]), fill: tint(c, 0.5) }, { d: poly([x2, ym, a, yr, a, yr + t, x2, ym + t]), fill: tint(sh, 0.34) }];
  }
  function fosforlu(c) {
    var uc = koyuMu(c) ? tint(c, 0.3) : c, halka = acikMi(c) ? shade(c, 0.2) : c;
    return yuzeyler(7, 7 / 3, FILDISI, 18, 80).concat(yuzeyler(7, 7 / 3, halka, 25.4, 28.4), yaka(4.7, 11.4, 7, 18, shade(uc, 0.1)), kece(3.9, 11.8, 7.4, 1, 2.3, uc));
  }
  function silgi() {
    var hw = 7.6, yan = 3.4, x2 = hw - yan, rub = rrect(-hw + 0.6, 0.8, 2 * hw - 1.2, 20, 3.2, 3.2, 0, 0);
    return [{ d: rub, fill: '#F6F3EE' }, { clip: rub, ops: [{ d: rect(x2 - 0.6, 0, yan + 1, 22), fill: '#D8D2CA' }] },
      { d: rect(-hw, 13.5, 2 * hw, 70), fill: '#2F6FD1' }, { d: rect(x2, 13.5, yan, 70), fill: '#2254A6' },
      { d: rect(-hw, 18, 2 * hw, 1.5), fill: BEYAZ }, { d: rect(-hw, 21, 2 * hw, 0.8), fill: BEYAZ, a: 0.85 }];
  }
  var SABLON_DELIK = (function () {
    var y = [];
    for (var i = 0; i < 10; i++) { var t = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 1.55 : 3.6; y.push(r2(Math.cos(t) * r), r2(30.6 + Math.sin(t) * r)); }
    return [daire(0, 9, 3.5), poly([0, 15.2, 3.9, 22, -3.9, 22]), poly(y), rrect(-3.1, 38, 6.2, 6.2, 1.3), daire(0, 51, 2.3)];
  })();
  function sablon(c) {
    var koyu = koyuMu(c), plaka = rrect(-9, 0.6, 18, 79.4, 5, 5, 0, 0);
    var o = [{ d: plaka, fill: koyu ? '#3A3740' : c, a: 0.88 }, { d: rect(-9, 5.6, 3.2, 74.4), fill: BEYAZ, a: 0.16 }];
    SABLON_DELIK.forEach(function (d) { o.push({ d: d, fill: DELIK }); });
    if (koyu) { o.push({ d: plaka, stroke: BEYAZ, sw: 0.6, a: 0.3 }); o.push({ d: rect(-9, 64, 18, 3), fill: c === '#1D1B1E' ? '#0E0D10' : c }); }
    return o;
  }
  var KEMENT_ILMEK = 'M0,1.6 C6.9,1.6 9.4,5.6 9.4,9.2 C9.4,13.4 5.8,15.6 0,15.6 C-5.8,15.6 -9.4,13.4 -9.4,9.2 C-9.4,5.6 -6.9,1.6 0,1.6 Z';
  function kement() {
    var h = yuzler('#2A9D8F'), m = yuzler('#C9C3BC');
    return [{ d: rect(-6.2, 23, 6.2 - 2.07, 57), fill: h[0] }, { d: rect(-2.07, 23, 4.14, 57), fill: h[1] }, { d: rect(2.07, 23, 6.2 - 2.07, 57), fill: h[2] },
      { d: rect(-4.4, 17.4, 2.9, 5.8), fill: m[0] }, { d: rect(-1.5, 17.4, 3, 5.8), fill: m[1] }, { d: rect(1.5, 17.4, 2.9, 5.8), fill: m[2] },
      { d: 'M-1.2,15.4 C-1.6,16.6 -1.4,17.2 -1.2,17.6 L1.2,17.6 C1.4,17.2 1.6,16.6 1.2,15.4 Z', fill: '#F4EFE6' },
      { d: KEMENT_ILMEK, stroke: '#3A3537', sw: 3.2 }, { d: KEMENT_ILMEK, stroke: '#F4EFE6', sw: 1.9, dash: '3.2 2.3', kapak: 'butt' }];
  }
  var GOLGE = 'M-1.6,5 L1.6,5 L6.2,16.4 V80 H-6.2 V16.4 Z';
  function ekle(acc) {
    return [{ d: GOLGE, fill: BEYAZ, a: 0.07 }, { d: GOLGE, stroke: BEYAZ, sw: 0.7, a: 0.16 }, { d: 'M-1.6,5 L1.6,5 L0.8,2.2 L-0.8,2.2 Z', fill: BEYAZ, a: 0.12 },
      { d: daire(0, 22.5, 6.1), fill: DELIK }, { d: daire(0, 22.5, 5.6), stroke: acc, sw: 1.1, a: 0.95 },
      { d: 'M-2.6,22.5 H2.6 M0,19.9 V25.1', stroke: tint(acc, 0.45), sw: 1.5 }];
  }
  var ARAC = { kalem: kalem, fosforlu: fosforlu, silgi: silgi, sablon: sablon, kement: kement, ekle: ekle };
  // açık zeminde (defterin kâğıt renkli çubuğu) araçların kenar çizgisi (Grafit.OUTLINE)
  var KENAR = {
    kalem: 'M-6.2,86 L-6.2,16.6 L-1.7,5.1 L0,0.3 L1.7,5.1 L6.2,16.6 L6.2,86',
    fosforlu: 'M-7,86 L-7,18 L-4.7,11.4 L-3.9,11.8 L-3.9,7.4 L3.9,1 L3.9,11.8 L4.7,11.4 L7,18 L7,86',
    silgi: 'M-7.6,86 L-7.6,13.5 L-7,13.5 L-7,4 Q-7,0.8 -3.8,0.8 L3.8,0.8 Q7,0.8 7,4 L7,13.5 L7.6,13.5 L7.6,86',
    kement: 'M-6.2,86 L-6.2,23 L-4.4,23 L-4.4,17.4 L-1.3,17.4 M1.3,17.4 L4.4,17.4 L4.4,23 L6.2,23 L6.2,86',
    sablon: 'M-9,86 L-9,5.6 Q-9,0.6 -4,0.6 L4,0.6 Q9,0.6 9,5.6 L9,86'
  };

  // kırpma yolları sayfada bir kez tanımlanır (her yol tek kimlik)
  var kirpma = {}, kirpmaNo = 0, tanimlar = null;
  function tanim(icerik) {
    if (!tanimlar) {
      var s = document.createElementNS(NS, 'svg');
      s.setAttribute('class', 'simgeler');
      s.setAttribute('aria-hidden', 'true');
      s.setAttribute('focusable', 'false');
      tanimlar = document.createElementNS(NS, 'defs');
      s.appendChild(tanimlar);
      (document.body || document.documentElement).appendChild(s);
    }
    var g = document.createElementNS(NS, 'g');
    g.innerHTML = icerik;
    while (g.firstChild) tanimlar.appendChild(g.firstChild);
  }
  function kirpId(d) {
    if (kirpma[d]) return kirpma[d];
    var id = 'kg-k' + (++kirpmaNo);
    kirpma[d] = id;
    tanim('<clipPath id="' + id + '"><path d="' + d + '"/></clipPath>');
    return id;
  }
  // renk dönüşümü bütün parçalara (parlak / soluk hâl)
  function renkle(ops, f) {
    return ops.map(function (o) {
      var y = {};
      for (var k in o) y[k] = o[k];
      if (o.ops) y.ops = renkle(o.ops, f);
      if (o.fill) y.fill = f(o.fill);
      if (o.stroke) y.stroke = f(o.stroke);
      return y;
    });
  }
  function svgYaz(ops) {
    var s = '';
    ops.forEach(function (o) {
      if (o.clip) { s += '<g clip-path="url(#' + kirpId(o.clip) + ')">' + svgYaz(o.ops) + '</g>'; return; }
      var a = o.a != null && o.a < 1 ? ' opacity="' + o.a + '"' : '';
      if (o.fill) s += '<path d="' + o.d + '" fill="' + o.fill + '"' + a + '/>';
      else s += '<path d="' + o.d + '" fill="none" stroke="' + o.stroke + '" stroke-width="' + o.sw + '" stroke-linecap="' + (o.kapak || 'round') +
        '" stroke-linejoin="round"' + (o.dash ? ' stroke-dasharray="' + o.dash + '"' : '') + a + '/>';
    });
    return s;
  }
  var aracOnbellek = {};
  // tür + renk + hâl ('p' parlak, 's' soluk, 'd' düz) → SVG parçaları
  function aracSvg(tur, renk, hal) {
    var k = tur + renk + hal;
    if (aracOnbellek[k]) return aracOnbellek[k];
    var ops = ARAC[tur](renk || '#E893A6');
    if (hal === 'p') ops = renkle(ops, function (c) { return lift(c, 4 / 24); });
    else if (hal === 's') ops = renkle(ops, function (c) { return toward(c, 0.55); });
    return (aracOnbellek[k] = svgYaz(ops));
  }

  /* ---------------------------------------------------------- KALEM KUTUSU (ekran kalemi)
     Ölçüler PenTrayToolbar.kt › trayMetrics: kutu, kuyu, yuva, araç büyütmesi, duruş, mod bölmesi,
     simge, simge kutusu, Kapat. Kenarlar: alt (varsayılan), ust, sol, sag. */
  var OLCU = {
    buyuk: { kutu: 64, kuyu: 54, yuva: 40, k: 1.5, dur: 5, mod: 96, simge: 22, kutuS: 42, kapat: 36 },
    tablet: { kutu: 60, kuyu: 50, yuva: 36, k: 1.38, dur: 5, mod: 90, simge: 21, kutuS: 40, kapat: 34 },
    telefon: { kutu: 58, kuyu: 48, yuva: 34, k: 1.3, dur: 4, mod: 86, simge: 21, kutuS: 38, kapat: 32 }
  };
  var TAM_BEYAZ = '#FFFFFF', SIMGE_ACIK = '#F0E9EC', TUS_PLAKA = '#F2ECEF', TUS_YAZI = '#221E20', TUS_SOLUK = '#A69C9F', TUS_KAPALI = '#3A3537';
  var KIRMIZI_HALKA = '#FF9A8A', ISARET = '#F2ECEF';
  // Kutudaki kalemlerin başlangıcı (DInkSpec.DEFAULT_PRESETS): kırmızı 3, mavi 1,5, sarı fosforlu 14
  var BASLANGIC = [{ hl: false, renk: '#E5484D', k: 3 }, { hl: false, renk: '#0090FF', k: 1.5 }, { hl: true, renk: '#FFC53D', k: 14 }];
  var RENK_AD = {
    '#1D1B1E': ['Siyah', 'Black'], '#FFFFFF': ['Beyaz', 'White'], '#E5484D': ['Kırmızı', 'Red'], '#F76B15': ['Turuncu', 'Orange'],
    '#FFC53D': ['Sarı', 'Yellow'], '#30A46C': ['Yeşil', 'Green'], '#0090FF': ['Mavi', 'Blue'], '#8E4EC6': ['Mor', 'Purple']
  };
  function kalemAdi(p) {
    var r = RENK_AD[p.renk];
    if (OSN.en) return ((r ? r[1].toLowerCase() + ' ' : '') + (p.hl ? 'highlighter' : 'pen')).replace(/^./, function (c) { return c.toUpperCase(); });
    return (r ? r[0] + ' ' : '') + (p.hl ? 'fosforlu' : 'kalem');
  }

  function simge(id, x, y, boy, renk, sinif, ek) {
    return '<use href="#' + id + '" x="' + r2(x - boy / 2) + '" y="' + r2(y - boy / 2) + '" width="' + boy + '" height="' + boy + '" fill="' + renk + '"' +
      (sinif ? ' class="' + sinif + '"' : '') + (ek || '') + '/>';
  }

  /**
   * Kalem kutusunu kurar. ayar:
   *  kenar 'alt'|'ust'|'sol'|'sag', olcu 'tablet'|'telefon'|'buyuk', tam (iki tuşlu mod, yinele; dar kutuda tek tuş),
   *  kalemler [{hl, renk, k}], sekil (Gelişmiş: şablon yuvası), sekilRenk, ekle (yeni kalem yuvası),
   *  dugme (true: araçların üstüne gerçek düğmeler; sayfanın kalemi), durum { ciz, sec: 'k0'.. | 'silgi' | 'sekil' }.
   * Dönüş: { kok, durum(d), yer(ad) → kutunun içinde öğenin kutusu (dp), olcu }.
   */
  function KalemKutusu(kap, ayar) {
    ayar = ayar || {};
    var kenar = ayar.kenar || 'alt', dik = kenar === 'sol' || kenar === 'sag';
    var m = OLCU[ayar.olcu || 'tablet'], tam = ayar.tam !== false;
    var g = (m.kutu - m.kuyu) / 2;
    var modU = tam ? m.mod : m.kuyu;
    var kalemler = ayar.kalemler || BASLANGIC;
    var yuvalar = [];
    kalemler.forEach(function (p, i) { yuvalar.push({ ad: 'k' + i, tur: p.hl ? 'fosforlu' : 'kalem', renk: p.renk, kalem: p }); });
    yuvalar.push({ ad: 'silgi', tur: 'silgi' });
    if (ayar.sekil) yuvalar.push({ ad: 'sekil', tur: 'sablon', renk: ayar.sekilRenk || '#E5484D' });
    if (ayar.ekle) yuvalar.push({ ad: 'ekle', tur: 'ekle', renk: ISARET });
    var kalemU = m.yuva * yuvalar.length + 12;
    var eylemU = 4 + (tam ? 3 : 2) * m.kutuS + 1 + m.kapat + 14;
    var L = g + modU + g + kalemU + g + eylemU + g, T = m.kutu;
    var id = 'kk' + (++KalemKutusu.no);

    // eksen boyunca a, dik yönde b (kutunun kalınlığı içinde, 0 = kenara bakan yan değil: düz kutuda üst)
    // nokta(a, b): kutunun SVG koordinatı. Dik kutuda eksen y, kalınlık x.
    function nokta(a, b) { return dik ? [b, a] : [a, b]; }
    function kutuR(a, b, ua, ub) { return dik ? { x: b, y: a, w: ub, h: ua } : { x: a, y: b, w: ua, h: ub }; }
    var W = dik ? T : L, H = dik ? L : T;

    var s = '';
    // gövde: sıcak gri, üstten hafif ışık (%24 örtücülük); kenarında üstte ışık alan kılcal çizgi
    s += '<defs><linearGradient id="' + id + '-g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="' + H + '">' +
      '<stop offset="0" stop-color="#5A5254" stop-opacity="0.24"/><stop offset="1" stop-color="#454041" stop-opacity="0.24"/></linearGradient>' +
      '<linearGradient id="' + id + '-c" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="' + H + '">' +
      '<stop offset="0" stop-color="#FFFFFF" stop-opacity="0.2"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0.05"/></linearGradient>';
    // kuyu derinliği (Dokun): kuyunun dış yarısı dibine doğru kararır
    var aK = g + modU + g, bK = g;     // kalem kuyusunun başı (eksen) ve kalınlıktaki yeri
    var d0, d1;
    if (kenar === 'alt') { d0 = nokta(0, bK + m.kuyu / 2); d1 = nokta(0, bK + m.kuyu); }
    else if (kenar === 'ust') { d0 = nokta(0, bK + m.kuyu / 2); d1 = nokta(0, bK); }
    else if (kenar === 'sol') { d0 = [bK + m.kuyu / 2, 0]; d1 = [bK, 0]; }
    else { d0 = [bK + m.kuyu / 2, 0]; d1 = [bK + m.kuyu, 0]; }
    s += '<linearGradient id="' + id + '-d" gradientUnits="userSpaceOnUse" x1="' + d0[0] + '" y1="' + d0[1] + '" x2="' + d1[0] + '" y2="' + d1[1] + '">' +
      '<stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.3"/></linearGradient>';
    // araçların kırpması: kuyunun içi, ekranın ortasına bakan yan açık (kalkan araç taşar); uçlardaki yuvarlak yalnız dış yanda
    var r = m.kuyu / 2, kx0 = aK, kx1 = aK + kalemU, acik = 120, kd;
    if (!dik) {
      var yU = kenar === 'alt' ? bK - acik : bK, yA = kenar === 'alt' ? bK + m.kuyu : bK + m.kuyu + acik;
      kd = kenar === 'alt' ? rrect(kx0, yU, kalemU, yA - yU, 0, 0, r, r) : rrect(kx0, yU, kalemU, yA - yU, r, r, 0, 0);
    } else {
      var xS = kenar === 'sag' ? bK - acik : bK, xG = kenar === 'sag' ? bK + m.kuyu : bK + m.kuyu + acik;
      kd = kenar === 'sag' ? rrect(xS, kx0, xG - xS, kalemU, 0, r, r, 0) : rrect(xS, kx0, xG - xS, kalemU, r, 0, 0, r);
    }
    s += '<clipPath id="' + id + '-k"><path d="' + kd + '"/></clipPath></defs>';
    s += '<rect class="kk__govde" x="0" y="0" width="' + W + '" height="' + H + '" rx="' + T / 2 + '" fill="url(#' + id + '-g)"/>';
    s += '<rect x="0.5" y="0.5" width="' + (W - 1) + '" height="' + (H - 1) + '" rx="' + (T - 1) / 2 + '" fill="none" stroke="url(#' + id + '-c)" stroke-width="1"/>';

    var yer = {};
    function kuyu(a, ua) { var k = kutuR(a, bK, ua, m.kuyu); s += '<rect x="' + k.x + '" y="' + k.y + '" width="' + k.w + '" height="' + k.h + '" rx="' + r + '" fill="' + KUYU + '"/>'; return k; }

    // 1) mod bölmesi
    kuyu(g, modU);
    if (tam) {
      var tu = (modU - 8) / 2, ta = m.kuyu - 6, cap = Math.min(tu, ta);
      [['ciz', g + 3 + tu / 2, 'ph-scribble'], ['dokun', g + 3 + tu + 2 + tu / 2, 'ph-hand-tap']].forEach(function (t) {
        var c = nokta(t[1], bK + m.kuyu / 2);
        yer[t[0]] = { x: c[0] - cap / 2, y: c[1] - cap / 2, w: cap, h: cap };
        s += '<g class="kk__tus kk__tus--' + t[0] + '"><circle class="kk__plaka" cx="' + c[0] + '" cy="' + c[1] + '" r="' + cap / 2 + '" fill="' + TUS_PLAKA + '"/>' +
          simge(t[2], c[0], c[1], m.simge, TUS_SOLUK, 'kk__ince') + simge(t[2] + '-bold', c[0], c[1], m.simge, TUS_YAZI, 'kk__kalin') + '</g>';
      });
    } else {
      // dar kutu: tek tuş, yalnız el (Dokun açıkken açık daire + koyu el, Çiz'de koyu daire + açık el)
      var cc = nokta(g + modU / 2, bK + m.kuyu / 2), cp = m.kuyu - 6;
      yer.dokun = yer.ciz = { x: cc[0] - cp / 2, y: cc[1] - cp / 2, w: cp, h: cp };
      s += '<g class="kk__tek"><circle cx="' + cc[0] + '" cy="' + cc[1] + '" r="' + cp / 2 + '" fill="' + TUS_KAPALI + '"/>' +
        '<circle class="kk__plaka" cx="' + cc[0] + '" cy="' + cc[1] + '" r="' + cp / 2 + '" fill="' + TUS_PLAKA + '"/>' +
        simge('ph-hand-tap-bold', cc[0], cc[1], m.simge, SIMGE_ACIK, 'kk__ince') + simge('ph-hand-tap-bold', cc[0], cc[1], m.simge, TUS_YAZI, 'kk__kalin') + '</g>';
    }

    // 2) kalem kuyusu: araçlar kuyunun ağzından ekranın ortasına bakar
    kuyu(aK, kalemU);
    var dur = m.dur, kalk = -(g + 10) - dur;   // duruştan kalkık hâle (kutunun 10 dp dışına taşar)
    var E = { alt: '', ust: ' scale(1,-1)', sol: ' rotate(90)', sag: ' rotate(90) scale(1,-1)' }[kenar];
    s += '<g clip-path="url(#' + id + '-k)">';
    yuvalar.forEach(function (y, i) {
      var c = nokta(aK + 6 + m.yuva * i + m.yuva / 2, bK + m.kuyu / 2);
      yer[y.ad] = dik ? { x: bK, y: aK + 6 + m.yuva * i, w: m.kuyu, h: m.yuva } : { x: aK + 6 + m.yuva * i, y: bK, w: m.yuva, h: m.kuyu };
      y.c = c;
      var ic = y.tur === 'ekle' ? '<g class="kk__d">' + aracSvg('ekle', ISARET, 'd') + '</g>' :
        '<g class="kk__p">' + aracSvg(y.tur, y.renk, 'p') + '</g><g class="kk__s">' + aracSvg(y.tur, y.renk, 's') + '</g>';
      s += '<g transform="translate(' + r2(c[0]) + ',' + r2(c[1]) + ')' + E + '"><g class="kk__arac" data-kk-arac="' + y.ad + '">' +
        '<g transform="translate(0,' + r2(dur - m.kuyu / 2) + ') scale(' + m.k + ')">' + ic + '</g></g></g>';
    });
    s += '</g>';
    var kz = kutuR(aK, bK, kalemU, m.kuyu);
    s += '<rect class="kk__derin" x="' + kz.x + '" y="' + kz.y + '" width="' + kz.w + '" height="' + kz.h + '" rx="' + r + '" fill="url(#' + id + '-d)"/>';
    // çentik: kuyunun dışındaki duvarın ortasında, uçları yuvarlak kısa çubuk
    yuvalar.forEach(function (y) {
      if (y.tur === 'ekle') return;
      var dis = kenar === 'alt' || kenar === 'sag' ? bK + m.kuyu + (g - 3) / 2 + 1.5 : bK - (g - 3) / 2 - 1.5;
      var c = dik ? [dis, y.c[1]] : [y.c[0], dis];
      var w = dik ? 3 : 12, h = dik ? 12 : 3;
      s += '<rect class="kk__centik" data-kk-centik="' + y.ad + '" x="' + r2(c[0] - w / 2) + '" y="' + r2(c[1] - h / 2) + '" width="' + w + '" height="' + h + '" rx="1.5" fill="' + ISARET + '"/>';
    });

    // 3) eylemler: geri al, (yinele), ⋯, ayraç, Kapat
    var aE = aK + kalemU + g;
    kuyu(aE, eylemU);
    var a = aE + 2, orta = bK + m.kuyu / 2;
    function eylem(ad, ince, kalin, boy) {
      var c = nokta(a + m.kutuS / 2, orta);
      yer[ad] = dik ? { x: bK, y: a, w: m.kuyu, h: m.kutuS } : { x: a, y: bK, w: m.kutuS, h: m.kuyu };
      s += '<g class="kk__eylem" data-kk="' + ad + '">' + (ince ? simge(ince, c[0], c[1], boy || m.simge, SIMGE_ACIK, 'kk__ince') : '') +
        simge(kalin, c[0], c[1], boy || m.simge, TAM_BEYAZ, ince ? 'kk__kalin' : 'kk__beyaz') + '</g>';
      a += m.kutuS;
    }
    eylem('geri', 'ph-arrow-u-up-left', 'ph-arrow-u-up-left-bold');
    if (tam) eylem('yinele', 'ph-arrow-u-up-right', 'ph-arrow-u-up-right-bold');
    var nok = dik ? 'ph-dots-three-vertical-bold' : 'ph-dots-three-bold';
    var cm = nokta(a + m.kutuS / 2, orta);
    yer.daha = dik ? { x: bK, y: a, w: m.kuyu, h: m.kutuS } : { x: a, y: bK, w: m.kutuS, h: m.kuyu };
    s += '<g class="kk__eylem" data-kk="daha">' + simge(nok, cm[0], cm[1], m.simge + 2, SIMGE_ACIK) + simge(nok, cm[0], cm[1], m.simge + 2, TAM_BEYAZ, 'kk__kalin') + '</g>';
    a += m.kutuS;
    var ay = kutuR(a - 3, orta - 13, 1, 26);
    s += '<rect x="' + r2(ay.x) + '" y="' + r2(ay.y) + '" width="' + ay.w + '" height="' + ay.h + '" fill="#FFFFFF" fill-opacity="0.14"/>';
    a += 1;
    var ck = nokta(a + (m.kapat + 14) / 2, orta);
    yer.kapat = dik ? { x: bK, y: a, w: m.kuyu, h: m.kapat + 14 } : { x: a, y: bK, w: m.kapat + 14, h: m.kuyu };
    s += '<g class="kk__kapat" data-kk="kapat"><circle cx="' + r2(ck[0]) + '" cy="' + r2(ck[1]) + '" r="' + r2(m.kapat / 2 - 0.25 - 0.875) + '" fill="none" stroke="' + KIRMIZI_HALKA + '"/>' +
      simge('ph-power-bold', ck[0], ck[1], m.kapat * 0.5, KIRMIZI_HALKA) + '</g>';

    var kok = document.createElement('div');
    kok.className = 'kk kk--' + kenar + (tam ? '' : ' kk--dar');
    kok.setAttribute('aria-hidden', ayar.dugme ? 'false' : 'true');
    kok.style.setProperty('--kk-en', W);
    kok.style.setProperty('--kalk', r2(kalk) + 'px');   // seçili aracın kalkışı (satır içi stil yok: CSP)
    kok.style.setProperty('--kk-boy', H);
    kok.innerHTML = '<svg class="kk__svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" focusable="false" aria-hidden="true">' + s + '</svg>';
    if (kap) kap.appendChild(kok);

    var o = { kok: kok, olcu: m, kenar: kenar, en: W, boy: H, yer: function (ad) { return yer[ad] || null; }, yuvalar: yuvalar, kalemler: kalemler, d: null };
    // dokunma hedefi: kutunun içinde öğenin ortası (dp)
    o.merkez = function (ad) { var k = yer[ad]; return k ? [k.x + k.w / 2, k.y + k.h / 2] : null; };
    // hâl: { ciz: bool, sec: 'k0' | 'silgi' | 'sekil' }
    o.durum = function (d) {
      var anahtar = (d.ciz ? 1 : 0) + '|' + d.sec;
      if (o.anahtar === anahtar) return;
      o.anahtar = anahtar;
      o.d = { ciz: !!d.ciz, sec: d.sec };
      kok.classList.toggle('kk--ciz', !!d.ciz);
      kok.classList.toggle('kk--dokun', !d.ciz);
      // seçili araç: Çiz'de kalkar (CSS), Dokun'da yuvasında; çentik iki modda da yanar
      var a = kok.querySelectorAll('[data-kk-arac]');
      for (var i = 0; i < a.length; i++) a[i].classList.toggle('kk__arac--sec', a[i].getAttribute('data-kk-arac') === d.sec);
      var c = kok.querySelectorAll('[data-kk-centik]');
      for (var j = 0; j < c.length; j++) c[j].classList.toggle('kk__centik--acik', c[j].getAttribute('data-kk-centik') === d.sec);
    };
    o.durum(ayar.durum || { ciz: false, sec: 'k0' });
    return o;
  }
  KalemKutusu.no = 0;

  /* ---------------------------------------------------------- KÜÇÜK KUTU (PenTrayToolbar.kt › MiniTray)
     Küçültülmüş kutu: Çiz/Dokun tuşu, kuyuda seçili kalem (şekil seçiliyse şablon) + silgi, geri al ve büyüt.
     Gövde 48 dp kalın; bölmeler 40 dp, aralar 4 dp; araçlar 1 ölçekte, duruş 5 dp, kalkış kutunun 6 dp dışına.
     Yalnız yatay kenarlar (alt, ust). ayar: { kenar, arac: { tur, renk }, durum: { ciz, sec: 'arac' | 'silgi' } } */
  function KucukKutu(kap, ayar) {
    ayar = ayar || {};
    var kenar = ayar.kenar === 'ust' ? 'ust' : 'alt', G = 4, CEP = 40, YUVA = 32, WPAD = 4, KUYU_U = 2 * YUVA + 2 * WPAD, IKON = 38;
    var T = CEP + 2 * G, L = G + CEP + G + KUYU_U + G + (2 * IKON + 4) + G, id = 'kq' + (++KucukKutu.no);
    var arac = ayar.arac || { tur: 'kalem', renk: '#E5484D' }, d = ayar.durum || { ciz: true, sec: 'arac' };
    var s = '<defs><linearGradient id="' + id + '-g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="' + T + '">' +
      '<stop offset="0" stop-color="#5A5254" stop-opacity="0.24"/><stop offset="1" stop-color="#454041" stop-opacity="0.24"/></linearGradient>' +
      '<linearGradient id="' + id + '-c" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="' + T + '">' +
      '<stop offset="0" stop-color="#FFFFFF" stop-opacity="0.2"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0.05"/></linearGradient>' +
      '<clipPath id="' + id + '-k"><path d="' + (kenar === 'alt' ? rrect(G + CEP + G, G - 120, KUYU_U, CEP + 120, 0, 0, CEP / 2, CEP / 2) : rrect(G + CEP + G, G, KUYU_U, CEP + 120, CEP / 2, CEP / 2, 0, 0)) + '"/></clipPath></defs>';
    s += '<rect x="0" y="0" width="' + L + '" height="' + T + '" rx="' + T / 2 + '" fill="url(#' + id + '-g)"/>' +
      '<rect x="0.5" y="0.5" width="' + (L - 1) + '" height="' + (T - 1) + '" rx="' + (T - 1) / 2 + '" fill="none" stroke="url(#' + id + '-c)"/>';
    // mod: daire bölme, içinde daire tuş (Çiz'de koyu daire + açık el, Dokun'da açık plaka + koyu el)
    var mx = G + CEP / 2, my = G + CEP / 2;
    s += '<circle cx="' + mx + '" cy="' + my + '" r="' + CEP / 2 + '" fill="' + KUYU + '"/>' +
      '<circle cx="' + mx + '" cy="' + my + '" r="' + (CEP / 2 - 3) + '" fill="' + (d.ciz ? TUS_KAPALI : TUS_PLAKA) + '"/>' +
      simge('ph-hand-tap-bold', mx, my, 20, d.ciz ? SIMGE_ACIK : TUS_YAZI);
    // kuyu: seçili kalem + silgi; seçili araç Çiz'de kalkar, altında çentik
    var kx = G + CEP + G;
    s += '<rect x="' + kx + '" y="' + G + '" width="' + KUYU_U + '" height="' + CEP + '" rx="' + CEP / 2 + '" fill="' + KUYU + '"/><g clip-path="url(#' + id + '-k)">';
    [['arac', arac.tur, arac.renk], ['silgi', 'silgi', null]].forEach(function (y, i) {
      var cx = kx + WPAD + YUVA * i + YUVA / 2, sec = d.sec === y[0], kalk = sec && d.ciz;
      var uc = kenar === 'alt' ? (kalk ? -6 : G + 5) : (kalk ? T + 6 : T - G - 5), don = kenar === 'alt' ? '' : ' scale(1,-1)';
      s += '<g transform="translate(' + r2(cx) + ',' + r2(uc) + ')' + don + '">' + aracSvg(y[1], y[2], d.ciz ? 'p' : 's') + '</g>';
    });
    s += '</g>';
    if (!d.ciz) s += '<rect x="' + kx + '" y="' + G + '" width="' + KUYU_U + '" height="' + CEP + '" rx="' + CEP / 2 + '" fill="#000" fill-opacity="0.12"/>';
    var ci = d.sec === 'silgi' ? 1 : 0, ncx = kx + WPAD + YUVA * ci + YUVA / 2, ny = kenar === 'alt' ? T - 3.5 : 0.5;
    s += '<rect x="' + r2(ncx - 6) + '" y="' + ny + '" width="12" height="3" rx="1.5" fill="' + ISARET + '"/>';
    // geri al, büyüt
    var ex = kx + KUYU_U + G;
    s += '<rect x="' + ex + '" y="' + G + '" width="' + (2 * IKON + 4) + '" height="' + CEP + '" rx="' + CEP / 2 + '" fill="' + KUYU + '"/>' +
      simge(d.ciz ? 'ph-arrow-u-up-left-bold' : 'ph-arrow-u-up-left', ex + 2 + IKON / 2, my, 20, d.ciz ? TAM_BEYAZ : SIMGE_ACIK) +
      simge(d.ciz ? 'ph-arrows-out-simple-bold' : 'ph-arrows-out-simple', ex + 2 + IKON * 1.5, my, 20, d.ciz ? TAM_BEYAZ : SIMGE_ACIK);
    var kok = document.createElement('div');
    kok.className = 'kk kk--kucuk';
    kok.setAttribute('aria-hidden', 'true');
    kok.style.setProperty('--kk-en', L);
    kok.style.setProperty('--kk-boy', T);
    kok.innerHTML = '<svg class="kk__svg" viewBox="0 0 ' + L + ' ' + T + '" width="' + L + '" height="' + T + '" focusable="false" aria-hidden="true">' + s + '</svg>';
    if (kap) kap.appendChild(kok);
    // dokunma yerleri (dp): mod tuşu, iki yuva, geri al, büyüt
    var yer = {
      mod: { x: G, y: G, w: CEP, h: CEP },
      arac: { x: kx + WPAD, y: G, w: YUVA, h: CEP }, silgi: { x: kx + WPAD + YUVA, y: G, w: YUVA, h: CEP },
      geri: { x: ex + 2, y: G, w: IKON, h: CEP }, buyut: { x: ex + 2 + IKON, y: G, w: IKON, h: CEP }
    };
    return { kok: kok, en: L, boy: T, yer: function (ad) { return yer[ad] || null; } };
  }
  KucukKutu.no = 0;

  /* ---------------------------------------------------------- KARMA: defterin kalem kutusu (KarmaBar.kt)
     Kâğıt renginde çubuk: geri · kalem kutusu (kalemler, silgi, kement, şablon, yeni kalem + cepte geri al /
     yinele) · iki katlı mürekkep alanı (üstte kalınlık izleri, altta renk lekeleri) · resim, dışa aktar · ⋯.
     Çizgiler titrek kurşun kalem (asıl çizgi + biraz kaymış soluk ikinci çizgi). */
  function karisim(a, b, t) {   // Compose lerp: Oklab'da doğrusal
    var x = lab(a), y = lab(b);
    return fromLab(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t);
  }
  function KarmaMurekkep(kagit) {
    var koyu = lab(kagit)[0] < 0.5;
    this.kagit = kagit; this.koyu = koyu;
    this.ink = koyu ? '#EFE8EB' : '#2A2427';
    this.ink2 = koyu ? '#B3AAAE' : '#6A6064';
    this.vurgu = koyu ? '#F28CA6' : '#C2405F';
    this.kuyu = karisim(kagit, this.ink, 0.07);
  }
  var DOODLE = {
    BACK: 'M15.2 5 C12.6 7.7 10.1 10 8 12 C10.2 14 12.6 16.4 15.4 19',
    UNDO: 'M9.1 5.8 L4.7 10.1 L9.2 14.3 M5 10.1 L14.6 10 C17.8 10 20.3 12.4 20.3 15.3 C20.3 18.2 17.8 20.4 14.6 20.4 L11 20.4',
    REDO: 'M14.9 5.8 L19.3 10.1 L14.8 14.3 M19 10.1 L9.4 10 C6.2 10 3.7 12.4 3.7 15.3 C3.7 18.2 6.2 20.4 9.4 20.4 L13 20.4',
    MORE: 'M5.6 12.1 C5.6 11.3 6.5 11.2 6.8 11.9 C7 12.6 6 13.1 5.6 12.1 M11.6 12 C11.6 11.2 12.5 11.1 12.8 11.8 C13 12.5 12 13 11.6 12 M17.6 12.1 C17.6 11.3 18.5 11.2 18.8 11.9 C19 12.6 18 13.1 17.6 12.1',
    IMAGE: 'M4 6.2 C9 5.8 15 6.1 20 5.9 L20.2 18.2 C15 18.4 9 18.1 3.9 18.3 Z M4.4 16.4 L9 11.6 L12.6 15 L15 12.8 L19.6 17.2 M15.6 9.4 C15.6 8.5 17 8.4 17.2 9.3 C17.4 10.2 15.8 10.6 15.6 9.4',
    EXPORT: 'M8.2 9.4 L4.8 9.6 L5 20.2 L19 20 L19.2 9.6 L15.8 9.4 M12 3.8 L12.1 14.6 M8.6 7.2 L12 3.8 L15.4 7.3',
    LOOP: 'M9 29 C5 19 13 8.5 25 7.5 C37 6.5 44 15 41.5 26 C39 37 25 42 15.5 37.5 C10 35 8.5 30 11.5 25.5',
    SQUIGGLE: 'M5 12 C12 7 18 15 25 10 C32 5 33 8 36 10',
    UNDERLINE: 'M7 23 C15 21.4 26 24 34 22',
    TICK: 'M8.5 15.5 L13 20 L22.5 9',
    CLOSE: 'M6.6 6.9 L17.3 17.3 M17.4 6.7 L6.7 17.2',
    PEN_ADD: 'M3.9 20.1 L4.8 16.6 L12.4 9 L15 11.6 L7.4 19.2 Z M4.9 16.7 L7.3 19.1 M17.6 3.6 L17.5 10.4 M14.1 7 L20.9 6.9',
    PAGE_ADD: 'M6 3.6 L14.4 3.5 L18.9 8 L19 20.4 L6.1 20.5 Z M14.4 3.6 L14.5 8 L18.9 8 M12.5 11.1 L12.4 17.4 M9.3 14.2 L15.7 14.3',
    PAPER: 'M5.6 3.8 L18.4 3.7 L18.5 20.2 L5.5 20.3 Z M8.6 8.4 L15.5 8.5 M8.5 12 L15.4 11.9 M8.6 15.5 L12.9 15.6',
    ERASE_PART: 'M3.4 14.6 C5.4 10.2 7.8 9.6 9.6 12.2 M14.6 12.6 C16 15 18.4 15 20.6 10.4',
    ERASE_WHOLE: 'M3.4 14.6 C6 8.6 8.8 9.4 11.2 12.8 C13.4 15.8 17 16 20.6 10.4'
  };
  // titrek yuvarlatılmış dikdörtgen (Doodle.wobblyRect): j tohum, amp titreme
  function titrekKutu(x, y, w, h, r0, j, amp) {
    var r = Math.min(r0, Math.min(w, h) / 2);
    function wb(k) { return Math.sin(k * 3.7 + j) * 0.8 * amp; }
    function n(a, b) { return r2(a) + ' ' + r2(b); }
    return 'M' + n(x + r, y + wb(1)) +
      'C' + n(x + w * 0.35, y - 0.7 * amp + wb(2)) + ' ' + n(x + w * 0.65, y + 0.8 * amp + wb(3)) + ' ' + n(x + w - r, y + wb(4)) +
      'Q' + n(x + w, y) + ' ' + n(x + w + wb(5) * 0.4, y + r) +
      'C' + n(x + w + 0.7 * amp, y + h * 0.4) + ' ' + n(x + w - 0.6 * amp, y + h * 0.6) + ' ' + n(x + w + wb(6) * 0.4, y + h - r) +
      'Q' + n(x + w, y + h) + ' ' + n(x + w - r, y + h + wb(7) * 0.5) +
      'C' + n(x + w * 0.65, y + h + 0.8 * amp) + ' ' + n(x + w * 0.35, y + h - 0.6 * amp) + ' ' + n(x + r, y + h + wb(8) * 0.5) +
      'Q' + n(x, y + h) + ' ' + n(x + wb(9) * 0.4, y + h - r) +
      'C' + n(x - 0.6 * amp, y + h * 0.6) + ' ' + n(x + 0.7 * amp, y + h * 0.4) + ' ' + n(x + wb(10) * 0.4, y + r) +
      'Q' + n(x, y) + ' ' + n(x + r, y + wb(1)) + 'Z';
  }
  // boya lekesi (Doodle.blob): 30 birim, dokuz köşe
  function leke(i) {
    var R = [11, 10.2, 11.4, 10.6, 11, 10.4, 11.2, 10.8], s = '';
    for (var j = 0; j <= 9; j++) {
      var a = j / 9 * 2 * Math.PI, r = R[(i + j) % 8] * (0.9 + 0.1 * Math.sin(j * 2.3 + i));
      s += (j ? 'L' : 'M') + r2(15 + Math.cos(a) * r) + ',' + r2(15 + Math.sin(a) * r);
    }
    return s + 'Z';
  }
  // kurşun kalem çizgisi: asıl + biraz kaymış soluk ikinci çizgi (karmaPencil; kayma 0,4 × 0,3 dp)
  function kursun(d, renk, w, ek) {
    return '<path d="' + d + '" fill="none" stroke="' + renk + '" stroke-width="' + r2(w) + '" stroke-linecap="round" stroke-linejoin="round"' + (ek || '') + '/>' +
      '<path d="' + d + '" transform="translate(0.4,0.3)" fill="none" stroke="' + renk + '" stroke-opacity="0.33" stroke-width="' + r2(w * 0.5) + '" stroke-linecap="round" stroke-linejoin="round"' + (ek || '') + '/>';
  }
  // karalama simgesi (24 birimlik kutu): asıl çizgi + kaymış soluk çizgi
  function karalama(d, x, y, boy, renk, kalin) {
    var s = boy / 24, w = kalin || 1.7;
    return '<g transform="translate(' + r2(x) + ',' + r2(y) + ') scale(' + r2(s) + ')">' +
      '<path d="' + d + '" fill="none" stroke="' + renk + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="' + d + '" transform="translate(0.7,0.6)" fill="none" stroke="' + renk + '" stroke-opacity="0.38" stroke-width="' + r2(w * 0.53) + '" stroke-linecap="round" stroke-linejoin="round"/></g>';
  }
  var KARMA_OLCU = {
    tablet: { yuva: 30, k: 1.1, bas: 9, kalk: 8, ust: 11, govde: 30, duvar: 14, padX: 11, cepD: 44, etiket: 11, halka: 28, tus: 48, simge: 24, hucre: 34, leke: 25, boyH: 38, ayar: 46, pay: 12 },
    telefon: { yuva: 27, k: 1, bas: 8, kalk: 6, ust: 9, govde: 26, duvar: 12, padX: 9, cepD: 40, etiket: 10, halka: 24, tus: 42, simge: 21, hucre: 28, leke: 22, boyH: 32, ayar: 38, pay: 8 }
  };
  var HIZLI = ['#1A1A1A', '#FFC107', '#E53935', '#2196F3'];
  // tikin rengi için parlaklık (KarmaBar.kt › lum, 0–255)
  function parlaklik(c) { var x = hexRgb(c); return (0.299 * x[0] + 0.587 * x[1] + 0.114 * x[2]) * 255; }
  var ADLAR = [['#1A1A1A', 'siyah', 'black'], ['#FFFFFF', 'beyaz', 'white'], ['#9E9E9E', 'gri', 'gray'], ['#E53935', 'kırmızı', 'red'],
    ['#FB8C00', 'turuncu', 'orange'], ['#FFC107', 'sarı', 'yellow'], ['#43A047', 'yeşil', 'green'], ['#00ACC1', 'turkuaz', 'teal'],
    ['#2196F3', 'mavi', 'blue'], ['#3949AB', 'lacivert', 'navy'], ['#8E24AA', 'mor', 'purple'], ['#D81B60', 'pembe', 'pink'], ['#795548', 'kahverengi', 'brown']];
  function enYakinAd(c) {
    var a = lab(c), en = null, d0 = 1e9;
    ADLAR.forEach(function (t) { var b = lab(t[0]), d = Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2) + Math.pow(a[2] - b[2], 2); if (d < d0) { d0 = d; en = t; } });
    return en;
  }
  // "Siyah kalem" / "Black pen" (QnNames.pen)
  function defterKalemAdi(p) {
    var t = enYakinAd(p.renk);
    if (OSN.en) return (t[2] + (p.hl ? ' highlighter' : ' pen')).replace(/^./, function (c) { return c.toUpperCase(); });
    return (t[1] + (p.hl ? ' fosforlu' : ' kalem')).replace(/^./, function (c) { return c.toLocaleUpperCase('tr'); });
  }
  function mmYaz(v) { var s = v % 1 === 0 ? String(v) : (OSN.en ? v.toFixed(1) : v.toFixed(1).replace('.', ',')); return s + ' mm'; }
  var DEFTER_BASLANGIC = [{ hl: false, renk: '#1A1A1A', mm: 2 }, { hl: false, renk: '#2196F3', mm: 2 }, { hl: false, renk: '#E53935', mm: 4 }, { hl: true, renk: '#FFC107', mm: 4 }];
  var DEFTER_MM = [2, 4];

  /**
   * Defterin çubuğu (tek satır, KarmaBar + NotesActivity'nin tek satırlık düzeni). ayar:
   *  en (çubuğun genişliği, dp), olcu 'tablet'|'telefon', kagit, kalemler [{hl, renk, mm}], sekilRenk,
   *  eylemler (resim ve dışa aktar çubukta; geniş ekran), durum { sec: 'k0'.. | 'silgi' | 'kement' | 'sekil' }.
   * Dönüş: { kok, durum(d), merkez(ad), boy }.
   */
  function Karma(kap, ayar) {
    ayar = ayar || {};
    var m = KARMA_OLCU[ayar.olcu || 'tablet'], c = new KarmaMurekkep(ayar.kagit || '#FFFFFF');
    var kalemler = ayar.kalemler || DEFTER_BASLANGIC;
    var yuvalar = [];
    kalemler.forEach(function (p, i) { yuvalar.push({ ad: 'k' + i, tur: p.hl ? 'fosforlu' : 'kalem', renk: p.renk, kalem: p }); });
    yuvalar.push({ ad: 'silgi', tur: 'silgi' }, { ad: 'kement', tur: 'kement' }, { ad: 'sekil', tur: 'sablon', renk: ayar.sekilRenk || '#E53935' });
    if (kalemler.length < 6) yuvalar.push({ ad: 'ekle', tur: 'ekle' });
    var n = yuvalar.length;
    var caseH = m.bas + m.kalk + m.ust + m.govde, tipBand = m.bas + m.kalk + m.ust, topCellH = tipBand - (m.bas - 4);
    var cepW = m.cepD * 2 + 6, caseW = m.padX + m.yuva * n + 6 + cepW + 7;
    var W = ayar.en || 1000, H = 4 + caseH + 7;
    var id = 'kr' + (++Karma.no);
    var yer = {};
    var s = '<rect width="' + W + '" height="' + H + '" fill="' + c.kagit + '"/>';

    // kapsül düğme (karmaKeyShape): titrek kenar, zemin kuyu tonunda; strong (geri) kalın kenar, bir ton koyu
    function tus(ad, d, x, w, tohum, guclu) {
      var h = m.govde, y = 4 + (caseH - h) / 2, ic = 0.6;
      yer[ad] = { x: x, y: 4, w: w, h: caseH };
      var kenar = titrekKutu(x + ic, y + ic, w - ic * 2, h - ic * 2, (h - ic * 2) / 2, tohum, 0.8);
      var zemin = guclu ? karisim(c.kagit, c.ink, 0.17) : karisim(c.kuyu, c.ink, 0.05);
      var b = guclu ? m.simge + 1 : m.simge;
      return '<g data-kr="' + ad + '"><path d="' + kenar + '" fill="' + zemin + '"/>' + kursun(kenar, c.ink, guclu ? 1.7 : 1.3) +
        karalama(d, x + w / 2 - b / 2, y + h / 2 - b / 2, b, c.ink, guclu ? 2.3 : 1.7) + '</g>';
    }
    var x = m.pay;
    s += tus('geri', DOODLE.BACK, x, m.tus, 3, true);
    x += m.tus + 6;
    // kalem kutusu
    var kx = x, ky = 4, rim = tipBand, bodyH = caseH - rim - 0.6, rr = Math.min(bodyH / 2, 14);
    var dis = titrekKutu(kx + 0.6, ky + rim, caseW - 1.2, bodyH, rr, 1, 1);
    var px = kx + m.padX + m.yuva * n + 6, py = ky + rim + 4, ph = caseH - 4 - (rim + 4);
    var cep = titrekKutu(px, py, cepW, ph, ph / 2, 4, 0.8);
    var duvarSag = px - 4 - kx, duvarUst = ky + caseH - m.duvar;
    s += '<defs><clipPath id="' + id + '-d"><path d="' + dis + '"/></clipPath>' +
      '<clipPath id="' + id + '-w"><rect x="' + kx + '" y="' + duvarUst + '" width="' + duvarSag + '" height="' + m.duvar + '"/></clipPath>' +
      '<pattern id="' + id + '-t" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)"><rect width="0.8" height="6" fill="' + c.ink + '" fill-opacity="0.14"/></pattern></defs>';
    s += '<path d="' + dis + '" fill="' + c.kuyu + '"/>';
    s += '<path d="' + cep + '" fill="' + karisim(c.kuyu, c.ink, 0.05) + '"/>' + kursun(cep, c.ink, 1.3);
    s += kursun(dis, c.ink, 1.7);
    // kalemler: yuvanın içinde kırpılı (kutunun altında biter), seçili kalem kalkar
    yuvalar.forEach(function (y, i) {
      var yx = kx + m.padX + m.yuva * i;
      yer[y.ad] = { x: yx, y: ky, w: m.yuva, h: caseH };
      y.cx = yx + m.yuva / 2;
      var govde;
      if (y.tur === 'ekle') {
        var b = 18, ex = y.cx - b / 2, ey = m.bas + m.kalk + 2 + ky;
        govde = '<rect x="' + r2(ex) + '" y="' + r2(ey) + '" width="' + b + '" height="' + b + '" rx="4" fill="none" stroke="' + c.ink2 + '" stroke-width="1.2" stroke-dasharray="3 2.5"/>' +
          '<path d="M' + r2(y.cx - 4.5) + ',' + r2(ey + b / 2) + 'h9M' + r2(y.cx) + ',' + r2(ey + b / 2 - 4.5) + 'v9" stroke="' + c.ink2 + '" stroke-width="1.6" stroke-linecap="round"/>';
        s += '<g data-kr-arac="ekle">' + govde + '</g>';
        return;
      }
      var kenarD = KENAR[y.tur];
      govde = aracSvg(y.tur, y.renk, 'd') + '<path d="' + kenarD + '" fill="none" stroke="' + c.ink + '" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="' + kenarD + '" transform="translate(0.6,0.5)" fill="none" stroke="' + c.ink + '" stroke-opacity="0.35" stroke-width="0.55" stroke-linecap="round" stroke-linejoin="round"/>';
      s += '<svg x="' + yx + '" y="' + ky + '" width="' + m.yuva + '" height="' + caseH + '" overflow="hidden"><g class="kr__arac" data-kr-arac="' + y.ad + '">' +
        '<g transform="translate(' + r2(m.yuva / 2) + ',' + r2(m.bas + m.kalk) + ') scale(' + m.k + ')">' + govde + '</g></g></svg>';
    });
    // ön duvar: kâğıt + tarama + kenar + ağız çizgisi
    s += '<g clip-path="url(#' + id + '-d)"><g clip-path="url(#' + id + '-w)"><rect x="' + kx + '" y="' + duvarUst + '" width="' + duvarSag + '" height="' + m.duvar + '" fill="' + c.kagit + '"/>' +
      '<rect x="' + kx + '" y="' + duvarUst + '" width="' + duvarSag + '" height="' + m.duvar + '" fill="url(#' + id + '-t)"/></g>' +
      '<path d="M' + r2(kx + duvarSag) + ',' + r2(duvarUst) + 'L' + r2(kx + duvarSag + 0.6) + ',' + r2(ky + caseH) + '" stroke="' + c.ink + '" stroke-width="1.4" stroke-linecap="round"/></g>';
    s += '<g clip-path="url(#' + id + '-w)">' + kursun(dis, c.ink, 1.7) + '</g>';
    var x0 = kx + 1, x1 = kx + duvarSag - 1, wv = 0.6;
    s += kursun('M' + r2(x0) + ',' + r2(duvarUst + wv * 0.5) + 'C' + r2(x0 + (x1 - x0) * 0.3) + ',' + r2(duvarUst - wv) + ' ' + r2(x0 + (x1 - x0) * 0.62) + ',' + r2(duvarUst + wv * 1.2) + ' ' + r2(x1) + ',' + r2(duvarUst - wv * 0.2), c.ink, 1.5);
    // ad etiketi (ön duvarın ortasında): kalemin adı vurgu renginde, kalınlığı soluk
    var duvarW = m.padX + m.yuva * n + 2;
    s += '<g data-kr-etiket transform="translate(' + r2(kx + duvarW / 2) + ',' + r2(duvarUst + m.duvar / 2) + ')"></g>';
    // cep: geri al / yinele
    var cy0 = ky + caseH - 4 - (m.govde - 8) / 2, cxs = kx + caseW - 10 - m.cepD / 2;
    s += karalama(DOODLE.UNDO, cxs - m.cepD - m.simge / 2, cy0 - m.simge / 2, m.simge, c.ink) + karalama(DOODLE.REDO, cxs - m.simge / 2, cy0 - m.simge / 2, m.simge, c.ink);
    yer.geriAl = { x: cxs - m.cepD * 1.5, y: ky, w: m.cepD, h: caseH };
    yer.yinele = { x: cxs - m.cepD / 2, y: ky, w: m.cepD, h: caseH };
    // pembe halka: seçili kalemin ucunda (48 birimlik LOOP; tepesi kalkan ucun 4 dp üstünde)
    s += '<g class="kr__halka" data-kr-halka><g transform="translate(' + r2(-m.halka / 2) + ',' + r2(ky + m.bas - 4 - m.halka * 0.146) + ') scale(' + r2(m.halka / 48) + ')">' +
      '<path d="' + DOODLE.LOOP + '" fill="none" stroke="' + c.vurgu + '" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></g></g>';
    x += caseW;
    // sağ grup: [resim, dışa aktar], ⋯
    var sag = W - m.pay - m.tus;
    var eylem = ayar.eylemler ? m.tus * 2 + 12 : 0;
    s += tus('daha', DOODLE.MORE, sag, m.tus, 9);
    if (ayar.eylemler) { s += tus('aktar', DOODLE.EXPORT, sag - 6 - m.tus, m.tus, 11); s += tus('resim', DOODLE.IMAGE, sag - 12 - m.tus * 2, m.tus, 10); }
    // mürekkep alanı: kutu ile sağ grup arasında ortada
    var murekkepX0 = x + 12, murekkepX1 = sag - eylem - 12;
    s += '<g data-kr-murekkep></g>';
    // çubuğun altı: elle çizilmiş mürekkep çizgisi
    var yy = H - 1.6, sn = Math.max(2, Math.floor(W / 150)), cz = 'M0,' + r2(yy);
    for (var i = 0; i < sn; i++) {
      var a0 = W * i / sn, a1 = W * (i + 1) / sn, sg = i % 2 ? -1 : 1;
      cz += 'C' + r2(a0 + (a1 - a0) * 0.33) + ',' + r2(yy - 0.6 * sg) + ' ' + r2(a0 + (a1 - a0) * 0.67) + ',' + r2(yy + 0.6 * sg) + ' ' + r2(a1) + ',' + r2(yy);
    }
    s += kursun(cz, c.ink, 1.6);

    var kok = document.createElement('div');
    kok.className = 'kr';
    kok.setAttribute('aria-hidden', 'true');
    kok.style.setProperty('--kr-en', W);
    kok.style.setProperty('--kalk', -m.kalk + 'px');
    kok.style.setProperty('--kr-boy', H);
    kok.innerHTML = '<svg class="kr__svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" focusable="false" aria-hidden="true">' + s + '</svg>';
    if (kap) kap.appendChild(kok);
    var etiketG = kok.querySelector('[data-kr-etiket]'), murG = kok.querySelector('[data-kr-murekkep]'), halka = kok.querySelector('[data-kr-halka]');

    // etiket: yazı ölçülür, çevresine kâğıt zemin ve ince kenar
    var olcer = null;
    function yaziEn(metin, boy, kalin) {
      if (!olcer) olcer = document.createElement('canvas').getContext('2d');
      olcer.font = (kalin ? '600 ' : '400 ') + boy + 'px Roboto, system-ui, sans-serif';
      return olcer.measureText(metin).width;
    }
    function etiket(ad, alt) {
      var b = m.etiket, a1 = yaziEn(ad, b, true), a2 = alt ? yaziEn('  ' + alt, b, false) : 0, w = Math.min(a1 + a2, duvarW - 14 - 12), h = b + 1;
      etiketG.innerHTML = '<rect x="' + r2(-w / 2 - 6) + '" y="' + r2(-h / 2 - 0.5) + '" width="' + r2(w + 12) + '" height="' + r2(h + 1) + '" rx="5" fill="' + c.kagit + '" stroke="' + c.ink + '" stroke-opacity="0.75" stroke-width="1"/>' +
        '<text x="' + r2(-w / 2) + '" y="' + r2(b * 0.36) + '" font-family="Roboto, system-ui, sans-serif" font-size="' + b + '"><tspan fill="' + c.vurgu + '" font-weight="600">' + ad + '</tspan>' +
        (alt ? '<tspan fill="' + c.ink2 + '" xml:space="preserve">  ' + alt + '</tspan>' : '') + '</text>';
    }
    // iki katlı mürekkep alanı: üstte kalınlık izleri + ayar düğmesi, altta renk lekeleri (kutunun gövde çizgisinde)
    // kalınlık düğmesinin sabit genişliği: iç pay + simge + en uzun değer ("00,0", rememberAdjustWidth)
    var ayarW = Math.max(m.ayar, 13 + m.simge + 3 + yaziEn('00,0', m.etiket + 2, true) + 2);
    function murekkepAlani(renk, hl, mmIdx) {
      var renkW = m.hucre * 5, boyW = m.boyH * 2 + ayarW, blokW = Math.max(renkW, boyW);
      var bx = murekkepX0 + Math.max(0, (murekkepX1 - murekkepX0 - blokW) / 2), out = '';
      // alt kat: renkler (hücre m.hucre × gövde)
      var ry = ky + tipBand + m.govde / 2, rx0 = bx + (blokW - renkW) / 2, lb = Math.min(m.leke, m.govde - 4);
      HIZLI.forEach(function (col, i) {
        var cx = rx0 + m.hucre * i + m.hucre / 2;
        yer['renk' + i] = { x: rx0 + m.hucre * i, y: ky + tipBand, w: m.hucre, h: m.govde };
        var on = renk === col, sc = lb / 30;
        out += '<g transform="translate(' + r2(cx - lb / 2) + ',' + r2(ry - lb / 2) + ') scale(' + r2(sc) + ')"><path d="' + leke(i) + '" fill="' + col + '"/>' +
          '<path d="' + leke(i + 3) + '" transform="translate(0.8,0.6)" fill="none" stroke="' + col + '" stroke-opacity="0.5" stroke-width="1.2"/>' +
          '<path d="' + leke(i) + '" fill="none" stroke="' + c.ink + '" stroke-opacity="' + (c.koyu ? 0.5 : 0.2) + '" stroke-width="1"/>' +
          (on ? '<path d="' + DOODLE.TICK + '" fill="none" stroke="' + (parlaklik(col) < 150 ? '#FFFFFF' : '#2A2427') + '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>' : '') + '</g>';
      });
      // özel renk (KarmaColors): kayıtlı renk varsa düz leke, seçiliyse üstünde ✓; yoksa gökkuşağı leke + beyaz artı
      var ox = rx0 + m.hucre * 4 + m.hucre / 2, sc2 = lb / 30, oz = ayar.ozel;
      yer.ozel = { x: rx0 + m.hucre * 4, y: ky + tipBand, w: m.hucre, h: m.govde };
      out += '<g transform="translate(' + r2(ox - lb / 2) + ',' + r2(ry - lb / 2) + ') scale(' + r2(sc2) + ')">';
      if (oz) {
        out += '<path d="' + leke(5) + '" fill="' + oz + '"/><path d="' + leke(8) + '" transform="translate(0.8,0.6)" fill="none" stroke="' + oz + '" stroke-opacity="0.5" stroke-width="1.2"/>' +
          '<path d="' + leke(5) + '" fill="none" stroke="' + c.ink + '" stroke-opacity="' + (c.koyu ? 0.5 : 0.22) + '" stroke-width="1"/>' +
          (renk === oz ? '<path d="' + DOODLE.TICK + '" fill="none" stroke="' + (parlaklik(oz) < 150 ? '#FFFFFF' : '#2A2427') + '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>' : '');
      } else {
        out += '<defs><linearGradient id="' + id + '-gk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E53935"/><stop offset="0.3" stop-color="#FFC107"/>' +
          '<stop offset="0.55" stop-color="#43A047"/><stop offset="0.8" stop-color="#2196F3"/><stop offset="1" stop-color="#8E24AA"/></linearGradient></defs>' +
          '<path d="' + leke(5) + '" fill="url(#' + id + '-gk)"/><path d="' + leke(5) + '" fill="none" stroke="' + c.ink + '" stroke-opacity="' + (c.koyu ? 0.5 : 0.22) + '" stroke-width="1"/>' +
          '<path d="M15,10V20M10,15H20" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round"/>';
      }
      out += '</g>';
      // üst kat: kalınlık izleri (hücre m.boyH × topCellH, bandın altına yaslı) + ayar düğmesi
      var sy0 = ky + tipBand - topCellH, sx0 = bx + (blokW - boyW) / 2;
      DEFTER_MM.forEach(function (mm, i) {
        var cw = m.boyH - 4, chh = cw * 0.65, cx = sx0 + m.boyH * i + m.boyH / 2, cy = sy0 + topCellH / 2, sc = cw / 40;
        yer['mm' + i] = { x: sx0 + m.boyH * i, y: sy0, w: m.boyH, h: topCellH };
        var w = hl ? mm * 2.2 : Math.max(1.6, Math.min(9, mm * 1.15));
        out += '<g transform="translate(' + r2(cx - cw / 2) + ',' + r2(cy - chh / 2) + ') scale(' + r2(sc) + ')">' +
          '<path d="' + DOODLE.SQUIGGLE + '" fill="none" stroke="' + renk + '" stroke-opacity="' + (hl ? 0.55 : 1) + '" stroke-width="' + r2(w) + '" stroke-linecap="' + (hl ? 'butt' : 'round') + '" stroke-linejoin="round"/>' +
          (i === mmIdx ? '<path d="' + DOODLE.UNDERLINE + '" fill="none" stroke="' + c.vurgu + '" stroke-width="2" stroke-linecap="round"/>' : '') + '</g>';
      });
      var ax = sx0 + m.boyH * 2, kh = Math.min(topCellH, m.govde), ay = sy0 + (topCellH - kh) / 2;
      yer.ayar = { x: ax, y: ay, w: ayarW, h: kh };
      var ak = titrekKutu(ax + 0.6, ay + 0.6, ayarW - 1.2, kh - 1.2, (kh - 1.2) / 2, 5, 0.8);
      var ib = Math.min(m.simge, kh - 2), ic = ax + 8, iy = ay + kh / 2 - ib / 2, is = ib / 24;
      out += '<path d="' + ak + '" fill="' + karisim(c.kuyu, c.ink, 0.05) + '"/>' + kursun(ak, c.ink, 1.3) +
        '<g transform="translate(' + r2(ic) + ',' + r2(iy) + ') scale(' + r2(is) + ')" stroke="' + c.ink + '" stroke-linecap="round">' +
        '<path d="M4.2 6.4L19.8 6.1" stroke-width="1.3"/><path d="M4 12.1L20 11.9" stroke-width="2.5"/><path d="M4.2 18.2L19.8 18" stroke-width="4.2"/></g>';
      murG.innerHTML = out;
    }

    var o = { kok: kok, en: W, boy: H, yuvalar: yuvalar, kalemler: kalemler, c: c, olcu: m };
    o.yer = function (ad) { return yer[ad] || null; };
    o.merkez = function (ad) { var k = yer[ad]; if (!k) return null; return ad.charAt(0) === 'k' || ad === 'silgi' || ad === 'kement' || ad === 'sekil' || ad === 'ekle' ? [k.x + k.w / 2, k.y + m.bas + m.kalk + 10] : [k.x + k.w / 2, k.y + k.h / 2]; };
    // hâl: { sec } — seçili kalem kalkar, halka ucuna geçer, etiket ve mürekkep alanı ona göre
    // d: { sec, sekilAd?, sekilRenk?, sekilMm? } (şekil seçiliyken etiket ve mürekkep alanı için)
    o.durum = function (d) {
      var anahtar = d.sec + '|' + (d.sekilAd || '') + '|' + (d.sekilRenk || '') + '|' + (d.sekilMm || '');
      if (o.anahtar === anahtar) return;
      o.anahtar = anahtar;
      o.d = { sec: d.sec };
      var a = kok.querySelectorAll('[data-kr-arac]');
      for (var i = 0; i < a.length; i++) a[i].classList.toggle('kr__arac--sec', a[i].getAttribute('data-kr-arac') === d.sec);
      var y = null;
      yuvalar.forEach(function (q) { if (q.ad === d.sec) y = q; });
      if (y) halka.style.transform = 'translateX(' + r2(y.cx) + 'px)';
      halka.style.opacity = y && y.ad !== 'ekle' ? '1' : '0';
      if (y && y.kalem) {
        etiket(defterKalemAdi(y.kalem), mmYaz(y.kalem.mm));
        murekkepAlani(y.kalem.renk, y.kalem.hl, DEFTER_MM.indexOf(y.kalem.mm));
      } else if (y && y.tur === 'silgi') { etiket(dil('Silgi', 'Eraser'), dil('bütün çizgi', 'whole stroke')); murG.innerHTML = ''; }
      else if (y && y.tur === 'kement') { etiket(dil('Kement', 'Lasso'), ''); murG.innerHTML = ''; }
      else if (y && y.tur === 'sablon') {
        var smm = d.sekilMm || 2;
        etiket(dil('Şekil: ', 'Shape: ') + (d.sekilAd || dil('üçgen', 'triangle')), mmYaz(smm));
        murekkepAlani(d.sekilRenk || y.renk, false, DEFTER_MM.indexOf(smm));
      }
    };
    o.durum(ayar.durum || { sec: 'k0' });
    return o;
  }
  Karma.no = 0;

  /* ---------------------------------------------------------- KUTUNUN KARTLARI (DockedKit.kt › DPopCard, TrayTok)
     Kutunun malzemesi: yarı saydam sıcak gri gövde + 5 dp duvar + koyu panel (#221E20, 12 dp iç pay); seçimler kutunun
     mod tuşu gibi açık plaka (#F2ECEF), düğmeler hap, sağ üstte küçük koyu daire içinde çarpı. Yazılar HTML (çevrilir),
     renkli ve konumlu parçalar SVG (satır içi stil yok: CSP). Ölçüler dp; kartın --dp'si ekrana çevirir. Kart
     yerleştirilmez: kök döner, çağıran koyar. */
  var PALET = ['#1D1B1E', '#FFFFFF', '#E5484D', '#F76B15', '#FFC53D', '#30A46C', '#0090FF', '#8E4EC6'];
  var KALIN = { kalem: [1.5, 3, 6], fosforlu: [8, 14, 22], silgi: [12, 24, 44] };   // DInkSpec.PEN / HL / ERASER
  var ARALIK = { kalem: [0.8, 12], fosforlu: [4, 32], silgi: [6, 72] };             // PEN_RANGE / HL_RANGE / ERASER_RANGE
  var KC = { surf: '#221E20', alt: '#2E292B', well: '#141113', fg: '#EDE6EA', dim: '#A0969B', plaka: '#F2ECEF', tehlike: '#FF8F80', ray: 'rgba(255,255,255,0.14)' };
  function enYakin(d, v) { var b = 0; d.forEach(function (x, i) { if (Math.abs(x - v) < Math.abs(d[b] - v)) b = i; }); return b; }
  // fmtDp: 10 ve üstü ya da tam sayı ondalıksız, değilse bir ondalık (Locale.US: nokta)
  function dpYaz(v) { var r = Math.round(v * 10) / 10; return (r >= 10 || r === Math.round(r) ? Math.round(r) : r.toFixed(1)) + ' dp'; }
  function karsitlik(a, b) {
    function l(h) { return hexRgb(h).map(toLin).reduce(function (s, c, i) { return s + c * [0.2126, 0.7152, 0.0722][i]; }, 0); }
    var x = l(a), y = l(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }
  function kcSimge(ad, sinif) { return '<svg class="' + (sinif || 'kc__simge') + '" aria-hidden="true" focusable="false"><use href="#' + ad + '"/></svg>'; }
  var KC_KAPAT = '<span class="kc__kapat">' + kcSimge('ph-x-bold') + '</span>';
  function kcBolme(adlar, sec, sinif) {
    return '<span class="kc__bolme' + (sinif ? ' ' + sinif : '') + '">' + adlar.map(function (a, i) { return '<span' + (i === sec ? ' class="kc__sec"' : '') + '>' + a + '</span>'; }).join('') + '</span>';
  }
  // ilk satır: içerik + çarpının yeri (D_CLOSE_RESERVE 36 dp)
  function kcIlk(ic) { return '<div class="kc__ilk">' + ic + '</div>' + KC_KAPAT; }
  function kcBaslik(metin, ek) { return kcIlk('<b class="kc__baslik">' + metin + '</b>' + (ek || '')); }
  // renkler tek sırada: hücre kart genişliğine bölünür, yuva 18 dp; seçili halka r + 3 (1,5 dp); koyu zeminde okunmayana ince açık kenar
  function kcRenkler(en, sec) {
    var h = en / PALET.length, s = '<svg class="kc__renkler" viewBox="0 0 ' + r2(en) + ' 34" aria-hidden="true">';
    PALET.forEach(function (r, i) {
      var cx = r2(h * i + h / 2);
      if (r === sec) s += '<circle cx="' + cx + '" cy="17" r="12" fill="none" stroke="' + KC.fg + '" stroke-width="1.5"/>';
      s += '<circle cx="' + cx + '" cy="17" r="9" fill="' + r + '"/>';
      if (karsitlik(r, KC.surf) < 1.6) s += '<circle cx="' + cx + '" cy="17" r="8.5" fill="none" stroke="#FFFFFF" stroke-opacity="0.28"/>';
    });
    return s + '</svg>';
  }
  // üç hazır kalınlık: hap (32 dp, 6 dp ara); kalemde dolu nokta, fosforluda yuvarlak kare (mürekkep renginde), silgide halka
  function kcKalinlik(tur, deger, renk) {
    var sec = enYakin(KALIN[tur], deger), s = '<span class="kc__boylar">';
    for (var i = 0; i < 3; i++) {
      var on = i === sec, c = on ? KC.surf : tur === 'fosforlu' ? renk : KC.fg, g;
      if (tur === 'kalem') g = '<circle cx="12" cy="12" r="' + [4, 7, 11][i] / 2 + '" fill="' + c + '"/>';
      else if (tur === 'fosforlu') { var a = [7, 11, 15][i]; g = '<rect x="' + (12 - a / 2) + '" y="' + (12 - a / 2) + '" width="' + a + '" height="' + a + '" rx="' + r2(a * 0.28) + '" fill="' + c + '"/>'; }
      else g = '<circle cx="12" cy="12" r="' + [12, 16, 20][i] / 2 + '" fill="none" stroke="' + c + '" stroke-width="1.5"/>';
      s += '<span' + (on ? ' class="kc__sec"' : '') + '><svg viewBox="0 0 24 24" aria-hidden="true">' + g + '</svg></span>';
    }
    return s + '</span>';
  }
  // kaydırıcı (DSlider): 4 dp ray, dolu kısmı mürekkep renginde, 20 dp başparmak (altında hafif gölge); sağında değer
  function kcKaydirici(en, deger, aralik, renk, yazi) {
    var w = en - 44, pad = 10, f = Math.max(0, Math.min(1, (deger - aralik[0]) / (aralik[1] - aralik[0]))), run = (w - 2 * pad) * f, x = pad + run;
    return '<span class="kc__kaydir"><svg viewBox="0 0 ' + r2(w) + ' 30" aria-hidden="true">' +
      '<rect x="' + pad + '" y="13" width="' + r2(w - 2 * pad) + '" height="4" rx="2" fill="#FFFFFF" fill-opacity="0.14"/>' +
      '<rect x="' + pad + '" y="13" width="' + r2(Math.max(4, run)) + '" height="4" rx="2" fill="' + renk + '"/>' +
      '<circle cx="' + r2(x) + '" cy="16" r="10.5" fill="#000" fill-opacity="0.2"/><circle cx="' + r2(x) + '" cy="15" r="10" fill="' + KC.plaka + '"/></svg>' +
      '<span class="kc__deger">' + yazi + '</span></span>';
  }
  function kcSatir(simgeAd, metin, tehlike) { return '<span class="kc__satir' + (tehlike ? ' kc__satir--tehlike' : '') + '">' + kcSimge(simgeAd) + '<span>' + metin + '</span></span>'; }
  // kalem kartının önizlemesi: yatan kalem (ucu 92 dp'de, gövdesi sola), ucun sağından kartın ucuna gerçek kalınlıkta iz
  function kcKalemOnizleme(en, p) {
    var tur = p.hl ? 'fosforlu' : 'kalem', sw = Math.max(1.5, Math.min(22, p.k)), id = 'kco' + (++kcKok.no);
    var iz = 'M112,26C128,9 146,10 158,22C170,34 186,36 ' + r2(en - 16) + ',18';
    return '<svg class="kc__kuyu" viewBox="0 0 ' + r2(en) + ' 44" aria-hidden="true"><defs><clipPath id="' + id + '"><rect width="' + r2(en) + '" height="44" rx="22"/></clipPath></defs>' +
      '<rect width="' + r2(en) + '" height="44" rx="22" fill="' + KC.well + '"/><g clip-path="url(#' + id + ')">' +
      '<g transform="translate(92,22) rotate(90) scale(1.05)">' + aracSvg(tur, p.renk, 'p') + '</g>' +
      (karsitlik(p.renk, KC.well) < 1.7 ? '<path d="' + iz + '" fill="none" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="' + r2(sw + 2.4) + '" stroke-linecap="round"/>' : '') +
      '<path d="' + iz + '" fill="none" stroke="' + p.renk + '"' + (p.hl ? ' stroke-opacity="0.45"' : '') + ' stroke-width="' + r2(sw) + '" stroke-linecap="round"/></g></svg>';
  }
  // şekil simgesi (dShapeGlyph) w × h kutuda; önizleme (dShapePreview) kuyunun ortasında
  function sekilYolu(sekil, l, t, r, b) {
    var cx = (l + r) / 2, cy = (t + b) / 2;
    if (sekil === 'cizgi') return 'M' + r2(l) + ',' + r2(b) + 'L' + r2(r) + ',' + r2(t);
    if (sekil === 'ok') { var ah = (r - l) * 0.34; return 'M' + r2(l) + ',' + r2(b) + 'L' + r2(r) + ',' + r2(t) + 'M' + r2(r - ah) + ',' + r2(t) + 'L' + r2(r) + ',' + r2(t) + 'L' + r2(r) + ',' + r2(t + ah); }
    if (sekil === 'dikdortgen') return 'M' + r2(l) + ',' + r2(t) + 'H' + r2(r) + 'V' + r2(b) + 'H' + r2(l) + 'Z';
    if (sekil === 'oval') { var rx = (r - l) / 2, ry = (b - t) / 2; return 'M' + r2(l) + ',' + r2(cy) + 'A' + r2(rx) + ',' + r2(ry) + ' 0 1 0 ' + r2(r) + ',' + r2(cy) + 'A' + r2(rx) + ',' + r2(ry) + ' 0 1 0 ' + r2(l) + ',' + r2(cy) + 'Z'; }
    if (sekil === 'ucgen') return 'M' + r2(cx) + ',' + r2(t) + 'L' + r2(r) + ',' + r2(b) + 'L' + r2(l) + ',' + r2(b) + 'Z';
    var s = '';
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 5, k = i % 2 ? 0.42 : 1;
      s += (i ? 'L' : 'M') + r2(cx + (r - l) / 2 * k * Math.cos(a)) + ',' + r2(cy + (b - t) / 2 * k * Math.sin(a));
    }
    return s + 'Z';
  }
  var SEKILLER = ['cizgi', 'ok', 'dikdortgen', 'oval', 'ucgen', 'yildiz'];
  function kcSekilOnizleme(en, sekil, renk, sw) {
    var cx = en / 2, cy = 22, d;
    if (sekil === 'cizgi' || sekil === 'ok') {
      d = 'M' + r2(cx - 64) + ',' + (cy + 8) + 'L' + r2(cx + 64) + ',' + (cy - 8);
      if (sekil === 'ok') {
        var ang = Math.atan2(16, -128), len = 9 + sw;
        [-1, 1].forEach(function (k) { var a = ang + k * Math.PI / 6; d += 'M' + r2(cx + 64 + len * Math.cos(a)) + ',' + r2(cy - 8 + len * Math.sin(a)) + 'L' + r2(cx + 64) + ',' + (cy - 8); });
      }
    } else if (sekil === 'ucgen') d = 'M' + r2(cx) + ',' + (cy - 12) + 'L' + r2(cx + 21) + ',' + (cy + 11) + 'L' + r2(cx - 21) + ',' + (cy + 11) + 'Z';
    else if (sekil === 'yildiz') d = sekilYolu('yildiz', cx - 13, cy + 1 - 13, cx + 13, cy + 1 + 13);
    else d = sekilYolu(sekil, cx - 46, cy - 11, cx + 46, cy + 11);
    return '<svg class="kc__kuyu" viewBox="0 0 ' + r2(en) + ' 44" aria-hidden="true"><rect width="' + r2(en) + '" height="44" rx="22" fill="' + KC.well + '"/>' +
      (karsitlik(renk, KC.well) < 1.7 ? '<path d="' + d + '" fill="none" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="' + r2(sw + 2.4) + '" stroke-linecap="round" stroke-linejoin="round"/>' : '') +
      '<path d="' + d + '" fill="none" stroke="' + renk + '" stroke-width="' + r2(sw) + '" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  function kcKok(en, ic, sinif) {
    var k = document.createElement('div');
    k.className = 'kc' + (sinif ? ' ' + sinif : '');
    k.setAttribute('aria-hidden', 'true');
    k.style.setProperty('--kc-en', en);
    k.innerHTML = '<div class="kc__ic">' + ic + '</div>';
    return k;
  }
  kcKok.no = 0;
  // panelin iç genişliği: kart − 2 × 5 duvar − 2 × pay
  function icEn(en, pay) { return en - 10 - 2 * (pay == null ? 12 : pay); }
  var KART = {
    // kalemi düzenle (PenEditor, 244 dp): tür, önizleme, renk, kalınlık, kaldır
    kalem: function (p, ek) {
      var en = 244, w = icEn(en), tur = p.hl ? 'fosforlu' : 'kalem', ray = karsitlik(p.renk, KC.surf) < 1.6 ? KC.fg : p.renk;
      return kcKok(en, kcIlk(kcBolme([dil('Kalem', 'Pen'), dil('Fosforlu', 'Highlighter')], p.hl ? 1 : 0)) +
        kcKalemOnizleme(w, p) + kcRenkler(w, p.renk) + kcKalinlik(tur, p.k, p.renk) +
        kcKaydirici(w, p.k, ARALIK[tur], ray, dpYaz(p.k)) +
        (ek && ek.kaldir === false ? '' : kcSatir('ph-trash', dil('Bu kalemi kutudan çıkar', 'Remove this pen'), true)), 'kc--kalem');
    },
    // silgi (DEraserPicker, 252 dp): parça / bütün çizgi, boyut, tümünü temizle
    silgi: function (deger, butun) {
      var en = 252, w = icEn(en);
      return kcKok(en, kcIlk(kcBolme([dil('Parça', 'Partial'), dil('Bütün çizgi', 'Whole stroke')], butun ? 1 : 0)) +
        kcKalinlik('silgi', deger, KC.fg) + kcKaydirici(w, deger, ARALIK.silgi, KC.fg, dpYaz(deger)) +
        kcSatir('ph-trash', dil('Tümünü temizle', 'Clear all'), true), 'kc--silgi');
    },
    // şekil (DShapePicker, 244 dp): altı şekil tek sırada, önizleme, renk, kalınlık
    sekil: function (sekil, renk, k) {
      var en = 244, w = icEn(en), sim = karsitlik(renk, KC.alt) >= 2 ? renk : KC.fg, s = '<span class="kc__sekiller">';
      SEKILLER.forEach(function (sk) {
        var on = sk === sekil;
        s += '<span' + (on ? ' class="kc__sec"' : '') + '><svg viewBox="0 0 18 18" aria-hidden="true"><path d="' + sekilYolu(sk, 2.52, 2.52, 15.48, 15.48) + '" fill="none" stroke="' + (on ? KC.surf : sim) +
          '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
      });
      s += '</span>';
      return kcKok(en, kcBaslik(dil('Şekil', 'Shape')) + s + kcSekilOnizleme(w, sekil, renk, k) + kcRenkler(w, renk) + kcKalinlik('kalem', k, renk) +
        kcKaydirici(w, k, ARALIK.kalem, karsitlik(renk, KC.surf) < 1.6 ? KC.fg : renk, dpYaz(k)), 'kc--sekil');
    },
    // ⋯ menüsü (DMenu, 216 dp, 8 dp pay); Kapat kutunun kendisinde, menüde yok
    menu: function () {
      return kcKok(216, kcIlk(kcSatir('ph-file-text', dil('Sayfa', 'Page'))) + kcSatir('ph-camera', dil('Ekran görüntüsü', 'Screenshot')) +
        kcSatir('ph-eye-slash', dil('Çizimleri gizle', 'Hide drawings')) + kcSatir('ph-trash', dil('Tümünü temizle', 'Clear all')) +
        kcSatir('ph-arrows-in-simple', dil('Küçült', 'Minimize')), 'kc--menu');
    },
    // sayfa (DSheetPanel, 252 dp): Kapalı/Açık, kâğıt rengi, desen, yön, opaklık
    sayfa: function (d) {
      d = d || {};
      var en = 252, w = icEn(en), renkler = ['#FAFAFA', '#FDF6E3', '#FDFBF7', '#E9EEF5', '#1E1E2E', '#282C34'], sec = d.renk || '#FAFAFA';
      var ara = (w - 34 * 6) / 5, s = '<svg class="kc__kagitlar" viewBox="0 0 ' + r2(w) + ' 34" aria-hidden="true">';
      renkler.forEach(function (r, i) {
        var cx = r2(17 + i * (34 + ara));
        if (r === sec) s += '<circle cx="' + cx + '" cy="17" r="14.5" fill="none" stroke="' + KC.fg + '" stroke-width="1.5"/>';
        s += '<circle cx="' + cx + '" cy="17" r="11" fill="' + r + '"/><circle cx="' + cx + '" cy="17" r="10.5" fill="none" stroke="#FFFFFF" stroke-opacity="0.2"/>';
      });
      s += '</svg>';
      var desen = ['bos', 'kareli', 'cizgili', 'noktali'].indexOf(d.desen || 'kareli'), op = d.opak == null ? 1 : d.opak;
      return kcKok(en, kcIlk('<b class="kc__baslik">' + dil('Sayfa', 'Page') + '</b>' + kcBolme([dil('Kapalı', 'Off'), dil('Açık', 'On')], d.kapali ? 0 : 1, 'kc__bolme--dar')) + s +
        kcBolme([dil('Boş', 'Blank'), dil('Kareli', 'Grid'), dil('Çizgili', 'Lined'), dil('Noktalı', 'Dotted')], desen, 'kc__bolme--desen') +
        (d.yon === false ? '' : kcBolme([dil('Dikey', 'Portrait'), dil('Yatay', 'Landscape')], d.yatay ? 1 : 0, 'kc__bolme--yon')) +
        kcKaydirici(w, op, [0.4, 1], KC.fg, dil('%' + Math.round(op * 100), Math.round(op * 100) + '%')), 'kc--sayfa');
    },
    // ekran görüntüsü (DCapturePanel, 240 dp)
    goruntu: function (hazir) {
      return kcKok(240, kcBaslik(dil('Ekran görüntüsü', 'Screenshot')) +
        '<p class="kc__not">' + (hazir ? dil('Neyi kaydedeceğini seç.', 'Choose what to save.') : dil('Arka plan için bir kez ekran izni vermen gerekir.', 'The background needs a one-time screen permission.')) + '</p>' +
        '<span class="kc__secenek">' + kcSimge('ph-pen-nib-straight') + '<span>' + dil('Sadece yazı', 'Only my writing') + '</span></span>' +
        '<span class="kc__secenek">' + kcSimge('ph-camera') + '<span>' + dil('Arka planla birlikte', 'Writing + background') + '</span></span>', 'kc--goruntu');
    },
    // onay (DConfirm, 240 dp)
    onay: function (baslik, metin, tamam) {
      return kcKok(240, kcBaslik(baslik) + '<p class="kc__not">' + metin + '</p>' +
        '<span class="kc__onay"><span>' + dil('Vazgeç', 'Cancel') + '</span><span class="kc__tamam">' + tamam + '</span></span>', 'kc--onay');
    }
  };

  OSN.kutu = {
    KalemKutusu: KalemKutusu, Karma: Karma, DEFTER_BASLANGIC: DEFTER_BASLANGIC, DOODLE: DOODLE, titrekKutu: titrekKutu, kursun: kursun, karalama: karalama,
    KarmaMurekkep: KarmaMurekkep, karisim: karisim, defterKalemAdi: defterKalemAdi, mmYaz: mmYaz, KART: KART, PALET: PALET, KucukKutu: KucukKutu,
    // çalışan kartlar (sayfanın kalemi, kalem.js) için parçalar
    kc: { kalemOnizleme: kcKalemOnizleme, sekilOnizleme: kcSekilOnizleme, sekilYolu: sekilYolu, SEKILLER: SEKILLER, KALIN: KALIN, ARALIK: ARALIK, dpYaz: dpYaz, karsitlik: karsitlik, enYakin: enYakin, simge: kcSimge },
    BASLANGIC: BASLANGIC, OLCU: OLCU, kalemAdi: kalemAdi,
    aracSvg: aracSvg, KENAR: KENAR, renk: { lab: lab, fromLab: fromLab, tint: tint, shade: shade, lift: lift, toward: toward, koyuMu: koyuMu, acikMi: acikMi },
    svgYaz: svgYaz, kirpId: kirpId, rrect: rrect, daire: daire, poly: poly, rect: rect
  };
})();
