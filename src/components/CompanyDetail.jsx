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

  useEffect(() => {
    fetchData()
  }, [company.id])

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
          const found = checklistData?.find(c => c.categoria === cat && c.tarefa === tarefa)
          organized[cat][tarefa] = found ? found.concluida : false
        })
      })
      setChecklists(organized)

      const { data: extratosData } = await supabase
        .from('extratos')
        .select('*')
        .eq('empresa_id', company.id)
        .order('mes_ref', { ascending: false })

      setExtratos(extratosData || [])
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleTarefa = async (categoria, tarefa) => {
    const novoStatus = !checklists[categoria][tarefa]

    try {
      const { data: existing } = await supabase
        .from('checklist_status')
        .select('id')
        .eq('empresa_id', company.id)
        .eq('categoria', categoria)
        .eq('tarefa', tarefa)
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
    const mes = new Date()
    const mesRef = `${String(mes.getMonth() + 1).padStart(2, '0')}/${mes.getFullYear()}`

    try {
      await supabase
        .from('extratos')
        .insert([{
          empresa_id: company.id,
          mes_ref: mesRef,
          status: 'solicitado',
        }])

      fetchData()
    } catch (error) {
      console.error('Erro:', error)
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
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600 mb-1">Progresso</p>
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
            📄 Extratos
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <p className="text-gray-600">Carregando...</p>
        ) : aba === 'checklist' ? (
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
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-6 pb-4 border-b">
              <h3 className="text-lg font-bold text-gray-800">Controle de Extratos</h3>
              <button
                onClick={adicionarExtrato}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
              >
                + Solicitar Novo
              </button>
            </div>

            <div className="space-y-3">
              {extratos.length === 0 ? (
                <p className="text-gray-600 text-center py-8">Nenhum extrato solicitado</p>
              ) : (
                extratos.map(extrato => (
                  <div key={extrato.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-4 flex-1">
                      <span className="text-2xl">
                        {extrato.status === 'recebido' && '✅'}
                        {extrato.status === 'pendente' && '⏳'}
                        {extrato.status === 'atrasado' && '⚠️'}
                        {extrato.status === 'solicitado' && '📧'}
                      </span>
                      <p className="font-semibold text-gray-800">{extrato.mes_ref}</p>
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
        )}
      </div>
    </div>
  )
}
