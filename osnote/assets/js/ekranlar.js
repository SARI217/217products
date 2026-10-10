/* ============================================================
   OSNote tanıtım sitesi · cihaz ekranları
   ------------------------------------------------------------
   Giriş, uygulamalar (katman sahnesi), "Kalem ve El" tableti,
   araç çubuğunun anatomisi, şekiller ve sayfa bölümleri.
   - Cihazların içi DOM'dur (Android arayüzü, bu site için hazırlandı);
     videoların kareleri videolar.js'te çizilir.
   - Mürekkep ekranın üstündeki tuvaldedir; çizgi OSNote'un kalemiyle
     aynı: tek kalınlık, uçlar yuvarlak. El yazıları el-yazisi.js'teki
     kalem çizgilerinden, her çizgi kendi hızıyla yazılır (sahne.js).
   - Çubuk uygulamadaki gibi El modunda başlar (OverlayService.kt:
     "her ilk açılışta El modu aktif"). Renge dokunmak kalemi seçer.
   - Hareket azaltılmışsa her sahne son hâliyle çizilir.
   ============================================================ */
(function () {
  'use strict';
  var OSN = window.OSN || (window.OSN = {});
  var dil = OSN.dil || function (tr) { return tr; };
  var M = OSN.m, S = OSN.sahne, V = OSN.videolar;
  if (!M || !S || !V) return;
  var RENK = S.RENK, RENK_AD = S.RENK_AD, ILK_RENK = S.ILK_RENK, AZ = S.AZ;
  var yazi = S.yazi, yaziEn = S.yaziEn, egriOk = S.egriOk, oge = S.oge, Cihaz = S.Cihaz, ocUygula = S.ocUygula;
  var oynat = S.oynat, durdur = S.durdur, oynuyor = S.oynuyor, yazitipiHazir = S.yazitipiHazir;
  var kutuYol = V.kutuYol;

  /* ========================================================== GİRİŞ: BÖLÜNMÜŞ EKRAN
     Tablette yan yana, telefonda üst üste iki uygulama. Ders videosu oynarken kalem (tablette üst
     kenardaki yuvasından kalkarak) gelir, videoya dokunur (çubuk El'de: dokunuş uygulamaya gider) ve
     top tepedeyken video durur; oynatıcının denetimleri bir an görünüp kaybolur. Sonra Kalem ve sarı:
     tepe noktası daire içine, bir ok iki uygulamanın arasındaki çizgiyi geçer; maviyle PDF'e çözüm,
     doğru şık daire içine. Kalem tablette yuvasına döner, telefonda çekilip gider. */
  // Kalem Kutusu'ndaki başlangıç kalemleri (DInkSpec.DEFAULT_PRESETS): kırmızı, mavi, sarı fosforlu
  var KK_KIRMIZI = '#E5484D', KK_MAVI = '#0090FF', KK_SARI = '#FFC53D';
  // fosforlu: metnin satırları boyunca birer düz geçiş (kalemle çekilmiş gibi hafif eğik, uçları taşar)
  function vurgula(c, el, tohum) {
    if (!el) return [];
    var e = c.ekran.getBoundingClientRect(), k = e.width / c.W, o = [];
    Array.prototype.forEach.call(el.getClientRects(), function (r, i) {
      if (r.width < 4) return;
      var x0 = (r.left - e.left) / k - 3, x1 = (r.right - e.left) / k + 3, y = (r.top - e.top) / k + r.height / k * 0.56;
      o.push({ p: M.titret([x0, y + 0.8, (x0 + x1) / 2, y - 0.3, x1, y - 1], 0.6, tohum + i), duz: false });
    });
    return o;
  }
  function senGiris(c, telefon, akis) {
    var tuval = c.ekran.querySelector('[data-ders]');
    var vk = c.kutu(tuval), tp = V.dersTepe(vk);
    var bos = c.kutu('.p-bosluk'), dog = c.kutu('[data-p-dogru]');
    if (!tp || !bos || !dog) return null;
    // Kalem Kutusu: tablette alt kenarda, videonun yarısında (yarı saydam gövdesi iki ayrı zemine bölünmesin);
    // telefonda sağ kenarda, dik (PDF'in sağ payında)
    var video = c.kutu('.bol__uyg');
    if (telefon) c.kkKur({ kenar: 'sag', sekil: true, ekle: true, oran: 0.39 });
    else c.kkKur({ kenar: 'alt', sekil: true, ekle: true, oran: (video.x + video.w / 2) / c.W });
    var kal = telefon ? 3.6 : 4.2, ince = telefon ? 2.7 : 3.1, fos = telefon ? 10 : 11.5;
    var Y = c.yuva();
    var plan = new S.Plan(c, { dinlen: Y ? [Y.x, Y.y] : [c.W + 60, c.H * 0.86], giris: Y ? 1.35 : 0.3 });
    // 1) Dokun: videoya sağ üstünden dokun (kalemin gövdesi altyazıya düşmesin), dokunuş videoya gider, durur
    var dur = plan.dokun([vk.x + vk.w * 0.74, vk.y + vk.h * 0.3]);
    var durT = dur.t + 0.1;
    plan.bekle(0.2);
    // 2) Çiz: kutudaki seçili kalem (kırmızı) kalkar
    var aKalem = plan.dokun('ciz', { el: false, sec: 'k0' });
    // 3) tepe noktası daire içine
    plan.ciz(M.halka(tp.x, tp.y + 1.5 * tp.sy, 29 * tp.sx, 18 * tp.sy, 21), KK_KIRMIZI, kal, 430, 0);
    // çözümün yeri ve boyu: yazı PDF'in yazısının iki katından biraz büyük
    var sol = bos.x + (telefon ? 4 : 44), en = telefon ? 250 : bos.w - 90;
    var boy = Math.min(telefon ? 23 : 29, en / (yaziEn('g_2', 1) || 1));
    var y1 = bos.y + boy * 1.25, y2 = bos.y + boy * 2.8;
    var satir1 = yazi('g_1', sol, y1, boy, -0.03), satir2 = yazi('g_2', sol + (telefon ? 5 : 8), y2, boy * 0.98, -0.012);
    // 4) ok: bölme çizgisini geçer
    var ok;
    if (telefon) {
      // tepenin sağından çubuğun soluna iner, ayırıcıyı geçer, sayfanın sağ boşluğundan (yazının dışından)
      // aşağı iner; çözümün ilk satırının yazılacağı yerin sonunu gösterir
      // satırın sağ ucu çizgilerinden (yazının eğimi yüzünden genişliğinden biraz taşar)
      var son = sol, pdf = c.kutu('.bol--ust .uyg--pdf') || { y: 396 };
      satir1.forEach(function (c1) { for (var i = 0; i < c1.p.length; i += 2) son = Math.max(son, c1.p[i]); });
      son += 14;
      ok = S.yolOk([[tp.x + 28 * tp.sx, tp.y + 14 * tp.sy], [tp.x + 92, tp.y + 88], [288, pdf.y - 70], [314, pdf.y + 60],
        [324, y1 - 90], [son + 36, y1 - boy * 0.7], [son, y1 - boy * 0.42]], 31, 12);
    } else {
      // tahtadan aşağı ve sağa: çizgiyi çözümün hizasında geçip boşluktaki ilk satırı gösterir
      ok = egriOk(tp.x + 32 * tp.sx, tp.y + 16 * tp.sy, bos.x - 60, bos.y + 44, bos.x + 30, bos.y + 24, 31, 15);
    }
    var oOk = plan.ciz(ok, KK_KIRMIZI, kal, 700, 0.05);
    plan.bekle(0.14);
    // 5) sarı fosforlu: sorunun can alıcı yeri ("en fazla kaç metre yükselir?")
    var aSari = plan.dokun('k2', { sec: 'k2' });
    plan.ciz(vurgula(c, c.ekran.querySelector('[data-p-vurgu]'), 51), KK_SARI, fos, 900, 0.08, true);
    plan.bekle(0.12);
    // 6) mavi: çözüm iki satır (ikinci satır elde yazılmış gibi biraz içeride ve daha düz), doğru şık
    var aMavi = plan.dokun('k1', { sec: 'k1' });
    plan.ciz(satir1, KK_MAVI, ince, 820, 0.05);
    plan.bekle(0.16);
    plan.ciz(satir2, KK_MAVI, ince, 820, 0.05);
    plan.bekle(0.2);
    var oSik = plan.ciz(M.halka(dog.x + dog.w / 2 - 2, dog.y + dog.h / 2 + 1, dog.w / 2 + 11, dog.h / 2 + 4, 33), KK_MAVI, telefon ? 3 : 3.4, 460, 0);
    // sahnenin anları (girişteki "tablette şimdi" listesi için)
    var anlar = [0, dur.t, aKalem.t, aSari.t, aMavi.t, oSik.bas + oSik.sure];
    // video: kalem dokunana kadar oynar (top tepeye çıkarken), sonra durur; denetimler 1,6 sn görünür
    var tepeT = V.DERS.tepeT, anahtar = '';
    plan.her(function (dt, t) {
      var fiz = t < durT ? tepeT - (durT - t) : tepeT;
      var kt = t - durT;
      var geri = kt >= 0 && kt < 0.8 ? kt / 0.8 : -1;
      var den = kt < 0 ? 0 : kt < 0.14 ? kt / 0.14 : kt < 1.25 ? 1 : kt < 1.6 ? 1 - (kt - 1.25) / 0.35 : 0;
      if (akis) { var an = 0; while (an < anlar.length - 1 && t >= anlar[an + 1]) an++; akis(an); }
      var k = fiz.toFixed(3) + '|' + (geri < 0 ? '-' : geri.toFixed(2)) + '|' + den.toFixed(2);
      if (k === anahtar) return;
      anahtar = k;
      V.dersCiz(tuval, fiz, geri, den);
    });
    // bitince: tablette kalem yuvasına döner; telefonda (çubuğun, düğmenin üstüne düşmesin diye) çekilip gider.
    // Kalem her açılışta Dokun'da başlar (uygulamadaki gibi); seçili kalem kutudaki ilk kalem.
    return plan.senaryo({ el: true, sec: 'k0' }, Y ? { yuva: Y } : { cikis: [c.W + 150, c.H + 80, 70], cikisGizli: true });
  }

  var giris = document.querySelector('[data-giris]');
  var girisCihaz = [];
  function girisKur() {
    if (!giris) return;
    var on = document.querySelector('.giris__on'), baslik = document.getElementById('giris-baslik');
    // "tablette şimdi": sahnenin hangi anındaysa o satır yanar, öncekiler biter
    var akisEl = document.querySelector('[data-giris-akis]'), akisLi = akisEl ? akisEl.querySelectorAll('li') : [], sonAn = -1;
    var akisSimdi = akisEl ? akisEl.querySelector('[data-giris-akis-simdi]') : null;
    function akis(an) {
      if (an === sonAn) return;
      sonAn = an;
      for (var i = 0; i < akisLi.length; i++) { akisLi[i].classList.toggle('simdi', i === an); akisLi[i].classList.toggle('bitti', i < an); }
      // kısa ekrandaki tek satır: "3/6 · Kalem ve sarı: tepe noktası"
      if (akisSimdi && akisLi[an]) akisSimdi.textContent = (an + 1) + '/' + akisLi.length + ' · ' + akisLi[an].textContent;
    }
    var dugmeler = document.querySelectorAll('[data-giris-oynat]');
    Array.prototype.forEach.call(giris.querySelectorAll('[data-giris-cihaz]'), function (el) {
      girisCihaz.push({ el: el, tur: el.getAttribute('data-giris-cihaz'), c: new Cihaz(el), sen: null, oynadi: false });
    });
    function gorunen() {
      for (var i = 0; i < girisCihaz.length; i++) if (girisCihaz[i].el.getBoundingClientRect().width) return girisCihaz[i];
      return null;
    }
    // ölçek: cihaz sütuna sığsın; geniş ekranda (yazı yandayken) ekranın yüksekliğine de. Yükseklikten
    // bölümün üst payı, başlık ve başlığın alt payı düşülür (içerik dikeyde ortalandığı için ölçülen yer
    // değil, düzenin değerleri); altyazı da ilk ekrana sığar (yarım görünmesin)
    function olcekle() {
      var o = gorunen();
      if (!o) return null;
      var W = o.tur === 'tablet' ? 1048 : 384, H = o.tur === 'tablet' ? 673 : 804;
      var yan = window.innerWidth > 1100, en = giris.clientWidth, k;
      if (yan) {
        var bolum = giris.closest('.giris'), bs = bolum ? getComputedStyle(bolum) : null;
        var ust = bs ? parseFloat(bs.paddingTop) : 112, alt = bs ? parseFloat(bs.paddingBottom) : 48;
        // başlık üstte tek satırsa onun yüksekliği; sol sütundaysa sahnenin üst payı (kalemin yuvası)
        if (kisaGenis && kisaGenis.matches) ust += parseFloat(getComputedStyle(giris).paddingTop) || 0;
        else if (baslik) ust += baslik.offsetHeight + parseFloat(getComputedStyle(baslik).marginBottom);
        var not = giris.querySelector('.giris__not');
        if (not && not.offsetHeight) alt += not.offsetHeight + parseFloat(getComputedStyle(not).marginTop);
        k = Math.min(en / W, (window.innerHeight - ust - alt) / H, 1.05);
      } else if (o.tur === 'tablet') {
        // alt alta: tablet ve altyazısı başlığın altında ilk ekrana sığsın (ekranın en az yarısı kadar yüksek kalır)
        var gb = giris.closest('.giris'), gs = gb ? getComputedStyle(gb) : null, fs = getComputedStyle(giris);
        var ust2 = (gs ? parseFloat(gs.paddingTop) : 112) + (baslik ? baslik.offsetHeight : 0) + (parseFloat(fs.marginTop) || 0);
        var not2 = giris.querySelector('.giris__not'), alt2 = (not2 ? not2.offsetHeight + parseFloat(getComputedStyle(not2).marginTop) : 0) + 24;
        k = Math.min(en / W, Math.max(window.innerHeight * 0.5, window.innerHeight - ust2 - alt2) / H, 1.05);
      } else {
        k = Math.min(en / W, window.innerHeight * 0.84 / H, 0.96);
      }
      k = Math.max(k, 0.3);
      o.el.style.setProperty('--k', k.toFixed(4));
      return o;
    }
    // optik hiza: başlığın H'si logonun sol kenarında, yazının büyük harf üstü tabletin üst kenarında
    // (kısa ve geniş ekranda başlık sol sütunda: başlığın büyük harf üstü tabletin üst kenarında)
    var kisaGenis = window.matchMedia ? window.matchMedia('(min-width: 1101px) and (max-height: 820px)') : null;
    // bir satırın kutusunun üstünden büyük harfin üstüne olan pay
    function harfPayi(x, cs, harf) {
      var f = parseFloat(cs.fontSize), lh = parseFloat(cs.lineHeight) || f * 1.2;
      x.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
      var m = x.measureText(harf), fa = m.fontBoundingBoxAscent, fd = m.fontBoundingBoxDescent;
      return fa ? (lh - (fa + fd)) / 2 + fa - m.actualBoundingBoxAscent : null;
    }
    function hizala() {
      if (!on || !baslik) return;
      var x = document.createElement('canvas').getContext('2d');
      var bs = getComputedStyle(baslik);
      x.font = bs.fontWeight + ' ' + bs.fontSize + ' ' + bs.fontFamily;
      var h = x.measureText('H');
      baslik.style.setProperty('--baslik-sol', (h.actualBoundingBoxLeft || 0).toFixed(2) + 'px');
      if (window.innerWidth <= 1100) { on.style.removeProperty('--on-ust'); baslik.style.removeProperty('--baslik-ust'); return; }
      if (kisaGenis && kisaGenis.matches) {
        var pb = harfPayi(x, bs, 'H'), sahne = giris ? parseFloat(getComputedStyle(giris).paddingTop) || 0 : 0;
        if (pb != null) baslik.style.setProperty('--baslik-ust', (sahne - pb).toFixed(2) + 'px');
        return;
      }
      baslik.style.removeProperty('--baslik-ust');
      var po = harfPayi(x, getComputedStyle(on), 'V');
      if (po != null) on.style.setProperty('--on-ust', (-po).toFixed(2) + 'px');
    }
    function kur(o) {
      if (!o || !o.c.boyutla()) return false;
      var tuval = o.el.querySelector('[data-ders]');
      if (tuval) V.dersCiz(tuval, V.DERS.tepeT - 1.3, -1);
      o.sen = senGiris(o.c, o.tur === 'telefon', o.tur === 'tablet' ? akis : null);
      return !!o.sen;
    }
    function oynat1(o, gecikme) {
      if (!o || !o.sen) return;
      if (AZ) { o.sen.ciz(o.sen.son); o.oynadi = true; return; }
      o.sen.ciz(0);
      o.oynadi = true;
      oynat(o.sen, gecikme);
    }
    var sonTur = null;
    function yenile() {
      hizala();
      var o = olcekle();
      if (!o) return;
      var t = o.sen && oynuyor(o.sen);
      if (!kur(o)) return;
      if (o.tur !== sonTur) { sonTur = o.tur; if (!o.oynadi) { oynat1(o, 0.3); return; } }
      if (t) oynat(o.sen, 0); else o.sen.ciz(o.sen.son);
    }
    olcekle();
    yazitipiHazir().then(function () {
      hizala();
      var o = olcekle();
      if (kur(o)) { o.sen.ciz(AZ ? o.sen.son : 0); sonTur = o.tur; oynat1(o, 0.5); }
    });
    Array.prototype.forEach.call(dugmeler, function (dugme) {
      dugme.addEventListener('click', function () {
        var o = gorunen();
        if (!o) return;
        if (!o.sen) kur(o);
        if (!o.sen) return;
        durdur(o.sen);
        oynat1(o, 0.15);
      });
    });
    var bekle = 0, sonEn = window.innerWidth, sonBoy = window.innerHeight;
    window.addEventListener('resize', function () {
      if (window.innerWidth === sonEn && Math.abs(window.innerHeight - sonBoy) < 120) return;
      sonEn = window.innerWidth; sonBoy = window.innerHeight;
      cancelAnimationFrame(bekle);
      bekle = requestAnimationFrame(yenile);
    });
    // kısa/uzun düzen değişince (yükseklik az değişse de) yeniden ölç
    if (kisaGenis && kisaGenis.addEventListener) kisaGenis.addEventListener('change', function () {
      cancelAnimationFrame(bekle);
      bekle = requestAnimationFrame(yenile);
    });
    OSN.giris = girisCihaz;
  }

  /* ========================================================== UYGULAMALAR: KATMAN
     Kendi kendine oynar (bölüm ekrandayken; t saniye). Önce mesajlarda yazı; telefon yan yatıp katmanlarına
     ayrılır (uygulama, OSNote'un saydam katmanı, Kalem Kutusu). Kutu Dokun'a geçince bir dokunuş camdan
     uygulamaya iner, alttaki uygulama haritaya, sonra takvime döner; Çiz'de camın üstüne yeni yazı. Sonunda
     katmanlar birleşir. Kalem ucu bu sahnede yok: yazı kendiliğinden ilerler (sahne bir şema). */
  function katmanKur() {
    var kap = document.querySelector('[data-katman]');
    if (!kap) return;
    var sahne = kap.querySelector('[data-katman-sahne]'), uzay = kap.querySelector('[data-katman-uzay]');
    var k3 = uzay.querySelector('[data-k3]'), cam = k3.querySelector('[data-k3-cam]'), cubukK = k3.querySelector('[data-k3-cubuk]');
    var tuval = cam.querySelector('canvas'), ctx = tuval.getContext('2d');
    var uyglar = Array.prototype.slice.call(k3.querySelectorAll('[data-k-uyg]'));
    var sira = Array.prototype.slice.call(kap.querySelectorAll('[data-k-sira]'));
    var oynatD = kap.querySelector('[data-k-oynat]'), oynatYazi = kap.querySelector('[data-k-oynat-yazi]'), simdiEl = kap.querySelector('[data-k-simdi]');
    var AD = ['cubuk', 'cam', 'uyg'], etiket = {}, cizgi = {}, nokta = {};
    AD.forEach(function (a) { etiket[a] = uzay.querySelector('[data-etiket="' + a + '"]'); cizgi[a] = uzay.querySelector('[data-cizgi="' + a + '"]'); nokta[a] = uzay.querySelector('[data-nokta="' + a + '"]'); });
    var izCizgi = uzay.querySelector('[data-cizgi="iz"]'), izNokta = uzay.querySelector('[data-nokta="iz"]');
    var dokCizgi = uzay.querySelector('[data-cizgi="dokun"]'), halkaCam = uzay.querySelector('[data-halka="cam"]'), halkaUyg = uzay.querySelector('[data-halka="uyg"]');
    // Kalem Kutusu en üst katmanda, telefonun sağ kenarında dik (kutudaki kalemler: kırmızı, mavi, sarı fosforlu, mor)
    var KALEMLER = [{ hl: false, renk: '#E5484D', k: 3 }, { hl: false, renk: '#0090FF', k: 1.5 }, { hl: true, renk: '#FFC53D', k: 14 }, { hl: false, renk: '#8E4EC6', k: 3 }];
    var RK = { k0: '#E5484D', k1: '#0090FF', k2: '#FFC53D', k3: '#8E4EC6' };
    var kk = OSN.kutu ? OSN.kutu.KalemKutusu(cubukK, { kenar: 'sag', olcu: 'telefon', kalemler: KALEMLER, sekil: true, ekle: true, durum: { ciz: true, sec: 'k0' } }) : null;
    var kkUst = kk ? Math.round(12 + (780 - kk.boy) / 2) : 0;
    if (kk) { kk.kok.style.left = (12 + 360 - 14 - kk.en) + 'px'; kk.kok.style.top = kkUst + 'px'; }
    // her uygulamada yazının hedefi (ekranın tasarım pikseliyle): iz çizgisi camdaki yazıdan buraya iner
    var HEDEF = { sohbet: null, harita: [281, 143], takvim: null };
    // etiketlerin bağlandığı noktalar (k3'ün tasarım pikseliyle): kutunun sağ kenarı, camın sağ kenarı, ekranın sağ kenarı
    var ISARET = { cubuk: [12 + 360 - 14, kkUst + 46], cam: [372, 470], uyg: [372, 700] };
    // dokunuşun yeri (ekranda): camdan uygulamaya iner
    var DOKUN = [176, 236];
    var PERS = 2000;
    var s = { t: 0, w: 0, h: 0, on: 0.6, anahtar: '', aktif: '', gor: -1, gorunen: [], oynuyor: false, bitti: false, kare: 0, onceki: 0, gorunur: false };
    var sen = null;

    /* zaman çizelgesi (sn): mesajlar düz telefonda yazılır; ayrılır; Dokun ve dokunuş: uygulama haritaya döner; Çiz ve
       mor kalem: yol; yine Dokun: takvim; Çiz, sarı fosforlu ve mavi kalem; katmanlar birleşir. */
    var Z = {
      sohbet: [0.6, 3.3], ayril: [3.6, 4.9],
      dok1: 5.2, tap1: [5.45, 6.35], gec1: [6.15, 6.95], ciz1: 7.15, harita: [7.35, 10.2],
      dok2: 10.55, tap2: [10.8, 11.7], gec2: [11.5, 12.3], ciz2: 12.5, takvim: [12.7, 16.2],
      birles: [16.7, 18.0], son: 18.6
    };
    var BOLUM = { sohbet: 0, harita: Z.dok1, takvim: Z.dok2 };

    // uygulamanın içindeki bir öğenin kutusu, uygulamanın tasarım pikseliyle (360×780)
    function kutu(uyg, el) {
      if (typeof el === 'string') el = uyg.querySelector(el);
      if (!el) return null;
      var r = el.getBoundingClientRect(), u = uyg.getBoundingClientRect(), k = u.width / 360;
      return { x: (r.left - u.left) / k, y: (r.top - u.top) / k, w: r.width / k, h: r.height / k };
    }
    // elle çekilmiş çizgi (noktalar arası, hafif titrek)
    function elCizgi(noktalar, tohum) { return [{ p: M.titret(M.duzlestir(noktalar, 3), 0.9, tohum), duz: true }]; }
    // yazı dizisi: öğeler arka arkaya (kalem ucu yok, yalnız zamanlama)
    function dizi() {
      var z = { a: [], son: 0 }, sonNokta = null;
      z.ciz = function (parca, renk, k, hiz, kalkis, fos) {
        if (!parca.length) return null;
        if (sonNokta) { var p0 = parca[0].p; z.son += 0.12 + Math.min(0.3, Math.hypot(p0[0] - sonNokta[0], p0[1] - sonNokta[1]) / 1500); }
        var o = oge(parca, renk, k, z.son, hiz, kalkis, fos);
        z.a.push({ tur: 'ciz', t: z.son, o: o });
        z.son += o.sure;
        var pp = parca[parca.length - 1].p;
        sonNokta = [pp[pp.length - 2], pp[pp.length - 1]];
        return o;
      };
      return z;
    }
    function senSohbet(u) {
      var z = dizi(), r = RK.k0;
      var h = kutu(u, '[data-fis-hedef]'), s2 = kutu(u, '[data-s-son]');
      if (!h || !s2) return z;
      // halka satırı sarar, alttaki ve üstteki satırın yazısına değmez
      var cx = h.x + h.w / 2, cy = h.y + h.h / 2 - 1.5;
      z.ciz(M.halka(cx, cy, h.w / 2 + 11, h.h / 2 + 3.5, 44), r, 3.6, 460, 0);
      var ny = s2.y + s2.h + 76, nx = 40;
      z.ciz(egriOk(h.x + h.w + 10, cy + 10, h.x + h.w + 30, (cy + ny) / 2 + 10, nx + 120, ny - 42, 45, 12), r, 3.8, 620, 0.04);
      z.ciz(yazi('o_duzelt', nx, ny, 32, -0.05), r, 4, 820, 0.05);
      return z;
    }
    function senHarita() {
      var z = dizi(), r = RK.k3;
      // mavi noktadan kuzeye, Cumhuriyet Cd.'den doğuya, Okul Sk.'tan kuzeye, Menekşe Sk.'tan kütüphanenin arka kapısına
      var yol = [131.5, 492, 131.2, 452, 130.8, 330, 130.4, 262, 136, 254.6, 150, 252.6, 180, 250.6, 206, 248.8, 214.6, 244, 215.8, 200, 215.2, 158, 219, 146.6, 232, 144.8, 262, 142.8];
      var govde = M.titret(M.duzlestir(yol, 3), 1.8, 12);
      var n = govde.length, ax = govde[n - 2] - govde[n - 8], ay = govde[n - 1] - govde[n - 7], al = Math.hypot(ax, ay) || 1;
      ax /= al; ay /= al;
      var ex = govde[n - 2], ey = govde[n - 1], uu = 13, c1 = Math.cos(0.5), s1 = Math.sin(0.5);
      var uc = [ex - uu * (ax * c1 - ay * s1), ey - uu * (ay * c1 + ax * s1), ex, ey, ex - uu * (ax * c1 + ay * s1), ey - uu * (ay * c1 - ax * s1)];
      z.ciz([{ p: govde, duz: true }, { p: uc, duz: true }], r, 4.2, 560, 0.05);
      // kapıya çarpı; not kapının altında, yolun sağında
      z.ciz(elCizgi([273, 134, 289, 150], 61), r, 3.8, 520, 0);
      z.ciz(elCizgi([289, 135, 272, 151], 62), r, 3.8, 520, 0.03);
      z.ciz(yazi('o_kapi', 150, 122, 26, -0.05), r, 3.4, 820, 0.05);
      return z;
    }
    // takvim: Sunum sarı fosforluyla; akşamki Spor'un üstü maviyle çizilir, yanına "slaytları bitir"
    function senTakvim(u) {
      var z = dizi();
      var sn = kutu(u, '[data-k-sunum] b'), sp = kutu(u, '[data-k-spor]'), spb = kutu(u, '[data-k-spor] b'), sps = kutu(u, '[data-k-spor] span');
      if (!sn || !sp || !spb || !sps) return z;
      var fy = sn.y + sn.h * 0.55;
      z.ciz([{ p: M.titret([sn.x - 5, fy + 0.6, sn.x + sn.w * 0.5, fy - 0.4, sn.x + sn.w + 6, fy - 0.8], 0.5, 19) }], RK.k2, 14, 520, 0, true);
      // üstü çizilen yalnız başlık; not iki satırın sağında, bloğun ortasında
      var s0 = spb.x - 4, s1 = spb.x + spb.w + 6, sy = spb.y + spb.h * 0.56;
      var o = z.ciz(elCizgi([s0, sy + 1.5, (s0 + s1) / 2, sy - 0.5, s1, sy - 1.2], 23), RK.k1, 3.2, 620, 0.04);
      z.mavi = o ? o.bas : 0;
      var nx = Math.max(spb.x + spb.w, sps.x + sps.w) + 22;
      z.ciz(yazi('k_sinav', nx, sp.y + sp.h / 2 + 8, 22, -0.05), RK.k1, 3, 820, 0.05);
      return z;
    }

    function yum(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
    function ara(p, a, b) { return M.sinirla((p - a) / (b - a), 0, 1); }
    // t anındaki hâl: e ayrılma (0..1), an hangi uygulama (0..2, arası geçiş), m yazılar, kutunun hâli, dokunuş
    function durum(t) {
      if (AZ) return { e: 1, an: 1, m: [{ k: 'harita', t: 1, a: 1 }], ciz: true, sec: 'k3', dok: -1, aktif: 'harita' };
      var e = yum(ara(t, Z.ayril[0], Z.ayril[1])) * (1 - yum(ara(t, Z.birles[0], Z.birles[1])));
      var an = yum(ara(t, Z.gec1[0], Z.gec1[1])) + yum(ara(t, Z.gec2[0], Z.gec2[1]));
      var ciz = t < Z.dok1 || (t >= Z.ciz1 && t < Z.dok2) || t >= Z.ciz2;
      // takvimde sarı fosforludan mavi kaleme, mavi yazı başlarken geçilir
      var tk = sen && sen.takvim && sen.takvim.son ? Z.takvim[0] + (sen.takvim.mavi / sen.takvim.son) * (Z.takvim[1] - Z.takvim[0]) - 0.15 : Z.takvim[0];
      var sec = t < Z.ciz1 ? 'k0' : t < Z.ciz2 ? 'k3' : t < tk ? 'k2' : 'k1';
      var dok = t >= Z.tap1[0] && t <= Z.tap1[1] ? ara(t, Z.tap1[0], Z.tap1[1]) : t >= Z.tap2[0] && t <= Z.tap2[1] ? ara(t, Z.tap2[0], Z.tap2[1]) : -1;
      return {
        e: e, an: an, ciz: ciz, sec: sec, dok: dok,
        m: [
          { k: 'sohbet', t: ara(t, Z.sohbet[0], Z.sohbet[1]), a: 1 - ara(t, Z.gec1[0] - 0.1, Z.gec1[0] + 0.4) },
          { k: 'harita', t: ara(t, Z.harita[0], Z.harita[1]), a: 1 - ara(t, Z.gec2[0] - 0.1, Z.gec2[0] + 0.4) },
          { k: 'takvim', t: ara(t, Z.takvim[0], Z.takvim[1]), a: 1 }
        ],
        aktif: t < Z.dok1 ? 'sohbet' : t < Z.dok2 ? 'harita' : 'takvim'
      };
    }
    // k3'ün dönüşümü: sahnede yeri, eğimi, ölçeği; katmanların yüksekliği ölçekle birlikte büyür
    var AX = 52 * Math.PI / 180, AZ_ = -32 * Math.PI / 180, ZC = 72, ZU = 160;
    // ayrık hâlin yeri ve ölçeği: yığının (gövde, cam, kutu) ekrandaki sınırları hesaplanır; geniş sahnede
    // yığın solda, etiketler sağda; dar sahnede yığın ortada (etiket yok)
    function yerlesim() {
      var T = { o: 1, cx: 0, cy: 0, ax: AX, az: AZ_ }, x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      var kx = 12 + 360 - 14 - (kk ? kk.en : 58), ky0 = kkUst, ky1 = kkUst + (kk ? kk.boy : 480);
      [[0, 0, 0], [384, 0, 0], [384, 804, 0], [0, 804, 0], [12, 12, ZC], [372, 12, ZC], [372, 792, ZC], [12, 792, ZC],
        [kx, ky0, ZU], [kx + 58, ky0, ZU], [kx + 58, ky1, ZU], [kx, ky1, ZU]].forEach(function (q) {
        var P = izdus(T, q[0], q[1], q[2]);
        x0 = Math.min(x0, P[0]); x1 = Math.max(x1, P[0]); y0 = Math.min(y0, P[1]); y1 = Math.max(y1, P[1]);
      });
      var yer = s.w > 600 ? s.etiketEn + 64 : 0, en = s.w - yer - 12;
      var o = Math.min(s.on * 0.92, en / (x1 - x0), s.bant * (s.w > 600 ? 0.92 : 0.8) / (y1 - y0));
      // dar ekranda açıklama modelin hemen altında; ikisi birlikte bantta ortalanır
      var dar = s.w <= 600, ek = dar && aciklama ? aciklama.offsetHeight + 22 : 0;
      s.ay = { o: o, cx: 6 + (en - (x1 - x0) * o) / 2 - x0 * o, cy: s.ust + s.bant * 0.5 - (y0 + y1) / 2 * o - ek / 2 };
      if (aciklama) {
        if (dar) { aciklama.style.top = Math.round(s.ay.cy + y1 * o + 22) + 'px'; aciklama.style.bottom = 'auto'; }
        else { aciklama.style.removeProperty('top'); aciklama.style.removeProperty('bottom'); }
      }
    }
    function donusum(d) {
      var e = d.e, o = s.on + (s.ay.o - s.on) * e;
      return {
        o: o, cx: s.w / 2 + (s.ay.cx - s.w / 2) * e, cy: s.orta + (s.ay.cy - s.orta) * e,
        ax: AX * e, az: AZ_ * e, zc: ZC * o * e + 0.6, zu: ZU * o * e + 1.2
      };
    }
    // bir noktanın sahnedeki izdüşümü (k3 içi tasarım pikseli, z: katmanın yüksekliği)
    function izdus(T, x, y, z) {
      var X = (x - 192) * T.o, Y = (y - 402) * T.o;
      var cz = Math.cos(T.az), sz = Math.sin(T.az);
      var X1 = X * cz - Y * sz, Y1 = X * sz + Y * cz;
      var cx = Math.cos(T.ax), sx = Math.sin(T.ax);
      var Y2 = Y1 * cx - z * sx, Z2 = Y1 * sx + z * cx;
      var k = PERS / (PERS - Z2);
      return [T.cx + X1 * k, T.cy + Y2 * k];
    }
    function murekkep(d) {
      if (!sen) return;
      var anahtar = d.m.map(function (x) { return x.k + x.t.toFixed(4) + '/' + x.a.toFixed(3); }).join('|');
      if (anahtar === s.anahtar) return;
      s.anahtar = anahtar;
      var w = tuval.width, h = tuval.height;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.setTransform(w / 360, 0, 0, h / 780, 0, 0);
      d.m.forEach(function (x) {
        if (x.a <= 0.002 || x.t <= 0) return;
        var z = sen[x.k];
        ctx.globalAlpha = x.a;
        z.a.forEach(function (st) { S.ogeCiz(ctx, st.o, x.t * z.son); });
      });
      ctx.globalAlpha = 1;
    }
    function bolumAdi(ad) { var b = sira.filter(function (x) { return x.getAttribute('data-k-sira') === ad; })[0]; return b ? b.querySelector('b').textContent : ''; }
    function ciz(t) {
      if (!s.ay) return; // sahne henüz kurulmadı (yazı tipleri bekleniyor)
      var d = durum(t), T = donusum(d);
      k3.style.transform = 'translate(' + T.cx.toFixed(1) + 'px,' + T.cy.toFixed(1) + 'px) perspective(' + PERS + 'px) rotateX(' + (T.ax * 180 / Math.PI).toFixed(3) + 'deg) rotateZ(' + (T.az * 180 / Math.PI).toFixed(3) + 'deg) scale(' + T.o.toFixed(4) + ') translate(-192px,-402px)';
      cam.style.transform = 'translateZ(' + T.zc.toFixed(2) + 'px)';
      cubukK.style.transform = 'translateZ(' + T.zu.toFixed(2) + 'px)';
      cam.style.setProperty('--e', d.e.toFixed(3));
      // uygulamalar: şimdiki ortada, geçişte yandaki kayarak gelir (Android'deki gibi hafif küçülerek)
      for (var j = 0; j < uyglar.length; j++) {
        var x = j - d.an, g = Math.abs(x) < 0.999;
        if (g !== s.gorunen[j]) { uyglar[j].style.visibility = g ? 'visible' : 'hidden'; s.gorunen[j] = g; }
        if (g) uyglar[j].style.transform = 'translateX(' + (x * 372).toFixed(1) + 'px) scale(' + (1 - 0.07 * Math.min(1, Math.abs(x) * 2.2)).toFixed(4) + ')';
      }
      murekkep(d);
      if (kk) kk.durum({ ciz: d.ciz, sec: d.sec });
      if (d.aktif !== s.aktif) {
        s.aktif = d.aktif;
        sira.forEach(function (b) { b.setAttribute('aria-current', b.getAttribute('data-k-sira') === d.aktif ? 'step' : 'false'); });
        if (simdiEl) simdiEl.textContent = (['sohbet', 'harita', 'takvim'].indexOf(d.aktif) + 1) + '/3 · ' + bolumAdi(d.aktif);
      }
      // bölümün ilerlemesi (satırın altındaki ince çizgi)
      sira.forEach(function (b) {
        var ad = b.getAttribute('data-k-sira'), son = ad === 'sohbet' ? Z.dok1 : ad === 'harita' ? Z.dok2 : Z.son;
        b.style.setProperty('--ilerleme', ara(t, BOLUM[ad], son).toFixed(3));
      });
      // etiketler: katmanlar ayrılınca gelir (dar ekranda etiket yerine altta tek satır açıklama)
      var gor = M.sinirla((d.e - 0.55) / 0.4, 0, 1);
      var dokGor = d.dok >= 0 ? gor : 0;
      // dokunuş: camda halka, kesik çizgi camdan uygulamaya iner, uygulamada halka (Dokun'da dokunuş geçer)
      if (dokCizgi && halkaCam && halkaUyg) {
        if (dokGor > 0) {
          var q = d.dok, ust = izdus(T, DOKUN[0], DOKUN[1], T.zc), alt = izdus(T, DOKUN[0], DOKUN[1], 0);
          var q1 = ara(q, 0, 0.42), q2 = ara(q, 0.18, 0.62), q3 = ara(q, 0.5, 1);
          halkaKoy(halkaCam, ust[0], ust[1], 0.55 + 0.9 * q1, (q1 > 0 ? 1 - q1 * q1 : 0) * dokGor);
          var uc2 = [ust[0] + (alt[0] - ust[0]) * q2, ust[1] + (alt[1] - ust[1]) * q2];
          hat(dokCizgi, ust[0], ust[1], uc2[0], uc2[1], true);
          dokCizgi.style.opacity = ((q2 > 0 ? (1 - ara(q, 0.75, 1)) * 0.9 : 0) * dokGor).toFixed(3);
          halkaKoy(halkaUyg, alt[0], alt[1], 0.55 + 0.9 * q3, (q3 > 0 ? 1 - q3 * q3 : 0) * dokGor);
        } else if (s.dokAcik !== false) {
          dokCizgi.style.opacity = '0'; halkaCam.style.opacity = '0'; halkaUyg.style.opacity = '0';
        }
        s.dokAcik = dokGor > 0;
      }
      // o anki moda göre vurgulanan etiket: Çiz'de OSNote'un katmanı, Dokun'da uygulama
      var vurgu = d.ciz ? 'cam' : 'uyg';
      if (vurgu !== s.vurgu) { s.vurgu = vurgu; AD.forEach(function (a) { etiket[a].classList.toggle('k-etiket--vurgu', a === vurgu); }); }
      if (gor === 0 && s.gor === 0) return;
      s.gor = gor;
      if (aciklama) aciklama.style.opacity = gor.toFixed(3);
      // etiketler sağ sütunda, yukarıdan aşağı aynı sırada ve aralarında en az 62 px; çizgi noktadan etikete eğik iner
      var P = {}, sutun = 0;
      AD.forEach(function (a) {
        var m = ISARET[a], z = a === 'cubuk' ? T.zu : a === 'cam' ? T.zc : 0;
        P[a] = izdus(T, m[0], m[1], z);
        sutun = Math.max(sutun, P[a][0] + 40);
      });
      // iz: camdaki yazının altındaki hedef (uygulama katmanında) ile yazının kendisi arasında kesik çizgi
      // (yazı o uygulamada bitmeden iz görünmez)
      var hd = HEDEF[d.aktif], mk = d.m.filter(function (x) { return x.k === d.aktif; })[0];
      var izg = mk ? M.sinirla((mk.t - 0.85) / 0.15, 0, 1) * mk.a : 0;
      var izRenk = d.aktif === 'sohbet' ? RK.k0 : d.aktif === 'harita' ? RK.k3 : RK.k1;
      if (izCizgi && !hd) { izCizgi.style.opacity = '0'; izNokta.style.opacity = '0'; }
      if (izCizgi && hd) {
        var ust2 = izdus(T, hd[0] + 12, hd[1] + 12, T.zc), alt2 = izdus(T, hd[0] + 12, hd[1] + 12, 0);
        hat(izCizgi, ust2[0], ust2[1], alt2[0], alt2[1], true);
        izCizgi.style.color = izRenk;
        izCizgi.style.opacity = (gor * izg * 0.85).toFixed(3);
        noktaKoy(izNokta, alt2[0], alt2[1]);
        izNokta.style.color = izRenk;
        izNokta.style.opacity = (gor * izg * 0.9).toFixed(3);
      }
      sutun = Math.min(sutun, s.w - s.etiketEn - 6);
      var y = -Infinity;
      AD.forEach(function (a) {
        var ly = Math.max(P[a][1] - 11, y + 62);
        y = ly;
        etiket[a].style.transform = 'translate(' + sutun.toFixed(1) + 'px,' + (ly + 6 * (1 - gor)).toFixed(1) + 'px)';
        etiket[a].style.opacity = gor.toFixed(3);
        hat(cizgi[a], P[a][0] + 4, P[a][1], sutun - 12, ly + 11);
        cizgi[a].style.opacity = (gor * 0.5).toFixed(3);
        if (nokta[a]) {
          noktaKoy(nokta[a], P[a][0] + 4, P[a][1]);
          nokta[a].style.opacity = (gor * 0.8).toFixed(3);
        }
      });
    }
    // çizgi (x0,y0)→(x1,y1) ve nokta: yalnız dönüşüm. Kesik çizginin deseni uzamasın diye boyu genişlikle verilir.
    function hat(el, x0, y0, x1, y1, kesik) {
      var dx = x1 - x0, dy = y1 - y0, u = Math.hypot(dx, dy), yon = 'rotate(' + Math.atan2(dy, dx).toFixed(4) + 'rad)';
      var yer = 'translate(' + x0.toFixed(1) + 'px,' + y0.toFixed(1) + 'px) ';
      if (kesik) { el.style.width = u.toFixed(1) + 'px'; el.style.transform = yer + yon; }
      else el.style.transform = yer + yon + ' scaleX(' + u.toFixed(1) + ')';
    }
    function noktaKoy(el, x, y) { el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)'; }
    function halkaKoy(el, x, y, olcek, op) { el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) scale(' + olcek.toFixed(3) + ')'; el.style.opacity = op.toFixed(3); }
    var aciklama = uzay.querySelector('[data-k-aciklama]');
    function boyut() {
      s.w = uzay.clientWidth;
      s.h = uzay.clientHeight;
      s.ust = 12;
      s.alt = 12;
      s.bant = Math.max(200, s.h - s.ust - s.alt);
      s.orta = s.ust + s.bant / 2;
      s.etiketEn = Math.max.apply(null, AD.map(function (a) { return etiket[a].offsetWidth; }));
      s.on = Math.min(s.bant / 804, s.w * 0.84 / 384, 0.9);
      yerlesim();
      var d = M.dpr(), w = Math.round(360 * s.on * d * 1.25), h = Math.round(780 * s.on * d * 1.25);
      if (tuval.width !== w) tuval.width = w;
      if (tuval.height !== h) tuval.height = h;
      s.anahtar = '';
      s.gor = -1;
    }
    function kur() {
      boyut();
      if (!s.w) return;
      // ölçüm düz hâlde: uygulamalar üst üste, dönüşümsüz
      k3.style.transform = 'scale(' + s.on.toFixed(4) + ')';
      uyglar.forEach(function (u) { u.style.transform = 'none'; u.style.visibility = 'visible'; });
      s.gorunen = [];
      sen = { sohbet: senSohbet(uyglar[0]), harita: senHarita(uyglar[1]), takvim: senTakvim(uyglar[2]) };
      var h1 = kutu(uyglar[0], '[data-fis-hedef]');
      HEDEF.sohbet = h1 ? [h1.x + h1.w / 2, h1.y + h1.h / 2] : null;
      var h3b = kutu(uyglar[2], '[data-k-spor] b');
      HEDEF.takvim = h3b ? [h3b.x + h3b.w / 2, h3b.y + h3b.h * 0.56] : null;
      ciz(s.t);
    }
    /* oynatma: bölüm ekrandayken saat ilerler, değilken durur; sonunda durur ("Tekrar oynat").
       Bir bölüme dokununca oradan oynar. */
    function dongu(z) {
      s.kare = 0;
      if (!s.oynuyor || !s.gorunur) return;
      var dt = s.onceki ? Math.min(0.1, (z - s.onceki) / 1000) : 0;
      s.onceki = z;
      s.t += dt;
      if (s.t >= Z.son) { s.t = Z.son; s.oynuyor = false; s.bitti = true; durumYaz(); ciz(s.t); return; }
      ciz(s.t);
      s.kare = requestAnimationFrame(dongu);
    }
    function basla(t) {
      if (AZ) return;
      s.t = t || 0;
      s.ilk = true;   // kullanıcı bir bölüme dokunduysa kendiliğinden baştan başlamaz
      s.oynuyor = true; s.bitti = false; s.onceki = 0;
      durumYaz();
      ciz(s.t);
      if (!s.kare && s.gorunur) s.kare = requestAnimationFrame(dongu);
    }
    function durumYaz() {
      if (oynatYazi) oynatYazi.textContent = s.oynuyor ? dil('Baştan oynat', 'Play from the start') : dil('Tekrar oynat', 'Play again');
    }
    sira.forEach(function (b) {
      b.addEventListener('click', function () { basla(BOLUM[b.getAttribute('data-k-sira')]); });
    });
    if (oynatD) oynatD.addEventListener('click', function () { basla(0); });
    yazitipiHazir().then(function () {
      kur();
      if (AZ) { ciz(0); return; }
      if ('IntersectionObserver' in window) {
        // ilk oynatma sahnenin çoğu göründüğünde (kaydırırken başı kaçmasın); sonra beşte biri görünürken sürer
        new IntersectionObserver(function (g) {
          var r = g[0].isIntersecting ? g[0].intersectionRatio : 0;
          s.gorunur = r > 0.2;
          if (!s.ilk) { if (r >= 0.6) { s.ilk = true; basla(0); } return; }
          if (s.gorunur && s.oynuyor && !s.kare) { s.onceki = 0; s.kare = requestAnimationFrame(dongu); }
        }, { threshold: [0, 0.2, 0.6] }).observe(sahne);
      } else { s.gorunur = true; basla(0); }
    });
    // telefonda adres çubuğu açılıp kapanınca da "resize" gelir: yalnız gerçek boyut değişiminde yeniden kur
    var bekle = 0, sonEn = window.innerWidth, sonBoy = window.innerHeight;
    window.addEventListener('resize', function () {
      if (window.innerWidth === sonEn && Math.abs(window.innerHeight - sonBoy) < 120) return;
      sonEn = window.innerWidth; sonBoy = window.innerHeight;
      cancelAnimationFrame(bekle);
      bekle = requestAnimationFrame(kur);
    });
    OSN.katman = { s: s, Z: Z, sen: function () { return sen; }, ciz: ciz, durum: durum, kur: kur, basla: basla, kk: kk };
  }

  /* ========================================================== HIZLI NOTLAR: DEFTERDEKİ KEDİ
     Yatay tablette Hızlı Notlar: üstte defterin kalem kutusu (KarmaBar.kt; kutu.js › Karma), altında noktalı kâğıt.
     Kalem ucu tabletin kenarındaki yuvasından kalkar, kutudan kalem seçip çizer (kedi.js): siyahla kedi, maviyle
     "OSNote", sarı fosforlu; en son pembeyle kulak, yanak, pati yastıkları, kalp, "pati onaylı!" ve pati izi damgası.
     Bölüm görününce bir kez oynar; "Tekrar çiz" baştan çizer. Hareket azaltılmışsa çizimin son hâli durur. */
  // kutudaki kalemler: siyah, pembe, mavi (2 mm), sarı fosforlu (4 mm); şablonun rengi kırmızı. Pembe hızlı renklerde
  // yok: kayıtlı özel renk (renk satırının beşinci lekesi)
  var DEFTER_KALEM = [{ hl: false, renk: '#1A1A1A', mm: 2 }, { hl: false, renk: '#D81B60', mm: 2 }, { hl: false, renk: '#2196F3', mm: 2 }, { hl: true, renk: '#FFC107', mm: 4 }];
  var DEFTER_SEC = { siyah: 'k0', pembe: 'k1', mavi: 'k2', sari: 'k3' };
  var DEFTER_RENK = { siyah: '#1A1A1A', pembe: '#D81B60', mavi: '#2196F3', sari: '#FFC107' };
  function defterKur() {
    var kok = document.querySelector('[data-defter-sahne]');
    if (!kok || !OSN.kedi || !OSN.kutu) return;
    var tablet = kok.querySelector('[data-defter-tablet]'), c = new Cihaz(tablet);
    var adimlar = kok.querySelectorAll('[data-defter-adimlar] li'), oynatD = kok.querySelector('[data-defter-oynat]');
    var sen = null, oynadi = false, anlar = [], sonAn = -2;
    function adim(an) {
      if (an === sonAn) return;
      sonAn = an;
      for (var i = 0; i < adimlar.length; i++) {
        if (i < an) adimlar[i].setAttribute('data-durum', 'tamam');
        else if (i === an) adimlar[i].setAttribute('data-durum', 'simdi');
        else adimlar[i].removeAttribute('data-durum');
      }
    }
    function senKur() {
      // defterin çubuğu ekranın üstünde (defterde durum çubuğu yok); genişlik dp (tablette 1 dp ≈ 0,82 px)
      var dp = 0.82, kr = OSN.kutu.Karma(c.ekran, { en: Math.round(c.W / dp), olcu: 'tablet', kalemler: DEFTER_KALEM, eylemler: true, sekilRenk: '#E53935', ozel: '#D81B60', durum: { sec: 'k0' } });
      if (c.kk) c.kk.kok.remove();
      kr.dp = dp; kr.x = 0; kr.y = 0;
      kr.kok.style.setProperty('--dp', dp + 'px');
      kr.kok.style.left = '0px'; kr.kok.style.top = '0px';
      c.kk = kr; c.oc = kr.kok; c.ocAnahtar = null;
      // kâğıdın alanı ve çizimin yeri: çizim kâğıda ortalanır
      var ust = kr.boy * dp, K = OSN.kedi;
      var s = Math.min((c.W - 110) / K.EN, (c.H - ust - 44) / K.BOY);
      var ox = (c.W - K.EN * s) / 2, oy = ust + (c.H - ust - K.BOY * s) / 2 + 4;
      function don(ps, tohum) {
        return ps.map(function (p, i) {
          var q = [];
          for (var j = 0; j < p.length; j += 2) q.push(ox + p[j] * s, oy + p[j + 1] * s);
          return { p: q.length > 8 ? M.titret(q, 0.35, tohum + i) : q, duz: false };
        });
      }
      var Y = c.yuva();
      var plan = new S.Plan(c, { dinlen: Y ? [Y.x, Y.y] : [c.W + 60, c.H * 0.8], giris: Y ? 0.75 : 0.3 });
      var kalem = 'siyah', kSiyah = 3 * s, kPembe = 3 * s, kMavi = 3.3 * s, kFos = 22 * s;
      // aynı kalemle art arda çizilen şekiller tek öğe: aralarında kalem yalnız kalkıp iner. Karalanan dolgular
      // (pati yastıkları, damga) hızlı, ayrı öğe; yazılar da ayrı.
      var grup = null;
      function bitir() { if (grup) plan.ciz(grup.p, grup.renk, grup.k, grup.hiz, grup.kalkis); grup = null; }
      anlar = [0];
      K.parcalar(OSN.en, function (a, b) { return S.yaziEn(a, b); }).forEach(function (q, i) {
        var renk = DEFTER_RENK[q.kalem];
        if (q.kalem !== kalem) {
          bitir();
          var d = plan.dokun(DEFTER_SEC[q.kalem], { sec: DEFTER_SEC[q.kalem] });
          kalem = q.kalem;
          anlar.push(d.t);
          plan.bekle(0.06);
        }
        if (q.yazi) {
          bitir();
          plan.ciz(yazi(q.yazi.anahtar, ox + q.yazi.x * s, oy + q.yazi.y * s, q.yazi.boy * s, q.yazi.egim), renk, q.kalem === 'mavi' ? kMavi : kPembe, 960, 0.05);
          return;
        }
        if (q.kalem === 'sari') { bitir(); plan.ciz(don(q.p, 90), renk, kFos, 800, 0, true); return; }
        var dolgu = q.ad === 'yastik' || q.ad === 'damga', hiz = dolgu ? 1300 : q.kalem === 'siyah' ? 860 : 780;
        if (grup && grup.hiz !== hiz) bitir();
        if (!grup) grup = { p: [], renk: renk, k: q.kalem === 'siyah' ? kSiyah : kPembe, hiz: hiz, kalkis: q.kalem === 'siyah' ? 0.07 : 0.05 };
        grup.p = grup.p.concat(don(q.p, i * 7));
      });
      bitir();
      plan.her(function (dt, t) { var an = 0; while (an < anlar.length - 1 && t >= anlar[an + 1]) an++; adim(an); });
      return plan.senaryo({ el: false, sec: 'k0' }, Y ? { yuva: Y } : { cikis: [c.W + 120, c.H + 60, 70], cikisGizli: true });
    }
    function olcekle() {
      // tablet kendi sütununa sığar; geniş ekranda ekranın yüksekliğine de (menü ve bölümün payları düşülür)
      var sutun = tablet.parentNode.clientWidth, k;
      if (window.innerWidth > 980) k = Math.min(0.96, sutun / 1048, Math.max(0.6, (window.innerHeight - 190) / 673));
      else k = Math.min(0.96, sutun / 1048);
      tablet.style.setProperty('--k', k.toFixed(4));
    }
    function kur() {
      olcekle();
      if (!c.boyutla()) return false;
      sen = senKur();
      return !!sen;
    }
    function oynat1(gecikme) {
      if (!sen) return;
      if (AZ) { sen.ciz(sen.son); adim(adimlar.length); return; }
      sen.ciz(0);
      oynadi = true;
      oynat(sen, gecikme || 0, function () { adim(adimlar.length); });
    }
    if (oynatD) oynatD.addEventListener('click', function () { if (!sen) kur(); if (sen) { durdur(sen); oynat1(0.1); } });
    yazitipiHazir().then(function () {
      if (!kur()) return;
      if (AZ || !('IntersectionObserver' in window)) { oynadi = true; sen.ciz(sen.son); adim(adimlar.length); return; }
      sen.ciz(0);
      S.ucYuvada(c);
      var io = new IntersectionObserver(function (g) {
        if (!g[0].isIntersecting || oynadi) return;
        io.disconnect();
        oynat1(0.25);
      }, { threshold: 0.55 });
      io.observe(tablet);
    });
    var bekle = 0, sonEn = window.innerWidth;
    window.addEventListener('resize', function () {
      if (window.innerWidth === sonEn) return;
      sonEn = window.innerWidth;
      cancelAnimationFrame(bekle);
      bekle = requestAnimationFrame(function () {
        var calisiyor = sen && oynuyor(sen);
        if (sen) durdur(sen);
        if (!kur()) return;
        if (calisiyor) oynat1(0); else sen.ciz(oynadi ? sen.son : 0);
      });
    });
    OSN.hizliNot = { c: c, sen: function () { return sen; }, kur: kur };
  }

  /* ========================================================== KALEM KUTUSU: KUTUDA NE VAR?
     Listeden bir parça seçilince ızgaralı sayfanın üstündeki kutuda o yer görünür; kartı varsa uygulamadaki gibi
     altında, düğmesinin hizasında açılır (kutu.js › KalemKutusu, KucukKutu, KART; içerikler PenTrayToolbar.kt,
     DockedKit.kt, DockedToolbarState.kt). Geniş sahnede kutu üst kenarda yatay; dar sahnede sol kenarda dik, kart
     yanında. Çiz · Dokun seçiliyken kutu iki mod arasında gidip gelir (hareket azaltılmışsa Dokun'da durur). */
  var AN_KALEM = [{ hl: false, renk: '#E5484D', k: 3 }, { hl: false, renk: '#0090FF', k: 1.5 }, { hl: true, renk: '#FFC53D', k: 14 }];
  // "+": kutuda olmayan ilk renk (siyah, yeşil, turuncu…), 3 dp; kalemlerin sonuna, fosforlulardan önce
  var AN_EKLI = [AN_KALEM[0], AN_KALEM[1], { hl: false, renk: '#1D1B1E', k: 3 }, AN_KALEM[2]];
  var AN = {
    mod: { isik: ['ciz', 'dokun'], a: ['Kalem her açıldığında Dokun’da başlar. Bir kaleme, silgiye ya da şekle dokununca Çiz’e geçer.',
      'The pen always opens in Touch. Tapping a pen, the eraser or the shape tool switches to Draw.'] },
    kalem: { sec: 'k0', capa: 'k0', ara: 23, kart: function (K) { return K.kalem(AN_KALEM[0]); },
      a: ['Kalem ya da fosforlu; sekiz renk, üç hazır kalınlık ve ince ayar. Kutu kendini dizer: önce kalemler, sonra fosforlular.',
        'Pen or highlighter; eight colours, three preset sizes and a fine slider. The tray sorts itself: pens first, then highlighters.'] },
    silgi: { sec: 'silgi', capa: 'silgi', ara: 23, kart: function (K) { return K.silgi(24, false); },
      a: ['Tümünü temizle ekranda çizim varsa önce sorar; temizlediğini Geri al getirir.', 'Clear all asks first when there is ink on the screen; Undo brings it back.'] },
    sekil: { sec: 'sekil', capa: 'sekil', ara: 31, kart: function (K) { return K.sekil('cizgi', '#E5484D', 3); },
      a: ['Şablon, şeklin renginde durur. Çizdikten sonra köşeler ve uçlar tek tek sürüklenir; şeklin içinden tutup taşırsın.',
        'The stencil takes the shape’s colour. After drawing, corners and ends drag one by one; grab inside to move the shape.'] },
    ekle: { sec: 'k2', capa: 'k2', ara: 23, isik: ['ekle'], kalemler: AN_EKLI, kart: function (K) { return K.kalem(AN_EKLI[2]); },
      a: ['Yeni kalem kutuda olmayan ilk rengi alır ve kartı hemen açılır. Çıkarmak önce sorar; ekrandaki çizimler silinmez.',
        'A new pen takes the first colour not in the tray, and its card opens right away. Removing one asks first; your ink stays.'] },
    geri: { sec: 'k0', isik: ['geri', 'yinele'], a: ['Dar kutuda (telefon dikken üstte ya da altta) Yinele, Şekil ve Yeni kalem ⋯ menüsüne geçer.',
      'On a narrow tray (a phone upright, tray at the top or bottom) Redo, Shape and New pen move into the ⋯ menu.'] },
    daha: { sec: 'k0', capa: 'daha', ara: 16, kart: function (K) { return K.menu(); },
      a: ['Çizimleri gizle, yazdıklarını silmeden ekranı açar; gizliyken ⋯ düğmesinde sarı bir nokta durur. Sayfa ve Ekran görüntüsü aşağıda.',
        'Hide drawings clears the view without erasing; while hidden, a yellow dot sits on ⋯. Page and Screenshot are further down.'] },
    kucult: { kucuk: true, a: ['En çok gerekenler kutuyu açmadan yapılır. Seçili kaleme bir daha dokununca bütün kalemler açılır, silgiye dokununca silgi kartı.',
      'The everyday things work without opening the tray. Tap the selected pen again for all your pens, the eraser for its card.'] },
    kapat: { sec: 'k0', capa: 'kapat', ara: 16, kart: function (K) { return K.onay(dil('Kalem kapatılsın mı?', 'Turn off the pen?'), dil('Ekrandaki çizimler silinir.', 'Ink on the screen will be cleared.'), dil('Kapat', 'Turn off')); },
      a: ['Saklamak istediğini kapatmadan önce Ekran görüntüsü ile kütüphaneye kaydet.', 'To keep something, save it to the library with Screenshot before you turn off.'] }
  };
  function anatomiKur() {
    var kok = document.querySelector('[data-anatomi]');
    if (!kok || !OSN.kutu) return;
    var K = OSN.kutu, liste = kok.querySelector('[data-anatomi-liste]'), ekran = kok.querySelector('[data-anatomi-ekran]'), aciklama = kok.querySelector('[data-anatomi-aciklama]');
    var sekmeler = liste.querySelectorAll('button[data-p]');
    var tray = null, trayAnahtar = '', kart = null, isiklar = [], kucuk = null, simdi = 'kalem', modZaman = 0, gorunur = false;
    function temizle() {
      if (kart) { kart.remove(); kart = null; }
      isiklar.forEach(function (i) { i.remove(); });
      isiklar = [];
      if (kucuk) { kucuk.kok.remove(); kucuk = null; }
      clearInterval(modZaman); modZaman = 0;
    }
    // sahnenin ölçüsü: iç genişliğe göre yatay (üst kenar) ya da dik (sol kenar); kutu en uzun hâline (dört kalem) göre ölçeklenir
    function olcu() {
      var cs = getComputedStyle(ekran), pay = parseFloat(cs.paddingLeft) || 24, ic = ekran.clientWidth - 2 * pay;
      var yatay = ic >= 560, m = K.OLCU.tablet, uzun = 5 + m.mod + 5 + (m.yuva * 7 + 12) + 5 + (4 + 3 * m.kutuS + 1 + m.kapat + 14) + 5;
      var s = yatay ? Math.min(1.4, ic / uzun) : Math.min(1, ic / (m.kutu + 23 + 244), (window.innerHeight * 0.9) / uzun);
      return { pay: pay, ic: ic, yatay: yatay, s: s };
    }
    function isik(r, o, x0, y0) {
      var d = document.createElement('i');
      d.className = 'anatomi__isik';
      d.setAttribute('aria-hidden', 'true');
      var p = 3;
      d.style.left = (x0 + (r.x - p) * o.s) + 'px'; d.style.top = (y0 + (r.y - p) * o.s) + 'px';
      d.style.width = ((r.w + 2 * p) * o.s) + 'px'; d.style.height = ((r.h + 2 * p) * o.s) + 'px';
      ekran.appendChild(d);
      isiklar.push(d);
    }
    function birlesim(adlar) {
      var b = null;
      adlar.forEach(function (a) {
        var r = tray.yer(a);
        if (!r) return;
        if (!b) b = { x: r.x, y: r.y, w: r.w, h: r.h };
        else { var x1 = Math.max(b.x + b.w, r.x + r.w), y1 = Math.max(b.y + b.h, r.y + r.h); b.x = Math.min(b.x, r.x); b.y = Math.min(b.y, r.y); b.w = x1 - b.x; b.h = y1 - b.y; }
      });
      return b;
    }
    function goster(p) {
      var t = AN[p], o = olcu();
      temizle();
      if (aciklama) aciklama.textContent = dil(t.a[0], t.a[1]);
      var ust = 22;
      if (t.kucuk) {
        if (tray) tray.kok.classList.add('kk--gizli');
        kucuk = K.KucukKutu(ekran, { kenar: 'ust', arac: { tur: 'kalem', renk: '#E5484D' }, durum: { ciz: true, sec: 'arac' } });
        var ks = Math.min(o.s * 1.15, o.ic / 208);
        kucuk.kok.style.setProperty('--dp', ks + 'px');
        kucuk.kok.style.left = (o.yatay ? o.pay + (o.ic - kucuk.en * ks) / 2 : o.pay) + 'px';
        kucuk.kok.style.top = ust + 'px';
        ekran.style.height = Math.round(ust + kucuk.boy * ks + 18 * ks + 40) + 'px';
        return;
      }
      // kutu: kalemler değişince yeniden kurulur; yön değişince de
      var kalemler = t.kalemler || AN_KALEM, anahtar = (t.kalemler ? 'e' : 'n') + (o.yatay ? 'y' : 'd') + o.s.toFixed(3);
      if (!tray || trayAnahtar !== anahtar) {
        if (tray) tray.kok.remove();
        tray = K.KalemKutusu(ekran, { kenar: o.yatay ? 'ust' : 'sol', olcu: 'tablet', sekil: true, ekle: true, kalemler: kalemler, durum: { ciz: true, sec: t.sec || 'k0' } });
        tray.kok.style.setProperty('--dp', o.s + 'px');
        trayAnahtar = anahtar;
      }
      tray.kok.classList.remove('kk--gizli');
      var x0 = o.yatay ? o.pay + (o.ic - tray.en * o.s) / 2 : o.pay, y0 = ust;
      tray.kok.style.left = x0 + 'px'; tray.kok.style.top = y0 + 'px';
      tray.durum({ ciz: p !== 'mod', sec: t.sec || 'k0' });
      if (p === 'mod' && !AZ) {
        var ciz = false;
        modZaman = setInterval(function () { if (!gorunur) return; ciz = !ciz; tray.durum({ ciz: ciz, sec: 'k0' }); }, 1700);
      }
      (t.isik ? [t.isik] : []).forEach(function (adlar) { var b = birlesim(adlar); if (b) isik(b, o, x0, y0); });
      var boy = o.yatay ? y0 + tray.boy * o.s + 40 : y0 + tray.boy * o.s + 22;
      if (t.kart) {
        kart = t.kart(K.KART);
        kart.style.setProperty('--dp', o.s + 'px');
        ekran.appendChild(kart);
        var a = tray.yer(t.capa), kw = kart.offsetWidth, kh = kart.offsetHeight;
        if (o.yatay) {
          var cx = x0 + (a.x + a.w / 2) * o.s, kx = Math.max(o.pay * 0.5, Math.min(ekran.clientWidth - o.pay * 0.5 - kw, cx - kw / 2));
          var ky = y0 + tray.boy * o.s + t.ara * o.s;
          kart.style.left = kx + 'px'; kart.style.top = ky + 'px';
          boy = Math.max(boy, ky + kh + 26);
        } else {
          var cy = y0 + (a.y + a.h / 2) * o.s, sx = x0 + tray.en * o.s + t.ara * o.s;
          var sy = Math.max(ust, Math.min(y0 + tray.boy * o.s - kh, cy - kh / 2));
          kart.style.left = Math.min(sx, ekran.clientWidth - kw - 4) + 'px'; kart.style.top = sy + 'px';
        }
      }
      ekran.style.height = Math.round(boy) + 'px';
    }
    function sec(p, odak) {
      simdi = p;
      for (var i = 0; i < sekmeler.length; i++) {
        var s = sekmeler[i].getAttribute('data-p') === p;
        sekmeler[i].setAttribute('aria-pressed', String(s));
        sekmeler[i].tabIndex = s ? 0 : -1;
        if (s && odak) sekmeler[i].focus();
      }
      goster(p);
    }
    liste.addEventListener('click', function (e) { var b = e.target.closest('button[data-p]'); if (b) sec(b.getAttribute('data-p')); });
    liste.addEventListener('keydown', function (e) {
      var i = Array.prototype.indexOf.call(sekmeler, document.activeElement);
      if (i < 0) return;
      var n = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? sekmeler.length - 1 : null;
      if (n === null) return;
      e.preventDefault();
      n = (n + sekmeler.length) % sekmeler.length;
      sec(sekmeler[n].getAttribute('data-p'), true);
    });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (g) { gorunur = g[0].isIntersecting; }).observe(ekran);
    else gorunur = true;
    yazitipiHazir().then(function () { sec(simdi); });
    var sonEn = window.innerWidth;
    window.addEventListener('resize', function () {
      if (window.innerWidth === sonEn) return;
      sonEn = window.innerWidth;
      requestAnimationFrame(function () { trayAnahtar = ''; goster(simdi); });
    });
    OSN.anatomi = { sec: sec };
  }

  /* ========================================================== ŞEKİLLER VE AÇILAR
     Sorunun şeklinin üstüne OSNote'un üçgeni: köşeler sürüklenir, açılar yazılır. Örnekte kalem ucu
     üçgeni çizer, sonra köşeleri tek tek şeklin köşelerine taşır; aralarda kalkıp geçer. */
  function sekilKur() {
    var tablet = document.querySelector('[data-sekil-tablet]');
    if (!tablet) return;
    var c = new Cihaz(tablet), ipucu = document.querySelector('[data-sekil-ipucu]');
    var v = null, hedef = null, surukle = null, kare = 0, oynuyor = false;
    var KIRMIZI = '#E5484D';   // şeklin ilk mürekkebi: kutunun kırmızı kalemi (DockedToolbarState: shapeInk)

    function hedefBul() {
      var svg = c.ekran.querySelector('.t-cizim'), b = c.kutu(svg);
      if (!b) return null;
      var k = b.w / 400;
      return [b.x + 70 * k, b.y + 40 * k, b.x + 70 * k, b.y + 220 * k, b.x + 382 * k, b.y + 220 * k]; // A, B, C
    }
    function susuOlcek() { return Math.min(1, c.olcek / 0.88); }
    function ciz() {
      var ctx = c.baglam();
      if (!v) return;
      M.cizgi(ctx, M.sekilYol('ucgen', v), KIRMIZI, 4, true);
      M.sekilSusu(ctx, 'ucgen', v, susuOlcek(), M.dpr());
    }
    function ipucuYaz() {
      if (!ipucu || !v) return;
      var a = M.acilar(v);
      var guzel = a.filter(function (x) { return [30, 45, 60, 90, 120, 135, 150].indexOf(x) >= 0; }).length;
      ipucu.textContent = dil('Açılar: ', 'Angles: ') + a[0] + '°, ' + a[1] + '°, ' + a[2] + '°.' + (guzel ? dil(' Sarı yazılanlar tam açı.', ' The yellow ones are clean angles.') : dil(' Köşeleri sürükle.', ' Drag the corners.'));
    }
    function kur() {
      if (!c.boyutla()) return;
      // Gelişmiş kutu sağ kenarda dik; şekil seçili ve Çiz'de (şablon kalkık), sorunun yazısından aşağıda
      c.kkKur({ kenar: 'sag', sekil: true, sekilRenk: KIRMIZI, ekle: true, durum: { ciz: true, sec: 'sekil' }, oran: 0.64 });
      hedef = hedefBul();
      ciz();
      if (!oynuyor) S.ucYuvada(c);
    }
    function bitis() {
      v = [hedef[0], hedef[1], hedef[4], hedef[5], hedef[2], hedef[3]];
      ciz();
      if (ipucu) ipucu.textContent = dil('C köşesi 30°, B köşesi 90°: cevap B şıkkı. Şimdi sen sürükle.', 'Corner C is 30°, corner B is 90°: the answer is B. Now you drag.');
    }
    // örnek: üçgeni çiz (sürükle), köşeleri şeklin köşelerine taşı
    function ornek() {
      if (!hedef) return;
      oynuyor = true;
      cancelAnimationFrame(kare);
      if (AZ) { oynuyor = false; bitis(); return; }
      var ax = hedef[0] + 60, ay = hedef[1] + 10, bx = hedef[4] - 40, by = hedef[3] - 6, Y = c.yuva();
      var sur = [{ a: [ax, ay], b: [bx, by], s: 1.0, cizim: true }];
      var vv = M.sekilKur('ucgen', ax, ay, bx, by);
      [[0, 0], [2, 2], [1, 4]].forEach(function (e) {
        var i = e[0], j = e[1];
        sur.push({ a: [vv[i * 2], vv[i * 2 + 1]], b: [hedef[j], hedef[j + 1]], s: 0.75, i: i });
        vv = M.tutamacTasi('ucgen', vv, i, hedef[j], hedef[j + 1]);
      });
      var t = Y ? 1.35 : 1.0;   // kalem önce bir an yuvasında görünür
      sur.forEach(function (x, k) {
        if (k) t += 0.3 + Math.hypot(x.a[0] - sur[k - 1].b[0], x.a[1] - sur[k - 1].b[1]) / 1500;
        x.t0 = t;
        t += x.s;
      });
      var yol = S.izKur(sur.map(function (x) {
        return {
          bas: x.t0, son: x.t0 + x.s, ilk: { x: x.a[0], y: x.a[1], h: 0 }, sonP: { x: x.b[0], y: x.b[1], h: 0 },
          poz: function (tt) { var e = M.yumusak(M.sinirla((tt - x.t0) / x.s, 0, 1)); return { x: x.a[0] + (x.b[0] - x.a[0]) * e, y: x.a[1] + (x.b[1] - x.a[1]) * e, h: 0, yaz: true }; }
        };
      }), Y ? { yuva: Y } : { x: c.W + 90, y: c.H * 0.72, h: 60 }, Y ? { yuva: Y } : { x: c.W + 90, y: c.H * 0.72, h: 60, gizli: true }, 1.0, 0.9, c);
      var bas = 0, vAnahtar = null;
      var yap = function (z) {
        if (!bas) bas = z;
        var tt = (z - bas) / 1000, w = null;
        for (var k = 0; k < sur.length; k++) {
          var x = sur[k];
          if (tt < x.t0) break;
          var e = M.yumusak(M.sinirla((tt - x.t0) / x.s, 0, 1));
          var px = x.a[0] + (x.b[0] - x.a[0]) * e, py = x.a[1] + (x.b[1] - x.a[1]) * e;
          w = x.cizim ? M.sekilKur('ucgen', ax, ay, px, py) : M.tutamacTasi('ucgen', w, x.i, px, py);
        }
        v = w;
        var vk = w ? w.map(function (n) { return Math.round(n * 4); }).join(',') : '';
        if (vk !== vAnahtar) { vAnahtar = vk; ciz(); }
        S.ucKoy(c, yol(tt), tt);
        if (tt < yol.son) { kare = requestAnimationFrame(yap); return; }
        oynuyor = false;
        S.ucYuvada(c);
        bitis();
      };
      kare = requestAnimationFrame(yap);
    }

    function nokta(e) { var r = c.tuval.getBoundingClientRect(); return [(e.clientX - r.left) / c.olcek, (e.clientY - r.top) / c.olcek]; }
    c.tuval.addEventListener('pointerdown', function (e) {
      if (oynuyor || !v) return;
      var n = nokta(e), yakin = -1, en = Math.pow(26 / c.olcek, 2);
      for (var i = 0; i < 3; i++) {
        var dx = v[i * 2] - n[0], dy = v[i * 2 + 1] - n[1], dd = dx * dx + dy * dy;
        if (dd < en) { en = dd; yakin = i; }
      }
      if (yakin < 0 && !M.icinde(v, n[0], n[1])) return;
      e.preventDefault();
      try { c.tuval.setPointerCapture(e.pointerId); } catch (_) { /* yok */ }
      surukle = { id: e.pointerId, i: yakin, x: n[0], y: n[1], v: v.slice() };
    });
    c.tuval.addEventListener('pointermove', function (e) {
      if (!surukle || surukle.id !== e.pointerId) return;
      var n = nokta(e);
      n[0] = M.sinirla(n[0], 8, c.W - 8);
      n[1] = M.sinirla(n[1], 40, c.H - 8);
      if (surukle.i >= 0) v = M.tutamacTasi('ucgen', v, surukle.i, n[0], n[1]);
      else {
        var dx = n[0] - surukle.x, dy = n[1] - surukle.y;
        v = surukle.v.map(function (s, k) { return s + (k % 2 ? dy : dx); });
      }
      ciz();
      ipucuYaz();
    });
    var birak = function (e) { if (surukle && surukle.id === e.pointerId) surukle = null; };
    c.tuval.addEventListener('pointerup', birak);
    c.tuval.addEventListener('pointercancel', birak);
    var yeniden = document.querySelector('[data-sekil-yeniden]');
    if (yeniden) yeniden.addEventListener('click', function () { cancelAnimationFrame(kare); v = null; ciz(); ornek(); });

    yazitipiHazir().then(function () {
      kur();
      if (!('IntersectionObserver' in window)) { ornek(); return; }
      var io = new IntersectionObserver(function (g) {
        if (!g[0].isIntersecting) return;
        io.disconnect();
        ornek();
      }, { threshold: 0.5 });
      io.observe(tablet);
    });
    // cihazın içi tasarım pikseliyle: ölçek değişse de köşelerin yeri aynı kalır
    window.addEventListener('resize', function () { requestAnimationFrame(kur); });
  }

  /* ========================================================== SAYFA VE EKRAN GÖRÜNTÜSÜ
     Telefonda ders videosunun üstüne kâğıt; altta kalem kutusu (telefon dik, kutu altta: dar düzen, tek mod tuşu).
     Yandaki Sayfa kartı kâğıdı değiştirir (renk ya da desen seçmek sayfayı açar, uygulamadaki gibi); ekran görüntüsü
     kartı yazıyı ya da ekranla birlikte deneme bölümünün kütüphanesine kaydeder. */
  // telefondaki kutunun kalemleri: kırmızı, mavi (biraz kalın), sarı fosforlu; çizim mavi, sonucun altı kırmızı
  var SAYFA_KALEM = [{ hl: false, renk: '#E5484D', k: 3 }, { hl: false, renk: '#0090FF', k: 2.5 }, { hl: true, renk: '#FFC53D', k: 14 }];
  function sayfaKur() {
    var kok = document.querySelector('[data-sayfa-sahne]');
    if (!kok) return;
    var tel = kok.querySelector('.tel'), c = new Cihaz(tel), kagit = tel.querySelector('[data-kagit]');
    var acD = kok.querySelectorAll('[data-sp-ac] [role="radio"]'), renkler = kok.querySelectorAll('[data-sp-renk] [role="radio"]'), desenler = kok.querySelectorAll('[data-sp-desen] [role="radio"]');
    var opak = kok.querySelector('[data-sp-opak]'), opakYazi = kok.querySelector('[data-sp-opak-yazi]'), onizleme = kok.querySelector('[data-sp-onizleme]');
    var not = kok.querySelector('[data-sp-yakala-not]');
    var d = { acik: true, renk: '#FAFAFA', desen: 'kareli', opak: 95 };   // uygulamanın varsayılanı %95
    var KOYU = { '#1E1E2E': 1, '#282C34': 1 };
    var sen = null, oynadi = false;

    function uygula() {
      kagit.hidden = !d.acik;
      kagit.setAttribute('data-desen', d.desen);
      kagit.classList.toggle('tel__kagit--koyu', !!KOYU[d.renk]);
      kagit.style.setProperty('--zemin', d.renk);
      kagit.style.setProperty('--opak', String(d.opak / 100));
      if (onizleme) { onizleme.style.setProperty('--zemin', d.renk); onizleme.style.opacity = String(d.opak / 100); onizleme.setAttribute('data-desen', d.desen); }
      if (opakYazi) opakYazi.textContent = dil('%' + d.opak, d.opak + '%');
      if (opak) opak.style.setProperty('--y', ((d.opak - 40) / 60 * 100).toFixed(1) + '%');
      // koyu kâğıtta mürekkep açık renk olsun diye değil: uygulamada mürekkep rengini sen seçersin
    }
    function radyo(grup, deger) {
      for (var i = 0; i < grup.length; i++) grup[i].setAttribute('aria-checked', String(grup[i].getAttribute('data-deger') === deger));
    }
    Array.prototype.forEach.call(acD, function (b) { b.addEventListener('click', function () { d.acik = b.getAttribute('data-deger') === 'acik'; radyo(acD, b.getAttribute('data-deger')); uygula(); }); });
    // renk ya da desen seçmek sayfayı da açar (DSheetPanel: setSheet(enabled = true, …))
    function ac() { d.acik = true; radyo(acD, 'acik'); }
    Array.prototype.forEach.call(renkler, function (b) { b.addEventListener('click', function () { d.renk = b.getAttribute('data-deger'); radyo(renkler, d.renk); ac(); uygula(); }); });
    Array.prototype.forEach.call(desenler, function (b) { b.addEventListener('click', function () { d.desen = b.getAttribute('data-deger'); radyo(desenler, d.desen); ac(); uygula(); }); });
    if (opak) opak.addEventListener('input', function () { d.opak = +opak.value; uygula(); });
    // radyo gruplarında ok tuşları
    [acD, renkler, desenler].forEach(function (grup) {
      Array.prototype.forEach.call(grup, function (b, i) {
        b.tabIndex = b.getAttribute('aria-checked') === 'true' ? 0 : -1;
        b.addEventListener('keydown', function (e) {
          var n = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? i + 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? i - 1 : null;
          if (n === null) return;
          e.preventDefault();
          n = (n + grup.length) % grup.length;
          grup[n].click();
          for (var k = 0; k < grup.length; k++) grup[k].tabIndex = k === n ? 0 : -1;
          grup[n].focus();
        });
        b.addEventListener('click', function () { for (var k = 0; k < grup.length; k++) grup[k].tabIndex = grup[k] === b ? 0 : -1; });
      });
    });

    // karalama kâğıdı: önce yörüngenin küçük bir çizimi (zemin, yol, tepeden inen kesik çizgi, h, açı), altında
    // hesap. İkinci satır yanlış (yarıyı unutmuş): üstü karalanır, doğrusu altına yazılır; kırmızıya dokunup
    // sonucun altını iki kez çizer. Kalem sonra çekilip gider.
    function elCizgiS(n, tohum) { return [{ p: M.titret(M.duzlestir(n, 3), 0.8, tohum), duz: true }]; }
    function sinir(parca) {
      var k = [Infinity, Infinity, -Infinity, -Infinity];
      parca.forEach(function (q) { for (var i = 0; i < q.p.length; i += 2) { k[0] = Math.min(k[0], q.p[i]); k[1] = Math.min(k[1], q.p[i + 1]); k[2] = Math.max(k[2], q.p[i]); k[3] = Math.max(k[3], q.p[i + 1]); } });
      return k;
    }
    function senKur() {
      var plan = new S.Plan(c, { dinlen: [c.W + 40, c.H + 120], giris: 0.2 });
      var mavi = SAYFA_KALEM[1].renk, kirmizi = SAYFA_KALEM[0].renk;
      var x0 = 98, x2 = 318, yz = 234, xt = (x0 + x2) / 2, yt = 116;
      plan.ciz(elCizgiS([x0 - 16, yz + 1, xt, yz - 0.5, x2 + 14, yz - 1], 5), mavi, 2.4, 900, 0);
      var yol = [];
      for (var i = 0; i <= 26; i++) { var t = i / 26, u = 1 - t; yol.push(u * u * x0 + 2 * u * t * xt + t * t * x2, u * u * yz + 2 * u * t * (2 * yt - yz) + t * t * yz); }
      plan.ciz([{ p: M.titret(yol, 1, 7), duz: true }], mavi, 2.8, 700, 0.03);
      for (var k = 0; k < 4; k++) { var ya = yt + 9 + k * 27; plan.ciz(elCizgiS([xt + 0.4 * k, ya, xt + 0.4 * k + 0.5, ya + 13], 30 + k), mavi, 2.2, 1300, 0); }
      plan.ciz(yazi('s_h', xt + 9, (yt + yz) / 2 + 14, 24, -0.03), mavi, 2.6, 820, 0.04);
      var yay = [];
      for (var a = 0; a <= 10; a++) { var q = -a / 10 * 0.9273; yay.push(x0 + 27 * Math.cos(q), yz + 27 * Math.sin(q)); }
      plan.ciz([{ p: M.titret(yay, 0.5, 9), duz: true }], mavi, 2.2, 700, 0.03);
      plan.ciz(yazi('s_aci', x0 + 32, yz - 7, 16, -0.03), mavi, 2.2, 820, 0.04);
      plan.bekle(0.18);
      // hesap: satırlar elle yazılmış gibi biraz kayar
      var lx = 82;
      plan.ciz(yazi('g_1', lx, 302, 25, -0.03), mavi, 2.8, 820, 0.05);
      plan.bekle(0.12);
      var hata = yazi('s_hata', lx + 5, 352, 25, -0.02), kh = sinir(hata);
      plan.ciz(hata, mavi, 2.8, 820, 0.05);
      plan.bekle(0.4);
      var zik = [], ym = (kh[1] + kh[3]) / 2, ad = 0;
      for (var zx = kh[0] - 5; zx <= kh[2] + 6; zx += 9) zik.push(zx, ym + (ad++ % 2 ? -8 : 8));
      plan.ciz([{ p: M.titret(M.duzlestir(zik, 2.5), 0.5, 12), duz: true }], mavi, 2.4, 1500, 0);
      plan.bekle(0.2);
      var dogru = yazi('y_4', lx + 2, 404, 25, -0.02), kd = sinir(dogru);
      plan.ciz(dogru, mavi, 2.8, 820, 0.05);
      plan.bekle(0.1);
      plan.dokun('k0', { el: false, sec: 'k0' });
      var ry = kd[3] + 5;
      plan.ciz(elCizgiS([kd[2] - 60, ry + 0.5, kd[2] + 4, ry - 1.2], 71), kirmizi, 3, 900, 0);
      plan.ciz(elCizgiS([kd[2] - 54, ry + 7.5, kd[2] + 8, ry + 5.5], 72), kirmizi, 3, 900, 0.03);
      return plan.senaryo({ el: false, sec: 'k1' }, { cikis: [c.W + 60, c.H + 150, 70], cikisGizli: true });
    }
    function kur() {
      if (!c.boyutla()) return;
      c.kkKur({ kenar: 'alt', tam: false, kalemler: SAYFA_KALEM, durum: { ciz: true, sec: 'k1' } });
      var video = tel.querySelector('[data-ders]');
      if (video) V.dersCiz(video, V.DERS.tepeT, -1);
      sen = senKur();
      sen.ciz(oynadi || AZ ? sen.son : 0);
    }
    function yazilar() { return sen ? sen.adimlar.filter(function (a) { return a.tur === 'ciz'; }) : []; }
    function yakala(tur) {
      if (!sen || !OSN.kutuphane) return;
      var s = 2, W = 360, H = 780, cv = document.createElement('canvas'), x;
      if (tur === 'yazi') {
        // yazının çevresi, beyaz zeminde
        var k = [Infinity, Infinity, -Infinity, -Infinity];
        yazilar().forEach(function (a) {
          a.o.parca.forEach(function (p) { var b = M.kutu(p.p, a.o.k); k = [Math.min(k[0], b[0]), Math.min(k[1], b[1]), Math.max(k[2], b[2]), Math.max(k[3], b[3])]; });
        });
        k = [Math.max(0, k[0] - 20), Math.max(0, k[1] - 20), Math.min(W, k[2] + 20), Math.min(H, k[3] + 20)];
        cv.width = (k[2] - k[0]) * s; cv.height = (k[3] - k[1]) * s;
        x = cv.getContext('2d');
        x.fillStyle = '#FFFFFF';
        x.fillRect(0, 0, cv.width, cv.height);
        x.setTransform(s, 0, 0, s, -k[0] * s, -k[1] * s);
        yazilar().forEach(function (a) { a.o.parca.forEach(function (p) { M.cizgi(x, p.p, a.o.renk, a.o.k, p.duz); }); });
      } else {
        cv.width = W * s; cv.height = H * s;
        x = cv.getContext('2d');
        x.setTransform(s, 0, 0, s, 0, 0);
        ekranResmi(x, tel, c);
        if (d.acik) {
          x.save();
          x.globalAlpha = d.opak / 100;
          M.kagit(x, W, H, d.desen, d.renk, KOYU[d.renk] ? 'rgba(255,255,255,0.16)' : 'rgba(17,17,17,0.14)', 30);
          x.restore();
        }
        yazilar().forEach(function (a) { a.o.parca.forEach(function (p) { M.cizgi(x, p.p, a.o.renk, a.o.k, p.duz); }); });
      }
      M.tuvalBlob(cv, 'image/png').then(function (blob) {
        OSN.kutuphane.ekle({ tur: tur === 'yazi' ? 'yazi' : 'ekran', blob: blob, en: cv.width, boy: cv.height });
        if (OSN.duyur) OSN.duyur(dil('Kütüphanende, güvende.', 'In your library, safe and sound.'), '#kutuphane', dil('Kütüphaneye git', 'Go to library'));
        if (not) not.textContent = dil((tur === 'yazi' ? 'Sadece yazı' : 'Arka plan dahil yazı') + ' kütüphaneye eklendi. Aşağıdaki deneme bölümünde duruyor.',
          (tur === 'yazi' ? 'Your writing' : 'Your writing and the screen behind it') + ' went to the library. It’s in the Try it section below.');
      }).catch(function () { if (not) not.textContent = dil('Kaydedilemedi, bir daha dene.', 'Couldn’t save it. Try again.'); });
    }
    Array.prototype.forEach.call(kok.querySelectorAll('[data-sp-yakala]'), function (b) {
      b.addEventListener('click', function () { yakala(b.getAttribute('data-sp-yakala')); });
    });

    uygula();
    yazitipiHazir().then(function () {
      kur();
      if (AZ || !('IntersectionObserver' in window)) { oynadi = true; if (sen) sen.ciz(sen.son); return; }
      var io = new IntersectionObserver(function (g) {
        if (!g[0].isIntersecting || oynadi) return;
        io.disconnect();
        oynadi = true;
        if (sen) { sen.ciz(0); oynat(sen, 0.2); }
      }, { threshold: 0.5 });
      io.observe(tel);
    });
    window.addEventListener('resize', function () { requestAnimationFrame(function () { if (!sen || !oynuyor(sen)) kur(); }); });
  }

  // "Arka plan dahil yazı": ders videosunun ekranını tuvale çizer (durum çubuğu, kare, başlık, bölümler)
  function ekranResmi(x, tel, c) {
    x.fillStyle = '#0F0F0F';
    x.fillRect(0, 0, 360, 780);
    var video = tel.querySelector('[data-ders]');
    var kb = c.kutu('.d-kare') || { x: 0, y: 32, w: 360, h: 203 };
    if (video && video.width) x.drawImage(video, kb.x, kb.y, kb.w, kb.h);
    x.textBaseline = 'alphabetic';
    x.fillStyle = '#FFFFFF';
    x.font = '500 14px Roboto, system-ui, sans-serif';
    var saat = tel.querySelector('.durum b');
    x.fillText(saat ? saat.textContent : '', 26, 22);
    var metinler = [['.d-baslik', '500 16px', '#F1F1F1', 21], ['.d-meta', '400 12.5px', '#AAAAAA', 16], ['.d-ara', '500 13px', '#AAAAAA', 16]];
    metinler.forEach(function (m) {
      var el = tel.querySelector(m[0]);
      if (!el) return;
      var b = c.kutu(el);
      x.font = m[1] + ' Roboto, system-ui, sans-serif';
      x.fillStyle = m[2];
      satirla(x, el.textContent, b.x, b.y + m[3] * 0.78, b.w + 2, m[3]);
    });
    Array.prototype.forEach.call(tel.querySelectorAll('.d-bolumler li'), function (li) {
      var b = c.kutu(li), orta = b.y + b.h / 2 + 4.5;
      if (li.classList.contains('d-simdi')) { x.fillStyle = '#262626'; kutuYol(x, b.x, b.y, b.w, b.h, 10); x.fill(); }
      var z = c.kutu(li.querySelector('time')), ad = c.kutu(li.querySelector('span'));
      x.font = '500 12.5px Roboto, system-ui, sans-serif';
      x.fillStyle = '#8AB4F8';
      x.fillText(li.querySelector('time').textContent, z.x, orta);
      x.font = '400 13.5px Roboto, system-ui, sans-serif';
      x.fillStyle = li.classList.contains('d-simdi') ? '#FFFFFF' : '#D6D6D6';
      x.fillText(li.querySelector('span').textContent, ad.x, orta);
    });
  }
  function satirla(x, metin, sx, sy, en, satir) {
    var kelime = metin.split(/\s+/), s = '', y = sy;
    for (var i = 0; i < kelime.length; i++) {
      var dene = s ? s + ' ' + kelime[i] : kelime[i];
      if (x.measureText(dene).width > en && s) { x.fillText(s, sx, y); s = kelime[i]; y += satir; }
      else s = dene;
    }
    if (s) x.fillText(s, sx, y);
  }

  function init() {
    girisKur();
    katmanKur();
    defterKur();
    anatomiKur();
    sekilKur();
    sayfaKur();
  }
  init();
  OSN.ekranlar = { senGiris: senGiris };
})();
