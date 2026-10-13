import { createFileRoute } from '@tanstack/react-router'
import { Radio, Volume2, Play, Square } from 'lucide-react'
import { useState, useRef } from 'react'

export const Route = createFileRoute('/radio-hs')({
  component: RadioComponent,
})

function RadioComponent() {
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // 🔴 SUBSTITUA ESTE LINK PELO LINK REAL DO SEU STREAMING (.mp3, .aac, etc)
  const STREAMING_URL = "SUA_URL_DE_STREAMING_AQUI" 

  const togglePlay = () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => console.error("Erro ao reproduzir áudio:", err))
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl min-h-[70vh] flex flex-col items-center justify-center">
      {/* Elemento de áudio nativo escondido */}
      <audio ref={audioRef} src={STREAMING_URL} preload="none" />

      <div className="w-full max-w-md bg-gradient-to-b from-purple-900 to-indigo-950 text-white rounded-3xl p-8 shadow-2xl flex flex-col items-center border border-purple-500/20">
        
        {/* Badge de Status */}
        <div className="flex items-center gap-2 bg-purple-500/20 text-purple-300 font-bold px-3 py-1 rounded-full text-xs uppercase tracking-widest mb-6">
          <span className={`h-2 w-2 rounded-full bg-red-500 ${isPlaying ? 'animate-ping' : ''}`} />
          {isPlaying ? 'Transmitindo Ao Vivo' : 'Rádio Offline / Pausada'}
        </div>

        {/* Ícone ou Capa da Rádio */}
        <div className={`bg-purple-600/30 p-8 rounded-full mb-6 border border-purple-400/30 shadow-inner ${isPlaying ? 'animate-pulse' : ''}`}>
          <Radio className={`h-20 w-20 text-purple-400 ${isPlaying ? 'text-white' : ''}`} />
        </div>
        
        {/* Títulos */}
        <h1 className="text-3xl font-extrabold tracking-tight mb-1">Rádio HS</h1>
        <p className="text-purple-300 text-sm mb-8 text-center px-4">
          A sua melhor conexão digital. Sintonize no melhor som!
        </p>

        {/* Player de Controle Customizado */}
        <div className="w-full bg-black/30 backdrop-blur-md rounded-2xl p-6 border border-white/5 flex flex-col items-center gap-4">
          
          {/* Botão de Play/Stop */}
          <button 
            onClick={togglePlay}
            className="h-16 w-16 bg-purple-600 hover:bg-purple-500 active:scale-95 transition-all text-white rounded-full flex items-center justify-center shadow-lg group"
          >
            {isPlaying ? (
              <Square className="h-6 w-6 fill-white" />
            ) : (
              <Play className="h-6 w-6 fill-white ml-1 group-hover:scale-110 transition-transform" />
            )}
          </button>

          {/* Indicador de Volume Gráfico Simulado */}
          <div className="w-full flex items-center gap-3 px-2">
            <Volume2 className="h-4 w-4 text-purple-400" />
            <div className="h-1 flex-1 bg-white/10 rounded-full overflow-hidden">
              <div className={`h-full bg-purple-500 rounded-full transition-all duration-500 ${isPlaying ? 'w-full' : 'w-0'}`} />
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
