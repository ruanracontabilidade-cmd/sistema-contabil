import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const CATEGORIAS = [
  'Conciliação Bancária',
  'Clientes & Adiantamentos',
  'Sócios',
  'Distribuição de Resultados',
  'Aplicações',
  'Fornecedores & Notas Fiscais',
  'Impostos & Fiscal',
  'Folha de Pagamento',
  'Outras Contas',
]

const TAREFAS = {
  'Conciliação Bancária': [
    'Importar extratos bancários',
    'Conciliar contas bancárias',
    'Verificar Caixa',
  ],
  'Clientes & Adiantamentos': [
    'Conciliar Clientes',
    'Verificar adiantamento de clientes',
  ],
  'Sócios': [
    'Conciliar Adiat. de Sócios',
    'Conciliar Empr. de Sócios',
  ],
  'Distribuição de Resultados': [
    'Pagar Pró-Labore',
    'Distribuição de lucros acumulados',
  ],
  'Aplicações': [
    'Conferir/Conciliar aplicações',
  ],
  'Fornecedores & Notas Fiscais': [
    'Importar notas de FOR (SIEG/Portal Barreiras)',
    'Conciliar Fornecedores',
  ],
  'Impostos & Fiscal': [
    'Integração Fiscal',
    'Conciliar impostos a REC. (portal e-CAC)',
    'Conferir pagamentos ISS/TFF/VISA (portal GPI)',
  ],
  'Folha de Pagamento': [
    'Integração Folha',
    'Salários a pagar',
    'Rescisões',
    'Férias',
    'INSS',
    'FGTS',
    '13° Salário',
  ],
  'Outras Contas': [
    'Conciliar honorários contábeis',
    'Conciliar CREMEB',
    'Concilia TFF',
    'Verificar conta de DESPESAS DIVERSAS',
  ],
}

