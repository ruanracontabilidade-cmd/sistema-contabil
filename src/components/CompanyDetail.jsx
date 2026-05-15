import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import CompanyChecklist from './CompanyChecklist'
import CompanyExtrato from './CompanyExtrato'

export default function CompanyDetail({ company, onBack, user }) {
  const [competencias, setCompetencias] = useState([])
  const [anoSelecionado, setAnoSelecionado] = useState(null)
  const [selectedCompetencia, setSelectedCompetencia] = useState(null)
  const [sessoesTrabaho, setSessoesTrabaho] = useState([])
  const [loading, setLoading] = useState(true)
  const [sessaoTrabalho, setSessaoTrabalho] = useState(null)
  const [novoStatus, setNovoStatus] = useState('')
  const [showPausarModal, setShowPausarModal] = useState(false)
  const [observacaoPausa, setObservacaoPausa] = useState('')
  const [telaSelecionada, setTelaSelecionada] = useState('empresa')

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
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedCompetencia) {
      fetchChecklistAndSessao()
    }
  }, [selectedCompetencia])

  const fetchChecklistAndSessao = async () => {
    if (!selectedCompetencia) return

    try {
      const mesRef = `${selectedCompetencia.mes}/${selectedCompetencia.ano}`

      const { data: sessaoData } = await supabase
        .from('sessoes_trabalho')
        .select('*')
        .eq('empresa_id', company.id)
        .eq('user_id', user.id)
        .eq('mes', mesRef)
        .single()

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

      if (sessaoTrabalho) {
        const { error } = await supabase
          .from('sessoes_trabalho')
          .update({
            status: 'em_andamento',
            iniciado_em: new Date().toISOString(),
            atualizado_em: new Date().toISOString(),
          })
          .eq('empresa_id', company.id)
          .eq('user_id', user.id)
          .eq('mes', mesRef)

        if (error) throw error
      } else {
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
      }

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

  const mesesMap = {
    '1': 'Jan', '2': 'Fev', '3': 'Mar', '4': 'Abr',
    '5': 'Mai', '6': 'Jun', '7': 'Jul', '8': 'Ago',
    '9': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
    '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
    '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
    '09': 'Set'
  }

  // Renderizar tela de Checklist
  if (telaSelecionada === 'checklist' && selectedCompetencia) {
    return (
      <CompanyChecklist
        company={company}
        onBack={() => setTelaSelecionada('empresa')}
        user={user}
        selectedCompetencia={selectedCompetencia}
      />
    )
  }

  // Renderizar tela de Extratos
  if (telaSelecionada === 'extratos' && selectedCompetencia) {
    return (
      <CompanyExtrato
        company={company}
        onBack={() => setTelaSelecionada('empresa')}
        user={user}
        selectedCompetencia={selectedCompetencia}
      />
    )
  }

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
          <div className="flex-1">
            <div className="flex items-center justify-between w-full">
  <button
    onClick={onBack}
    className="text-blue-600 hover:text-blue-800 block"
  >
    ← Voltar
  </button>
</div>
            <h1 className="text-2xl font-bold text-gray-800">{company.nome}</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-4 py-2 rounded-lg font-medium border-2 ${getStatusColor(novoStatus)}`}>
              {getStatusLabel(novoStatus)}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
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
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-6">
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

        {selectedCompetencia && (
          <>
            {/* Menu de Navegação */}
            <div className="bg-white rounded-lg shadow-sm border-b mb-6">
              <div className="flex">
                <button
                  onClick={() => setTelaSelecionada('empresa')}
                  className={`flex-1 px-4 py-3 font-medium text-center border-b-2 transition ${
                    telaSelecionada === 'empresa'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-gray-200 text-gray-600 hover:text-gray-800'
                  }`}
                >
                  📋 Checklist
                </button>
                <button
                  onClick={() => setTelaSelecionada('extratos')}
                  className={`flex-1 px-4 py-3 font-medium text-center border-b-2 transition ${
                    telaSelecionada === 'extratos'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-gray-200 text-gray-600 hover:text-gray-800'
                  }`}
                >
                  📄 Extratos
                </button>
              </div>
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
                  Finalizado em {new Date(sessaoTrabalho.concluido_em).toLocaleDateString('pt-BR')}
                </p>
              </div>
            )}

            {/* Dropdown de Status e Botão Iniciar Trabalho */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-3">Status do Mês</label>
                <select
                  value={novoStatus}
                  onChange={(e) => {
                    const novoStatusValue = e.target.value
                    setNovoStatus(novoStatusValue)
                    alterarStatus(novoStatusValue)
                  }}
                  className={`w-full px-4 py-2 rounded-lg font-medium border-2 ${getStatusColor(novoStatus)}`}
                >
                  <option value="nao_iniciado">⭕ Não iniciado</option>
                  <option value="em_andamento">▶️ Em Andamento</option>
                  <option value="pausado">⏸️ Pausado</option>
                  <option value="concluido">✅ Concluído</option>
                </select>
              </div>

              <button
                onClick={iniciarTrabalho}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-medium transition"
              >
                {sessaoTrabalho?.status === 'pausado' ? '▶️ Retomar Trabalho' : 
                 sessaoTrabalho?.status === 'em_andamento' ? '▶️ Continuar Trabalho' :
                 sessaoTrabalho?.status === 'concluido' ? '▶️ Recomeçar Trabalho' :
                 '▶️ Iniciar Trabalho'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Modal Pausar Trabalho */}
      {showPausarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">⏸️ Pausar Trabalho</h3>
            <p className="text-sm text-gray-600 mb-3">Por que você está pausando este trabalho?</p>
            <textarea
              value={observacaoPausa}
              onChange={(e) => setObservacaoPausa(e.target.value)}
              placeholder="Ex: Cliente pediu para parar..."
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
