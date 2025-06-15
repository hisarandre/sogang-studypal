import React from 'react'
import Btn from '../components/Btn'
import { useUser } from '@supabase/auth-helpers-react'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function Home() {
  const navigate = useNavigate()
  const user = useUser()

  useEffect(() => {
    if (user) {
      navigate('/dashboard')
    } 
  }, [user])

  return (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.4, ease: "easeOut" }}
    className="flex-1 flex flex-col justify-center items-center px-4"
  >
      <div className="text-center">
        <h1 className='mb-8'> 
          한국어 학습
        </h1>
        <h2>
          Sogang Vocabulary
        </h2>
        <p>
          Master Korean vocabulary with interactive flashcards based on Sogang University textbooks
        </p>
      </div>
      <section className="flex flex-col gap-4 pt-8 w-full md:w-1/4 mx-auto">
        <Btn navigateTo="/register" buttonText="Sign up" variant="filled" />
        <Btn navigateTo="/login" buttonText="Sign in" variant="outline" />
      </section>
    </motion.div>
  )
}