import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import CoordenadorDashboard from './components/CoordenadorDashboard'

export default function App() {
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        fetchUserRole(session.user.email)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user)
        fetchUserRole(session.user.email)
      } else {
        setUser(null)
        setUserRole(null)
        setLoading(false)
      }
    })

    return () => subscription?.unsubscribe()
  }, [])

  const fetchUserRole = async (email) => {
    try {
      const { data } = await supabase
        .from('users')
        .select('role')
        .eq('email', email)
        .single()

      setUserRole(data?.role || 'analista')
    } catch (error) {
      console.error('Erro ao buscar role:', error)
      setUserRole('analista')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Carregando...</p>
      </div>
    )
  }

  if (!user) {
    return <Login onLogin={setUser} />
  }

  if (userRole === 'coordenador') {
    return <CoordenadorDashboard user={user} />
  }

  return <Dashboard user={user} />
}
