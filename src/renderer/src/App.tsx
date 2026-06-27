import { zodResolver } from '@hookform/resolvers/zod'
import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const schema = z.object({
  url: z.string().url('É necessário um link válido do YouTube.'),
  outputDir: z.string().min(1, 'Defina o caminho de destino para a expedição.')
})

type RoveFormData = z.infer<typeof schema>

function App(): React.JSX.Element {
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle')
  const [logs, setLogs] = useState<string[]>([])
  const logEndRef = useRef<HTMLDivElement>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<RoveFormData>({
    resolver: zodResolver(schema),
    defaultValues: { url: '', outputDir: '' }
  })

  const outputDir = watch('outputDir')

  // --- Efeito de Telemetria ---
  useEffect(() => {
    // Escuta os logs vindos do motor Node.js e adiciona ao array
    window.api.onPipelineLog((msg) => {
      setLogs((prev) => [...prev, msg])
    })
  }, [])

  // Auto-scroll para o final do terminal sempre que um log novo chega
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])
  // ----------------------------

  const handleSelectFolder = async () => {
    const folder = await window.api.selectFolder()
    if (folder) {
      setValue('outputDir', folder, { shouldValidate: true })
    }
  }

  const onSubmit = async (data: RoveFormData) => {
    setStatus('processing')
    setLogs([]) // Limpa o terminal antes de uma nova expedição
    try {
      await window.api.processAudio({ url: data.url, outputDir: data.outputDir })
      setStatus('success')
    } catch (error) {
      setStatus('error')
    }
  }

  return (
    <main className="min-h-screen bg-[#1b1b1f] text-[#f8f8f8] flex flex-col items-center justify-center p-6 select-none font-sans">
      <header className="mb-8 text-center flex flex-col items-center">
        <div className="w-16 h-16 bg-[#282828] border-2 border-[#414853] rounded-lg mb-4 flex items-center justify-center shadow-lg">
           <span className="font-mono text-2xl font-bold text-[#A2ECFB]">RT</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white uppercase">RoveTrack</h1>
      </header>

      <form 
        onSubmit={handleSubmit(onSubmit)} 
        className="w-full max-w-xl bg-[#222222] border border-[#32363f] p-6 rounded-md shadow-2xl space-y-6"
      >
        {/* Input de URL e Output Directory permanecem iguais */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[#8b949e] uppercase tracking-wider block">Coordenadas (Link)</label>
          <input
            {...register('url')}
            disabled={status === 'processing'}
            placeholder="https://youtube.com/watch?v=... ou Playlist"
            className="w-full bg-[#161618] border border-[#32363f] focus:border-[#A2ECFB] outline-none text-[#e6edf3] text-sm p-3 rounded transition-colors font-mono"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-[#8b949e] uppercase tracking-wider block">Acampamento (Destino)</label>
          <div className="flex gap-2">
            <input
              {...register('outputDir')}
              readOnly
              placeholder="Nenhum caminho selecionado..."
              className="flex-1 bg-[#161618] border border-[#32363f] text-[#a0a4a8] text-sm p-3 rounded font-mono truncate cursor-not-allowed"
            />
            <button
              type="button"
              onClick={handleSelectFolder}
              disabled={status === 'processing'}
              className="bg-[#32363f] hover:bg-[#414853] text-[#e6edf3] px-4 rounded border border-[#414853] font-semibold uppercase text-xs disabled:opacity-50"
            >
              Procurar
            </button>
          </div>
        </div>

        {/* --- TERMINAL DE EXPEDIÇÃO (TELEMETRIA) --- */}
        <div className="h-48 w-full bg-[#0d0d0f] border border-[#32363f] rounded p-4 font-mono text-xs overflow-y-auto flex flex-col gap-1 shadow-inner">
          {logs.length === 0 ? (
            <span className="text-[#515c67] italic">AGUARDANDO INSTRUÇÕES...</span>
          ) : (
            logs.map((log, index) => (
              <span 
                key={index} 
                className={`${log.includes('FALHA') ? 'text-red-400' : log.includes('SUCESSO') ? 'text-[#A2ECFB] font-bold' : 'text-[#a0a4a8]'}`}
                style={{ whiteSpace: 'pre-wrap' }}
              >
                {log}
              </span>
            ))
          )}
          {/* Âncora invisível para o auto-scroll */}
          <div ref={logEndRef} />
        </div>

        <button
          type="submit"
          disabled={status === 'processing'}
          className={`w-full py-4 rounded font-bold uppercase tracking-widest transition-all ${
            status === 'processing' 
              ? 'bg-[#32363f] text-[#8b949e] cursor-not-allowed border border-[#414853]' 
              : 'bg-[#A2ECFB] text-[#1b1b1f] hover:bg-[#8bd6e5] shadow-[0_0_15px_rgba(162,236,251,0.2)]'
          }`}
        >
          {status === 'processing' ? 'Extração em Andamento...' : 'Iniciar Extração'}
        </button>
      </form>
    </main>
  )
}

export default App