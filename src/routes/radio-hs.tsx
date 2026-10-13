import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Radio, Volume2, Play, Pause, ArrowLeft, Crown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

export const Route = createFileRoute('/radio-hs')({
  component: RadioComponent,
})

// Gerenciador de áudio global fora do ciclo de vida do componente para não cortar o som ao sair da página
let globalAudio: HTMLAudioElement | null = null;

function RadioComponent() {
  const router = useRouter()
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(80)
  const [showExitModal, setShowExitModal] = useState(false)

  // Link de streaming oficial e estável do Google Storage (Livre de bloqueios CORS)
  const STREAMING_URL = "https://googleapis.com"

  useEffect(() => {
    // Inicializa o áudio global apenas uma vez
    if (!globalAudio) {
      globalAudio = new Audio(STREAMING_URL)
      globalAudio.loop = true
      globalAudio.preload = "auto"
    }

    setIsPlaying(!globalAudio.paused)
    setVolume(globalAudio.volume * 100)

    // Bloqueia e gerencia o botão voltar nativo do navegador/celular
    const handleBackButton = (e: PopStateEvent) => {
      e.preventDefault()
      window.history.pushState(null, "", window.location.pathname)
      setShowExitModal(true)
    }

    window.history.pushState(null, "", window.location.pathname)
    window.addEventListener('popstate', handleBackButton)

    return () => {
      window.removeEventListener('popstate', handleBackButton)
    }
  }, [])

  // Sincroniza o volume direto no player nativo
  const handleVolumeChange = (v: number) => {
    setVolume(v)
    if (globalAudio) globalAudio.volume = v / 100
  }

  const togglePlay = () => {
    if (!globalAudio) return

    if (isPlaying) {
      globalAudio.pause()
      setIsPlaying(false)
    } else {
      globalAudio.play()
        .then(() => setIsPlaying(true))
        .catch(err => console.log("Permissão de áudio requerida:", err))
    }
  }

  // Sair da rádio mantendo ela tocando em segundo plano na vitrine
  const handleExitKeepPlaying = () => {
    setShowExitModal(false)
    router.navigate({ to: '/' })
  }

  // Sair da rádio e desligar o som por completo
  const handleExitAndStop = () => {
    if (globalAudio) {
      globalAudio.pause()
      globalAudio.currentTime = 0
    }
    setShowExitModal(false)
    router.navigate({ to: '/' })
  }

  return (
    <div className="min-h-screen bg-[#030712] text-white flex flex-col items-center p-4 antialiased relative">
      
      {/* Botão Superior para Voltar Manual */}
      <div className="w-full max-w-md flex items-center justify-between my-4 px-2">
        <button 
          onClick={() => setShowExitModal(true)} 
          className="h-10 w-10 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-zinc-400" />
        </button>
        <span className="text-xs font-bold uppercase tracking-widest text-purple-400 animate-pulse">Rádio HS Premium</span>
      </div>

      {/* Card do Player */}
      <div className="w-full max-w-md bg-zinc-950/60 border border-zinc-900 rounded-[32px] p-6 shadow-2xl flex flex-col items-center mt-4">
        <div className="w-full relative aspect-square rounded-2xl overflow-hidden mb-6 shadow-xl">
          <img 
            src="https://unsplash.com" 
            alt="Capa" 
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-4 left-4 bg-red-600/90 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-md tracking-widest uppercase">
            Ao Vivo
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-black tracking-tight mb-1">Pop & Top Brasil</h1>
          <p className="text-purple-400 font-bold text-sm tracking-wide">Rádio HS Digital 🎵</p>
        </div>

        {/* Controle Central */}
        <div className="w-full flex items-center justify-center mb-8">
          <button 
            onClick={togglePlay}
            className="h-16 w-16 bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-600/30"
          >
            {isPlaying ? <Pause className="h-6 w-6 fill-white" /> : <Play className="h-6 w-6 fill-white ml-1" />}
          </button>
        </div>

        {/* Volume */}
        <div className="w-full flex items-center gap-4 px-2">
          <Volume2 className="h-5 w-5 text-zinc-400" />
          <input 
            type="range" min="0" max="100" value={volume} 
            onChange={(e) => handleVolumeChange(Number(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-purple-500"
            style={{ background: `linear-gradient(to right, #a855f7 0%, #a855f7 ${volume}%, #27272a ${volume}%, #27272a 100%)` }}
          />
        </div>
      </div>

      {/* 🚨 POP-UP DINÂMICO DE CONFIRMAÇÃO AO SAIR (PAYWALL/NAV MODAL) */}
      {showExitModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 text-center shadow-2xl">
            <div className="h-12 w-12 bg-purple-500/10 text-purple-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Radio className="h-6 w-6" />
            </div>
            
            <h3 className="text-xl font-bold text-white mb-2">Sair da Rádio HS?</h3>
            <p className="text-zinc-400 text-sm mb-6">
              Você deseja continuar ouvindo a transmissão em segundo plano enquanto navega no app?
            </p>

            <div className="flex flex-col gap-2">
              <button 
                onClick={handleExitKeepPlaying}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl text-sm transition-all"
              >
                Sim, manter tocando 🎵
              </button>
              
              <button 
                onClick={handleExitAndStop}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium py-3 rounded-xl text-sm transition-all"
              >
                Não, desligar rádio e fechar
              </button>

              <button 
                onClick={() => setShowExitModal(false)}
                className="text-xs text-zinc-500 hover:text-zinc-400 underline mt-2"
              >
                Cancelar e voltar ao Player
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
