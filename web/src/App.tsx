import type React from "react"
import { Navigate, Route, Routes } from 'react-router-dom'
import Join from './pages/Join'
import Play from './pages/Play'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import QuizEditor from './pages/QuizEditor'
import Console from './pages/Console'
import Results from './pages/Results'
import Projection from './pages/Projection'
import { teacherToken } from './lib/api'

const Private = ({ children }: { children: React.ReactElement }) => (teacherToken() ? children : <Navigate to="/enseignant/connexion" replace />)

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Join />} />
      <Route path="/j/:code" element={<Join />} />
      <Route path="/play/:code" element={<Play />} />
      <Route path="/projection/:code" element={<Projection />} />
      <Route path="/enseignant/connexion" element={<Login />} />
      <Route path="/enseignant" element={<Private><Dashboard /></Private>} />
      <Route path="/enseignant/quiz/:id" element={<Private><QuizEditor /></Private>} />
      <Route path="/enseignant/session/:id" element={<Private><Console /></Private>} />
      <Route path="/enseignant/resultats/:id" element={<Private><Results /></Private>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