export default function CompanyDetail({ company, onBack, user }) {
  const [aba, setAba] = useState('checklist')
  const [checklists, setChecklists] = useState({})
  const [extratos, setExtratos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModalExtrato, setShowModalExtrato] = useState(false)
  const [destinatario, setDestinatario] = useState('')
  const [competencias, setCompetencias] = useState([])
  const [mesChecklistSelecionado, setMesChecklistSelecionado] = useState('')
  const [mesExtratoSelecionado, setMesExtratoSelecionado] = useState('')

  useEffect(() => {
    fetchCompetencias()
    fetchData()
  }, [company.id])

  const fetchCompetencias = async () => {
    try {
      const { data } = await supabase
        .from('competencias')
        .select('mes')
        .order('mes', { ascending: false })

      if (data && data.length > 0) {
        setCompetencias(data.map(c => c.mes))
        setMesChecklistSelecionado(data[0].mes)
        setMesExtratoSelecionado(data[0].mes)
      }
    } catch (error) {
      console.error('Erro ao carregar competências:', error)
    }
  }

  const fetchData = async () => {
    try {
      setLoading(true)

      const { data: checklistData } = await supabase
        .from('checklist_status')
        .select('*')
        .eq('empresa_id', company.id)

      const organized = {}
      CATEGORIAS.forEach(cat => {
        organized[cat] = {}
        TAREFAS[cat].forEach(tarefa => {
          const found = checklistData?.find(
            c => c.categoria === cat && c.tarefa === tarefa && c.mes === mesChecklistSelecionado
          )
          organized[cat][tarefa] = found ? found.concluida : false
        })
      })
      setChecklists(organized)

      const { data: extratosData } = await supabase
        .from('extratos')
        .select('*')
        .eq('empresa_id', company.id)
        .order('created_at', { ascending: false })

      setExtratos(extratosData || [])
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }

  // Recarregar checklist quando mudar mês
  useEffect(() => {
    if (mesChecklistSelecionado) {
      fetchData()
    }
  }, [mesChecklistSelecionado])

  const toggleTarefa = async (categoria, tarefa) => {
    const novoStatus = !checklists[categoria][tarefa]

    try {
      const { data: existing } = await supabase
        .from('checklist_status')
        .select('id')
        .eq('empresa_id', company.id)
        .eq('categoria', categoria)
        .eq('tarefa', tarefa)
        .eq('mes', mesChecklistSelecionado)
        .single()

      if (existing) {
        await supabase
          .from('checklist_status')
          .update({ concluida: novoStatus })
          .eq('id', existing.id)
      } else {
        await supabase
          .from('checklist_status')
          .insert([{
            empresa_id: company.id,
            categoria,
            tarefa,
            concluida: novoStatus,
            mes: mesChecklistSelecionado,
          }])
      }

      setChecklists(prev => ({
        ...prev,
        [categoria]: {
          ...prev[categoria],
          [tarefa]: novoStatus,
        },
      }))
    } catch (error) {
      console.error('Erro:', error)
    }
  }

  const adicionarExtrato = async () => {
    if (!destinatario.trim()) {
      alert('Por favor, preencha para quem foi solicitado')
      return
    }

    try {
      await supabase
        .from('extratos')
        .insert([{
          empresa_id: company.id,
          mes_ref: mesExtratoSelecionado,
          status: 'solicitado',
          destinatario: destinatario,
        }])

      setDestinatario('')
      setShowModalExtrato(false)
      fetchData()
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao solicitar extrato')
    }
  }

  const atualizarStatusExtrato = async (id, novoStatus) => {
    try {
      await supabase
        .from('extratos')
        .update({ status: novoStatus })
        .eq('id', id)

      fetchData()
    } catch (error) {
      console.error('Erro:', error)
    }
  }

  const calcularProgresso = () => {
    let total = 0
    let concluidas = 0

    Object.values(checklists).forEach(categoria => {
      Object.values(categoria).forEach(status => {
        total++
        if (status) concluidas++
      })
    })

    return total > 0 ? Math.round((concluidas / total) * 100) : 0
  }

  // Contar solicitações pendentes do mês selecionado
  const solicitacoesPendentes = extratos.filter(
    e => e.mes_ref === mesExtratoSelecionado && e.status !== 'recebido'
  ).length
  const temProblema = solicitacoesPendentes >= 3

  // Extratos do mês selecionado
  const extratosMes = extratos.filter(e => e.mes_ref === mesExtratoSelecionado)

  const progresso = calcularProgresso()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <button
              onClick={onBack}
              className="text-blue-600 hover:text-blue-800 font-medium text-sm mb-2"
            >
              ← Voltar
            </button>
            <h1 className="text-2xl font-bold text-gray-800">{company.nome}</h1>
            <p className="text-gray-600 text-sm">{company.cnpj}</p>
            {temProblema && (
              <div className="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium inline-block">
                ⚠️ Cliente não manda extratos
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600 mb-1">Progresso ({mesChecklistSelecionado})</p>
            <div className="w-32 h-8 bg-gray-200 rounded-full flex items-center justify-center relative overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full bg-blue-500 transition-all"
                style={{ width: `${progresso}%` }}
              ></div>
              <span className="relative text-xs font-bold text-gray-800">{progresso}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 flex gap-8">
          <button
            onClick={() => setAba('checklist')}
            className={`py-4 px-1 font-medium border-b-2 transition ${
              aba === 'checklist'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            ✓ Checklist
          </button>
          <button
            onClick={() => setAba('extratos')}
            className={`py-4 px-1 font-medium border-b-2 transition ${
              aba === 'extratos'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            📄 Extratos ({solicitacoesPendentes})
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <p className="text-gray-600">Carregando...</p>
        ) : aba === 'checklist' ? (
          <div>
            {/* Seletor de Mês/Competência */}
            <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selecione a Competência (Mês)
              </label>
              <select
                value={mesChecklistSelecionado}
                onChange={(e) => setMesChecklistSelecionado(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {competencias.map(mes => (
                  <option key={mes} value={mes}>
                    {mes}
                  </option>
                ))}
              </select>
            </div>

            {/* Checklist */}
            <div className="space-y-6">
              {CATEGORIAS.map(categoria => {
                const tarefas = TAREFAS[categoria]
                const concluidas = tarefas.filter(t => checklists[categoria]?.[t]).length

                return (
                  <div key={categoria} className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex justify-between items-center mb-4 pb-3 border-b">
                      <h3 className="text-lg font-bold text-gray-800">{categoria}</h3>
                      <span className="text-sm font-medium text-gray-600">
                        {concluidas}/{tarefas.length}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {tarefas.map(tarefa => {
                        const marcada = checklists[categoria]?.[tarefa] || false
                        return (
                          <div
                            key={tarefa}
                            onClick={() => toggleTarefa(categoria, tarefa)}
                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${
                              marcada
                                ? 'bg-green-50 border border-green-200'
                                : 'bg-gray-50 border border-gray-200 hover:border-blue-300'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                              marcada
                                ? 'bg-green-500 border-green-500'
                                : 'border-gray-300'
                            }`}>
                              {marcada && <span className="text-white text-sm">✓</span>}
                            </div>
                            <span className={`transition ${marcada ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                              {tarefa}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div>
            {/* Seletor de Mês para Extratos */}
            <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
              <div className="flex justify-between items-end gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selecione a Competência (Mês)
                  </label>
                  <select
                    value={mesExtratoSelecionado}
                    onChange={(e) => setMesExtratoSelecionado(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {competencias.map(mes => (
                      <option key={mes} value={mes}>
                        {mes}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => setShowModalExtrato(true)}
                  className={`px-4 py-2 rounded-lg transition text-white font-medium ${
                    temProblema
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  + Solicitar
                </button>
              </div>
            </div>

            {/* Modal */}
            {showModalExtrato && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-md">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">
                    Solicitar Extrato - {mesExtratoSelecionado}
                  </h3>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Para quem foi solicitado?
                    </label>
                    <input
                      type="text"
                      value={destinatario}
                      onChange={(e) => setDestinatario(e.target.value)}
                      placeholder="Ex: João (Gerente), Maria (Contato)"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowModalExtrato(false)
                        setDestinatario('')
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={adicionarExtrato}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Solicitar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Lista de Extratos */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                Extratos - {mesExtratoSelecionado}
              </h3>

              <div className="space-y-3">
                {extratosMes.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">
                    Nenhum extrato solicitado para este mês
                  </p>
                ) : (
                  extratosMes.map(extrato => (
                    <div 
                      key={extrato.id} 
                      className={`flex items-center justify-between p-4 rounded-lg border transition ${
                        extrato.status === 'recebido'
                          ? 'bg-green-50 border-green-200'
                          : extrato.status === 'atrasado'
                          ? 'bg-red-50 border-red-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <span className="text-2xl">
                          {extrato.status === 'recebido' && '✅'}
                          {extrato.status === 'pendente' && '⏳'}
                          {extrato.status === 'atrasado' && '⚠️'}
                          {extrato.status === 'solicitado' && '📧'}
                        </span>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800">
                            Solicitado para: {extrato.destinatario || 'Não informado'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {extrato.created_at && new Date(extrato.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>

                      <select
                        value={extrato.status}
                        onChange={(e) => atualizarStatusExtrato(extrato.id, e.target.value)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium border ${
                          extrato.status === 'recebido'
                            ? 'bg-green-100 text-green-700 border-green-300'
                            : extrato.status === 'pendente'
                            ? 'bg-yellow-100 text-yellow-700 border-yellow-300'
                            : extrato.status === 'atrasado'
                            ? 'bg-red-100 text-red-700 border-red-300'
                            : 'bg-blue-100 text-blue-700 border-blue-300'
                        }`}
                      >
                        <option value="solicitado">Solicitado</option>
                        <option value="pendente">Pendente</option>
                        <option value="atrasado">Atrasado</option>
                        <option value="recebido">Recebido</option>
                      </select>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
