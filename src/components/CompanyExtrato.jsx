import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function CompanyExtrato({ company, onBack, user, selectedCompetencia }) {
  const [extratos, setExtratos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModalExtrato, setShowModalExtrato] = useState(false)
  const [destinatario, setDestinatario] = useState('')

  useEffect(() => {
    fetchExtratos()
  }, [selectedCompetencia])

  const fetchExtratos = async () => {
    try {
      setLoading(true)

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
      fetchExtratos()
    } catch (error) {
      console.error('Erro:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <p className="text-gray-600">Carregando...</p>
      </div>
    )
  }

  const extratosDoMes = extratos.filter(e => e.mes_ref === `${selectedCompetencia.mes}/${selectedCompetencia.ano}`)

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
          <p className="text-sm text-gray-600 mt-1">Mês: {selectedCompetencia.mes}/{selectedCompetencia.ano}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
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
            {extratosDoMes.length === 0 ? (
              <p className="text-gray-600 text-center py-8">Nenhum extrato solicitado neste mês</p>
            ) : (
              extratosDoMes.map(e => (
                <div key={e.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
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
      </div>

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
    </div>
  )
}
