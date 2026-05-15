import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function CompanyChecklist({ company, onBack, user, selectedCompetencia }) {
  const [checklists, setChecklists] = useState([])
  const [loading, setLoading] = useState(true)
  const [showChecklistModal, setShowChecklistModal] = useState(false)
  const [novaChecklist, setNovaChecklist] = useState({ categoria: '', tarefa: '' })

  const ordemCategorias = {
    'Conciliação Bancária': 1,
    'Aplicações': 2,
    'Clientes & Adiantamentos': 3,
    'Sócios': 4,
    'Fornecedores & Notas Fiscais': 5,
    'Impostos & Fiscal': 6,
    'Folha de Pagamento': 7,
    'Distribuição de Resultados': 8,
    'Outras Contas': 9,
  }

  useEffect(() => {
    fetchChecklist()
  }, [selectedCompetencia])

  const fetchChecklist = async () => {
    if (!selectedCompetencia) return

    try {
      setLoading(true)
      const mesRef = `${selectedCompetencia.mes}/${selectedCompetencia.ano}`

      const tarefasPadrao = [
        { categoria: 'Conciliação Bancária', tarefa: 'Conciliar saldo bancário' },
        { categoria: 'Conciliação Bancária', tarefa: 'Analisar diferenças' },
        { categoria: 'Conciliação Bancária', tarefa: 'Resolver pendências' },
        { categoria: 'Aplicações', tarefa: 'Analisar aplicações financeiras' },
        { categoria: 'Clientes & Adiantamentos', tarefa: 'Analisar contas a receber' },
        { categoria: 'Clientes & Adiantamentos', tarefa: 'Verificar adiantamentos' },
        { categoria: 'Sócios', tarefa: 'Verificar contas de sócios' },
        { categoria: 'Sócios', tarefa: 'Analisar pró-labore' },
        { categoria: 'Fornecedores & Notas Fiscais', tarefa: 'Conciliar notas fiscais' },
        { categoria: 'Fornecedores & Notas Fiscais', tarefa: 'Verificar contas a pagar' },
        { categoria: 'Impostos & Fiscal', tarefa: 'Calcular IRPJ' },
        { categoria: 'Impostos & Fiscal', tarefa: 'Calcular CSLL' },
        { categoria: 'Impostos & Fiscal', tarefa: 'Apurar PIS/COFINS' },
        { categoria: 'Folha de Pagamento', tarefa: 'Verificar salários' },
        { categoria: 'Folha de Pagamento', tarefa: 'Calcular FGTS' },
        { categoria: 'Folha de Pagamento', tarefa: 'Apurar INSS' },
        { categoria: 'Folha de Pagamento', tarefa: 'Verificar descontos' },
        { categoria: 'Folha de Pagamento', tarefa: 'Validar contribuições' },
        { categoria: 'Folha de Pagamento', tarefa: 'Processar rescisões' },
        { categoria: 'Folha de Pagamento', tarefa: 'Fechar folha mensal' },
        { categoria: 'Distribuição de Resultados', tarefa: 'Calcular lucro/prejuízo' },
        { categoria: 'Distribuição de Resultados', tarefa: 'Preparar distribuição' },
        { categoria: 'Outras Contas', tarefa: 'Analisar estoques' },
        { categoria: 'Outras Contas', tarefa: 'Verificar ativo imobilizado' },
        { categoria: 'Outras Contas', tarefa: 'Analisar intangíveis' },
        { categoria: 'Outras Contas', tarefa: 'Verificar provisões' },
      ]

      const { data: existentes } = await supabase
        .from('checklist_status')
        .select('id')
        .eq('empresa_id', company.id)
        .eq('mes', mesRef)
        .limit(1)

      if (!existentes || existentes.length === 0) {
        const tarefasAInserir = tarefasPadrao.map(t => ({
          empresa_id: company.id,
          categoria: t.categoria,
          tarefa: t.tarefa,
          concluida: false,
          mes: mesRef,
        }))

        await supabase.from('checklist_status').insert(tarefasAInserir)
      }

      const { data: checklistData } = await supabase
        .from('checklist_status')
        .select('*')
        .eq('empresa_id', company.id)
        .eq('mes', mesRef)
        .order('categoria')

      setChecklists(checklistData || [])
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleChecklist = async (checklistId, concluida) => {
    try {
      await supabase
        .from('checklist_status')
        .update({ concluida: !concluida })
        .eq('id', checklistId)

      fetchChecklist()
    } catch (error) {
      console.error('Erro:', error)
    }
  }

  const adicionarChecklist = async () => {
    if (!selectedCompetencia || !novaChecklist.categoria || !novaChecklist.tarefa) {
      alert('Preencha categoria e tarefa')
      return
    }

    try {
      const mesRef = `${selectedCompetencia.mes}/${selectedCompetencia.ano}`

      await supabase.from('checklist_status').insert([{
        empresa_id: company.id,
        categoria: novaChecklist.categoria,
        tarefa: novaChecklist.tarefa,
        concluida: false,
        mes: mesRef,
      }])

      setShowChecklistModal(false)
      setNovaChecklist({ categoria: '', tarefa: '' })
      fetchChecklist()
    } catch (error) {
      console.error('Erro:', error)
    }
  }

  const deletarTarefa = async (checklistId) => {
    if (!confirm('Remover esta tarefa?')) return

    try {
      await supabase
        .from('checklist_status')
        .delete()
        .eq('id', checklistId)

      fetchChecklist()
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao remover tarefa')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <p className="text-gray-600">Carregando...</p>
      </div>
    )
  }

  const totalTarefas = checklists.length
  const tarefasConcluidas = checklists.filter(c => c.concluida).length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button
            onClick={onBack}
            className="text-blue-600 hover:text-blue-800 mb-2 block"
          >
            ← Voltar
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Checklist - {company.nome}</h1>
          <p className="text-sm text-gray-600 mt-1">Mês: {selectedCompetencia.mes}/{selectedCompetencia.ano}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">
              Checklist ({tarefasConcluidas}/{totalTarefas})
            </h2>
            <button
              onClick={() => setShowChecklistModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
            >
              + Adicionar Tarefa
            </button>
          </div>

          <div className="space-y-4">
            {checklists.length === 0 ? (
              <p className="text-gray-600 text-center py-4">Sem tarefas</p>
            ) : (
              Object.entries(
                checklists.reduce((acc, cl) => {
                  if (!acc[cl.categoria]) {
                    acc[cl.categoria] = []
                  }
                  acc[cl.categoria].push(cl)
                  return acc
                }, {})
              )
                .sort(([catA], [catB]) => {
                  const ordemA = ordemCategorias[catA] || 999
                  const ordemB = ordemCategorias[catB] || 999
                  return ordemA - ordemB
                })
                .map(([categoria, tarefas]) => {
                  const tarefasConcluidasCategoria = tarefas.filter(t => t.concluida).length
                  const totalTarefasCategoria = tarefas.length

                  return (
                    <div key={categoria} className="border rounded-lg overflow-hidden">
                      <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-4 py-3 border-b">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-gray-800">{categoria}</h3>
                          <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full">
                            {tarefasConcluidasCategoria}/{totalTarefasCategoria}
                          </span>
                        </div>
                      </div>

                      <div className="divide-y">
                        {tarefas.map(cl => (
                          <div
                            key={cl.id}
                            className={`flex items-center gap-3 p-3 transition ${
                              cl.concluida
                                ? 'bg-green-50'
                                : 'bg-white hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={cl.concluida}
                              onChange={() => toggleChecklist(cl.id, cl.concluida)}
                              className="w-5 h-5 cursor-pointer flex-shrink-0"
                            />
                            <div className="flex-1">
                              <p className={`${
                                cl.concluida 
                                  ? 'line-through text-gray-500' 
                                  : 'text-gray-800'
                              }`}>
                                {cl.tarefa}
                              </p>
                            </div>
                            {cl.concluida && (
                              <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium flex-shrink-0">
                                ✅
                              </span>
                            )}
                            <button
                              onClick={() => deletarTarefa(cl.id)}
                              className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 flex-shrink-0"
                            >
                              Remover
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })
            )}
          </div>
        </div>
      </div>

      {/* Modal Adicionar Tarefa */}
      {showChecklistModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Adicionar Tarefa</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Categoria"
                value={novaChecklist.categoria}
                onChange={(e) => setNovaChecklist({...novaChecklist, categoria: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
              />
              <input
                type="text"
                placeholder="Descrição da tarefa"
                value={novaChecklist.tarefa}
                onChange={(e) => setNovaChecklist({...novaChecklist, tarefa: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowChecklistModal(false)}
                className="flex-1 px-4 py-2 border rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={adicionarChecklist}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
