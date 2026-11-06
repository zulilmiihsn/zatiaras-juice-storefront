# Mati lampu? Ke Zatiaras Juice aja — paket render 1080p (Reels)

## Cara render (di komputer yang punya GPU)
1. Pasang Node 18+ dan ffmpeg (pastikan `ffmpeg -version` jalan di terminal).
2. Di folder ini:  `npm i`  lalu  `node render_local.cjs`
3. Hasil: `Zatiaras_MatiLampu_Reels_1080x1920.mp4` (H.264 high, CRF 16, 30 fps, AAC 192k, -14 LUFS, faststart).
   Tes cepat dulu (30 frame): `node render_local.cjs --test`

Opsi (environment variable): `PNG=0` (JPEG, lebih cepat), `AUDIO=audio/vo_only.m4a` (suara saja tanpa SFX), `HEADFUL=1` (kalau headless tidak memakai GPU),
`SOFTWARE_GL=1` (hanya kalau tidak ada GPU; sangat lambat), `W=720` (resolusi lebih kecil), `OUT=nama.mp4`.

## Isi
- web/        halaman animasi (sudah di-bundle)    - src/   kode sumber (main.js = timeline, CFG di atas)
- audio/      final_mix.m4a (VO + SFX halus), vo_only.m4a, serta 1..6.mp3 asli
- Durasi 34,4 detik. Timing animasi sudah disinkronkan ke 1..6.mp3.
