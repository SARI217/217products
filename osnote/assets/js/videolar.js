/* ============================================================
   OSNote tanıtım sitesi · cihazlardaki videolar
   ------------------------------------------------------------
   Videoların kareleri tuvalde çizilir; hepsi bu site için
   hazırlandı (gerçek bir kanalın kopyası değil).
   - Ders videosu: eğik atış, koyu zeminli bir anlatım animasyonu.
     Top yörüngede ilerler, hız bileşenleri değişir; altyazı ve
     oynatıcının ilerleme çubuğu karenin içinde.
   Kare çizimi zamana bağlı ve durumsuz: ciz(t) aynı t için hep
   aynı kareyi verir.
   ============================================================ */
(function () {
  'use strict';
  var OSN = window.OSN || (window.OSN = {});
  var dil = OSN.dil || function (tr) { return tr; };
  var M = OSN.m;
  if (!M) return;

  function tuvalHazirla(tuval, W, H) {
    var r = tuval.getBoundingClientRect();
    if (!r.width) return null;
    var d = M.dpr(), w = Math.max(1, Math.round(r.width * d)), h = Math.max(1, Math.round(r.height * d));
    if (tuval.width !== w) tuval.width = w;
    if (tuval.height !== h) tuval.height = h;
    var c = tuval.getContext('2d');
    c.setTransform(w / W, 0, 0, h / H, 0, 0);
    return c;
  }
  // "v_y = 0": _ alt simge, ^ üst simge (tek karakter); italik: değişkenler eğik
  function formul(c, metin, x, y, boy, renk, hiza, italik) {
    var par = [], i = 0;
    while (i < metin.length) {
      var ch = metin[i];
      if ((ch === '_' || ch === '^') && i + 1 < metin.length) { par.push([metin[i + 1], ch]); i += 2; }
      else { var j = i; while (j < metin.length && metin[j] !== '_' && metin[j] !== '^') j++; par.push([metin.slice(i, j), '']); i = j; }
    }
    var kucuk = Math.round(boy * 0.7 * 10) / 10;
    function yaz(ciz) {
      var cx = x;
      for (var k = 0; k < par.length; k++) {
        var t = par[k][1];
        c.font = (italik ? 'italic ' : '') + (t ? kucuk : boy) + 'px Roboto, system-ui, sans-serif';
        var w = c.measureText(par[k][0]).width;
        if (ciz) c.fillText(par[k][0], cx, y + (t === '_' ? boy * 0.3 : t === '^' ? -boy * 0.38 : 0));
        cx += w + (t ? 0.6 : 0);
      }
      return cx - x;
    }
    c.fillStyle = renk;
    c.textAlign = 'left';
    var en = yaz(false);
    if (hiza === 'sag') x -= en;
    else if (hiza === 'orta') x -= en / 2;
    yaz(true);
    return en;
  }
  function kutuYol(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function ok(c, ax, ay, bx, by, renk, kal, uc) {
    var a = Math.atan2(by - ay, bx - ax), u = uc || 7.5, L = Math.hypot(bx - ax, by - ay);
    if (L < 1) return;
    c.strokeStyle = renk; c.fillStyle = renk; c.lineWidth = kal || 2; c.lineCap = 'round';
    c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx - Math.cos(a) * u * 0.7, by - Math.sin(a) * u * 0.7); c.stroke();
    c.beginPath(); c.moveTo(bx, by);
    c.lineTo(bx - u * Math.cos(a - 0.4), by - u * Math.sin(a - 0.4));
    c.lineTo(bx - u * Math.cos(a + 0.4), by - u * Math.sin(a + 0.4));
    c.closePath(); c.fill();
  }

  /* ========================================================== DERS VİDEOSU
     Eğik atış: v0 = 50 m/s, 53° (sin 0,8 / cos 0,6) → vx 30, vy 40, g 10. Tepe t = 4 sn, 120 m, 80 m.
     Kare 494×278 (16:9); telefonda aynı kare küçülür. */
  var DERS = { W: 494, H: 278, x0: 52, yer: 222, o: 1.6, vx: 30, vy: 40, g: 10, tepeT: 4, sure: 1865, bas: 764 };
  var MAVI = '#58C4DD', YESIL = '#83C167', KIRMIZI = '#FC6255', CAMGOBEGI = '#5CD0B3';
  function dersKonum(t) { return [DERS.x0 + DERS.vx * t * DERS.o, DERS.yer - (DERS.vy * t - DERS.g / 2 * t * t) * DERS.o]; }
  var DERS_TEPE = dersKonum(DERS.tepeT); // [244, 94]
  function sure(sn) { var d = Math.floor(sn / 60), s = Math.floor(sn % 60); return d + ':' + (s < 10 ? '0' : '') + s; }

  // t: fizik zamanı (sn), dur: duraklatmadan beri geçen evre (0..1; yoksa -1),
  // kontrol: oynatıcının denetimlerinin görünürlüğü (0..1; dokununca görünür, sonra kaybolur)
  function dersCiz(tuval, t, dur, kontrol) {
    var W = DERS.W, H = DERS.H, c = tuvalHazirla(tuval, W, H);
    if (!c) return false;
    c.fillStyle = '#0C1218';
    c.fillRect(0, 0, W, H);
    var v = c.createRadialGradient(W * 0.5, H * 0.46, 60, W * 0.5, H * 0.5, W * 0.62);
    v.addColorStop(0, 'rgba(22,34,44,0.55)');
    v.addColorStop(1, 'rgba(0,0,0,0.4)');
    c.fillStyle = v;
    c.fillRect(0, 0, W, H);
    var x0 = DERS.x0, yer = DERS.yer, o = DERS.o, xs = x0 + 240 * o;
    // koordinat ızgarası (20 m)
    c.lineWidth = 1;
    c.strokeStyle = 'rgba(88,196,221,0.08)';
    c.beginPath();
    for (var X = 20; X <= 260; X += 20) { c.moveTo(x0 + X * o + 0.5, 34); c.lineTo(x0 + X * o + 0.5, yer); }
    for (var Y = 20; Y <= 110; Y += 20) { c.moveTo(x0 - 30, yer - Y * o + 0.5); c.lineTo(W - 12, yer - Y * o + 0.5); }
    c.stroke();
    // eksenler
    c.strokeStyle = 'rgba(236,240,243,0.55)';
    c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(20, yer + 0.5); c.lineTo(W - 12, yer + 0.5); c.stroke();
    c.strokeStyle = 'rgba(236,240,243,0.22)';
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(x0 + 0.5, yer); c.lineTo(x0 + 0.5, 30); c.stroke();
    c.fillStyle = 'rgba(236,240,243,0.4)';
    [60, 120, 180, 240].forEach(function (m) { c.fillRect(x0 + m * o, yer, 1, 4); });
    // yörüngenin tamamı: silik noktalar
    c.fillStyle = 'rgba(236,240,243,0.2)';
    for (var q = 0; q <= 8.001; q += 0.16) { var z = dersKonum(q); c.beginPath(); c.arc(z[0], z[1], 0.9, 0, 6.2832); c.fill(); }
    // atış açısı ve ilk hız
    c.strokeStyle = 'rgba(236,240,243,0.6)';
    c.lineWidth = 1.2;
    c.beginPath(); c.arc(x0, yer, 22, -0.9273, 0); c.stroke();
    formul(c, '53°', x0 + 27, yer - 7, 10, 'rgba(236,240,243,0.8)');
    ok(c, x0, yer, x0 + 26, yer - 34.7, 'rgba(236,240,243,0.75)', 1.5, 6.5);
    formul(c, 'v_0', x0 + 8, yer - 40, 11.5, 'rgba(236,240,243,0.85)', 'sol', true);
    // topun izi
    var tt = M.sinirla(t, 0, 8);
    c.strokeStyle = CAMGOBEGI;
    c.lineWidth = 2.2;
    c.lineCap = 'round';
    c.beginPath();
    for (var s = 0; s <= 60; s++) { var k = dersKonum(tt * s / 60); if (s) c.lineTo(k[0], k[1]); else c.moveTo(k[0], k[1]); }
    c.stroke();
    // tepe: yükseklik
    var p = dersKonum(tt), tepede = Math.abs(tt - DERS.tepeT) < 0.08;
    if (tt >= DERS.tepeT - 0.08) {
      c.save();
      c.setLineDash([4, 4]);
      c.strokeStyle = 'rgba(236,240,243,0.42)';
      c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(DERS_TEPE[0] + 0.5, DERS_TEPE[1] + 9); c.lineTo(DERS_TEPE[0] + 0.5, yer); c.stroke();
      c.restore();
      formul(c, 'h', DERS_TEPE[0] + 8, (DERS_TEPE[1] + yer) / 2 + 12, 13, 'rgba(236,240,243,0.9)', 'sol', true);
    }
    // hız bileşenleri
    var vy = DERS.vy - DERS.g * tt, ov = 1.45;
    ok(c, p[0], p[1], p[0] + DERS.vx * ov, p[1], KIRMIZI, 2.2);
    formul(c, 'v_x', p[0] + DERS.vx * ov + 5, p[1] + 4, 11.5, KIRMIZI, 'sol', true);
    if (Math.abs(vy) > 1) {
      ok(c, p[0], p[1], p[0], p[1] - vy * ov, YESIL, 2.2);
      formul(c, 'v_y', p[0] - 7, p[1] - vy * ov + (vy > 0 ? -2 : 12), 11.5, YESIL, 'sag', true);
    } else {
      // öğrencinin halkası tepeyi saracak: yazı halkanın üstünde kalsın
      formul(c, 'v_y = 0', p[0], p[1] - 31, 12, YESIL, 'orta', true);
    }
    // top
    c.fillStyle = 'rgba(255,255,255,0.14)';
    c.beginPath(); c.arc(p[0], p[1], 9, 0, 6.2832); c.fill();
    c.fillStyle = '#FFFFFF';
    c.beginPath(); c.arc(p[0], p[1], 5, 0, 6.2832); c.fill();
    // üstte denklem
    // üstte denklem: değişkenler eğik, v_y yeşil
    var gx = 18, gy = 32, beyaz = 'rgba(236,240,243,0.94)';
    [['v_y', YESIL, true], [' = ', beyaz, false], ['v_0', beyaz, true], [' · sin 53° − ', beyaz, false], ['g', beyaz, true], [' · ', beyaz, false], ['t', beyaz, true]].forEach(function (p) {
      gx += formul(c, p[0], gx, gy, 14.5, p[1], 'sol', p[2]);
    });
    // altyazı
    var alt = tepede || tt > DERS.tepeT ? dil('Tepe noktasında dikey hız sıfırdır.', 'At the top, the vertical velocity is zero.')
      : dil('Top yükseldikçe dikey hızı azalır.', 'As the ball rises, its vertical velocity drops.');
    c.font = '11.5px Roboto, system-ui, sans-serif';
    var aw = c.measureText(alt).width + 14;
    c.fillStyle = 'rgba(8,8,8,0.74)';
    kutuYol(c, W / 2 - aw / 2, H - 45, aw, 19, 2);
    c.fill();
    c.fillStyle = '#FFFFFF';
    c.textAlign = 'center';
    c.fillText(alt, W / 2, H - 31.5);
    // oynatıcı: süre ve ilerleme (bölüm araları boşluklu)
    var an = DERS.bas + tt, oran = an / DERS.sure, by = H - 3;
    c.textAlign = 'left';
    c.font = '500 10.5px Roboto, system-ui, sans-serif';
    c.fillStyle = 'rgba(255,255,255,0.92)';
    c.fillText(sure(an) + ' / ' + sure(DERS.sure), 10, H - 12);
    var bolum = [0, 320 / 1865, 730 / 1865, 1185 / 1865, 1];
    for (var b = 0; b < 4; b++) {
      var a0 = bolum[b] * W + (b ? 1.5 : 0), a1 = bolum[b + 1] * W - (b < 3 ? 1.5 : 0);
      c.fillStyle = 'rgba(255,255,255,0.3)';
      c.fillRect(a0, by, a1 - a0, 3);
      if (oran > bolum[b]) { c.fillStyle = '#FFFFFF'; c.fillRect(a0, by, Math.min(a1, oran * W) - a0, 3); }
    }
    // denetimler: karartma; ortada oynat (video durdu), yanlarda önceki/sonraki; altta kalın, bölümlü
    // ilerleme çubuğu ve tutamacı. Dokunuşla gelir, bir süre sonra kaybolur (mobil oynatıcılardaki gibi)
    var den = kontrol > 0 ? Math.min(1, kontrol) : 0;
    if (den > 0) {
      c.globalAlpha = den;
      c.fillStyle = 'rgba(0,0,0,0.44)';
      c.fillRect(0, 0, W, H);
      var ox = W / 2, oy = H / 2 - 12, pop = dur >= 0 && dur < 1 ? 1 + 0.07 * Math.sin(Math.PI * Math.min(1, dur * 2.4)) : 1;
      c.fillStyle = 'rgba(0,0,0,0.36)';
      c.beginPath(); c.arc(ox, oy, 26 * pop, 0, 6.2832); c.fill();
      c.fillStyle = '#FFFFFF';
      c.beginPath(); c.moveTo(ox - 7 * pop, oy - 11 * pop); c.lineTo(ox + 12 * pop, oy); c.lineTo(ox - 7 * pop, oy + 11 * pop); c.closePath(); c.fill();
      [-1, 1].forEach(function (y) {
        var x = ox + y * 92;
        c.beginPath(); c.moveTo(x - y * 6, oy - 8); c.lineTo(x + y * 6, oy); c.lineTo(x - y * 6, oy + 8); c.closePath(); c.fill();
        c.fillRect(x + y * 6 - (y > 0 ? 0 : 2.4), oy - 8, 2.4, 16);
      });
      for (var b2 = 0; b2 < 4; b2++) {
        var k0 = bolum[b2] * W + (b2 ? 1.5 : 0), k1 = bolum[b2 + 1] * W - (b2 < 3 ? 1.5 : 0);
        c.fillStyle = 'rgba(255,255,255,0.32)';
        c.fillRect(k0, by - 1.5, k1 - k0, 4.5);
        if (oran > bolum[b2]) { c.fillStyle = '#FFFFFF'; c.fillRect(k0, by - 1.5, Math.min(k1, oran * W) - k0, 4.5); }
      }
      c.beginPath(); c.arc(oran * W, by + 0.75, 6.5, 0, 6.2832); c.fill();
      c.globalAlpha = 1;
    }
    return true;
  }
  // tepe noktasının cihaz ekranındaki yeri (kutu: tuvalin ekrandaki kutusu, tasarım pikseliyle)
  function dersTepe(kutu) {
    return kutu ? { x: kutu.x + DERS_TEPE[0] * kutu.w / DERS.W, y: kutu.y + DERS_TEPE[1] * kutu.h / DERS.H, sx: kutu.w / DERS.W, sy: kutu.h / DERS.H } : null;
  }

  OSN.videolar = {
    dersCiz: dersCiz, dersTepe: dersTepe, DERS: DERS, formul: formul, kutuYol: kutuYol, ok: ok, tuvalHazirla: tuvalHazirla, sure: sure
  };
})();
