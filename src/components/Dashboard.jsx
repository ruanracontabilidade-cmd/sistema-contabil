import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import CompanyDetail from './CompanyDetail'

export default function Dashboard({ user }) {
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [filter, setFilter] = useState('todas')

  useEffect(() => {
    fetchCompanies()
  }, [user.id])

  const fetchCompanies = async () => {
    try {
      setLoading(true)
      
      // Buscar empresas do usuário logado
      const { data, error } = await supabase
        .from('user_companies')
        .select('empresa_id')
        .eq('user_id', user.id)

      if (error) throw error

      const empresaIds = data.map(uc => uc.empresa_id)

      if (empresaIds.length === 0) {
        setCompanies([])
        return
      }

      // Buscar detalhes das empresas
      const { data: empresasData, error: empresasError } = await supabase
        .from('empresas')
        .select('*')
        .in('id', empresaIds)
        .order('nome', { ascending: true })

      if (empresasError) throw empresasError
      setCompanies(empresasData || [])
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao carregar empresas: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const filteredCompanies = companies.filter(c => {
    if (filter === 'todas') return true
    return c.status === filter
  })

  const stats = {
    em_dia: companies.filter(c => c.status === 'em_dia').length,
    pendente: companies.filter(c => c.status === 'pendente').length,
    atrasado: companies.filter(c => c.status === 'atrasado').length,
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
            <p className="text-gray-600">{user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg transition"
          >
            Sair
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">Minhas Empresas ({filteredCompanies.length})</h2>
            <div className="flex gap-2 flex-wrap">
              {['todas', 'em_dia', 'pendente', 'atrasado'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                    filter === f
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {f === 'todas' ? 'Todas' : f === 'em_dia' ? '✓ Em Dia' : f === 'pendente' ? '⏳ Pendente' : '⚠️ Atrasado'}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <p className="text-gray-600">Carregando empresas...</p>
          ) : filteredCompanies.length === 0 ? (
            <p className="text-gray-600 text-center py-8">Nenhuma empresa encontrada</p>
          ) : (
            <div className="space-y-2">
              {filteredCompanies.map(company => (
                <div
                  key={company.id}
                  onClick={() => setSelectedCompany(company)}
                  className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 cursor-pointer transition"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{company.nome}</h3>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    company.status === 'em_dia'
                      ? 'bg-green-100 text-green-700'
                      : company.status === 'pendente'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {company.status === 'em_dia' ? '✓ Em Dia' : company.status === 'pendente' ? '⏳ Pendente' : '⚠️ Atrasado'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
