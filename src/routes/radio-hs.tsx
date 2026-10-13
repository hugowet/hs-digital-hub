import { createFileRoute, Link } from '@tanstack/react-router'
import { Radio, Volume2, Play, Pause, SkipForward, SkipBack, Sparkles, Crown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { supabase } from "@/integrations/supabase/client"
import { useQuery } from '@tanstack/react-query'

export const Route = createFileRoute('/radio-hs')({
  component: RadioComponent,
})

function RadioComponent() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(80)
  const [songCount, setSongCount] = useState(0)
  const [showPaywall, setShowPaywall] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // 🔴 COLOQUE AQUI O LINK REAL DA SUA RÁDIO (Ex: link .mp3 ou IP do streaming)
  const STREAMING_URL = "https://walmradio.com" 

  // Busca o status do usuário para saber se ele é assinante do Clube HS
  const { data: isSubscriber = false } = useQuery({
    queryKey: ["user-clube-hs-status"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false
      
      // Verifica se o usuário tem a assinatura ativa na tabela de perfis/roles
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "subscriber") // Altere para a lógica exata do seu banco
      
      return data && data.length > 0
    }
  })

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100
    }
  }, [volume])

  const togglePlay = () => {
    if (!audioRef.current) return

    if (showPaywall && !isSubscriber) {
      return // Bloqueia o play se bateu o limite e não é assinante
    }

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => console.error("Erro ao tocar rádio:", err))
    }
  }

  // Simula a mudança de música na rádio para ativar o gatilho a cada 3 faixas
  const handleNextSong = () => {
    if (isSubscriber) return // Assinante ouve infinito sem anúncios ou travas

    const nextCount = songCount + 1
    if (nextCount >= 3) {
      if (audioRef.current) audioRef.current.pause()
      setIsPlaying(false)
      setSongCount(3)
      setShowPaywall(true) // Ativa a tela de cobrança do Clube HS
    } else {
      setSongCount(nextCount)
    }
  }

  return (
    <div className="min-h-screen bg-[#030712] text-white flex flex-col items-center p-4 antialiased">
      <audio ref={audioRef} src={STREAMING_URL} preload="none" />

      {/* Top Header do Player */}
      <div className="w-full max-w-md flex items-center justify-between my-4 px-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-purple-600/40">
            <Radio className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-wide uppercase">HS Digital Stream</h2>
            <p className="text-xs text-zinc-400">
              {isSubscriber ? "Clube HS Premium Ativo" : `Músicas ouvidas: ${songCount}/3`}
            </p>
          </div>
        </div>
        
        <Link to="/clube-hs" className="flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-xs px-3 py-1.5 rounded-full shadow-md hover:opacity-90 transition-all">
          <Crown className="h-3.5 w-3.5 fill-white" /> Clube HS
        </Link>
      </div>

      {/* Card Principal Central */}
      <div className="w-full max-w-md bg-zinc-950/60 border border-zinc-900 rounded-[32px] p-6 shadow-2xl flex flex-col items-center mt-4 relative overflow-hidden">
        
        {/* BLOQUEIO DO CLUBE HS (PAYWALL EM CIMA DA TELA) */}
        {showPaywall && !isSubscriber && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-10 transition-all">
            <div className="bg-amber-500 p-4 rounded-full mb-4 shadow-lg shadow-amber-500/30 animate-bounce">
              <Crown className="h-10 w-10 text-white fill-white" />
            </div>
            <h3 className="text-xl font-black text-amber-400 mb-2">Limite de Músicas Atingido!</h3>
            <p className="text-zinc-300 text-sm max-w-xs mb-6">
              Você já ouviu 3 músicas. Assine o **Clube HS** por apenas **R\$ 19,90/mês** para liberar streaming ilimitado e sem anúncios!
            </p>
            <Link 
              to="/clube-hs"
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white font-extrabold p-3 rounded-full shadow-lg hover:from-amber-600 hover:to-amber-700 transition-all text-center block mb-3"
            >
              Assinar Clube HS - R\$ 19,90
            </Link>
            <button 
              onClick={() => { setShowPaywall(false); setSongCount(0); }}
              className="text-xs text-zinc-500 hover:text-zinc-300 underline"
            >
              Reiniciar teste gratuito
            </button>
          </div>
        )}

        {/* Imagem de Capa */}
        <div className="w-full relative aspect-square rounded-2xl overflow-hidden mb-6 shadow-xl">
          <img 
            src="https://unsplash.com" 
            alt="Capa da Rádio HS" 
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-4 left-4 bg-red-600/90 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-md tracking-widest uppercase">
            Ao Vivo
          </div>
        </div>

        {/* Informações da Faixa */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black tracking-tight mb-1 text-zinc-100">Pop & Top Brasil</h1>
          <p className="text-purple-400 font-bold text-sm tracking-wide">
            Rádio HS Digital 🎵
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">Perdizes Sessions</p>
        </div>

        {/* Controles de Reprodução */}
        <div className="w-full flex items-center justify-center gap-8 mb-8">
          <button className="text-zinc-600 hover:text-zinc-400 transition-colors">
            <SkipBack className="h-6 w-6 fill-current" />
          </button>

          <button 
            onClick={togglePlay}
            className="h-16 w-16 bg-purple-600 hover:bg-purple-500 active:scale-95 transition-all text-white rounded-full flex items-center justify-center shadow-lg shadow-purple-600/30"
          >
            {isPlaying ? <Pause className="h-6 w-6 text-white" /> : <Play className="h-6 w-6 text-white ml-1" />}
          </button>

          {/* Botão de passar música simula o contador de limite */}
          <button onClick={handleNextSong} className="text-zinc-400 hover:text-zinc-200 transition-colors active:scale-95 bg-zinc-900 p-2 rounded-full border border-zinc-800">
            <SkipForward className="h-5 w-5 fill-current text-purple-400" />
          </button>
        </div>

        {/* Controle do Volume Slider */}
        <div className="w-full flex items-center gap-4 px-2">
          <Volume2 className="h-5 w-5 text-zinc-400" />
          <input 
            type="range" min="0" max="100" value={volume} 
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-purple-500"
            style={{ background: `linear-gradient(to right, #a855f7 0%, #a855f7 ${volume}%, #27272a ${volume}%, #27272a 100%)` }}
          />
        </div>

      </div>

      <p className="text-[10px] text-zinc-600 tracking-wide mt-12 text-center max-w-xs">
        Compatível com reprodução em segundo plano e controle integrado.
      </p>
    </div>
  )
}
