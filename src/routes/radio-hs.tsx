import { createFileRoute } from '@tanstack/react-router'
import { Radio, Volume2 } from 'lucide-react'

export const Route = createFileRoute('/radio-hs')({
  component: RadioComponent,
})

function RadioComponent() {
  return (
    <div className="container mx-auto p-6 max-w-4xl min-h-[50vh] flex flex-col items-center justify-center text-center">
      <div className="bg-purple-50 p-6 rounded-full my-4 animate-pulse">
        <Radio className="h-16 w-16 text-purple-600" />
      </div>
      
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Rádio HS</h1>
      <p className="text-gray-600 max-w-md mb-6">
        Seja bem-vindo à nossa estação de rádio digital. Fique ligado no melhor conteúdo!
      </p>

      {/* 🎵 ESPAÇO PARA O SEU PLAYER DE ÁUDIO DEPOIS */}
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Volume2 className="h-5 w-5 text-purple-600" />
          <span className="text-sm font-medium text-gray-700">Player de Transmissão</span>
        </div>
        <span className="text-xs bg-purple-100 text-purple-700 font-bold px-2 py-1 rounded-full uppercase tracking-wider animate-bounce">
          Ao Vivo
        </span>
      </div>
    </div>
  )
}
