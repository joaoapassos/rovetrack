import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

// Esquema de Validação Zod
const schema = z.object({
  url: z.url('É necessário um link válido do YouTube.'),
  outputDir: z.string().min(1, 'Defina o caminho de destino para a expedição.')
})

type RoveFormData = z.infer<typeof schema>

function App(): React.JSX.Element {
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle')

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

  // Chama o OS para abrir a seleção de pastas via ponte IPC
  const handleSelectFolder = async () => {
    const folder = await window.api.selectFolder()
    if (folder) {
      setValue('outputDir', folder, { shouldValidate: true })
    }
  }

  // Dispara o motor no backend
  const onSubmit = async (data: RoveFormData) => {
    setStatus('processing')
    try {
      await window.api.processAudio({ url: data.url, outputDir: data.outputDir })
      setStatus('success')
    } catch (error) {
      setStatus('error')
      console.error(error)
    }
  }

  return (
    <main className="min-h-screen bg-[#1b1b1f] text-[#f8f8f8] flex flex-col items-center justify-center p-6 select-none font-sans">
      
      {/* Cabeçalho Utilitário */}
      <header className="mb-10 text-center flex flex-col items-center">
        <div className="w-16 h-16 bg-[#282828] border-2 border-[#414853] rounded-lg mb-4 flex items-center justify-center shadow-lg">
           <span className="font-mono text-2xl font-bold text-[#A2ECFB]">RT</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white uppercase">RoveTrack</h1>
        <p className="text-[#a0a4a8] text-sm font-mono mt-1 tracking-widest">AUDIO EXTRACTION UTILITY</p>
      </header>

      {/* Painel de Controlo */}
      <form 
        onSubmit={handleSubmit(onSubmit)} 
        className="w-full max-w-xl bg-[#222222] border border-[#32363f] p-6 rounded-md shadow-2xl space-y-6"
      >
        
        {/* Input: URL */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[#8b949e] uppercase tracking-wider block" htmlFor=''>
            Coordenadas (Link do YouTube)
          </label>
          <input
            {...register('url')}
            disabled={status === 'processing'}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full bg-[#161618] border border-[#32363f] focus:border-[#A2ECFB] outline-none text-[#e6edf3] text-sm p-3 rounded transition-colors font-mono"
          />
          {errors.url && <p className="text-red-400 text-xs font-mono mt-1">{errors.url.message}</p>}
        </div>

        {/* Input: Output Directory */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[#8b949e] uppercase tracking-wider block" htmlFor=''>
            Acampamento Base (Destino)
          </label>
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
              className="bg-[#32363f] hover:bg-[#414853] text-[#e6edf3] px-4 rounded border border-[#414853] transition-colors font-semibold uppercase text-xs tracking-wider disabled:opacity-50"
            >
              Procurar
            </button>
          </div>
          {errors.outputDir && <p className="text-red-400 text-xs font-mono mt-1">{errors.outputDir.message}</p>}
        </div>

        {/* Console de Status Básico */}
        <div className={`p-4 rounded border text-sm font-mono text-center ${
            status === 'processing' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500' :
            status === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-500' :
            status === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-500' :
            'bg-[#161618] border-[#32363f] text-[#8b949e]'
        }`}>
          {status === 'idle' && 'AGUARDANDO INSTRUÇÕES...'}
          {status === 'processing' && 'FORJA EM ANDAMENTO. POR FAVOR, AGUARDE...'}
          {status === 'success' && 'EXPEDIÇÃO CONCLUÍDA COM SUCESSO!'}
          {status === 'error' && 'FALHA CRÍTICA. VERIFIQUE OS LOGS.'}
        </div>

        {/* Action Button */}
        <button
          type="submit"
          disabled={status === 'processing'}
          className={`w-full py-4 rounded font-bold uppercase tracking-widest transition-all ${
            status === 'processing' 
              ? 'bg-[#32363f] text-[#8b949e] cursor-not-allowed border border-[#414853]' 
              : 'bg-[#A2ECFB] text-[#1b1b1f] hover:bg-[#8bd6e5] shadow-[0_0_15px_rgba(162,236,251,0.2)]'
          }`}
        >
          {status === 'processing' ? 'A Processar...' : 'Iniciar Extração'}
        </button>

      </form>
    </main>
  )
}

export default App