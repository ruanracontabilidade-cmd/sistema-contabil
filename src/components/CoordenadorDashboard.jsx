import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import AtividadesFeed from './AtividadesFeed'

export default function CoordenadorDashboard({ user, onLogout }) {
  const [abaSelecionada, setAbaSelecionada] = useState('dashboard')
  const [empresas, setEmpresas] = useState([])
  const [analistas, setAnalistas] = useState([])
  const [sessoes, setSessoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [extratos, setExtratos] = useState([])

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    try {
      setLoading(true)

      const { data: empresasData } = await supabase
        .from('empresas')
        .select('*')

      setEmpresas(empresasData || [])

      const { data: usersData } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'analista')

      setAnalistas(usersData || [])

      const { data: sessoesData } = await supabase
        .from('sessoes_trabalho')
        .select('*')

      setSessoes(sessoesData || [])

      const { data: extratosData } = await supabase
        .from('extratos')
        .select('*')

      setExtratos(extratosData || [])
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatsGlobais = () => {
    const stats = {
      total: empresas.length,
      em_dia: 0,
      em_andamento: 0,
      pendente: 0,
      nao_iniciado: 0,
    }

    sessoes.forEach(sessao => {
      if (sessao.status === 'em_andamento') stats.em_andamento++
      if (sessao.status === 'concluido') stats.em_dia++
      if (sessao.status === 'pausado') stats.pendente++
      if (!sessao.status) stats.nao_iniciado++
    })

    return stats
  }

  const getRankingAnalistas = () => {
    const ranking = analistas.map(analista => {
      const sessoesDoanalistaa = sessoes.filter(s => s.user_id === analista.id)
      const concluidas = sessoesDoanalistaa.filter(s => s.status === 'concluido').length
      const total = sessoesDoanalistaa.length

      return {
        nome: analista.nome,
        email: analista.email,
        concluidas,
        total,
        percentual: total > 0 ? Math.round((concluidas / total) * 100) : 0
      }
    }).sort((a, b) => b.percentual - a.percentual)

    return ranking
  }

  const getEmpresasComProblemaExtratos = () => {
    const problemasMap = new Map()

    extratos.forEach(extrato => {
      const empresa = empresas.find(e => e.id === extrato.empresa_id)
      if (!empresa) return

      const numSolicitacoes = (extrato.solicitacoes || []).length

      if (extrato.status === 'atrasado' || numSolicitacoes >= 3) {
        if (!problemasMap.has(extrato.empresa_id)) {
          problemasMap.set(extrato.empresa_id, {
            empresa,
            extratos: []
          })
        }
        problemasMap.get(extrato.empresa_id).extratos.push({
          ...extrato,
          numSolicitacoes
        })
      }
    })

    return Array.from(problemasMap.values())
  }

  const stats = getStatsGlobais()
  const ranking = getRankingAnalistas()
  const empresasComProblema = getEmpresasComProblemaExtratos()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <p className="text-gray-600">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Painel do Coordenador</h1>
            <p className="text-sm text-gray-600 mt-1">{user.email}</p>
          </div>
          <button
            onClick={onLogout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition"
          >
            Sair
          </button>
        </div>
      </div>

      {/* Abas */}
      <div className="bg-white border-b sticky top-16 z-10">
        <div className="max-w-7xl mx-auto px-4 flex">
          <button
            onClick={() => setAbaSelecionada('dashboard')}
            className={`px-4 py-3 font-medium text-center border-b-2 transition ${
              abaSelecionada === 'dashboard'
                ? 'border-blue-600 text-blue-600'
                : 'border-gray-200 text-gray-600 hover:text-gray-800'
            }`}
          >
            📊 Dashboard
          </button>
          <button
            onClick={() => setAbaSelecionada('atividades')}
            className={`px-4 py-3 font-medium text-center border-b-2 transition ${
              abaSelecionada === 'atividades'
                ? 'border-blue-600 text-blue-600'
                : 'border-gray-200 text-gray-600 hover:text-gray-800'
            }`}
          >
            📡 Atividades
          </button>
          <button
            onClick={() => setAbaSelecionada('analistas')}
            className={`px-4 py-3 font-medium text-center border-b-2 transition ${
              abaSelecionada === 'analistas'
                ? 'border-blue-600 text-blue-600'
                : 'border-gray-200 text-gray-600 hover:text-gray-800'
            }`}
          >
            👥 Analistas
          </button>
          <button
            onClick={() => setAbaSelecionada('problemas')}
            className={`px-4 py-3 font-medium text-center border-b-2 transition ${
              abaSelecionada === 'problemas'
                ? 'border-blue-600 text-blue-600'
                : 'border-gray-200 text-gray-600 hover:text-gray-800'
            }`}
          >
            ⚠️ Problemas ({empresasComProblema.length})
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* ABA DASHBOARD */}
        {abaSelecionada === 'dashboard' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-500">
                <p className="text-gray-600 text-sm font-medium">Total de Empresas</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{stats.total}</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-500">
                <p className="text-gray-600 text-sm font-medium">Em Dia</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{stats.em_dia}</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-400">
                <p className="text-gray-600 text-sm font-medium">Em Andamento</p>
                <p className="text-3xl font-bold text-blue-400 mt-2">{stats.em_andamento}</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-yellow-500">
                <p className="text-gray-600 text-sm font-medium">Pendente</p>
                <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.pendente}</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-red-500">
                <p className="text-gray-600 text-sm font-medium">Não Iniciado</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{stats.nao_iniciado}</p>
              </div>
            </div>

            {/* Ranking de Analistas */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">🏆 Ranking de Analistas</h2>
              <div className="space-y-3">
                {ranking.map((analista, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                    <div>
                      <p className="font-medium text-gray-800">#{idx + 1} {analista.nome}</p>
                      <p className="text-xs text-gray-500">{analista.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-600">{analista.percentual}%</p>
                      <p className="text-xs text-gray-500">{analista.concluidas}/{analista.total}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ABA ATIVIDADES */}
        {abaSelecionada === 'atividades' && (
          <AtividadesFeed />
        )}

        {/* ABA ANALISTAS */}
        {abaSelecionada === 'analistas' && (
          <div className="space-y-4">
            {ranking.map((analista, idx) => {
              const sessoesDoanalistaa = sessoes.filter(s => s.user_id === 
                analistas.find(a => a.nome === analista.nome)?.id
              )
              const em_dia = sessoesDoanalistaa.filter(s => s.status === 'concluido').length
              const em_andamento = sessoesDoanalistaa.filter(s => s.status === 'em_andamento').length
              const pausado = sessoesDoanalistaa.filter(s => s.status === 'pausado').length

              return (
                <div key={idx} className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">#{idx + 1} {analista.nome}</h3>
                      <p className="text-sm text-gray-600">{analista.email}</p>
                    </div>
                    <span className="text-3xl font-bold text-blue-600">{analista.percentual}%</span>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                      <p className="text-gray-600 text-xs">Em Dia</p>
                      <p className="text-2xl font-bold text-green-600">{em_dia}</p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <p className="text-gray-600 text-xs">Em Andamento</p>
                      <p className="text-2xl font-bold text-blue-600">{em_andamento}</p>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                      <p className="text-gray-600 text-xs">Pausado</p>
                      <p className="text-2xl font-bold text-yellow-600">{pausado}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all duration-500"
                        style={{ width: `${analista.percentual}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ABA PROBLEMAS */}
        {abaSelecionada === 'problemas' && (
          <div className="space-y-4">
            {empresasComProblema.length === 0 ? (
              <div className="bg-white rounded-lg p-8 text-center">
                <p className="text-gray-600 text-lg">✅ Nenhuma empresa com problema de extratos!</p>
              </div>
            ) : (
              empresasComProblema.map((item, idx) => (
                <div key={idx} className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-red-500">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">⚠️ {item.empresa.nome}</h3>
                      <p className="text-sm text-gray-600">{item.empresa.email}</p>
                    </div>
                    <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium">
                      {item.extratos.length} extratos atrasados
                    </span>
                  </div>

                  <div className="space-y-3">
                    {item.extratos.map((extrato, eIdx) => (
                      <div key={eIdx} className="bg-red-50 p-3 rounded-lg border border-red-200">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-sm font-medium text-gray-800">{extrato.mes_ref}</p>
                            <p className="text-xs text-gray-600">De: {extrato.destinatario}</p>
                          </div>
                          <span className="bg-red-200 text-red-800 px-2 py-1 rounded text-xs font-medium">
                            {extrato.numSolicitacoes}x solicitado
                          </span>
                        </div>

                        {extrato.solicitacoes && extrato.solicitacoes.length > 0 && (
                          <div className="text-xs text-gray-600 mt-2 max-h-16 overflow-y-auto">
                            {extrato.solicitacoes.map((sol, sIdx) => (
                              <div key={sIdx} className="flex justify-between text-gray-600">
                                <span>#{sIdx + 1}</span>
                                <span>{new Date(sol.data).toLocaleDateString('pt-BR')}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
