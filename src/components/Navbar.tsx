import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react'
import { LogOut } from 'lucide-react'
import Snackbar from './Snackbar'

export default function Navbar() {
  const supabase = useSupabaseClient()
  const user = useUser()
  const navigate = useNavigate()
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null)
  const [snackbarType, setSnackbarType] = useState<'success' | 'error' | null>(null)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/')
    setSnackbarMessage('You have been logged out')
    setSnackbarType('error')
  }

  return (
    <nav>
      <div className="container mx-auto px-4">
        <div className="flex justify-end h-16">

          <div className="flex items-center space-x-4">
            {user && (
              <>
                <button
                  onClick={handleSignOut}
                  className="text-primary p-2 rounded-full hover:bg-primary/5 transition"
                  title="Sign Out"
                >
                  <LogOut size={20} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      {snackbarMessage && snackbarType && (
        <Snackbar 
          message={snackbarMessage}
          type={snackbarType}
          onClose={() => setSnackbarMessage(null)} 
        />
      )}
    </nav>
  )
} 