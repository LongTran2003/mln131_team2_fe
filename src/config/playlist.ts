export interface Track {
  title: string;
  src: string;
}

// Đặt file MP3 vào public/music/ với tên tương ứng.
// Source playlist: https://www.youtube.com/watch?v=w1UBuEpstWE (1h06m, 8 bài)
export const PLAYLIST: Track[] = [
  { title: 'Bài 1', src: '/music/track-1.mp3' },
  { title: 'Bài 2', src: '/music/track-2.mp3' },
  { title: 'Bài 3', src: '/music/track-3.mp3' },
  { title: 'Bài 4', src: '/music/track-4.mp3' },
  { title: 'Bài 5', src: '/music/track-5.mp3' },
  { title: 'Bài 6', src: '/music/track-6.mp3' },
  { title: 'Bài 7', src: '/music/track-7.mp3' },
  { title: 'Bài 8', src: '/music/track-8.mp3' },
];