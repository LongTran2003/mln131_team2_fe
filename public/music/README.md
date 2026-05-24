# Music files

Đặt 8 file MP3 vào folder này với tên đúng:

- `track-1.mp3`
- `track-2.mp3`
- `track-3.mp3`
- `track-4.mp3`
- `track-5.mp3`
- `track-6.mp3`
- `track-7.mp3`
- `track-8.mp3`

## Cách tải nhạc từ YouTube

Source: https://www.youtube.com/watch?v=w1UBuEpstWE (1h06m, 8 bài)

### Option 1 — yt-dlp (recommended)

```bash
# Cài đặt yt-dlp
pip install yt-dlp

# Tải video về dạng MP3 (1 file dài)
yt-dlp -x --audio-format mp3 -o "full-mix.%(ext)s" "https://www.youtube.com/watch?v=w1UBuEpstWE"

# Hoặc split theo chapter nếu video có chapter markers
yt-dlp -x --audio-format mp3 --split-chapters -o "track-%(section_number)s.%(ext)s" "https://www.youtube.com/watch?v=w1UBuEpstWE"
```

### Option 2 — Online tool

- ytmp3.cc
- y2mate.com
- Sau đó dùng Audacity / ffmpeg để cắt thành 8 đoạn theo timestamp.

### Option 3 — ffmpeg split

Nếu có file dài rồi, dùng ffmpeg cắt:

```bash
# Ví dụ cắt từ 0:00 đến 8:00 cho bài 1
ffmpeg -i full-mix.mp3 -ss 00:00:00 -to 00:08:00 -c copy track-1.mp3
```

## Tuỳ chỉnh tên bài

Sau khi có file, mở `src/config/playlist.ts` và sửa `title` của mỗi track cho khớp tên bài thật.

## Lưu ý deploy

- File MP3 ~5MB/bài × 8 = ~40MB. Netlify free tier giới hạn ~100MB build size.
- Nếu vượt limit, host file lên S3/Cloudflare R2 rồi sửa `src` thành URL ngoài.
- Hoặc nén bitrate 96-128kbps để giảm size.