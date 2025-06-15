/// <reference types="vite/client" />
import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'
import { SessionContextProvider } from '@supabase/auth-helpers-react'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import LevelDetail from './pages/LevelDetail'
import WordsList from './pages/WordsList'
import Flashcards from './pages/Flashcards'
import WritingPractice from './pages/WritingPractice'
import ListeningPractice from './pages/ListeningPractice'
import QuizPage from './pages/QuizPage'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

function App() {
  return (
    <SessionContextProvider supabaseClient={supabase}>
      <Router>
      <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1 flex flex-col justify-start">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/level/:levelId" element={<LevelDetail />} />
              <Route path="/level/:levelId/words" element={<WordsList />} />
              <Route path="/level/:levelId/flashcards" element={<Flashcards />} />
              <Route path="/level/:levelId/writing" element={<WritingPractice />} />
              <Route path="/level/:levelId/listening" element={<ListeningPractice />} />
              <Route path="/level/:levelId/test" element={<QuizPage />} />
            </Routes>
          </main>
        </div>
      </Router>
    </SessionContextProvider>
  )
}

export default App 