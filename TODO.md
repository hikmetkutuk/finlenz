# Finlenz — Yol Haritası

## ✅ Tamamlananlar
- [x] Geçmiş fiyat grafiği — Yahoo chart API ile 1A/3A/6A/1Y/5Y aralıklı SVG line chart, detay sayfasında

---

## 🚀 Hızlı Kazanımlar

- [ ] **Favoriler / Watchlist**
  localStorage tabanlı, login gerektirmeden. Ana sayfada yıldızlanan hisseleri üstte göster.

- [ ] **Arama / filtreleme iyileştirmesi**
  Sektöre göre filtre zaten var; F/K aralığı, piyasa değeri aralığı gibi basit filtreler eklenebilir.

---

## 🛠️ Orta Vadeli

- [ ] **Sektör ortalamasıyla karşılaştırma**
  Bir hissenin F/K'sını kendi sektör ortalamasıyla kıyaslayıp "sektöre göre ucuz/pahalı" etiketi. Veriyi zaten DB'de tutuyoruz (`sector` alanı), backend'de agregasyon sorgusu yazılır.

- [ ] **Çoklu karşılaştırma (2'den fazla hisse)**
  Şu an compare sayfası 2 hisseyle sınırlı; 3-4 hisseyi yan yana koyma isteği gelir genelde.

- [ ] **Temettü verisi**
  Yahoo'da `summaryDetail.dividendYield`, `trailingAnnualDividendRate` var; BIST yatırımcısı için oldukça aranan bir metrik.

---

## 🏗️ Daha Büyük Yatırım

- [ ] **Geçmiş performans / backtest**
  "1 yıl önce alsaydım ne olurdu" tarzı basit hesaplama.
---

> Bu liste canlı bir backlog'tur — yeni fikirler eklenebilir, öncelikler değişebilir.
