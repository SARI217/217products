/* ============================================================
   OSNote tanıtım sitesi · sayfanın ekran kalemi
   ------------------------------------------------------------
   Uygulamadaki ekran kaleminin (Kalem Kutusu, Gelişmiş başlangıç)
   tarayıcıdaki provası. Kutu ve kartlar uygulamanın çizimleriyle
   (kutu.js; PenTrayToolbar.kt, DockedKit.kt, DockedToolbarState.kt):
   - Kutu ekranın altında, ortada (uygulamanın varsayılan yeri). Dar
     ekranda (kenar boyunca 500 dp'den az yer) tek mod tuşu; Yinele,
     Şekil ve Yeni kalem ⋯ menüsünün üst sırasına geçer.
   - Çiz'de kalem yazar; Dokun'da dokunuşlar sayfaya geçer (kaydırır,
     bağlantılara basarsın), yazı ekranda kalır.
   - Kaleme, silgiye ya da şekle ilk dokunuş seçer ve Çiz'e geçer;
     seçiliyken bir daha dokununca kartı açılır.
   - Kalemler: kırmızı 3, mavi 1,5 dp, sarı fosforlu 14 dp; en çok 6.
     "+" kutuda olmayan ilk rengi 3 dp kalem olarak ekler, kartı açılır.
   - Katman ekrana sabittir: yazı sayfayla birlikte kaymaz (uygulamada
     da çizim ekranın üstündedir).
   - Kalem (stylus) algılanınca parmak yazmaz (avuç reddi).
   - Ekran görüntüsü › "Sadece yazı": yazı beyaz zeminde PNG olur ve
     deneme bölümündeki kütüphaneye düşer. Tarayıcı sayfanın
     görüntüsünü alamadığı için "Arka planla birlikte" burada kapalı.
   - Sitede kalem, düğmeye basan kişi yazmak istediği için Çiz'de
     açılır (uygulamada Dokun'da açılır).
   ============================================================ */
