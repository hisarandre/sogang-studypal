import React, { useState, useEffect, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react'
import { Eye, EyeOff } from 'lucide-react'
import { motion } from 'framer-motion'
import Snackbar from '../components/Snackbar'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null)
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null)
  const [snackbarType, setSnackbarType] = useState<'success' | 'error' | null>(null)

  const navigate = useNavigate()
  const supabase = useSupabaseClient()
  const user = useUser()

  useEffect(() => {
    if (user) {
      navigate('/dashboard')
    }
  }, [user, navigate])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSnackbarMessage(null)
    setSnackbarType(null)
    setEmailError(null)
    setPasswordError(null)
    setConfirmPasswordError(null)

    let isValid = true

    if (!email) {
      setEmailError('Email is required')
      isValid = false
    } else if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
      setEmailError('Please enter a valid email address')
      isValid = false
    }

    if (!password) {
      setPasswordError('Password is required')
      isValid = false
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters long')
      isValid = false
    }

    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your password')
      isValid = false
    } else if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match')
      isValid = false
    }

    if (!isValid) {
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) throw error
      setSnackbarMessage('Registration successful! Please check your email to confirm your account.')
      setSnackbarType('success')
      // Optionally, navigate to a confirmation message page or login page
      // navigate('/login')
    } catch (err) {
      setSnackbarMessage(err instanceof Error ? err.message : 'An error occurred during registration.')
      setSnackbarType('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col justify-center items-center px-4 w-full">

      <h1>Sign up</h1>

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

        <div className="relative mt-4">
          <label
            htmlFor="confirm-password"
            className="input-label"
          >
            Confirm Password
          </label>
          <input
            id="confirm-password"
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input"
          />

          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-600 hover:text-gray-900 focus:outline-none"
            style={{ top: '28px' }}
          >
            {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>


        </div>
        {confirmPasswordError && <p className="input-error">{confirmPasswordError}</p>}

        <button
          type="submit"
          disabled={loading}
          className="button flex flex-col w-full mt-8"
        >
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>
      <p className="text-center text-sm mt-4 text-gray-600">
        Already have an account? {' '}
        <Link to="/login" className="text-primary hover:underline">
          Sign in here
        </Link>
      </p>
      {snackbarMessage && (
        <Snackbar
          message={snackbarMessage}
          type={snackbarType}
          onClose={() => setSnackbarMessage(null)}
        />
      )}
    </motion.div>
  )
} 