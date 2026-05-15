import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function CompanyExtrato({ company, onBack, user, selectedCompetencia: initialCompetencia }) {
  const [competencias, setCompetencias] = useState([])
  const [anoSelecionado, setAnoSelecionado] = useState(null)
  const [selectedCompetencia, setSelectedCompetencia] = useState(initialCompetencia)
  const [extratos, setExtratos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModalExtrato, setShowModalExtrato] = useState(false)
  const [showModalImportar, setShowModalImportar] = useState(false)
  const [destinatario, setDestinatario] = useState('')
  const [bancosEnviados, setBancosEnviados] = useState([])
  const [novobanco, setNovobanco] = useState('')
  const [extratoSelecionado, setExtratoSelecionado] = useState(null)
  const [bancosImportados, setBancosImportados] = useState([])
  const [novoBancoImportado, setNovoBancoImportado] = useState('')

  const bancosPadrao = [
    'Banco do Brasil',
    'Itaú',
    'Bradesco',
    'Caixa Econômica',
    'Santander',
    'HSBC',
    'Banco Inter',
    'Nubank',
    'Banco Original',
    'Banco Votorantim',
    'Banco BTG Pactual',
    'Banco Safra',
    'Banco Daycoval',
    'Outro'
  ]

  useEffect(() => {
    fetchAllData()
  }, [])

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

      fetchExtratos()
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchExtratos = async () => {
    try {
      const { data: extratosData } = await supabase
        .from('extratos')
        .select('*')
        .eq('empresa_id', company.id)
        .order('created_at', { ascending: false })

      setExtratos(extratosData || [])
    } catch (error) {
      console.error('Erro:', error)
    }
  }

  const solicitarExtrato = async () => {
    if (!selectedCompetencia || !destinatario.trim() || bancosEnviados.length === 0) {
      alert('Preencha destinatário e selecione pelo menos um banco')
      return
    }

    try {
      const mesRef = `${selectedCompetencia.mes}/${selectedCompetencia.ano}`
      const novaSolicitacao = {
        data: new Date().toISOString(),
        status: 'solicitado'
      }

      await supabase.from('extratos').insert([{
        empresa_id: company.id,
        mes_ref: mesRef,
        status: 'solicitado',
        destinatario: destinatario,
        bancos_enviados: bancosEnviados,
        bancos_importados: [],
        solicitacoes: [novaSolicitacao]
      }])

      setShowModalExtrato(false)
      setDestinatario('')
      setBancosEnviados([])
      fetchExtratos()
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao solicitar extrato')
    }
  }

  const solicitarNovamente = async (extrato) => {
    try {
      const solicitacoesAtualizadas = [...(extrato.solicitacoes || []), {
        data: new Date().toISOString(),
        status: 'solicitado'
      }]

      let novoStatus = 'solicitado'
      if (solicitacoesAtualizadas.length > 3) {
        novoStatus = 'atrasado'
      }

      await supabase
        .from('extratos')
        .update({
          solicitacoes: solicitacoesAtualizadas,
          status: novoStatus
        })
        .eq('id', extrato.id)

      fetchExtratos()
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao solicitar novamente')
    }
  }

  const adicionarBancoEnviado = () => {
    if (novobanco.trim() && !bancosEnviados.includes(novobanco.trim())) {
      setBancosEnviados([...bancosEnviados, novobanco.trim()])
      setNovobanco('')
    }
  }

  const removerBancoEnviado = (banco) => {
    setBancosEnviados(bancosEnviados.filter(b => b !== banco))
  }

  const adicionarBancoImportado = () => {
    if (novoBancoImportado.trim() && !bancosImportados.includes(novoBancoImportado.trim())) {
      setBancosImportados([...bancosImportados, novoBancoImportado.trim()])
      setNovoBancoImportado('')
    }
  }

  const removerBancoImportado = (banco) => {
    setBancosImportados(bancosImportados.filter(b => b !== banco))
  }

  const confirmarImportacao = async () => {
    if (!extratoSelecionado) return

    try {
      const solicitacoesAtualizadas = extratoSelecionado.solicitacoes || []
      if (solicitacoesAtualizadas.length > 0) {
        solicitacoesAtualizadas[solicitacoesAtualizadas.length - 1].status = 'recebido'
      }

      await supabase
        .from('extratos')
        .update({
          status: 'recebido',
          bancos_importados: bancosImportados,
          solicitacoes: solicitacoesAtualizadas
        })
        .eq('id', extratoSelecionado.id)

      setShowModalImportar(false)
      setExtratoSelecionado(null)
      setBancosImportados([])
      fetchExtratos()
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao atualizar extrato')
    }
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

  const extratosDoMes = selectedCompetencia 
    ? extratos.filter(e => e.mes_ref === `${selectedCompetencia.mes}/${selectedCompetencia.ano}`)
    : []

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
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button
            onClick={onBack}
            className="text-blue-600 hover:text-blue-800 mb-2 block"
          >
            ← Voltar
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Extratos - {company.nome}</h1>
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
              const isSelected = selectedCompetencia?.id === mes.id
              const mesNome = mesesMap[String(mes.mes)] || mesesMap[String(parseInt(mes.mes))] || `M${mes.mes}`
              const bgColor = isSelected ? 'bg-blue-100 border-blue-300' : 'bg-gray-50 border-gray-200'

              return (
                <button
                  key={mes.id}
                  onClick={() => setSelectedCompetencia(mes)}
                  className={`px-3 py-2 rounded-lg font-medium border-2 transition ${bgColor}`}
                >
                  <div className="text-sm font-bold">{mesNome}</div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Lista de Extratos */}
        {selectedCompetencia && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">
                Extratos - {selectedCompetencia.mes}/{selectedCompetencia.ano}
              </h2>
              <button
                onClick={() => setShowModalExtrato(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
              >
                + Solicitar
              </button>
            </div>

            <div className="space-y-3">
              {extratosDoMes.length === 0 ? (
                <p className="text-gray-600 text-center py-8">Nenhum extrato solicitado</p>
              ) : (
                extratosDoMes.map(e => {
                  const numSolicitacoes = (e.solicitacoes || []).length

                  return (
                    <div key={e.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-medium text-gray-800">{e.destinatario}</p>
                          <p className="text-xs text-gray-500">{e.mes_ref}</p>
                        </div>
                        <span className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap ${
                          e.status === 'recebido' ? 'bg-green-100 text-green-700' :
                          e.status === 'atrasado' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {e.status === 'recebido' ? '✅ Recebido' :
                           e.status === 'atrasado' ? '⚠️ Atrasado' :
                           '⏳ Solicitado'}
                        </span>
                      </div>

                      {/* Histórico de Solicitações */}
                      {e.solicitacoes && e.solicitacoes.length > 0 && (
                        <div className="mb-3 bg-white p-3 rounded border border-gray-200">
                          <p className="text-xs font-medium text-gray-700 mb-2">📋 Histórico ({numSolicitacoes}):</p>
                          <div className="space-y-1 max-h-40 overflow-y-auto">
                            {e.solicitacoes.map((sol, idx) => (
                              <div key={idx} className="text-xs text-gray-600 flex justify-between">
                                <span>
                                  #{idx + 1} - {new Date(sol.data).toLocaleDateString('pt-BR')} {new Date(sol.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span className={`font-medium ${
                                  sol.status === 'recebido' ? 'text-green-600' : 'text-yellow-600'
                                }`}>
                                  {sol.status === 'recebido' ? '✓' : '○'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Bancos Enviados */}
                      {e.bancos_enviados && e.bancos_enviados.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-gray-700 mb-2">📤 Bancos Enviados:</p>
                          <div className="flex flex-wrap gap-2">
                            {e.bancos_enviados.map((banco, idx) => (
                              <span key={idx} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                                {banco}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Bancos Importados */}
                      {e.bancos_importados && e.bancos_importados.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-gray-700 mb-2">📥 Bancos Importados:</p>
                          <div className="flex flex-wrap gap-2">
                            {e.bancos_importados.map((banco, idx) => (
                              <span key={idx} className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
                                {banco}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Botões */}
                      <div className="flex gap-2 mt-3">
                        {e.status === 'solicitado' && (
                          <button
                            onClick={() => solicitarNovamente(e)}
                            className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded text-sm font-medium"
                          >
                            🔄 Solicitado Novamente
                          </button>
                        )}
                        {e.status !== 'recebido' && (
                          <button
                            onClick={() => {
                              setExtratoSelecionado(e)
                              setBancosImportados(e.bancos_importados || [])
                              setShowModalImportar(true)
                            }}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-medium"
                          >
                            ✓ Adicionar Bancos Importados
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal Solicitar Extrato */}
      {showModalExtrato && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-96 overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Solicitar Extrato</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Para quem foi solicitado?</label>
                <input
                  type="text"
                  placeholder="Ex: Cliente XYZ"
                  value={destinatario}
                  onChange={(e) => setDestinatario(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Bancos a Enviar</label>
                <div className="mb-3">
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value && !bancosEnviados.includes(e.target.value)) {
                        setBancosEnviados([...bancosEnviados, e.target.value])
                      }
                    }}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Selecione um banco...</option>
                    {bancosPadrao.map(banco => (
                      <option key={banco} value={banco} disabled={bancosEnviados.includes(banco)}>
                        {banco}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <p className="text-xs text-gray-600 mb-2">Ou digite um banco:</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Novo banco"
                      value={novobanco}
                      onChange={(e) => setNovobanco(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && adicionarBancoEnviado()}
                      className="flex-1 px-3 py-2 border rounded-lg"
                    />
                    <button
                      onClick={adicionarBancoEnviado}
                      className="bg-blue-600 text-white px-3 py-2 rounded text-sm"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {bancosEnviados.map(banco => (
                    <div key={banco} className="flex items-center justify-between bg-blue-50 p-2 rounded border border-blue-200">
                      <span className="text-sm text-blue-800">{banco}</span>
                      <button
                        onClick={() => removerBancoEnviado(banco)}
                        className="text-red-600 hover:text-red-800 font-bold"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setShowModalExtrato(false)
                  setDestinatario('')
                  setBancosEnviados([])
                }}
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

      {/* Modal Adicionar Bancos Importados */}
      {showModalImportar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-96 overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Bancos Importados</h3>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-3">
                  <strong>De:</strong> {extratoSelecionado?.destinatario}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-700 mb-2">📤 Bancos Enviados:</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {extratoSelecionado?.bancos_enviados?.map((banco, idx) => (
                    <span key={idx} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                      {banco}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Quais foram importados?</label>

                <div className="mb-3">
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value && !bancosImportados.includes(e.target.value)) {
                        setBancosImportados([...bancosImportados, e.target.value])
                      }
                    }}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Selecione um banco...</option>
                    {extratoSelecionado?.bancos_enviados?.map(banco => (
                      <option key={banco} value={banco} disabled={bancosImportados.includes(banco)}>
                        {banco}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  {bancosImportados.map(banco => (
                    <div key={banco} className="flex items-center justify-between bg-green-50 p-2 rounded border border-green-200">
                      <span className="text-sm text-green-800">{banco}</span>
                      <button
                        onClick={() => removerBancoImportado(banco)}
                        className="text-red-600 hover:text-red-800 font-bold"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setShowModalImportar(false)
                  setExtratoSelecionado(null)
                  setBancosImportados([])
                }}
                className="flex-1 px-4 py-2 border rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarImportacao}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
