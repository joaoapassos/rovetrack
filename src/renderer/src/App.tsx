import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState} from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { calculateGlobalProgress } from './utils'

const schema = z.object({
  url: z.url('É necessário um link válido do YouTube.'),
  outputDir: z.string().min(1, 'Defina o caminho de destino para a expedição.')
})

type RoveFormData = z.infer<typeof schema>



function App(): React.JSX.Element {
  const [telemetry, setTelemetry] = useState<PipelineState | null>(null)
  const logEndRef = useRef<HTMLDivElement>(null)

  const {
    register,
    handleSubmit,
    setValue,
    // watch,
    formState: { errors }
  } = useForm<RoveFormData>({
    resolver: zodResolver(schema),
    defaultValues: { url: '', outputDir: '' }
  })

  // const outputDir = watch('outputDir')

  // --- Efeito de Telemetria ---
  useEffect(() => {
    window.api.onPipelineTelemetry((state) => {
      setTelemetry(state)
      console.log(state)
    })
  }, [])

  // Auto-scroll para o final do terminal sempre que o status muda
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [telemetry])
  // ----------------------------

  const handleSelectFolder = async () => {
    const folder = await window.api.selectFolder()
    if (folder) setValue('outputDir', folder, { shouldValidate: true })
  }

  const onSubmit = async (data: RoveFormData) => {
    setTelemetry({
      status: 'preparing',
      message: 'A iniciar os motores...',
      progress: 0,
      step: { current: 1, total: 4 },
      batch: { current: 1, total: 1 }
    })
    try {
      await window.api.processAudio({ url: data.url, outputDir: data.outputDir })
    } catch (error) {
      // Falhas são apanhadas pelo estado 'error' da telemetria
    }
  }

  const isProcessing = telemetry?.status === 'preparing' || telemetry?.status === 'downloading' || telemetry?.status === 'forging';
  const globalProgress = calculateGlobalProgress(telemetry);

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
        <div className="space-y-2">
          <label className="text-xs font-bold text-[#8b949e] uppercase tracking-wider block">Coordenadas (Link)</label>
          <input
            {...register('url')}
            disabled={isProcessing}
            placeholder="https://youtube.com/watch?v=... ou Playlist"
            className="w-full bg-[#161618] border border-[#32363f] focus:border-[#A2ECFB] outline-none text-[#e6edf3] text-sm p-3 rounded transition-colors font-mono"
          />
          {errors.url && <p className="text-red-400 text-xs font-mono mt-1">{errors.url.message}</p>}
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
              disabled={isProcessing}
              className="bg-[#32363f] hover:bg-[#414853] text-[#e6edf3] px-4 rounded border border-[#414853] font-semibold uppercase text-xs disabled:opacity-50 transition-colors"
            >
              Procurar
            </button>
          </div>
          {errors.outputDir && <p className="text-red-400 text-xs font-mono mt-1">{errors.outputDir.message}</p>}
        </div>

        {/* --- DISPLAY VISUAL DA TELEMETRIA COM PROGRESSO GLOBAL --- */}
        {telemetry && (
          <div className="w-full bg-[#0d0d0f] border border-[#32363f] rounded p-4 flex flex-col gap-3 shadow-inner">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-[#A2ECFB] uppercase font-bold flex items-center gap-2">
                {telemetry.status === 'downloading' ? `A DESCARREGAR... ${telemetry.progress || 0}%` : telemetry.status.toUpperCase()}
              </span>
              <span className="text-[#515c67]">
                FAIXA {telemetry.batch.current} / {telemetry.batch.total}
              </span>
            </div>
            
            {/* Barra de Progresso Suave (Global) */}
            <div className="w-full h-2 bg-[#161618] rounded-full overflow-hidden relative">
              <div 
                className={`absolute top-0 left-0 h-full transition-all duration-500 ease-out ${
                  telemetry.status === 'error' ? 'bg-red-500' : 
                  telemetry.status === 'success' ? 'bg-green-500' : 
                  'bg-[#A2ECFB]'
                }`}
                style={{ width: `${globalProgress}%` }}
              />
            </div>
            
            <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-[#a0a4a8] truncate max-w-[80%]">
                  {telemetry.message}
                </span>
                <span className="text-[#515c67] ml-2 shrink-0">
                  {Math.round(globalProgress)}%
                </span>
            </div>
            {/* Âncora para scroll caso decida voltar a meter logs em lista */}
            <div ref={logEndRef} />
          </div>
        )}

        <button
          type="submit"
          disabled={isProcessing}
          className={`w-full py-4 rounded font-bold uppercase tracking-widest transition-all ${
            isProcessing 
              ? 'bg-[#32363f] text-[#8b949e] cursor-not-allowed border border-[#414853]' 
              : 'bg-[#A2ECFB] text-[#1b1b1f] hover:bg-[#8bd6e5] shadow-[0_0_15px_rgba(162,236,251,0.2)]'
          }`}
        >
          {isProcessing ? 'Extração em Andamento...' : 'Iniciar Extração'}
        </button>
      </form>
    </main>
  )
}

export default App