(function () {
  'use strict';
  var OSN = window.OSN || (window.OSN = {});
  var dil = OSN.dil || function (tr) { return tr; };
  var M = OSN.m, K = OSN.kutu;
  var kok = document.getElementById('kalem');
  if (!M || !K || !kok) return;
  var KC = K.kc;

  var PALET = K.PALET;
  var RENK_AD = [['Siyah', 'Black'], ['Beyaz', 'White'], ['Kırmızı', 'Red'], ['Turuncu', 'Orange'], ['Sarı', 'Yellow'], ['Yeşil', 'Green'], ['Mavi', 'Blue'], ['Mor', 'Purple']];
  // yeni kalemin rengi: kutuda olmayan ilk renk, bu sırayla (DockedToolbarState.addPreset)
  var YENI_SIRA = ['#1D1B1E', '#30A46C', '#F76B15', '#8E4EC6', '#FFFFFF', '#E5484D', '#0090FF', '#FFC53D'];
  var EN_COK = 6;
  var KAGITLAR = [
    ['#FAFAFA', dil('Beyaz', 'White')], ['#FDF6E3', dil('Krem', 'Ivory')], ['#FDFBF7', dil('Kâğıt', 'Paper')],
    ['#E9EEF5', dil('Gri', 'Slate')], ['#1E1E2E', dil('Gece', 'Night')], ['#282C34', dil('Koyu', 'Dark')]
  ];
  var DESENLER = [['bos', dil('Boş', 'Blank')], ['kareli', dil('Kareli', 'Grid')], ['cizgili', dil('Çizgili', 'Lined')], ['noktali', dil('Noktalı', 'Dotted')]];
  var SEKIL_AD = { cizgi: dil('Çizgi', 'Line'), ok: dil('Ok', 'Arrow'), dikdortgen: dil('Dikdörtgen', 'Rectangle'), oval: dil('Oval', 'Oval'), ucgen: dil('Üçgen', 'Triangle'), yildiz: dil('Yıldız', 'Star') };
  var CIZIM_SEKLI = { cizgi: 'cizgi', ok: 'ok', dikdortgen: 'dikdortgen', oval: 'elips', ucgen: 'ucgen', yildiz: 'yildiz' };

  var sekme = document.getElementById('kalem-ac');
  var cubuk = document.getElementById('kalem-cubuk');
  var panel = document.getElementById('kalem-panel');
  var tuval = null, yuzey = null, sayfa = null, acan = null;

  var d = {
    acik: false,
    ciz: true,                // Çiz | Dokun
    mini: false,
    arac: 'kalem',            // kalem | silgi | sekil
    sec: 0,                   // seçili kalemin sırası
    kalemler: [{ hl: false, renk: '#E5484D', k: 3 }, { hl: false, renk: '#0090FF', k: 1.5 }, { hl: true, renk: '#FFC53D', k: 14 }],
    silgi: 24, butun: false,  // silgi boyutu (dp) ve türü (parça | bütün çizgi)
    sekil: 'cizgi', sekilM: { renk: '#E5484D', k: 3 },
    kalemGoruldu: false,
    aktif: null,
    is: null,                 // bu basışta ne yapılıyor: 'ciz' | 'sil' | 'sekil' | 'duzen'
    sayfa: { acik: false, renk: KAGITLAR[0][0], desen: 'kareli', opak: 95 },
    gizli: false
  };

  function renkAdi(r) { var i = PALET.indexOf(r); return i < 0 ? '' : dil(RENK_AD[i][0], RENK_AD[i][1]); }
  function kalemAdi(p) {
    var r = renkAdi(p.renk);
    return OSN.en ? ((r ? r + ' ' : '') + (p.hl ? 'highlighter' : 'pen')).replace(/^./, function (c) { return c.toUpperCase(); })
      : ((r ? r + ' ' : '') + (p.hl ? 'fosforlu' : 'kalem')).replace(/^./, function (c) { return c.toLocaleUpperCase('tr'); });
  }
  function secilen() { return d.kalemler[d.sec] || d.kalemler[0]; }
  // kutu kendini dizer: önce kalemler, sonra fosforlular (seçili kalem yerini korur)
  function diz() {
    var p = secilen(), a = d.kalemler.filter(function (x) { return !x.hl; }).concat(d.kalemler.filter(function (x) { return x.hl; }));
    d.kalemler = a;
    d.sec = Math.max(0, a.indexOf(p));
  }

  /* ---------------------------------------------------------- kutu
     Görünüş kutu.js'ten (SVG, tıklanmaz); üstüne her öğenin yerinde görünmez bir düğme. */
  var tray = null, trayAnahtar = '', dp = 1, dar = false, telefon = false, tuslar = {};
  function olcu() {
    var vw = document.documentElement.clientWidth;
    telefon = vw < 600;
    dp = telefon ? 1 : vw > 1200 ? 1.1 : 1;
    dar = vw / dp - 16 < 500;
  }
  function secAd() { return d.arac === 'silgi' ? 'silgi' : d.arac === 'sekil' ? 'sekil' : 'k' + d.sec; }
  function trayKur(zorla) {
    olcu();
    var anahtar = JSON.stringify([d.mini, dar, telefon, dp, d.kalemler, d.sekilM.renk, d.mini ? [d.ciz, d.arac, d.sec] : 0]);
    if (!zorla && tray && anahtar === trayAnahtar) { durumYaz(); return; }
    trayAnahtar = anahtar;
    var odak = document.activeElement && cubuk.contains(document.activeElement) ? document.activeElement.getAttribute('data-k') : null;
    cubuk.innerHTML = '';
    tuslar = {};
    if (d.mini) {
      var p = secilen();
      tray = K.KucukKutu(cubuk, { kenar: 'alt', arac: d.arac === 'sekil' ? { tur: 'sablon', renk: d.sekilM.renk } : { tur: p.hl ? 'fosforlu' : 'kalem', renk: p.renk },
        durum: { ciz: d.ciz, sec: d.arac === 'silgi' ? 'silgi' : 'arac' } });
    } else {
      tray = K.KalemKutusu(cubuk, { kenar: 'alt', olcu: telefon ? 'telefon' : 'tablet', tam: !dar, sekil: !dar, sekilRenk: d.sekilM.renk,
        ekle: !dar && d.kalemler.length < EN_COK, kalemler: d.kalemler, durum: { ciz: d.ciz, sec: secAd() } });
    }
    tray.kok.style.setProperty('--dp', dp + 'px');
    tray.kok.style.left = '0px';
    tray.kok.style.top = '0px';
    cubuk.style.setProperty('--kalem-en', (tray.en * dp) + 'px');
    cubuk.style.setProperty('--kalem-boy', (tray.boy * dp) + 'px');
    document.documentElement.style.setProperty('--kalem-alt', (tray.boy * dp + 24) + 'px');
    var adlar = d.mini ? ['mod', 'arac', 'silgi', 'geri', 'buyut'] : (dar ? ['mod'] : ['ciz', 'dokun']).concat(d.kalemler.map(function (x, i) { return 'k' + i; }),
      ['silgi'], dar ? [] : ['sekil'], !dar && d.kalemler.length < EN_COK ? ['ekle'] : [], ['geri'], dar ? [] : ['yinele'], ['daha', 'kapat']);
    adlar.forEach(function (ad) {
      var r = tray.yer(ad === 'mod' && !d.mini ? 'dokun' : ad);
      if (!r) return;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'kalem__tus' + (/^k\d|silgi|sekil|ekle|arac/.test(ad) ? ' kalem__tus--arac' : '');
      b.setAttribute('data-k', ad);
      b.style.left = (r.x * dp) + 'px'; b.style.top = (r.y * dp) + 'px';
      b.style.width = (r.w * dp) + 'px'; b.style.height = (r.h * dp) + 'px';
      cubuk.appendChild(b);
      tuslar[ad] = b;
    });
    // çizimler gizliyken ⋯ düğmesinde sarı nokta (küçük kutuda büyüt düğmesinde)
    var nokta = document.createElement('i');
    nokta.className = 'kalem__gizli-nokta';
    nokta.setAttribute('aria-hidden', 'true');
    var dr = tray.yer(d.mini ? 'buyut' : 'daha');
    if (dr) { nokta.style.left = ((dr.x + dr.w - 10) * dp) + 'px'; nokta.style.top = ((dr.y + 6) * dp) + 'px'; }
    cubuk.appendChild(nokta);
    durumYaz();
    if (odak && tuslar[odak]) tuslar[odak].focus();
  }
  var SECILI_NOT = [' (seçili: ayarları için yine dokun)', ' (selected: tap again for its settings)'];
  function durumYaz() {
    if (!tray) return;
    if (tray.durum) tray.durum({ ciz: d.ciz, sec: secAd() });
    for (var ad in tuslar) {
      var b = tuslar[ad], etiket = '', basili = null;
      if (ad === 'ciz') { etiket = dil('Çiz', 'Draw'); basili = d.ciz; }
      else if (ad === 'dokun') { etiket = dil('Dokun: dokunuşların sayfaya geçer, yazı yerinde kalır', 'Touch: your touches reach the page, your writing stays put'); basili = !d.ciz; }
      else if (ad === 'mod') etiket = d.ciz ? dil('Çiz modu, Dokun’a geç', 'Draw mode, switch to Touch') : dil('Dokun modu, Çiz’e geç', 'Touch mode, switch to Draw');
      else if (/^k\d/.test(ad)) {
        var i = +ad.slice(1), sec = d.arac === 'kalem' && d.sec === i;
        if (!d.kalemler[i]) continue;   // kalem az önce çıkarıldı; kutu yeniden kuruluyor
        etiket = kalemAdi(d.kalemler[i]) + (sec && d.ciz ? dil(SECILI_NOT[0], SECILI_NOT[1]) : '');
        basili = sec;
      } else if (ad === 'arac') {
        etiket = d.arac === 'sekil' ? dil('Şekil', 'Shape') : kalemAdi(secilen());
        basili = d.arac !== 'silgi';
      } else if (ad === 'silgi') { etiket = dil('Silgi', 'Eraser') + (d.arac === 'silgi' && d.ciz ? dil(SECILI_NOT[0], SECILI_NOT[1]) : ''); basili = d.arac === 'silgi'; }
      else if (ad === 'sekil') { etiket = dil('Şekil', 'Shape') + (d.arac === 'sekil' && d.ciz ? dil(SECILI_NOT[0], SECILI_NOT[1]) : ''); basili = d.arac === 'sekil'; }
      else if (ad === 'ekle') etiket = dil('Yeni kalem', 'New pen');
      else if (ad === 'geri') etiket = dil('Geri al', 'Undo');
      else if (ad === 'yinele') etiket = dil('Yinele', 'Redo');
      else if (ad === 'daha') etiket = dil('Diğer', 'More') + (d.gizli ? dil(' (çizimler gizli)', ' (drawings hidden)') : '');
      else if (ad === 'kapat') etiket = dil('Kalemi kapat', 'Turn off pen');
      else if (ad === 'buyut') etiket = dil('Kalem kutusunu aç', 'Expand pen tray') + (d.gizli ? dil(' (çizimler gizli)', ' (drawings hidden)') : '');
      b.setAttribute('aria-label', etiket);
      b.title = etiket.replace(/ \(.*\)$/, '');
      if (basili === null) b.removeAttribute('aria-pressed'); else b.setAttribute('aria-pressed', String(basili));
      if (ad === 'daha') b.setAttribute('aria-expanded', String(kartTur === 'menu'));
    }
    if (tuslar.geri) tuslar.geri.disabled = !yuzey || !yuzey.geri.length;
    if (tuslar.yinele) tuslar.yinele.disabled = !yuzey || !yuzey.ileri.length;
    cubuk.classList.toggle('kalem__cubuk--gizli', d.gizli);
    kok.classList.toggle('kalem--el', !d.ciz);
    document.documentElement.classList.toggle('kalem-el', d.acik && !d.ciz);
    kok.setAttribute('data-kalem-arac', d.arac);
  }

  /* ---------------------------------------------------------- kartlar
     Uygulamanın kartları (kutu.js › KART ile aynı görünüş), düğmeleri çalışır. Kart kutunun üstünde, onu açan düğmenin
     hizasında açılır, ekranın içinde kalır. */
  var kartTur = null, kartKaynak = null;
  function ikon(ad) { return '<svg class="kc__simge" aria-hidden="true" focusable="false"><use href="#' + ad + '"/></svg>'; }
  var KAPAT_TUS = '<button type="button" class="kc__kapat" data-is="vazgec" aria-label="' + dil('Kapat', 'Close') + '"><svg aria-hidden="true"><use href="#ph-x-bold"/></svg></button>';
  function bolme(adlar, sec, veri, sinif, etiket) {
    return '<span class="kc__bolme' + (sinif ? ' ' + sinif : '') + '" role="radiogroup"' + (etiket ? ' aria-label="' + etiket + '"' : '') + '>' + adlar.map(function (a, i) {
      return '<button type="button" role="radio" aria-checked="' + (i === sec) + '" data-' + veri + '="' + i + '">' + a + '</button>';
    }).join('') + '</span>';
  }
  function renkler(sec, veri) {
    return '<span class="kc__renk-sec" role="radiogroup" aria-label="' + dil('Renk', 'Colour') + '">' + PALET.map(function (r, i) {
      return '<button type="button" role="radio" aria-checked="' + (r === sec) + '" data-' + veri + '="' + r + '" data-deger="' + r + '" aria-label="' + dil(RENK_AD[i][0], RENK_AD[i][1]) + '"></button>';
    }).join('') + '</span>';
  }
  function boylar(tur, deger, renk) {
    var dizi = KC.KALIN[tur], sec = KC.enYakin(dizi, deger), ad = tur === 'silgi' ? [dil('Küçük silgi', 'Small eraser'), dil('Orta silgi', 'Medium eraser'), dil('Büyük silgi', 'Large eraser')]
      : [dil('İnce', 'Thin'), dil('Orta', 'Medium'), dil('Kalın', 'Thick')];
    var s = '<span class="kc__boylar" role="radiogroup" aria-label="' + (tur === 'silgi' ? dil('Silgi boyutu', 'Eraser size') : dil('Kalınlık', 'Thickness')) + '">';
    dizi.forEach(function (v, i) {
      var on = i === sec, c = on ? '#221E20' : tur === 'fosforlu' ? renk : '#EDE6EA', g;
      if (tur === 'kalem') g = '<circle cx="12" cy="12" r="' + [4, 7, 11][i] / 2 + '" fill="' + c + '"/>';
      else if (tur === 'fosforlu') { var a = [7, 11, 15][i]; g = '<rect x="' + (12 - a / 2) + '" y="' + (12 - a / 2) + '" width="' + a + '" height="' + a + '" rx="' + (a * 0.28).toFixed(2) + '" fill="' + c + '"/>'; }
      else g = '<circle cx="12" cy="12" r="' + [12, 16, 20][i] / 2 + '" fill="none" stroke="' + c + '" stroke-width="1.5"/>';
      s += '<button type="button" role="radio" aria-checked="' + on + '" data-boy="' + v + '" aria-label="' + ad[i] + '"><svg viewBox="0 0 24 24" aria-hidden="true">' + g + '</svg></button>';
    });
    return s + '</span>';
  }
  function kaydirici(veri, deger, aralik, adim, etiket, yazi) {
    return '<label class="kc__kaydir kc__kaydir--canli"><span class="gorunmez">' + etiket + '</span><input type="range" min="' + aralik[0] + '" max="' + aralik[1] + '" step="' + adim + '" value="' + deger + '" data-aralik="' + veri + '"><output data-cikti="' + veri + '">' + yazi + '</output></label>';
  }
  function satir(is, simge, metin, sinif, kapali) {
    return '<button type="button" class="kc__satir' + (sinif ? ' ' + sinif : '') + '" data-is="' + is + '"' + (kapali ? ' disabled' : '') + '>' + ikon(simge) + '<span>' + metin + '</span></button>';
  }
  function kalemKart() {
    var p = secilen(), tur = p.hl ? 'fosforlu' : 'kalem', en = 244, w = en - 10 - 24;
    return { en: en, sinif: 'kc--kalem', h: '<div class="kc__ilk">' + bolme([dil('Kalem', 'Pen'), dil('Fosforlu', 'Highlighter')], p.hl ? 1 : 0, 'tur', '', dil('Tür', 'Type')) + '</div>' + KAPAT_TUS +
      '<span class="kc__onizleme" data-onizleme>' + KC.kalemOnizleme(w, p) + '</span>' + renkler(p.renk, 'renk') + boylar(tur, p.k, p.renk) +
      kaydirici('kalem', p.k, KC.ARALIK[tur], 0.1, dil('Kalınlık', 'Thickness'), KC.dpYaz(p.k)) +
      (d.kalemler.length > 1 ? satir('kaldir', 'ph-trash', dil('Bu kalemi kutudan çıkar', 'Remove this pen'), 'kc__satir--tehlike') : '') };
  }
  function silgiKart() {
    return { en: 252, sinif: 'kc--silgi', h: '<div class="kc__ilk">' + bolme([dil('Parça', 'Partial'), dil('Bütün çizgi', 'Whole stroke')], d.butun ? 1 : 0, 'butun', '', dil('Silgi türü', 'Eraser type')) + '</div>' + KAPAT_TUS +
      boylar('silgi', d.silgi, '#EDE6EA') + kaydirici('silgi', d.silgi, KC.ARALIK.silgi, 1, dil('Silgi boyutu', 'Eraser size'), KC.dpYaz(d.silgi)) +
      satir('temizle', 'ph-trash', dil('Tümünü temizle', 'Clear all'), 'kc__satir--tehlike') };
  }
  function sekilKart() {
    var en = 244, w = en - 10 - 24, m = d.sekilM, sim = KC.karsitlik(m.renk, '#2E292B') >= 2 ? m.renk : '#EDE6EA';
    var s = '<span class="kc__sekiller" role="radiogroup" aria-label="' + dil('Şekil', 'Shape') + '">';
    KC.SEKILLER.forEach(function (sk) {
      var on = sk === d.sekil;
      s += '<button type="button" role="radio" aria-checked="' + on + '" data-sekil="' + sk + '" aria-label="' + SEKIL_AD[sk] + '"><svg viewBox="0 0 18 18" aria-hidden="true"><path d="' + KC.sekilYolu(sk, 2.52, 2.52, 15.48, 15.48) +
        '" fill="none" stroke="' + (on ? '#221E20' : sim) + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>';
    });
    s += '</span>';
    return { en: en, sinif: 'kc--sekil', h: '<div class="kc__ilk"><b class="kc__baslik">' + dil('Şekil', 'Shape') + '</b></div>' + KAPAT_TUS + s +
      '<span class="kc__onizleme" data-onizleme>' + KC.sekilOnizleme(w, d.sekil, m.renk, m.k) + '</span>' + renkler(m.renk, 'srenk') + boylar('kalem', m.k, m.renk) +
      kaydirici('sekil', m.k, KC.ARALIK.kalem, 0.1, dil('Kalınlık', 'Thickness'), KC.dpYaz(m.k)) };
  }
  function menuKart() {
    var h = '';
    if (dar) {
      // dar kutuda sığmayanlar üst sırada (DMenu › quick)
      var hizli = [['yinele', 'ph-arrow-u-up-right-bold', dil('Yinele', 'Redo'), !yuzey || !yuzey.ileri.length], ['sekil', 'ph-shapes', dil('Şekil', 'Shape')]];
      if (d.kalemler.length < EN_COK) hizli.push(['ekle', 'ph-plus-bold', dil('Yeni kalem', 'New pen')]);
      h += '<div class="kc__hizli">' + hizli.map(function (q) { return '<button type="button" data-is="' + q[0] + '"' + (q[3] ? ' disabled' : '') + '>' + ikon(q[1]) + '<span>' + q[2] + '</span></button>'; }).join('') + '</div><i class="kc__ayrac" aria-hidden="true"></i>';
    }
    var bos = !yuzey || !yuzey.ops.length;
    var satirlar = satir('sayfa', 'ph-file-text', dil('Sayfa', 'Page')) + satir('goruntu', 'ph-camera', dil('Ekran görüntüsü', 'Screenshot'), '', bos) +
      satir('gizle', d.gizli ? 'ph-eye' : 'ph-eye-slash', d.gizli ? dil('Çizimleri göster', 'Show drawings') : dil('Çizimleri gizle', 'Hide drawings')) +
      satir('temizle', 'ph-trash', dil('Tümünü temizle', 'Clear all'), '', bos) + satir('kucult', 'ph-arrows-in-simple', dil('Küçült', 'Minimize'));
    return { en: 216, sinif: 'kc--menu' + (dar ? ' kc--hizli' : ''), h: h + '<div class="kc__satirlar">' + satirlar + '</div>' + KAPAT_TUS };
  }
  function sayfaKart() {
    var s = '<span class="kc__kagit-sec" role="radiogroup" aria-label="' + dil('Kâğıt rengi', 'Paper colour') + '">' + KAGITLAR.map(function (k) {
      return '<button type="button" role="radio" aria-checked="' + (k[0] === d.sayfa.renk) + '" data-kagit="' + k[0] + '" data-deger="' + k[0] + '" aria-label="' + k[1] + '"></button>';
    }).join('') + '</span>';
    return { en: 252, sinif: 'kc--sayfa', h: '<div class="kc__ilk"><b class="kc__baslik">' + dil('Sayfa', 'Page') + '</b>' +
      bolme([dil('Kapalı', 'Off'), dil('Açık', 'On')], d.sayfa.acik ? 1 : 0, 'sayfa-ac', 'kc__bolme--dar', dil('Sayfa', 'Page')) + '</div>' + KAPAT_TUS + s +
      bolme(DESENLER.map(function (x) { return x[1]; }), DESENLER.map(function (x) { return x[0]; }).indexOf(d.sayfa.desen), 'desen', 'kc__bolme--desen', dil('Desen', 'Pattern')) +
      kaydirici('opak', d.sayfa.opak, [40, 100], 1, dil('Opaklık', 'Opacity'), dil('%' + d.sayfa.opak, d.sayfa.opak + '%')) };
  }
  function goruntuKart() {
    return { en: 240, sinif: 'kc--goruntu', h: '<div class="kc__ilk"><b class="kc__baslik">' + dil('Ekran görüntüsü', 'Screenshot') + '</b></div>' + KAPAT_TUS +
      '<p class="kc__not">' + dil('Neyi kaydedeceğini seç.', 'Choose what to save.') + '</p>' +
      '<button type="button" class="kc__secenek" data-is="yakala-yazi">' + ikon('ph-pen-nib-straight') + '<span>' + dil('Sadece yazı', 'Only my writing') + '</span></button>' +
      '<button type="button" class="kc__secenek" data-is="yakala-ekran" disabled aria-describedby="kp-ekran-not">' + ikon('ph-camera') + '<span>' + dil('Arka planla birlikte', 'Writing + background') + '</span></button>' +
      '<p class="kc__not kc__not--alt" id="kp-ekran-not">' + dil('Tarayıcı sayfanın görüntüsünü alamaz. Uygulamada bu seçenek arkadaki ekranı da kaydeder.',
        'A browser can’t take a picture of the page. In the app, this option saves the screen behind your writing too.') + '</p>' };
  }
  function onayKart(baslik, metin, tamam, is) {
    return { en: 240, sinif: 'kc--onay', h: '<div class="kc__ilk"><b class="kc__baslik">' + baslik + '</b></div>' + KAPAT_TUS + '<p class="kc__not">' + metin + '</p>' +
      '<span class="kc__onay"><button type="button" data-is="vazgec">' + dil('Vazgeç', 'Cancel') + '</button><button type="button" class="kc__tamam" data-is="' + is + '">' + tamam + '</button></span>' };
  }
  var KART_AD = {
    kalem: ['Kalemi düzenle', 'Edit pen'], silgi: ['Silgi', 'Eraser'], sekil: ['Şekil', 'Shape'], menu: ['Diğer', 'More'], sayfa: ['Sayfa', 'Page'],
    goruntu: ['Ekran görüntüsü', 'Screenshot'], kapat: ['Kalemi kapat', 'Turn off pen'], temizle: ['Tümünü temizle', 'Clear all'], kaldir: ['Kalemi çıkar', 'Remove pen'], secici: ['Kalemler', 'Pens']
  };
  function kartGoster(tur, en, sinif, ic) {
    var odakVardi = panel.contains(document.activeElement);
    kartTur = tur;
    panel.innerHTML = '<div class="kc kc--canli ' + sinif + '" role="group" aria-label="' + dil(KART_AD[tur][0], KART_AD[tur][1]) + '"><div class="kc__ic">' + ic + '</div></div>';
    var kart = panel.firstChild;
    kart.style.setProperty('--kc-en', en);
    kart.style.setProperty('--dp', dp + 'px');
    panel.hidden = false;
    raylar();
    yerlestir();
    durumYaz();
    if (odakVardi) { var ilk = panel.querySelector('[aria-checked="true"], button:not(:disabled), input'); if (ilk) ilk.focus(); }
  }
  function kartAc(tur, kaynak) {
    var k;
    if (kaynak) kartKaynak = kaynak;
    if (tur === 'kalem') k = kalemKart();
    else if (tur === 'silgi') k = silgiKart();
    else if (tur === 'sekil') k = sekilKart();
    else if (tur === 'menu') k = menuKart();
    else if (tur === 'sayfa') k = sayfaKart();
    else if (tur === 'goruntu') k = goruntuKart();
    else if (tur === 'kapat') k = onayKart(dil('Kalem kapatılsın mı?', 'Turn off the pen?'), dil('Ekrandaki çizimler silinir.', 'Ink on the screen will be cleared.'), dil('Kapat', 'Turn off'), 'kapat-evet');
    else if (tur === 'temizle') k = onayKart(dil('Tümü temizlensin mi?', 'Clear everything?'), dil('Ekrandaki bütün çizimler silinir. Geri al ile geri getirebilirsin.', 'All ink on screen is erased. Undo brings it back.'), dil('Temizle', 'Clear'), 'temizle-evet');
    else if (tur === 'kaldir') k = onayKart(dil('Bu kalem çıkarılsın mı?', 'Remove this pen?'), dil(kalemAdi(secilen()) + ' kutudan çıkarılır. Ekrandaki çizimler silinmez.', kalemAdi(secilen()) + ' leaves the tray. Drawings on screen stay.'), dil('Çıkar', 'Remove'), 'kaldir-evet');
    if (k) kartGoster(tur, k.en, k.sinif, k.h);
  }
  // kart, açan düğmenin hizasında kutunun üstünde; seçili araç kutudan kalktığı için onun kartı biraz daha yukarıda
  function yerlestir() {
    if (!kartTur || !panel.firstChild) return;
    var kart = panel.firstChild, kaynak = kartKaynak && kartKaynak.isConnected ? kartKaynak : tuslar.daha || tuslar.buyut || cubuk;
    var r = kaynak.getBoundingClientRect(), cr = cubuk.getBoundingClientRect(), vw = document.documentElement.clientWidth;
    var w = kart.offsetWidth, h = kart.offsetHeight, arac = kaynak.classList && kaynak.classList.contains('kalem__tus--arac');
    var x = Math.max(8, Math.min(vw - w - 8, r.left + r.width / 2 - w / 2));
    var y = Math.max(8, cr.top - (arac ? 26 : 12) * dp - h);
    panel.style.setProperty('--x', x + 'px');
    panel.style.setProperty('--y', y + 'px');
  }
  // kaydırıcıların dolu kısmı (rengi kalemin mürekkebi; koyu mürekkepte açık)
  function raylar() {
    var a = panel.querySelectorAll('input[type="range"]');
    for (var i = 0; i < a.length; i++) {
      var g = a[i], y = (g.value - g.min) / (g.max - g.min) * 100, v = g.getAttribute('data-aralik');
      g.style.setProperty('--y', y.toFixed(1) + '%');
      var renk = v === 'kalem' ? secilen().renk : v === 'sekil' ? d.sekilM.renk : '#EDE6EA';
      g.style.setProperty('--dolu', KC.karsitlik(renk, '#221E20') < 1.6 ? '#EDE6EA' : renk);
    }
  }
  function kartKapat() {
    panel.hidden = true;
    panel.innerHTML = '';
    kartTur = null;
    durumYaz();
  }
  // açık kartı yenile (seçimler görünsün)
  function kartYenile() { if (kartTur && kartTur !== 'secici') kartAc(kartTur); }

  /* ---------------------------------------------------------- katmanlar */
  function katmanKur() {
    if (tuval) return;
    sayfa = document.createElement('div');
    sayfa.className = 'kalem-sayfa';
    sayfa.setAttribute('aria-hidden', 'true');
    sayfa.hidden = true;
    document.body.appendChild(sayfa);
    tuval = document.createElement('canvas');
    tuval.className = 'kalem-tuval';
    tuval.setAttribute('aria-hidden', 'true');
    document.body.appendChild(tuval);
    yuzey = new M.Yuzey(tuval, { sinir: 200 });
    yuzey.degisti = function () { durumYaz(); if (kartTur === 'menu') kartYenile(); };
    boyutla();
    tuval.addEventListener('pointerdown', bas);
    tuval.addEventListener('pointermove', surukle);
    tuval.addEventListener('pointerup', birak);
    tuval.addEventListener('pointercancel', birak);
    tuval.addEventListener('lostpointercapture', birak);
    tuval.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }
  function boyutla() {
    if (!tuval) return;
    var r = tuval.getBoundingClientRect();
    if (!r.width || !r.height) return;
    // büyük ekranlarda katman en çok ~6 milyon piksel (bellek: görünen tuval + önbelleği)
    var dpr = Math.min(M.dpr(), Math.sqrt(6e6 / (r.width * r.height)));
    yuzey.boyutla(r.width, r.height, 1, dpr);
  }
  var boyutKare = 0;
  window.addEventListener('resize', function () {
    if (!d.acik) return;
    cancelAnimationFrame(boyutKare);
    boyutKare = requestAnimationFrame(function () { boyutla(); trayKur(); yerlestir(); });
  });
  function sayfaGuncelle() {
    if (!sayfa) return;
    sayfa.hidden = !d.sayfa.acik;
    sayfa.setAttribute('data-desen', d.sayfa.desen);
    var koyu = d.sayfa.renk === '#1E1E2E' || d.sayfa.renk === '#282C34';
    sayfa.classList.toggle('kalem-sayfa--koyu', koyu);
    sayfa.style.setProperty('--zemin', d.sayfa.renk);
    sayfa.style.setProperty('opacity', String(d.sayfa.opak / 100));
  }

  /* ---------------------------------------------------------- çizim */
  function nokta(e) {
    var r = d.kutu || tuval.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }
  function bas(e) {
    if (!d.acik || !d.ciz) return;
    if (e.pointerType === 'pen') {
      if (!d.kalemGoruldu) {
        d.kalemGoruldu = true;
        duyur(dil('Avuç reddi açık: kalem algılandı, artık yalnız kalem yazar. Elini ekrana dayayabilirsin.',
          'Palm rejection is on: a stylus was detected, so only the stylus writes now. You can rest your hand on the screen.'));
      }
    } else if (e.pointerType === 'touch' && d.kalemGoruldu) {
      return;
    }
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (d.aktif !== null) return; // ikinci parmak çizmez
    e.preventDefault();
    // Çiz'de aracın kartı açık kalır (uygulamada avuç kâğıda değince kart kapanmaz); menü ve onaylar kapanır
    if (kartTur && kartTur !== 'kalem' && kartTur !== 'silgi' && kartTur !== 'sekil') kartKapat();
    d.aktif = e.pointerId;
    d.kutu = tuval.getBoundingClientRect();
    try { tuval.setPointerCapture(e.pointerId); } catch (_) { /* yok */ }
    var n = nokta(e);
    var silgiUcu = e.pointerType === 'pen' && (e.button === 5 || (e.buttons & 32));
    if (d.arac === 'silgi' || silgiUcu) {
      d.is = 'sil';
      d.son = n;
      yuzey.silBaslat();
      silAdim(n[0], n[1], n[0], n[1]);
      halka(n);
    } else if (d.arac === 'sekil') {
      var dok = yuzey.sekilDokunus(n[0], n[1]);
      if (dok) { d.is = 'duzen'; yuzey.duzenBaslat(dok, n[0], n[1]); }
      else { d.is = 'sekil'; yuzey.birak(); yuzey.sekilBaslat(CIZIM_SEKLI[d.sekil], d.sekilM.renk, d.sekilM.k, n[0], n[1]); }
    } else {
      var p = secilen();
      d.is = 'ciz';
      yuzey.baslat(p.hl ? 'fosforlu' : 'kalem', p.renk, p.k, n[0], n[1]);
    }
  }
  function silAdim(x0, y0, x1, y1) {
    if (d.butun) yuzey.silButun(x0, y0, x1, y1, d.silgi / 2);
    else yuzey.sil(x0, y0, x1, y1, d.silgi / 2);
  }
  function surukle(e) {
    if (d.aktif !== e.pointerId) {
      if (d.acik && d.ciz && d.arac === 'silgi' && e.pointerType === 'mouse') halka(nokta(e), true);
      return;
    }
    var olaylar = (e.getCoalescedEvents && e.getCoalescedEvents()) || [];
    if (!olaylar.length) olaylar = [e];
    for (var i = 0; i < olaylar.length; i++) {
      var n = nokta(olaylar[i]);
      if (d.is === 'sil') { silAdim(d.son[0], d.son[1], n[0], n[1]); d.son = n; }
      else if (d.is === 'sekil') yuzey.sekilSurukle(n[0], n[1]);
      else if (d.is === 'duzen') yuzey.duzenSurukle(n[0], n[1]);
      else yuzey.surdur(n[0], n[1]);
    }
    if (d.is === 'sil') halka(nokta(e));
  }
  function birak(e) {
    if (d.aktif !== e.pointerId) return;
    d.aktif = null;
    d.kutu = null;
    if (d.is === 'sil') { yuzey.silBitir(); halka(null); }
    else if (d.is === 'sekil') yuzey.sekilBitir();
    else if (d.is === 'duzen') yuzey.duzenBitir();
    else yuzey.bitir();
    d.is = null;
    durumYaz();
  }

  // silginin dairesi
  var halkaEl = null;
  function halka(n, uzak) {
    if (!halkaEl) {
      halkaEl = document.createElement('div');
      halkaEl.className = 'kalem-silgi';
      halkaEl.setAttribute('aria-hidden', 'true');
      document.body.appendChild(halkaEl);
    }
    if (!n || !d.acik || !d.ciz) { halkaEl.hidden = true; return; }
    halkaEl.hidden = false;
    halkaEl.style.setProperty('--x', n[0] + 'px');
    halkaEl.style.setProperty('--y', n[1] + 'px');
    halkaEl.style.setProperty('--r', d.silgi + 'px');
    halkaEl.classList.toggle('uzak', !!uzak);
  }

  /* ---------------------------------------------------------- aç / kapat */
  function ac() {
    if (d.acik) { if (!d.ciz) modYap(true); return; }
    acan = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
    katmanKur();
    d.acik = true;
    d.ciz = true;
    d.gizli = false;
    kok.classList.add('kalem--acik');
    document.documentElement.classList.add('kalem-acik');
    sekme.setAttribute('aria-expanded', 'true');
    cubuk.hidden = false;
    trayKur(true);
    boyutla();
    sayfaGuncelle();
    duyur(dil('Kalem açık. Sayfanın istediğin yerine yaz. Kaydırmak ya da bir şeye dokunmak için Dokun’a geç.',
      'The pen is on. Write anywhere on the page. To scroll or tap something, switch to Touch.'));
    var ilk = tuslar['k' + d.sec] || tuslar.arac;
    if (ilk && document.activeElement && (document.activeElement === sekme || document.activeElement.hasAttribute('data-kalem-ac'))) ilk.focus();
  }
  function kapat() {
    if (!d.acik) return;
    d.acik = false;
    d.aktif = null;
    d.is = null;
    kartKapat();
    halka(null);
    kok.classList.remove('kalem--acik', 'kalem--el');
    document.documentElement.classList.remove('kalem-acik', 'kalem-el');
    sekme.setAttribute('aria-expanded', 'false');
    cubuk.hidden = true;
    cubuk.innerHTML = '';
    tray = null;
    trayAnahtar = '';
    tuslar = {};
    // katmanların belleğini bırak
    if (yuzey) yuzey.birakBellek();
    if (tuval) { tuval.width = 0; tuval.height = 0; tuval.remove(); tuval = null; yuzey = null; }
    if (sayfa) { sayfa.remove(); sayfa = null; }
    duyur(dil('Kalem kapandı; ekrandaki çizimler silindi.', 'The pen is off; the ink on the screen was cleared.'));
    // odağı açan düğmeye geri ver (telefonda sekme gizli: menü kapsülündeki düğme)
    var hedef = acan && acan.isConnected && acan.getClientRects().length ? acan : (sekme.getClientRects().length ? sekme : document.querySelector('.kapsul__kalem'));
    if (hedef && hedef.focus) hedef.focus();
  }
  function modYap(ciz) {
    if (d.ciz === ciz) return;
    d.ciz = ciz;
    if (!ciz && yuzey) yuzey.birak();
    if (!ciz) kartKapat();
    halka(null);
    trayKur();
    duyur(ciz ? dil('Çiz: yeniden yazabilirsin.', 'Draw: you can write again.')
      : dil('Dokun: sayfayı kaydırabilir, bağlantılara dokunabilirsin. Yazı ekranda kalır.', 'Touch: you can scroll the page and tap links. Your writing stays on the screen.'));
  }
  // araca dokunuş: ilk dokunuş seçer ve Çiz'e geçer; seçiliyken (Çiz'de) bir daha dokununca kartı açılır ya da kapanır
  function aracDokun(arac, sira, kaynak) {
    var secili = d.ciz && d.arac === arac && (arac !== 'kalem' || d.sec === sira);
    if (secili) {
      if (kartTur === arac) kartKapat(); else kartAc(arac, kaynak);
      return;
    }
    if (yuzey) yuzey.birak();
    d.arac = arac;
    if (arac === 'kalem') d.sec = sira;
    if (kartTur) kartKapat();
    if (!d.ciz) { d.ciz = true; duyur(dil('Çiz: yeniden yazabilirsin.', 'Draw: you can write again.')); }
    trayKur();
  }
  function kalemEkle(kaynak) {
    if (d.kalemler.length >= EN_COK) return;
    var renk = YENI_SIRA.filter(function (r) { return !d.kalemler.some(function (p) { return p.renk === r; }); })[0] || '#1D1B1E';
    var p = { hl: false, renk: renk, k: 3 }, ilkFos = -1;
    for (var i = 0; i < d.kalemler.length; i++) if (d.kalemler[i].hl) { ilkFos = i; break; }
    if (ilkFos < 0) d.kalemler.push(p); else d.kalemler.splice(ilkFos, 0, p);
    d.sec = d.kalemler.indexOf(p);
    d.arac = 'kalem';
    d.ciz = true;
    trayKur();
    kartAc('kalem', tuslar['k' + d.sec] || kaynak);
    duyur(dil(kalemAdi(p) + ' kutuya eklendi.', kalemAdi(p) + ' added to the tray.'));
  }
  function kalemCikar() {
    if (d.kalemler.length < 2) return;
    var p = secilen();
    d.kalemler.splice(d.sec, 1);
    d.sec = Math.min(d.sec, d.kalemler.length - 1);
    trayKur();
    kartKapat();
    duyur(dil(kalemAdi(p) + ' kutudan çıkarıldı.', kalemAdi(p) + ' removed from the tray.'));
  }

  function yakala() {
    if (!yuzey || !yuzey.ops.length) return;
    var k = [Infinity, Infinity, -Infinity, -Infinity];
    for (var i = 0; i < yuzey.ops.length; i++) {
      var b = M.kutu(yuzey.ops[i].p, yuzey.ops[i].k);
      k = [Math.min(k[0], b[0]), Math.min(k[1], b[1]), Math.max(k[2], b[2]), Math.max(k[3], b[3])];
    }
    var W = yuzey.cssW, H = yuzey.cssH;
    k = [Math.max(0, k[0] - 24), Math.max(0, k[1] - 24), Math.min(W, k[2] + 24), Math.min(H, k[3] + 24)];
    var olcek = 2, w = Math.max(1, Math.round((k[2] - k[0]) * olcek)), h = Math.max(1, Math.round((k[3] - k[1]) * olcek));
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var x = c.getContext('2d');
    // uygulamadaki gibi "Sadece yazı": düz beyaz zemin
    x.fillStyle = '#FFFFFF';
    x.fillRect(0, 0, w, h);
    x.setTransform(olcek, 0, 0, olcek, -k[0] * olcek, -k[1] * olcek);
    M.opsCiz(x, yuzey.ops, olcek);
    M.tuvalBlob(c, 'image/png').then(function (blob) {
      if (OSN.kutuphane) OSN.kutuphane.ekle({ tur: 'yazi', blob: blob, en: w, boy: h });
      duyur(dil('Yazın kaydedildi. Deneme bölümündeki kütüphanede duruyor.', 'Writing saved. It’s in the library of the Try it section.'),
        '#kutuphane', dil('Kütüphaneye git', 'Go to library'));
    }).catch(function () { duyur(dil('Kaydedilemedi, bir daha dene.', 'Couldn’t save it. Try again.')); });
  }

  /* ---------------------------------------------------------- olaylar */
  function cubukTik(e) {
    var b = e.target.closest('button[data-k]');
    if (!b || !cubuk.contains(b) || b.disabled) return;
    var k = b.getAttribute('data-k');
    if (/^k\d/.test(k)) { aracDokun('kalem', +k.slice(1), b); return; }
    switch (k) {
      case 'ciz': modYap(true); break;
      case 'dokun': modYap(false); break;
      case 'mod': modYap(!d.ciz); break;
      case 'silgi': aracDokun('silgi', 0, b); break;
      case 'sekil': aracDokun('sekil', 0, b); break;
      case 'arac':
        // küçük kutunun kalem yuvası: ilk dokunuş araca geçer, ikincisi bütün kalemleri gösterir (düzenlemek büyük kutuda)
        if (d.ciz && d.arac !== 'silgi') { if (kartTur === 'secici') kartKapat(); else seciciAc(b); }
        else { if (d.arac === 'silgi') d.arac = 'kalem'; d.ciz = true; kartKapat(); trayKur(); }
        break;
      case 'ekle': kalemEkle(b); break;
      case 'geri': if (yuzey) yuzey.geriAl(); durumYaz(); break;
      case 'yinele': if (yuzey) yuzey.yinele(); durumYaz(); break;
      case 'daha': if (kartTur === 'menu') kartKapat(); else kartAc('menu', b); break;
      case 'kapat': if (yuzey && yuzey.ops.length) { if (kartTur === 'kapat') kartKapat(); else kartAc('kapat', b); } else kapat(); break;
      case 'buyut': d.mini = false; kartKapat(); trayKur(); odakla('daha'); break;
    }
  }
  function odakla(k) { if (tuslar[k]) tuslar[k].focus(); }
  // küçük kutunun kalem seçicisi (MiniPicker): bütün kalemler kuyuda; seçmek Çiz'e geçirir ve kapanır
  function seciciAc(kaynak) {
    var s = '<span class="kc__kalemler" role="radiogroup" aria-label="' + dil('Kalemler', 'Pens') + '">';
    d.kalemler.forEach(function (p, i) {
      var on = d.arac === 'kalem' && d.sec === i;
      s += '<button type="button" role="radio" aria-checked="' + on + '" data-sec="' + i + '" aria-label="' + kalemAdi(p) + '"><svg viewBox="-18 -12 36 64" aria-hidden="true"><g transform="translate(0,' + (on ? -4 : 6) + ')">' +
        K.aracSvg(p.hl ? 'fosforlu' : 'kalem', p.renk, 'p') + '</g></svg></button>';
    });
    s += '</span>';
    kartKaynak = kaynak;
    kartGoster('secici', d.kalemler.length * 36 + 12 + 36 + 20 + 10, 'kc--secici', '<div class="kc__ilk">' + s + '</div>' + KAPAT_TUS);
  }

  function kartTik(e) {
    var b = e.target.closest('button');
    if (!b || !panel.contains(b) || b.disabled) return;
    var p = secilen(), v;
    if ((v = b.getAttribute('data-tur')) !== null) {
      var hl = v === '1';
      if (p.hl !== hl) { p.hl = hl; p.k = hl ? 14 : 3; diz(); trayKur(); kartAc('kalem', tuslar['k' + d.sec]); }
      return;
    }
    if ((v = b.getAttribute('data-renk')) !== null) { p.renk = v; trayKur(); kartAc('kalem', tuslar['k' + d.sec]); return; }
    if ((v = b.getAttribute('data-srenk')) !== null) { d.sekilM.renk = v; trayKur(); kartAc('sekil', tuslar.sekil || kartKaynak); return; }
    if ((v = b.getAttribute('data-boy')) !== null) {
      if (kartTur === 'kalem') p.k = +v; else if (kartTur === 'silgi') d.silgi = +v; else if (kartTur === 'sekil') d.sekilM.k = +v;
      kartYenile();
      return;
    }
    if ((v = b.getAttribute('data-butun')) !== null) { d.butun = v === '1'; kartYenile(); return; }
    if ((v = b.getAttribute('data-sekil')) !== null) { d.sekil = v; d.arac = 'sekil'; if (yuzey) yuzey.birak(); trayKur(); kartYenile(); return; }
    if ((v = b.getAttribute('data-sec')) !== null) { d.sec = +v; d.arac = 'kalem'; d.ciz = true; kartKapat(); trayKur(); return; }
    if ((v = b.getAttribute('data-sayfa-ac')) !== null) { d.sayfa.acik = v === '1'; sayfaGuncelle(); kartYenile(); return; }
    if ((v = b.getAttribute('data-kagit')) !== null) { d.sayfa.renk = v; d.sayfa.acik = true; sayfaGuncelle(); kartYenile(); return; }
    if ((v = b.getAttribute('data-desen')) !== null) { d.sayfa.desen = DESENLER[+v][0]; d.sayfa.acik = true; sayfaGuncelle(); kartYenile(); return; }
    switch (b.getAttribute('data-is')) {
      case 'vazgec': var kk = kartKaynak; kartKapat(); if (kk && kk.isConnected && kk.focus) kk.focus(); break;
      case 'kaldir': kartAc('kaldir'); break;
      case 'kaldir-evet': kalemCikar(); break;
      case 'temizle': if (yuzey && yuzey.ops.length) kartAc('temizle', tuslar.daha || kartKaynak); break;
      case 'temizle-evet': if (yuzey) yuzey.temizle(); kartKapat(); break;
      case 'sayfa': kartAc('sayfa', tuslar.daha); break;
      case 'goruntu': kartAc('goruntu', tuslar.daha); break;
      case 'yakala-yazi': kartKapat(); yakala(); break;
      case 'gizle':
        d.gizli = !d.gizli;
        if (yuzey) { yuzey.gizli = d.gizli; yuzey.ciz(); }
        kartYenile();
        duyur(d.gizli ? dil('Çizimler gizlendi; silinmedi.', 'Drawings hidden, not deleted.') : dil('Çizimler yeniden görünüyor.', 'Drawings visible again.'));
        break;
      case 'kucult': d.mini = true; kartKapat(); trayKur(); odakla('buyut'); break;
      case 'yinele': if (yuzey) yuzey.yinele(); kartYenile(); break;
      case 'sekil': kartKapat(); d.arac = 'sekil'; d.ciz = true; trayKur(); kartAc('sekil', tuslar.daha); break;
      case 'ekle': kartKapat(); kalemEkle(tuslar.daha); break;
      case 'kapat-evet': kapat(); break;
    }
  }
  function kartGirdi(e) {
    var a = e.target.getAttribute && e.target.getAttribute('data-aralik');
    if (!a) return;
    var v = +e.target.value, o = panel.querySelector('[data-cikti="' + a + '"]'), p = secilen();
    if (a === 'kalem') p.k = v;
    else if (a === 'silgi') d.silgi = v;
    else if (a === 'sekil') d.sekilM.k = v;
    else if (a === 'opak') { d.sayfa.opak = v; sayfaGuncelle(); }
    if (o) o.textContent = a === 'opak' ? dil('%' + v, v + '%') : KC.dpYaz(v);
    raylar();
    // önizleme ve hazır kalınlıklar kaydırıcıyla birlikte
    var on = panel.querySelector('[data-onizleme]'), w = (+panel.firstChild.style.getPropertyValue('--kc-en') || 244) - 10 - 24;
    if (on && a === 'kalem') on.innerHTML = KC.kalemOnizleme(w, p);
    if (on && a === 'sekil') on.innerHTML = KC.sekilOnizleme(w, d.sekil, d.sekilM.renk, d.sekilM.k);
    var hazir = panel.querySelectorAll('[data-boy]');
    if (hazir.length) {
      var dizi = [].map.call(hazir, function (x) { return +x.getAttribute('data-boy'); }), s = KC.enYakin(dizi, v);
      [].forEach.call(hazir, function (x, i) { x.setAttribute('aria-checked', String(i === s)); });
    }
  }

  function duyur(metin, bag, bagMetni) { if (OSN.duyur) OSN.duyur(metin, bag, bagMetni); }

  function init() {
    sekme.addEventListener('click', function () { if (d.acik) { if (yuzey && yuzey.ops.length) kartAc('kapat', tuslar.kapat); else kapat(); } else ac(); });
    cubuk.addEventListener('click', cubukTik);
    panel.addEventListener('click', kartTik);
    panel.addEventListener('input', kartGirdi);
    panel.addEventListener('change', function (e) { kartGirdi(e); if (e.target.getAttribute && e.target.getAttribute('data-aralik') === 'kalem') trayKur(); });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || !d.acik) return;
      if (kartTur) { var k = kartKaynak; kartKapat(); if (k && k.isConnected && k.focus) k.focus(); return; }
      if (d.ciz) modYap(false);
    });
    // kartın dışına dokununca kart kapanır (tuvalde Çiz'deyken aracın kartı açık kalır: bas() karar verir)
    document.addEventListener('pointerdown', function (e) {
      if (!kartTur) return;
      if (panel.contains(e.target) || cubuk.contains(e.target) || sekme.contains(e.target)) return;
      if (tuval && e.target === tuval) return;
      kartKapat();
    }, true);
    var acanlar = document.querySelectorAll('[data-kalem-ac]');
    for (var i = 0; i < acanlar.length; i++) acanlar[i].addEventListener('click', function (e) { e.preventDefault(); ac(); });
    OSN.kalem = { ac: ac, kapat: kapat, d: d, yuzey: function () { return yuzey; }, kartAc: kartAc, tus: function (k) { return tuslar[k]; } };
  }
  init();
})();
