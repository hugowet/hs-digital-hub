import { createFileRoute, Link } from '@tanstack/react-router'
import { Radio, Volume2, Play, Pause, SkipForward, SkipBack, Sparkles, Crown, Lock } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

export const Route = createFileRoute('/radio-hs')({
  component: RadioComponent,
})

// Simulando uma lista de faixas para o comportamento idêntico ao Lovable
const PLAYLIST = [
  { title: "Pop & Top Brasil", station: "Rádio HS Digital 🎵", session: "Perdizes Sessions", cover: "https://unsplash.com" },
  { title: "Glow Electro Hits", station: "Rádio HS Digital 🎵", session: "Ibiza Summer Warmup", cover: "https://unsplash.com" },
  { title: "Hip-Hop Underground", station: "Rádio HS Digital 🎵", session: "Brooklyn Classic Mix", cover: "https://unsplash.com" },
  { title: "Chill & Lofi Beats", station: "Rádio HS Digital 🎵", session: "Midnight Study Session", cover: "https://unsplash.com" }
]

function RadioComponent() {
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(80)
  
  // Controle de limite: conta quantas músicas o usuário ouviu
  const [songsListenedCount, setSongsListenedCount] = useState(0)
  const [showPaywall, setShowPaywall] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const currentTrack = PLAYLIST[currentTrackIndex]

  // 🔴 COLOQUE O LINK REAL DO SEU STREAMING DE ÁUDIO (.mp3) AQUI PARA TOCAR SOM
  const STREAMING_URL = "https://hs-digital-marck.lovable.app/radio" 

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100
    }
  }, [volume])

  // Lógica de monitoramento de limite por faixa escutada
  const handleNextTrack = () => {
    if (songsListenedCount >= 2) {
      // Se já ouviu 3 músicas (0, 1, 2), bloqueia a reprodução
      if (audioRef.current) audioRef.current.pause()
      setIsPlaying(false)
      setShowPaywall(true)
      return
    }

    setSongsListenedCount(prev => prev + 1)
    setCurrentTrackIndex((prevIndex) => (prevIndex + 1) % PLAYLIST.length)
  }

  const handlePrevTrack = () => {
    setCurrentTrackIndex((prevIndex) => (prevIndex - 1 + PLAYLIST.length) % PLAYLIST.length)
  }

  const togglePlay = () => {
    if (showPaywall) return

    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => console.error("Erro de reprodução:", err))
    }
  }

  return (
    <div className="min-h-screen bg-[#030712] text-white flex flex-col items-center p-4 antialiased selection:bg-purple-500/30">
      
      {/* Elemento de Áudio HTML5 Nativo */}
      <audio ref={audioRef} src={STREAMING_URL} preload="none" onEnded={handleNextTrack} />

      {/* Top Header do Player */}
      <div className="w-full max-w-md flex items-center justify-between my-4 px-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-600/40">
            <Radio className="h-5 w-5 text-white animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-wide uppercase">HS Digital Stream</h2>
            <p className="text-xs text-zinc-400">Background Audio Ativo</p>
          </div>
        </div>
        
        <Link to="/clube-hs" className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 text-amber-400 font-semibold text-xs px-3 py-1.5 rounded-full hover:bg-zinc-800 transition-all">
          <Sparkles className="h-3.5 w-3.5 fill-amber-400" /> Ouvir sem Anúncios
        </Link>
      </div>

      {/* Card Principal Central */}
      <div className="w-full max-w-md bg-zinc-950/60 border border-zinc-900 rounded-[32px] p-6 shadow-2xl flex flex-col items-center mt-4 relative overflow-hidden">
        
        {/* PAYWALL: Exibido em cima do player após o limite de 3 músicas */}
        {showPaywall && (
          <div className="absolute inset-0 bg-black/90 z-20 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
            <div className="h-16 w-16 bg-amber-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/30 mb-4 animate-bounce">
              <Crown className="h-8 w-8 text-white fill-white" />
            </div>
            <h2 className="text-2xl font-black tracking-tight mb-2">Limite Gratuito Atingido!</h2>
            <p className="text-zinc-400 text-sm max-w-xs mb-6">
              Você já ouviu 3 músicas. Assine o <span className="text-amber-400 font-bold">Clube HS</span> para liberar músicas ilimitadas sem anúncios e comerciais.
            </p>
            <Link 
              to="/clube-hs" 
              className="w-full max-w-xs bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-full flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
            >
              <Lock className="h-4 w-4" /> Assinar Clube HS Agora
            </Link>
            <button 
              onClick={() => { setSongsListenedCount(0); setShowPaywall(false); }}
              className="text-xs text-zinc-500 hover:text-zinc-300 underline mt-4"
            >
              Continuar em Modo de Teste Demo
            </button>
          </div>
        )}

        {/* Imagem de Capa */}
        <div className="w-full relative aspect-square rounded-2xl overflow-hidden mb-6 shadow-xl group">
          <img 
            src={currentTrack.cover} 
            alt="Capa da Rádio HS" 
            className="w-full h-full object-cover transition-transform duration-700"
          />
          <div className="absolute bottom-4 left-4 bg-red-600/90 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-md tracking-widest uppercase">
            Ao Vivo
          </div>
        </div>

        {/* Informações da Faixa Dinâmica */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black tracking-tight mb-1 text-zinc-100">{currentTrack.title}</h1>
          <p className="text-purple-400 font-bold text-sm tracking-wide flex items-center justify-center gap-1">
            {currentTrack.station}
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">{currentTrack.session}</p>
        </div>

        {/* Controles de Reprodução */}
        <div className="w-full flex items-center justify-center gap-8 mb-8">
          <button onClick={handlePrevTrack} className="text-zinc-500 hover:text-zinc-200 transition-colors active:scale-95">
            <SkipBack className="h-6 w-6 fill-current" />
          </button>

          <button 
            onClick={togglePlay}
            className="h-16 w-16 bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-600/30"
          >
            {isPlaying ? (
              <Pause className="h-6 w-6 fill-white text-white" />
            ) : (
              <Play className="h-6 w-6 fill-white text-white ml-1" />
            )}
          </button>

          <button onClick={handleNextTrack} className="text-zinc-500 hover:text-zinc-200 transition-colors active:scale-95">
            <SkipForward className="h-6 w-6 fill-current" />
          </button>
        </div>

        {/* Controle do Volume */}
        <div className="w-full flex items-center gap-4 px-2">
          <Volume2 className="h-5 w-5 text-zinc-400" />
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={volume} 
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-purple-500 focus:outline-none"
            style={{
              background: `linear-gradient(to right, #a855f7 0%, #a855f7 ${volume}%, #27272a ${volume}%, #27272a 100%)`
            }}
          />
        </div>

      </div>

      {/* Footer Disclaimer */}
      <p className="text-[10px] text-zinc-600 tracking-wide mt-12 text-center max-w-xs">
        Compatível com reprodução em segundo plano e tela bloqueada.
      </p>

    </div>
  )
}
