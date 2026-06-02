# isTakip

GitHub Pages üzerinde çalışan, Firebase destekli işletme borç defteri uygulaması.

## Özellikler

- İşletme adı + şifre ile hesap oluşturma ve giriş
- Aynı işletmeye farklı cihazlardan erişim (telefon / bilgisayar)
- Borç kaydı ekleme (müşteri/işlem, tutar, not)
- Borçları kapatma (ödendi), yeniden açma ve silme
- Arama + durum filtresi (tümü, açık, kapalı)
- Toplam açık borç, kapanan toplam ve kayıt sayısı kartları
- Responsive mobil/web arayüz
- Hafif Framer Motion animasyonları (motion kütüphanesi)

## Çalıştırma

Bu proje statik dosyalardan oluşur ve doğrudan GitHub Pages ile yayınlanabilir.

Yerelde test etmek için herhangi bir statik sunucu kullanabilirsiniz:

```bash
python3 -m http.server 8080
```

Ardından tarayıcıdan `http://localhost:8080` adresini açın.
