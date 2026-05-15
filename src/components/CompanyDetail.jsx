import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function CompanyDetail({ company, onBack, user }) {
  const [competencias, setCompetencias] = useState([])
  const [anoSelecionado, setAnoSelecionado] = useState(null)
  const [selectedCompetencia, setSelectedCompetencia] = useState(null)
  const [checklists, setChecklists] = useState([])
  const [extratos, setExtratos] = useState([])
  const [sessoesTrabaho, setSessoesTrabaho] = useState([])
  const [loading, setLoading] = useState(true)
  const [showChecklistModal, setShowChecklistModal] = useState(false)
  const [novaChecklist, setNovaChecklist] = useState({ categoria: '', tarefa: '' })
  const [showModalExtrato, setShowModalExtrato] = useState(false)
  const [destinatario, setDestinatario] = useState('')
  const [sessaoTrabalho, setSessaoTrabalho] = useState(null)
  const [showPausarModal, setShowPausarModal] = useState(false)
  const [observacaoPausa, setObservacaoPausa] = useState('')
  const [novoStatus, setNovoStatus] = useState('')
  const [abaSelecionada, setAbaSelecionada] = useState('checklist')

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
    fetchAllData()
  }, [company.id])

  const fetchAllData = async () => {
    try {
      setLoading(true)

      const { data: competenciasData } = await supabase
        .from('competencias')
        .select('*')
        .order('ano', { ascending: false })
        .order('mes', { ascending: false })

      setCompetencias(competenciasData || [])

      if (competenciasData?.length > 0) {
        const anoMaisRecente = competenciasData[0].ano
        setAnoSelecionado(anoMaisRecente)
      }

      const { data: sessoesData } = await supabase
        .from('sessoes_trabalho')
        .select('*')
        .eq('empresa_id', company.id)
        .eq('user_id', user.id)

      setSessoesTrabaho(sessoesData || [])

      const { data: extratosData } = await supabase
        .from('extratos')
        .select('*')
        .eq('empresa_id', company.id)

      setExtratos(extratosData || [])
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedCompetencia) {
      criarChecklistPadrao()
      fetchChecklistAndSessao()
    }
  }, [selectedCompetencia])

  const criarChecklistPadrao = async () => {
    if (!selectedCompetencia) return

    try {
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
    } catch (error) {
      console.error('Erro ao criar checklist padrão:', error)
    }
  }

  const fetchChecklistAndSessao = async () => {
    if (!selectedCompetencia) return

    try {
      const mesRef = `${selectedCompetencia.mes}/${selectedCompetencia.ano}`

      const { data: checklistData } = await supabase
        .from('checklist_status')
        .select('*')
        .eq('empresa_id', company.id)
        .eq('mes', mesRef)
        .order('categoria')

      const { data: sessaoData } = await supabase
        .from('sessoes_trabalho')
        .select('*')
        .eq('empresa_id', company.id)
        .eq('user_id', user.id)
        .eq('mes', mesRef)
        .single()

      setChecklists(checklistData || [])
      setSessaoTrabalho(sessaoData || null)
      setNovoStatus(sessaoData?.status || 'nao_iniciado')
    } catch (error) {
      console.error('Erro:', error)
    }
  }

  const iniciarTrabalho = async () => {
    if (!selectedCompetencia) return

    try {
      const mesRef = `${selectedCompetencia.mes}/${selectedCompetencia.ano}`

      const { error } = await supabase
        .from('sessoes_trabalho')
        .insert([{
          empresa_id: company.id,
          user_id: user.id,
          mes: mesRef,
          status: 'em_andamento',
          iniciado_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString(),
        }])

      if (error) throw error

      await supabase.from('atividades_log').insert([{
        empresa_id: company.id,
        user_id: user.id,
        mes: mesRef,
        acao: 'INICIOU',
        detalhe: `Iniciou trabalho em ${company.nome}`,
      }])

      setNovoStatus('em_andamento')
      fetchChecklistAndSessao()
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao iniciar: ' + error.message)
    }
  }

  const alterarStatus = async (novoStatusValue) => {
    if (!selectedCompetencia) return

    try {
      const mesRef = `${selectedCompetencia.mes}/${selectedCompetencia.ano}`

      if (novoStatusValue === 'pausado') {
        setShowPausarModal(true)
        return
      }

      if (novoStatusValue === 'nao_iniciado') {
        await supabase
          .from('sessoes_trabalho')
          .delete()
          .eq('empresa_id', company.id)
          .eq('user_id', user.id)
          .eq('mes', mesRef)

        setNovoStatus('nao_iniciado')
        fetchAllData()
        fetchChecklistAndSessao()
        return
      }

      const { data: updateData, error: updateError } = await supabase
        .from('sessoes_trabalho')
        .update({
          status: novoStatusValue,
          concluido_em: novoStatusValue === 'concluido' ? new Date().toISOString() : null,
          atualizado_em: new Date().toISOString(),
        })
        .eq('empresa_id', company.id)
        .eq('user_id', user.id)
        .eq('mes', mesRef)

      if (updateError) throw updateError

      if (!updateData || updateData.length === 0) {
        const { error: insertError } = await supabase
          .from('sessoes_trabalho')
          .insert([{
            empresa_id: company.id,
            user_id: user.id,
            mes: mesRef,
            status: novoStatusValue,
            concluido_em: novoStatusValue === 'concluido' ? new Date().toISOString() : null,
            atualizado_em: new Date().toISOString(),
          }])

        if (insertError) throw insertError
      }

      const acaoMap = {
        'em_andamento': 'INICIOU',
        'concluido': 'CONCLUIU',
      }

      await supabase.from('atividades_log').insert([{
        empresa_id: company.id,
        user_id: user.id,
        mes: mesRef,
        acao: acaoMap[novoStatusValue] || 'ATUALIZOU',
        detalhe: `Mudou status para ${novoStatusValue}`,
      }])

      setNovoStatus(novoStatusValue)
      fetchAllData()
      fetchChecklistAndSessao()
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao alterar status: ' + error.message)
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

      await supabase.from('atividades_log').insert([{
        empresa_id: company.id,
        user_id: user.id,
        mes: mesRef,
        acao: 'PAUSOU',
        detalhe: `Motivo: ${observacaoPausa}`,
      }])

      setNovoStatus('pausado')
      setShowPausarModal(false)
      setObservacaoPausa('')
      fetchChecklistAndSessao()
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao pausar: ' + error.message)
    }
  }

  const toggleChecklist = async (checklistId, concluida) => {
    try {
      await supabase
        .from('checklist_status')
        .update({ concluida: !concluida })
        .eq('id', checklistId)

      fetchChecklistAndSessao()
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
      fetchChecklistAndSessao()
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

      fetchChecklistAndSessao()
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao remover tarefa')
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
    if (!status || status === 'nao_iniciado') return 'bg-gray-100 text-gray-700 border-gray-300'
    if (status === 'em_andamento') return 'bg-blue-100 text-blue-700 border-blue-300'
    if (status === 'pausado') return 'bg-yellow-100 text-yellow-700 border-yellow-300'
    if (status === 'concluido') return 'bg-green-100 text-green-700 border-green-300'
    return 'bg-gray-100 text-gray-700'
  }

  const getStatusLabel = (status) => {
    if (!status || status === 'nao_iniciado') return '⭕ Não iniciado'
    if (status === 'em_andamento') return '▶️ Em Andamento'
    if (status === 'pausado') return '⏸️ Pausado'
    if (status === 'concluido') return '✅ Concluído'
    return status
  }

  const getMesStatus = (mes, ano) => {
    const mesRef = `${mes}/${ano}`
    const sessao = sessoesTrabaho.find(s => s.mes === mesRef)
    return sessao?.status || 'nao_iniciado'
  }

  const anos = [...new Set(competencias.map(c => c.ano))].sort((a, b) => b - a)
  const mesesDoAno = competencias
    .filter(c => c.ano === anoSelecionado)
    .sort((a, b) => parseInt(a.mes) - parseInt(b.mes))

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <p className="text-gray-600">Carregando...</p>
      </div>
    )
  }

  const totalTarefas = checklists.length
  const tarefasConcluidas = checklists.filter(c => c.concluida).length
  const progresso = totalTarefas > 0 ? Math.round((tarefasConcluidas / totalTarefas) * 100) : 0

  const mesesMap = {
    '1': 'Jan', '2': 'Fev', '3': 'Mar', '4': 'Abr',
    '5': 'Mai', '6': 'Jun', '7': 'Jul', '8': 'Ago',
    '9': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
    '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
    '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
    '09': 'Set'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex-1">
            <button
              onClick={onBack}
              className="text-blue-600 hover:text-blue-800 mb-2 block"
            >
              ← Voltar
            </button>
            <h1 className="text-2xl font-bold text-gray-800">{company.nome}</h1>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={novoStatus}
              onChange={(e) => alterarStatus(e.target.value)}
              className={`px-4 py-2 rounded-lg font-medium border-2 ${getStatusColor(novoStatus)}`}
            >
              <option value="nao_iniciado">⭕ Não iniciado</option>
              <option value="em_andamento">▶️ Em Andamento</option>
              <option value="pausado">⏸️ Pausado</option>
              <option value="concluido">✅ Concluído</option>
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Seletor de Ano e Meses */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <label className="block text-sm font-medium mb-3">Ano</label>
          <select
            value={anoSelecionado || ''}
            onChange={(e) => {
              setAnoSelecionado(parseInt(e.target.value))
              setSelectedCompetencia(null)
            }}
            className="w-full md:w-48 px-4 py-2 border rounded-lg mb-4"
          >
            {anos.map(ano => (
              <option key={ano} value={ano}>
                {ano}
              </option>
            ))}
          </select>

          <label className="block text-sm font-medium mb-3">Meses</label>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {mesesDoAno.map(mes => {
              const status = getMesStatus(mes.mes, mes.ano)
              const isSelected = selectedCompetencia?.id === mes.id
              const mesNome = mesesMap[String(mes.mes)] || mesesMap[String(parseInt(mes.mes))] || `M${mes.mes}`

              let bgColor = 'bg-gray-50 border-gray-200'
              if (isSelected) bgColor = 'bg-blue-100 border-blue-300'
              if (status === 'concluido') bgColor = 'bg-green-100 border-green-300'
              if (status === 'pausado') bgColor = 'bg-yellow-100 border-yellow-200'
              if (status === 'em_andamento') bgColor = 'bg-blue-50 border-blue-200'

              return (
                <button
                  key={mes.id}
                  onClick={() => setSelectedCompetencia(mes)}
                  className={`px-3 py-2 rounded-lg font-medium border-2 transition ${bgColor}`}
                >
                  <div className="text-sm font-bold">{mesNome}</div>
                  <div className="text-xs mt-1">
                    {status === 'concluido' && '✅'}
                    {status === 'em_andamento' && '▶️'}
                    {status === 'pausado' && '⏸️'}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Barra de Progresso */}
        {selectedCompetencia && (
          <>
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-gray-800">Progresso - {selectedCompetencia.mes}/{selectedCompetencia.ano}</h3>
                <span className="text-xl font-bold text-blue-600">{progresso}%</span>
              </div>
              <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-500"
                  style={{ width: `${progresso}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 mt-2">{tarefasConcluidas} de {totalTarefas} tarefas concluídas</p>
            </div>

            {/* Status da Sessão */}
            {sessaoTrabalho?.status === 'pausado' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-sm font-bold text-yellow-800 mb-2">⏸️ TRABALHO PAUSADO</p>
                <p className="text-sm text-yellow-700">
                  <strong>Motivo:</strong> {sessaoTrabalho.observacao}
                </p>
              </div>
            )}

            {sessaoTrabalho?.status === 'concluido' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="text-sm font-bold text-green-800 mb-1">✅ CONCLUÍDO EM {selectedCompetencia.mes}/{selectedCompetencia.ano}</p>
                <p className="text-sm text-green-700">
                  Finalizado em {new Date(sessaoTrabalho.concluido_em).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            )}

            {/* Botão Iniciar Trabalho */}
            {(!sessaoTrabalho || sessaoTrabalho.status === 'concluido') && (
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <button
                  onClick={iniciarTrabalho}
                  className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-medium transition"
                >
                  ▶️ Iniciar Trabalho
                </button>
              </div>
            )}

            {/* Abas */}
            <div className="bg-white rounded-lg shadow-sm border-b mb-6">
              <div className="flex">
                <button
                  onClick={() => setAbaSelecionada('checklist')}
                  className={`flex-1 px-4 py-3 font-medium text-center border-b-2 transition ${
                    abaSelecionada === 'checklist'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-gray-200 text-gray-600 hover:text-gray-800'
                  }`}
                >
                  📋 Checklist ({tarefasConcluidas}/{totalTarefas})
                </button>
                <button
                  onClick={() => setAbaSelecionada('extratos')}
                  className={`flex-1 px-4 py-3 font-medium text-center border-b-2 transition ${
                    abaSelecionada === 'extratos'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-gray-200 text-gray-600 hover:text-gray-800'
                  }`}
                >
                  📄 Extratos
                </button>
              </div>
            </div>

            {/* ABA CHECKLIST */}
            {abaSelecionada === 'checklist' && (
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-800">
                    Checklist ({tarefasConcluidas}/{totalTarefas})
                  </h2>
                  <button
                    onClick={() => setShowChecklistModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                  >
                    + Adicionar Tarefa Extra
                  </button>
                </div>

                <div className="space-y-4">
                  {checklists.length === 0 ? (
                    <p className="text-gray-600 text-center py-4">Sem tarefas ainda</p>
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
            )}

            {/* ABA EXTRATOS */}
            {abaSelecionada === 'extratos' && (
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
                  {extratos.filter(e => e.mes_ref === `${selectedCompetencia.mes}/${selectedCompetencia.ano}`).length === 0 ? (
                    <p className="text-gray-600 text-center py-4">Sem extratos</p>
                  ) : (
                    extratos
                      .filter(e => e.mes_ref === `${selectedCompetencia.mes}/${selectedCompetencia.ano}`)
                      .map(e => (
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
                            {e.status === 'recebido' ? '✅ Recebido' :
                             e.status === 'atrasado' ? '⚠️ Atrasado' :
                             '⏳ Solicitado'}
                          </span>
                        </div>
                      ))
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Adicionar Tarefa Extra */}
      {showChecklistModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Adicionar Tarefa Extra</h3>
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
