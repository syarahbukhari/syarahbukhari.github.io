# syarahBukhari

Laman web ebook ringkasan syarah Sahih al-Bukhari beserta video penerangan, diringkaskan daripada kitab *Shahih Bukhari bersama Terjemahan dan Ulasan* oleh Maulana Muhammad Asri Yusoff. Projek Teratak Hadits.

Semua ebook boleh dibaca terus di laman (termasuk di telefon) dan dimuat turun secara percuma.

## Struktur

| Folder / fail | Kegunaan |
|---|---|
| `content/kitab/*.json` | Satu fail bagi setiap Kitab (tajuk besar) beserta senarai ebooknya |
| `content/tetapan.json` | Nama laman, slogan, teks pengenalan, kredit |
| `uploads/` | Fail PDF dan gambar yang dimuat naik |
| `admin/` | Panel admin (Sveltia CMS) |
| `assets/` | Gaya (CSS), pembaca PDF, ikon |
| `build.js` | Penjana laman — hasilkan `_site/` |

Laman akan dibina dan diterbitkan semula secara automatik (GitHub Actions) setiap kali ada perubahan pada cawangan `main`, termasuk perubahan melalui panel admin. Proses ini mengambil masa lebih kurang 1–2 minit.

## Persediaan kali pertama (sekali sahaja)

1. Gabungkan (merge) kod ini ke cawangan `main`.
2. Di GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Laman akan tersedia di https://syarahbukhari.github.io/
   Domain sendiri (contoh `syarahbukhari.com`) boleh ditetapkan di halaman yang sama.

> Nota: GitHub Pages percuma untuk repo **public**. Untuk repo private, perlu pelan GitHub berbayar.

## Cara guna panel admin

1. Buka `https://<alamat-laman>/admin/`
2. Log masuk dengan **"Sign In with Token"**, iaitu GitHub Personal Access Token:
   - GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token
   - Repository access: pilih repo ini sahaja
   - Permissions → Repository permissions → **Contents: Read and write**
   - Salin token dan tampal di panel admin. Simpan token di tempat selamat dan jangan kongsi.
   - Setiap admin perlu ada akaun GitHub dan dijadikan *collaborator* repo ini.

### Tambah ebook baharu dalam kitab sedia ada
1. **Kitab** → pilih kitab (contoh *Kitab Wahyu*)
2. Di bahagian **Senarai Ebook**, tekan **Add Ebook**
3. Isi tajuk (contoh *Hadis Kelima*), muat naik PDF, dan tampal pautan YouTube (jika ada)
4. Tekan **Save**. Laman akan dikemas kini dalam 1–2 minit.

### Tambah video kemudian
Buka ebook berkenaan, tampal pautan YouTube di ruangan **Pautan video YouTube**, dan tekan **Save**. Video boleh ditetapkan sebagai *Public* atau *Unlisted* di YouTube.

### Tambah kitab baharu
**Kitab → New Kitab**. Isi no. urutan, tajuk (contoh *Kitab Iman*), tajuk Arab dan penerangan, kemudian tambah ebook.

### Sembunyikan ebook sementara
Matikan suis **Paparkan di laman** pada ebook tersebut.

### Perhatian
- Alamat URL ebook dijana daripada **tajuk**. Elakkan menukar tajuk selepas pautan dikongsi.
- Pastikan saiz setiap PDF kurang daripada ~25 MB supaya mudah dimuat naik dan dibaca di telefon.

## Uji di komputer sendiri

```bash
node build.js
cd _site && python3 -m http.server 8000
# buka http://localhost:8000
```
