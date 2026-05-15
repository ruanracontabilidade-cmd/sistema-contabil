import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function CompanyDetail({ company, onBack, user }) {
  const [competencias, setCompetencias] = useState([])
  const [selectedCompetencia, setSelectedCompetencia] = useState(null)
  const [checklists, setChecklists] = useState([])
  const [extratos, setExtratos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showChecklistModal, setShowChecklistModal] = useState(false)
  const [novaChecklist, setNovaChecklist] = useState({ categoria: '', tarefa: '' })
  const [showModalExtrato, setShowModalExtrato] = useState(false)
  const [destinatario, setDestinatario] = useState('')
  const [sessaoTrabalho, setSessaoTrabalho] = useState(null)
  const [showPausarModal, setShowPausarModal] = useState(false)
  const [observacaoPausa, setObservacaoPausa] = useState('')

  useEffect(() => {
    fetchAllData()
  }, [company.id, selectedCompetencia])

  const fetchAllData = async () => {
    try {
      setLoading(true)

      const { data: competenciasData } = await supabase
        .from('competencias')
        .select('*')
        .order('ano', { ascending: false })
        .order('mes', { ascending: false })

      setCompetencias(competenciasData || [])

      if (competenciasData?.length > 0 && !selectedCompetencia) {
        setSelectedCompetencia(competenciasData[0])
      }

      if (selectedCompetencia) {
        const mesRef = `${selectedCompetencia.mes}/${selectedCompetencia.ano}`

        const { data: checklistData } = await supabase
          .from('checklist_status')
          .select('*')
          .eq('empresa_id', company.id)
          .eq('mes', mesRef)

        const { data: extratosData } = await supabase
          .from('extratos')
          .select('*')
          .eq('empresa_id', company.id)
          .eq('mes_ref', mesRef)

        // Buscar sessão de trabalho
        const { data: sessaoData } = await supabase
          .from('sessoes_trabalho')
          .select('*')
          .eq('empresa_id', company.id)
          .eq('user_id', user.id)
          .eq('mes', mesRef)
          .single()

        setChecklists(checklistData || [])
        setExtratos(extratosData || [])
        setSessaoTrabalho(sessaoData || null)
      }
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }

  const iniciarTrabalho = async () => {
    if (!selectedCompetencia) return

    try {
      const mesRef = `${selectedCompetencia.mes}/${selectedCompetencia.ano}`

      const { error } = await supabase
        .from('sessoes_trabalho')
        .upsert([{
          empresa_id: company.id,
          user_id: user.id,
          mes: mesRef,
          status: 'em_andamento',
          iniciado_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString(),
        }])

      if (error) throw error

      // Registrar atividade
      await supabase.from('atividades_log').insert([{
        empresa_id: company.id,
        user_id: user.id,
        mes: mesRef,
        acao: 'INICIOU',
        detalhe: `Iniciou trabalho em ${company.nome}`,
      }])

      alert('Trabalho iniciado!')
      fetchAllData()
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao iniciar: ' + error.message)
    }
  }

  const pausarTrabalho = async () => {
    if (!observacaoPausa.trim()) {
      alert('Por favor, descreva o motivo da pausa')
      return
    }

    if (!selectedCompetencia) return

    try {
      const mesRef = `${selectedCompetencia.mes}/${selectedCompetencia.ano}`

      const { error } = await supabase
        .from('sessoes_trabalho')
        .update({
          status: 'pausado',
          pausado_em: new Date().toISOString(),
          observacao: observacaoPausa,
          atualizado_em: new Date().toISOString(),
        })
        .eq('empresa_id', company.id)
        .eq('user_id', user.id)
        .eq('mes', mesRef)

      if (error) throw error

      // Registrar atividade
      await supabase.from('atividades_log').insert([{
        empresa_id: company.id,
        user_id: user.id,
        mes: mesRef,
        acao: 'PAUSOU',
        detalhe: `Motivo: ${observacaoPausa}`,
      }])

      alert('Trabalho pausado!')
      setShowPausarModal(false)
      setObservacaoPausa('')
      fetchAllData()
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao pausar: ' + error.message)
    }
  }

  const concluirMes = async () => {
    if (!selectedCompetencia) return

    try {
      const mesRef = `${selectedCompetencia.mes}/${selectedCompetencia.ano}`

      const { error } = await supabase
        .from('sessoes_trabalho')
        .update({
          status: 'concluido',
          concluido_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString(),
        })
        .eq('empresa_id', company.id)
        .eq('user_id', user.id)
        .eq('mes', mesRef)

      if (error) throw error

      // Registrar atividade
      await supabase.from('atividades_log').insert([{
        empresa_id: company.id,
        user_id: user.id,
        mes: mesRef,
        acao: 'CONCLUIU',
        detalhe: `Finalizou ${company.nome} em ${mesRef}`,
      }])

      alert('Mês concluído!')
      fetchAllData()
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao concluir: ' + error.message)
    }
  }

  const toggleChecklist = async (checklistId, concluida) => {
    try {
      await supabase
        .from('checklist_status')
        .update({ concluida: !concluida })
        .eq('id', checklistId)

      fetchAllData()
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
      fetchAllData()
    } catch (error) {
      console.error('Erro:', error)
    }
  }

  const solicitarExtrato = async () => {
    if (!selectedCompetencia || !destinatario.trim()) {
      alert('Preencha para quem foi solicitado')
      return
    }

    try {
      const mesRef = `${selectedCompetencia.mes}/${selectedCompetencia.ano}`

      await supabase.from('extratos').insert([{
        empresa_id: company.id,
        mes_ref: mesRef,
        status: 'solicitado',
        destinatario: destinatario,
      }])

      setShowModalExtrato(false)
      setDestinatario('')
      fetchAllData()
    } catch (error) {
      console.error('Erro:', error)
    }
  }

  const getStatusColor = (status) => {
    if (!status) return 'bg-gray-100 text-gray-700'
    if (status === 'em_andamento') return 'bg-blue-100 text-blue-700'
    if (status === 'pausado') return 'bg-yellow-100 text-yellow-700'
    if (status === 'concluido') return 'bg-green-100 text-green-700'
    return 'bg-gray-100 text-gray-700'
  }

  const getStatusLabel = (status) => {
    if (!status) return '⭕ Não iniciado'
    if (status === 'em_andamento') return '▶️ Em Andamento'
    if (status === 'pausado') return '⏸️ Pausado'
    if (status === 'concluido') return '✅ Concluído'
    return status
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <p className="text-gray-600">Carregando...</p>
      </div>
    )
  }

  const mesAtual = selectedCompetencia ? `${selectedCompetencia.mes}/${selectedCompetencia.ano}` : ''
  const totalTarefas = 26
  const tarefasConcluidas = checklists.filter(c => c.concluida).length
  const progresso = totalTarefas > 0 ? Math.round((tarefasConcluidas / totalTarefas) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <button
              onClick={onBack}
              className="text-blue-600 hover:text-blue-800 mb-2"
            >
              ← Voltar
            </button>
            <h1 className="text-2xl font-bold text-gray-800">{company.nome}</h1>
          </div>
          <div className={`px-4 py-2 rounded-lg font-medium ${getStatusColor(sessaoTrabalho?.status)}`}>
            {getStatusLabel(sessaoTrabalho?.status)}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Seletor de Competência */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Mês/Ano</label>
          <select
            value={selectedCompetencia?.id || ''}
            onChange={(e) => {
              const comp = competencias.find(c => c.id === e.target.value)
              setSelectedCompetencia(comp)
            }}
            className="w-full md:w-48 px-4 py-2 border rounded-lg"
          >
            {competencias.map(c => (
              <option key={c.id} value={c.id}>
                {c.mes}/{c.ano}
              </option>
            ))}
          </select>
        </div>

        {/* Barra de Progresso */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-gray-800">Progresso Geral</h3>
            <span className="text-xl font-bold text-blue-600">{progresso}%</span>
          </div>
          <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all"
              style={{ width: `${progresso}%` }}
            ></div>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex gap-2 flex-wrap">
            {!sessaoTrabalho || sessaoTrabalho.status === 'concluido' ? (
              <button
                onClick={iniciarTrabalho}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                ▶️ Iniciar Trabalho
              </button>
            ) : sessaoTrabalho.status === 'em_andamento' ? (
              <>
                <button
                  onClick={() => setShowPausarModal(true)}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-medium"
                >
                  ⏸️ Pausar
                </button>
                <button
                  onClick={concluirMes}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium"
                >
                  ✅ Concluir Mês
                </button>
              </>
            ) : sessaoTrabalho.status === 'pausado' ? (
              <>
                <button
                  onClick={iniciarTrabalho}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
                >
                  ▶️ Retomar
                </button>
                <div className="flex-1 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800 font-medium">Motivo da pausa:</p>
                  <p className="text-sm text-yellow-700">{sessaoTrabalho.observacao}</p>
                </div>
              </>
            ) : null}
          </div>
        </div>

        {/* Checklist */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Checklist ({tarefasConcluidas}/{totalTarefas})</h2>
            <button
              onClick={() => setShowChecklistModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
            >
              + Adicionar
            </button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {checklists.length === 0 ? (
              <p className="text-gray-600 text-center py-4">Sem tarefas ainda</p>
            ) : (
              checklists.map(cl => (
                <div
                  key={cl.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                >
                  <input
                    type="checkbox"
                    checked={cl.concluida}
                    onChange={() => toggleChecklist(cl.id, cl.concluida)}
                    className="w-5 h-5 cursor-pointer"
                  />
                  <div className="flex-1">
                    <p className={`${cl.concluida ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                      {cl.tarefa}
                    </p>
                    <p className="text-xs text-gray-500">{cl.categoria}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Extratos */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Extratos</h2>
            <button
              onClick={() => setShowModalExtrato(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
            >
              + Solicitar
            </button>
          </div>

          <div className="space-y-2">
            {extratos.length === 0 ? (
              <p className="text-gray-600 text-center py-4">Sem extratos</p>
            ) : (
              extratos.map(e => (
                <div key={e.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">{e.destinatario}</p>
                    <p className="text-xs text-gray-500">{e.mes_ref}</p>
                  </div>
                  <span className={`px-3 py-1 rounded text-xs font-medium ${
                    e.status === 'recebido' ? 'bg-green-100 text-green-700' :
                    e.status === 'atrasado' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {e.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal Adicionar Checklist */}
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

      {/* Modal Solicitar Extrato */}
      {showModalExtrato && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Solicitar Extrato</h3>
            <input
              type="text"
              placeholder="Para quem foi solicitado?"
              value={destinatario}
              onChange={(e) => setDestinatario(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowModalExtrato(false)}
                className="flex-1 px-4 py-2 border rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={solicitarExtrato}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg"
              >
                Solicitar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pausar Trabalho */}
      {showPausarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">⏸️ Pausar Trabalho</h3>
            <p className="text-sm text-gray-600 mb-3">Por que você está pausando este trabalho?</p>
            <textarea
              value={observacaoPausa}
              onChange={(e) => setObservacaoPausa(e.target.value)}
              placeholder="Ex: Cliente pediu para parar e fazer outra empresa primeiro..."
              className="w-full px-3 py-2 border rounded-lg mb-4 h-24 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowPausarModal(false)
                  setObservacaoPausa('')
                }}
                className="flex-1 px-4 py-2 border rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={pausarTrabalho}
                className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg"
              >
                Pausar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
