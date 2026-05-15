import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import CompanyDetail from './CompanyDetail'
import AtividadesFeed from './AtividadesFeed'

export default function CoordenadorDashboard({ user }) {
  const [aba, setAba] = useState('dashboard')
  const [analistas, setAnalistas] = useState([])
  const [companies, setCompanies] = useState([])
  const [userCompanies, setUserCompanies] = useState([])
  const [extratos, setExtratos] = useState([])
  const [checklists, setChecklists] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroAnalista, setFiltroAnalista] = useState('todos')
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [novaEmpresa, setNovaEmpresa] = useState({ nome: '', cnpj: '', analista_id: '' })
  const [showReatribuirModal, setShowReatribuirModal] = useState(null)

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    try {
      setLoading(true)

      const { data: analistasData } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'analista')
        .order('nome')

      const { data: companiesData } = await supabase
        .from('empresas')
        .select('*')
        .order('nome')

      const { data: userCompaniesData } = await supabase
        .from('user_companies')
        .select('*')

      const { data: extratosData } = await supabase
        .from('extratos')
        .select('*')

      const { data: checklistsData } = await supabase
        .from('checklist_status')
        .select('*')

      setAnalistas(analistasData || [])
      setCompanies(companiesData || [])
      setUserCompanies(userCompaniesData || [])
      setExtratos(extratosData || [])
      setChecklists(checklistsData || [])
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao carregar dados: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const adicionarEmpresa = async () => {
    if (!novaEmpresa.nome.trim() || !novaEmpresa.analista_id) {
      alert('Preencha o nome da empresa e selecione o analista')
      return
    }

    try {
      const { data: empresaInserida, error: errEmpresa } = await supabase
        .from('empresas')
        .insert([{ 
          nome: novaEmpresa.nome, 
          cnpj: novaEmpresa.cnpj || '', 
          status: 'em_dia' 
        }])
        .select()
        .single()

      if (errEmpresa) throw errEmpresa

      await supabase
        .from('user_companies')
        .insert([{
          user_id: novaEmpresa.analista_id,
          empresa_id: empresaInserida.id,
        }])

      alert('Empresa adicionada com sucesso!')
      setShowAddModal(false)
      setNovaEmpresa({ nome: '', cnpj: '', analista_id: '' })
      fetchAllData()
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao adicionar empresa: ' + error.message)
    }
  }

  const reatribuirEmpresa = async (empresaId, novoAnalistaId) => {
    try {
      await supabase
        .from('user_companies')
        .delete()
        .eq('empresa_id', empresaId)

      await supabase
        .from('user_companies')
        .insert([{ user_id: novoAnalistaId, empresa_id: empresaId }])

      alert('Empresa reatribuída com sucesso!')
      setShowReatribuirModal(null)
      fetchAllData()
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao reatribuir empresa')
    }
  }

  const deletarEmpresa = async (empresaId, nomeEmpresa) => {
    if (!confirm(`Deletar empresa "${nomeEmpresa}"? Esta ação não pode ser desfeita.`)) return

    try {
      await supabase.from('checklist_status').delete().eq('empresa_id', empresaId)
      await supabase.from('extratos').delete().eq('empresa_id', empresaId)
      await supabase.from('user_companies').delete().eq('empresa_id', empresaId)
      await supabase.from('empresas').delete().eq('id', empresaId)

      alert('Empresa deletada!')
      fetchAllData()
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao deletar empresa')
    }
  }

  // Estatísticas globais
  const stats = {
    total_empresas: companies.length,
    em_dia: companies.filter(c => c.status === 'em_dia').length,
    pendente: companies.filter(c => c.status === 'pendente').length,
    atrasado: companies.filter(c => c.status === 'atrasado').length,
    extratos_pendentes: extratos.filter(e => e.status !== 'recebido').length,
  }

  // Estatísticas por analista
  const statsAnalistas = analistas.map(a => {
    const empresasDoAnalista = userCompanies
      .filter(uc => uc.user_id === a.id)
      .map(uc => uc.empresa_id)

    const companiesAnalista = companies.filter(c => empresasDoAnalista.includes(c.id))
    const extratosAnalista = extratos.filter(e => empresasDoAnalista.includes(e.empresa_id))
    const checklistsAnalista = checklists.filter(c => empresasDoAnalista.includes(c.empresa_id))

    const totalTarefas = 26 * empresasDoAnalista.length
    const concluidas = checklistsAnalista.filter(c => c.concluida).length

    return {
      ...a,
      total_empresas: companiesAnalista.length,
      em_dia: companiesAnalista.filter(c => c.status === 'em_dia').length,
      pendente: companiesAnalista.filter(c => c.status === 'pendente').length,
      atrasado: companiesAnalista.filter(c => c.status === 'atrasado').length,
      extratos_pendentes: extratosAnalista.filter(e => e.status !== 'recebido').length,
      progresso_geral: totalTarefas > 0 ? Math.round((concluidas / totalTarefas) * 100) : 0,
    }
  })

  // Empresas filtradas
  const empresasFiltradas = filtroAnalista === 'todos' 
    ? companies 
    : companies.filter(c => {
        const userCompany = userCompanies.find(uc => uc.empresa_id === c.id)
        return userCompany?.user_id === filtroAnalista
      })

  // Empresas com problema (3+ extratos não recebidos)
  const empresasProblema = companies.filter(c => {
    const extratosEmpresa = extratos.filter(e => e.empresa_id === c.id && e.status !== 'recebido')
    return extratosEmpresa.length >= 3
  })

  const getAnalistaName = (empresaId) => {
    const uc = userCompanies.find(uc => uc.empresa_id === empresaId)
    if (!uc) return 'Sem analista'
    const analista = analistas.find(a => a.id === uc.user_id)
    return analista?.nome || 'Não encontrado'
  }

  if (selectedCompany) {
    return (
      <CompanyDetail
        company={selectedCompany}
        onBack={() => setSelectedCompany(null)}
        user={user}
      />
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Carregando dados...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">👑 Painel do Coordenador</h1>
            <p className="text-purple-100">{user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg transition"
          >
            Sair
          </button>
        </div>
      </div>

      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 flex gap-8 overflow-x-auto">
          {[
            { key: 'dashboard', label: '📊 Dashboard' },
            { key: 'atividades', label: '📡 Atividades' },
            { key: 'analistas', label: '👥 Analistas' },
            { key: 'empresas', label: '🏢 Empresas' },
            { key: 'problemas', label: '⚠️ Problemas' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setAba(tab.key)}
              className={`py-4 px-1 font-medium border-b-2 transition whitespace-nowrap ${
                aba === tab.key
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* DASHBOARD GERAL */}
        {aba === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-purple-500">
                <p className="text-gray-600 text-sm font-medium">Total Empresas</p>
                <p className="text-3xl font-bold text-purple-600">{stats.total_empresas}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-500">
                <p className="text-gray-600 text-sm font-medium">Em Dia</p>
                <p className="text-3xl font-bold text-green-600">{stats.em_dia}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-yellow-500">
                <p className="text-gray-600 text-sm font-medium">Pendente</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.pendente}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-red-500">
                <p className="text-gray-600 text-sm font-medium">Atrasado</p>
                <p className="text-3xl font-bold text-red-600">{stats.atrasado}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-orange-500">
                <p className="text-gray-600 text-sm font-medium">Extratos Pendentes</p>
                <p className="text-3xl font-bold text-orange-600">{stats.extratos_pendentes}</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">🏆 Ranking de Analistas</h2>
              <div className="space-y-3">
                {statsAnalistas.length === 0 ? (
                  <p className="text-gray-600">Carregando analistas...</p>
                ) : (
                  statsAnalistas
                    .sort((a, b) => b.progresso_geral - a.progresso_geral)
                    .map((a, idx) => (
                      <div key={a.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                          idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : 'bg-orange-600'
                        }`}>
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800">{a.nome}</p>
                          <p className="text-sm text-gray-600">{a.total_empresas} empresas</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-purple-600">{a.progresso_geral}%</p>
                          <p className="text-xs text-gray-500">progresso geral</p>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ATIVIDADES AO VIVO */}
        {aba === 'atividades' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800">📡 Atividades em Tempo Real</h2>
            <p className="text-gray-600">Acompanhe em tempo real o que cada analista está fazendo</p>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <AtividadesFeed />
            </div>
          </div>
        )}

        {/* ANALISTAS */}
        {aba === 'analistas' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800">Performance dos Analistas</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {statsAnalistas.map(a => (
                <div key={a.id} className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold">
                      {a.nome[0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">{a.nome}</h3>
                      <p className="text-xs text-gray-500">{a.email}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total de Empresas:</span>
                      <span className="font-bold">{a.total_empresas}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600">✓ Em Dia:</span>
                      <span className="font-bold text-green-600">{a.em_dia}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-yellow-600">⏳ Pendente:</span>
                      <span className="font-bold text-yellow-600">{a.pendente}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-red-600">⚠️ Atrasado:</span>
                      <span className="font-bold text-red-600">{a.atrasado}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-orange-600">📧 Extratos Pendentes:</span>
                      <span className="font-bold text-orange-600">{a.extratos_pendentes}</span>
                    </div>

                    <div className="pt-3 border-t">
                      <p className="text-xs text-gray-600 mb-1">Progresso Geral</p>
                      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-purple-600 transition-all"
                          style={{ width: `${a.progresso_geral}%` }}
                        ></div>
                      </div>
                      <p className="text-right text-sm font-bold text-purple-600 mt-1">{a.progresso_geral}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EMPRESAS */}
        {aba === 'empresas' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <h2 className="text-xl font-bold text-gray-800">Empresas ({empresasFiltradas.length})</h2>
              <div className="flex gap-2 flex-wrap items-center">
                <select
                  value={filtroAnalista}
                  onChange={(e) => setFiltroAnalista(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="todos">Todos os Analistas</option>
                  {analistas.map(a => (
                    <option key={a.id} value={a.id}>{a.nome}</option>
                  ))}
                </select>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                >
                  + Nova Empresa
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="space-y-2">
                {empresasFiltradas.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">Nenhuma empresa encontrada</p>
                ) : (
                  empresasFiltradas.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => setSelectedCompany(c)}
                      >
                        <h3 className="font-semibold text-gray-800">{c.nome}</h3>
                        <p className="text-xs text-gray-500">Analista: {getAnalistaName(c.id)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          c.status === 'em_dia' ? 'bg-green-100 text-green-700' :
                          c.status === 'pendente' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {c.status === 'em_dia' ? '✓' : c.status === 'pendente' ? '⏳' : '⚠️'}
                        </span>
                        <button
                          onClick={() => setShowReatribuirModal(c)}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                        >
                          Reatribuir
                        </button>
                        <button
                          onClick={() => deletarEmpresa(c.id, c.nome)}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                        >
                          Deletar
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* PROBLEMAS */}
        {aba === 'problemas' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800">⚠️ Empresas com Problemas</h2>
            <p className="text-gray-600">Empresas que não enviaram extratos após 3+ solicitações</p>

            <div className="bg-white rounded-lg shadow-sm p-6">
              {empresasProblema.length === 0 ? (
                <p className="text-gray-600 text-center py-8">Nenhuma empresa com problema! 🎉</p>
              ) : (
                <div className="space-y-2">
                  {empresasProblema.map(c => {
                    const extratosEmpresa = extratos.filter(e => e.empresa_id === c.id && e.status !== 'recebido')
                    return (
                      <div key={c.id} className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                        <div 
                          className="flex-1 cursor-pointer"
                          onClick={() => setSelectedCompany(c)}
                        >
                          <h3 className="font-semibold text-gray-800">{c.nome}</h3>
                          <p className="text-xs text-gray-600">Analista: {getAnalistaName(c.id)}</p>
                          <p className="text-xs text-red-700 mt-1">
                            {extratosEmpresa.length} solicitações sem resposta
                          </p>
                        </div>
                        <span className="text-2xl">⚠️</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal Adicionar Empresa */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Adicionar Nova Empresa</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Nome da Empresa *</label>
                <input
                  type="text"
                  value={novaEmpresa.nome}
                  onChange={(e) => setNovaEmpresa({...novaEmpresa, nome: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Ex: Empresa XYZ LTDA"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">CNPJ (opcional)</label>
                <input
                  type="text"
                  value={novaEmpresa.cnpj}
                  onChange={(e) => setNovaEmpresa({...novaEmpresa, cnpj: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="00.000.000/0001-00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Atribuir ao Analista *</label>
                <select
                  value={novaEmpresa.analista_id}
                  onChange={(e) => setNovaEmpresa({...novaEmpresa, analista_id: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Selecione...</option>
                  {analistas.map(a => (
                    <option key={a.id} value={a.id}>{a.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setNovaEmpresa({ nome: '', cnpj: '', analista_id: '' })
                }}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={adicionarEmpresa}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Reatribuir */}
      {showReatribuirModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-2">Reatribuir Empresa</h3>
            <p className="text-sm text-gray-600 mb-4">{showReatribuirModal.nome}</p>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Analista atual: <strong>{getAnalistaName(showReatribuirModal.id)}</strong></p>
              <label className="block text-sm font-medium mb-1">Novo Analista</label>
              <select
                className="w-full px-3 py-2 border rounded-lg"
                onChange={(e) => {
                  if (e.target.value) {
                    reatribuirEmpresa(showReatribuirModal.id, e.target.value)
                  }
                }}
              >
                <option value="">Selecione...</option>
                {analistas.map(a => (
                  <option key={a.id} value={a.id}>{a.nome}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setShowReatribuirModal(null)}
              className="w-full px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
