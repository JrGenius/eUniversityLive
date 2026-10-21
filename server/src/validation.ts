import { z } from 'zod'
import { DURATIONS } from './config.js'

const text = (label: string, max: number) =>
  z.string({ error: `${label} : champ requis.` }).trim().min(1, `${label} : champ requis.`).max(max, `${label} : ${max} caractères maximum.`)

export const questionSchema = z.object({
  text: text('Énoncé', 500),
  options: z.array(text('Proposition', 200)).min(2, 'Au moins deux propositions.').max(4, 'Quatre propositions maximum.'),
  correctIndex: z.number().int(),
  durationSec: z.number().refine((d) => (DURATIONS as readonly number[]).includes(d), 'Durée : 10, 20, 30 ou 60 secondes.'),
  explanation: z.string().trim().max(600, 'Explication : 600 caractères maximum.').optional().nullable(),
}).refine((q) => q.correctIndex >= 0 && q.correctIndex < q.options.length, { message: 'Choisissez la bonne réponse.', path: ['correctIndex'] })

export const quizSchema = z.object({
  title: text('Titre', 120),
  description: z.string().trim().max(500, 'Description : 500 caractères maximum.').optional().nullable(),
  questions: z.array(questionSchema).min(1, 'Ajoutez au moins une question.').max(100, '100 questions maximum.'),
})

export const joinSchema = z.object({
  code: z.string().min(1).max(20),
  fullName: text('Nom complet', 100),
  nickname: text('Pseudo', 20).refine((v) => v.length >= 2, 'Pseudo : 2 caractères minimum.'),
})

export const loginSchema = z.object({ email: z.string().email().max(200), password: z.string().min(1).max(200) })
