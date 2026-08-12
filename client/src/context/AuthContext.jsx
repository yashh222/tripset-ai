import { createContext, useContext, useState, useEffect } from "react"

const AuthContext = createContext(null)

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem("token"))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      if (!token) {
        setUser(null)
        setLoading(false)
        return
      }

      try {
        const res = await fetch(`${API_URL}/auth/me`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        })
        const data = await res.json()
        if (data.success && data.data && data.data.user) {
          setUser(data.data.user)
        } else {
          // Token is invalid or expired
          localStorage.removeItem("token")
          setToken(null)
          setUser(null)
        }
      } catch (err) {
        console.error("Auth check failed:", err)
        // Keep or clear user session depending on connectivity, but clear to be safe
        localStorage.removeItem("token")
        setToken(null)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [token])

  async function login(email, password) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    })

    const data = await res.json()
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Login failed")
    }

    const { token: userToken, user: userData } = data.data
    localStorage.setItem("token", userToken)
    setToken(userToken)
    setUser(userData)
    return { token: userToken, user: userData }
  }

  async function register(name, email, password, phone) {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name, email, password, phone: phone || undefined })
    })

    const data = await res.json()
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Registration failed")
    }

    const { token: userToken, user: userData } = data.data
    localStorage.setItem("token", userToken)
    setToken(userToken)
    setUser(userData)
    return { token: userToken, user: userData }
  }

  function logout() {
    localStorage.removeItem("token")
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
