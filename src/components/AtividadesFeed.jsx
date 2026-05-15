import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AtividadesFeed() {
  const [atividades, setAtividades] = useState([])
  const [analistas, setAnalistas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
    
    // Atualizar a cada 3 segundos
    const interval = setInterval(() => {
      fetchData()
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      const { data: atividadesData } = await supabase
        .from('atividades_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      const { data: analistasData } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'analista')

      const { data: empresasData } = await supabase
        .from('empresas')
        .select('*')

      setAtividades(
        atividadesData?.map(a => ({
          ...a,
          nomeAnalista: analistasData?.find(u => u.id === a.user_id)?.nome || 'Desconhecido',
          nomeEmpresa: empresasData?.find(e => e.id === a.empresa_id)?.nome || 'Desconhecida',
        })) || []
      )
      setAnalistas(analistasData || [])
      setLoading(false)
    } catch (error) {
      console.error('Erro:', error)
    }
  }

  const getActionColor = (acao) => {
    if (acao === 'INICIOU') return 'bg-blue-50 border-l-4 border-blue-500'
    if (acao === 'PAUSOU') return 'bg-yellow-50 border-l-4 border-yellow-500'
    if (acao === 'CONCLUIU') return 'bg-green-50 border-l-4 border-green-500'
    return 'bg-gray-50 border-l-4 border-gray-500'
  }

  const getActionIcon = (acao) => {
    if (acao === 'INICIOU') return '▶️'
    if (acao === 'PAUSOU') return '⏸️'
    if (acao === 'CONCLUIU') return '✅'
    return '📝'
  }

  const getAnalistaColor = (index) => {
    const colors = [
      'bg-red-100 text-red-800',
      'bg-blue-100 text-blue-800',
      'bg-purple-100 text-purple-800',
      'bg-green-100 text-green-800',
      'bg-yellow-100 text-yellow-800',
    ]
    return colors[index % colors.length]
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffSeconds = Math.floor((now - date) / 1000)

    if (diffSeconds < 60) return 'agora'
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m atrás`
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h atrás`
    return date.toLocaleDateString('pt-BR')
  }

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-600">
        Carregando atividades...
      </div>
    )
  }

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {atividades.length === 0 ? (
        <div className="text-center py-8 text-gray-600">
          Nenhuma atividade registrada
        </div>
      ) : (
        atividades.map((atividade, idx) => (
          <div
            key={atividade.id}
            className={`p-4 rounded-lg ${getActionColor(atividade.acao)}`}
          >
            <div className="flex items-start gap-3">
              <div className="text-2xl">{getActionIcon(atividade.acao)}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getAnalistaColor(idx)}`}>
                    {atividade.nomeAnalista}
                  </span>
                  <span className="font-semibold text-gray-800">{atividade.acao}</span>
                </div>
                <p className="text-sm text-gray-700 mt-1">
                  <strong>{atividade.nomeEmpresa}</strong>
                  {atividade.mes && <span> • {atividade.mes}</span>}
                </p>
                {atividade.detalhe && (
                  <p className="text-sm text-gray-600 mt-1">
                    {atividade.detalhe}
                  </p>
                )}
              </div>
              <span className="text-xs text-gray-500 whitespace-nowrap">
                {formatTime(atividade.created_at)}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
