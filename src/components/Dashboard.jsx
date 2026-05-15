import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import CompanyDetail from './CompanyDetail'

export default function Dashboard({ user, onLogout }) {
  const [empresas, setEmpresas] = useState([])
  const [empresaSelecionada, setEmpresaSelecionada] = useState(null)
  const [filtroStatus, setFiltroStatus] = useState('todas')
  const [loading, setLoading] = useState(true)
  const [statusEmpresa, setStatusEmpresa] = useState({})

  useEffect(() => {
    fetchEmpresas()
  }, [])

  const fetchEmpresas = async () => {
    try {
      setLoading(true)

      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('email', user.email)
        .single()

      if (!userData) {
        console.error('Usuário não encontrado')
        return
      }

      const { data: userCompaniesData } = await supabase
        .from('user_companies')
        .select('empresa_id')
        .eq('user_id', userData.id)

      const empresaIds = userCompaniesData?.map(uc => uc.empresa_id) || []

      if (empresaIds.length === 0) {
        setEmpresas([])
        return
      }

      const { data: empresasData } = await supabase
        .from('empresas')
        .select('*')
        .in('id', empresaIds)

      setEmpresas(empresasData || [])
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusEmpresa = (empresa) => {
    return statusEmpresa[empresa.id] || empresa.status || 'pendente'
  }

  const empresasFiltradas = empresas.filter(empresa => {
    const status = getStatusEmpresa(empresa)
    if (filtroStatus === 'todas') return true
    return status === filtroStatus
  })

  const stats = {
    total: empresas.length,
    em_dia: empresas.filter(e => getStatusEmpresa(e) === 'em_dia').length,
    em_andamento: empresas.filter(e => getStatusEmpresa(e) === 'em_andamento').length,
    nao_iniciado: empresas.filter(e => getStatusEmpresa(e) === 'nao_iniciado').length,
    pendente: empresas.filter(e => getStatusEmpresa(e) === 'pendente').length,
  }

  if (empresaSelecionada) {
    return (
      <CompanyDetail
        company={empresaSelecionada}
        onBack={() => setEmpresaSelecionada(null)}
        user={user}
      />
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <p className="text-gray-600">Carregando empresas...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Minhas Empresas ({stats.total})</h1>
            <p className="text-sm text-gray-600 mt-1">Usuário: {user.email}</p>
          </div>
          <button
            onClick={onLogout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition"
          >
            Sair
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-500">
            <p className="text-gray-600 text-sm font-medium">Total</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{stats.total}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-500">
            <p className="text-gray-600 text-sm font-medium">Em Dia</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{stats.em_dia}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-400">
            <p className="text-gray-600 text-sm font-medium">Em Andamento</p>
            <p className="text-2xl font-bold text-blue-400 mt-1">{stats.em_andamento}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-yellow-500">
            <p className="text-gray-600 text-sm font-medium">Pendente</p>
            <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pendente}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-red-500">
            <p className="text-gray-600 text-sm font-medium">Não Iniciado</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{stats.nao_iniciado}</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex gap-2 flex-wrap">
          <button
            onClick={() => setFiltroStatus('todas')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
              filtroStatus === 'todas'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setFiltroStatus('em_dia')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
              filtroStatus === 'em_dia'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            ✓ Em Dia
          </button>
          <button
            onClick={() => setFiltroStatus('em_andamento')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
              filtroStatus === 'em_andamento'
                ? 'bg-blue-400 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            ▶️ Em Andamento
          </button>
          <button
            onClick={() => setFiltroStatus('pendente')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
              filtroStatus === 'pendente'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            ⏸️ Pendente
          </button>
          <button
            onClick={() => setFiltroStatus('nao_iniciado')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
              filtroStatus === 'nao_iniciado'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            ⭕ Não Iniciado
          </button>
        </div>

        {/* Lista de Empresas */}
        <div className="space-y-3">
          {empresasFiltradas.length === 0 ? (
            <div className="bg-white rounded-lg p-8 text-center">
              <p className="text-gray-600">Nenhuma empresa encontrada com este filtro</p>
            </div>
          ) : (
            empresasFiltradas.map(empresa => {
              const status = getStatusEmpresa(empresa)
              const getStatusColor = (s) => {
                if (s === 'em_dia') return 'bg-green-100 text-green-700 border-green-300'
                if (s === 'em_andamento') return 'bg-blue-100 text-blue-700 border-blue-300'
                if (s === 'nao_iniciado') return 'bg-red-100 text-red-700 border-red-300'
                return 'bg-yellow-100 text-yellow-700 border-yellow-300'
              }

              const getStatusLabel = (s) => {
                if (s === 'em_dia') return '✓ Em Dia'
                if (s === 'em_andamento') return '▶️ Em Andamento'
                if (s === 'nao_iniciado') return '⭕ Não Iniciado'
                return '⏸️ Pendente'
              }

              return (
                <div
                  key={empresa.id}
                  className="w-full p-4 bg-white rounded-lg border hover:border-blue-400 transition flex justify-between items-center"
                >
                  <button
                    onClick={() => setEmpresaSelecionada(empresa)}
                    className="flex-1 text-left"
                  >
                    <span className="font-medium text-gray-800">{empresa.nome}</span>
                  </button>
                  <select
                    onClick={(e) => e.stopPropagation()}
                    value={status}
                    onChange={(e) => {
                      const novoStatus = e.target.value
                      setStatusEmpresa({...statusEmpresa, [empresa.id]: novoStatus})
                    }}
                    className={`px-3 py-1 rounded text-xs font-medium border-2 cursor-pointer ml-2 flex-shrink-0 ${
                      getStatusColor(status)
                    }`}
                  >
                    <option value="nao_iniciado">⭕ Não iniciado</option>
                    <option value="em_andamento">▶️ Em Andamento</option>
                    <option value="pendente">⏸️ Pendente</option>
                    <option value="em_dia">✓ Em Dia</option>
                  </select>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
