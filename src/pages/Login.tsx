import React, { useState, useEffect, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react'
import { Eye, EyeOff } from 'lucide-react'
import { motion } from 'framer-motion'


export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const navigate = useNavigate()
  const supabase = useSupabaseClient()
  const user = useUser()

  useEffect(() => {
    if (user) {
      navigate('/dashboard')
    } 
  }, [user])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setEmailError(null)
    setPasswordError(null)

    let isValid = true

    if (!email) {
      setEmailError('Email is required')
      isValid = false
    } else if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
      setEmailError('Please enter a valid email address')
      isValid = false
    }

    if (!password) {
      setPasswordError('Password is required')
      isValid = false
    }

    if (!isValid) {
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.4, ease: "easeOut" }}
     className="min-h-screen flex flex-col justify-center items-center px-4 w-full">

      <h1>Sign in</h1>
      
      <form onSubmit={handleSubmit} className="w-full lg:w-1/4">
        
        
        <div>
          <label
            htmlFor="email"
            className="input-label"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
        </div>
        
        {emailError && <p className="input-error">{emailError}</p>}

        
        <div className="relative">
          <label
            htmlFor="password"
            className="input-label"
          >
            Password
          </label>
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
          />

          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-600 hover:text-gray-900 focus:outline-none"
            style={{ top: '28px' }}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>


        </div>
        {passwordError && <p className="input-error">{passwordError}</p>}

        {error && (
          <div className="input-error">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="button flex flex-col w-full mt-8"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
      <p className="text-center text-sm mt-4 text-gray-600">
        No account yet? {' '}
        <Link to="/register" className="text-primary hover:underline">
          Register here
        </Link>
      </p>
    </motion.div>
  )
} 