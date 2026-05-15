import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import CoordenadorDashboard from './components/CoordenadorDashboard'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState(null)

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user?.email) {
          const { data: userData } = await supabase
            .from('users')
            .select('id, email, role')
            .eq('email', session.user.email)
            .single()

          if (userData) {
            setUser(userData)
            setUserRole(userData.role)
          }
        }
      } catch (error) {
        console.error('Erro:', error)
      } finally {
        setLoading(false)
      }
    }

    checkUser()
  }, [])

  const handleLogin = async (email, password) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      const { data: userData } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('email', email)
        .single()

      if (userData) {
        setUser(userData)
        setUserRole(userData.role)
      }
    } catch (error) {
      alert('Erro ao fazer login: ' + error.message)
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setUserRole(null)
    } catch (error) {
      alert('Erro ao fazer logout: ' + error.message)
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
    return <Login onLogin={handleLogin} />
  }

  return (
    <>
      {userRole === 'coordenador' ? (
        <CoordenadorDashboard user={user} onLogout={handleLogout} />
      ) : (
        <Dashboard user={user} onLogout={handleLogout} />
      )}
    </>
  )
}
