import { createFileRoute } from '@tanstack/react-router'
import { Radio, Volume2, Play, Pause, SkipForward, SkipBack, Sparkles } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

export const Route = createFileRoute('/radio-hs')({
  component: RadioComponent,
})

function RadioComponent() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(80)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // 🔴 URL de Streaming está configurada com um áudio público estável de exemplo.
  // Substitua pela URL da sua rádio se tiver uma própria (.mp3).
  const STREAMING_URL = "https://walmradio.com" 

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100
    }
  }, [volume])

  const togglePlay = () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => console.error("Erro ao tocar streaming:", err))
    }
  }

  return (
    <div className="min-h-screen bg-[#030712] text-white flex flex-col items-center p-4 antialiased">
      
      {/* Elemento de Áudio Oculto */}
      <audio ref={audioRef} src={STREAMING_URL} preload="none" />

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
        
        <button className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 text-amber-400 font-semibold text-xs px-3 py-1.5 rounded-full hover:bg-zinc-800 transition-all">
          <Sparkles className="h-3.5 w-3.5 fill-amber-400" /> Ouvir sem Anúncios
        </button>
      </div>

      {/* Card Principal Central */}
      <div className="w-full max-w-md bg-zinc-950/60 border border-zinc-900 rounded-[32px] p-6 shadow-2xl flex flex-col items-center mt-4">
        
        {/* Imagem de Capa */}
        <div className="w-full relative aspect-square rounded-2xl overflow-hidden mb-6 shadow-xl group">
          <img 
            src="https://unsplash.com" 
            alt="Capa da Rádio HS" 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute bottom-4 left-4 bg-red-600/90 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-md tracking-widest uppercase">
            Ao Vivo
          </div>
        </div>

        {/* Informações da Faixa */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black tracking-tight mb-1 text-zinc-100">Pop & Top Brasil</h1>
          <p className="text-purple-400 font-bold text-sm tracking-wide flex items-center justify-center gap-1">
            Rádio HS Digital 🎵
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">Perdizes Sessions</p>
        </div>

        {/* Controles de Reprodução */}
        <div className="w-full flex items-center justify-center gap-8 mb-8">
          <button className="text-zinc-500 hover:text-zinc-200 transition-colors active:scale-95">
            <SkipBack className="h-6 w-6 fill-current" />
          </button>

          <button 
            onClick={togglePlay}
            className="h-16 w-16 bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-600/30 group"
          >
            {isPlaying ? (
              <Pause className="h-6 w-6 fill-white text-white" />
            ) : (
              <Play className="h-6 w-6 fill-white text-white ml-1" />
            )}
          </button>

          <button className="text-zinc-500 hover:text-zinc-200 transition-colors active:scale-95">
            <SkipForward className="h-6 w-6 fill-current" />
          </button>
        </div>

        {/* Controle do Volume Slider */}
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
