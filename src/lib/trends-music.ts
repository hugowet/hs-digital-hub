// Biblioteca de músicas do HSTrends — faixas livres de direitos (royalty-free),
// servidas por CDN público. O criador escolhe uma da lista ou envia do aparelho.
export type TrendMusicTrack = {
  id: string;
  title: string;
  artist: string;
  url: string;
  tag: string;
};

export const TREND_MUSIC_LIBRARY: TrendMusicTrack[] = [
  {
    id: "viral-groove",
    title: "Viral Groove",
    artist: "HS Sounds",
    tag: "🔥 Viral",
    url: "https://cdn.pixabay.com/audio/2024/11/01/audio_07b2f4ae9e.mp3",
  },
  {
    id: "funk-beat",
    title: "Beat Explosão",
    artist: "HS Sounds",
    tag: "🔥 Viral",
    url: "https://cdn.pixabay.com/audio/2023/10/24/audio_6e9b90a1b6.mp3",
  },
  {
    id: "summer-vibes",
    title: "Vibes de Verão",
    artist: "HS Sounds",
    tag: "☀️ Alegre",
    url: "https://cdn.pixabay.com/audio/2022/10/25/audio_2b3b8c1f2e.mp3",
  },
  {
    id: "night-drive",
    title: "Noite Neon",
    artist: "HS Sounds",
    tag: "🌙 Eletrônica",
    url: "https://cdn.pixabay.com/audio/2024/02/14/audio_c9b8a1d2f3.mp3",
  },
  {
    id: "acoustic-chill",
    title: "Violão Leve",
    artist: "HS Sounds",
    tag: "🎸 Calma",
    url: "https://cdn.pixabay.com/audio/2022/03/10/audio_1a2b3c4d5e.mp3",
  },
  {
    id: "party-up",
    title: "Festa Pra Cima",
    artist: "HS Sounds",
    tag: "🎉 Festa",
    url: "https://cdn.pixabay.com/audio/2023/07/19/audio_9f8e7d6c5b.mp3",
  },
];
