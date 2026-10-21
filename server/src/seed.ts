import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const email = (process.env.TEACHER_EMAIL || 'prof@euniversite.local').toLowerCase()
const password = process.env.TEACHER_PASSWORD || 'ChangeMoi!2024'

type Q = [string, string[], number, number, string]
const DEMO: Q[] = [
  ['Que signifie le sigle « URL » ?', ['Uniform Resource Locator', 'Universal Range Link', 'Unique Remote Login', 'United Resource Layer'], 0, 20, 'Une URL est l’adresse complète d’une ressource sur le Web.'],
  ['Quel protocole sécurise la navigation web avec un cadenas dans le navigateur ?', ['FTP', 'HTTPS', 'SMTP', 'SSH'], 1, 20, 'HTTPS chiffre les échanges entre le navigateur et le site grâce à TLS.'],
  ['Quelle pratique protège le mieux un compte en ligne ?', ['Utiliser le même mot de passe partout', 'Noter son mot de passe sur un post-it', 'Activer la double authentification', 'Partager son mot de passe avec un ami'], 2, 20, 'La double authentification ajoute une seconde preuve d’identité en plus du mot de passe.'],
  ['Qu’est-ce que le « phishing » ?', ['Un virus qui efface le disque', 'Une tentative de vol d’informations par faux message', 'Une panne de réseau', 'Un logiciel de compression'], 1, 30, 'L’hameçonnage imite un organisme de confiance pour vous faire livrer vos identifiants.'],
  ['Combien de bits compte un octet ?', ['4', '8', '16', '32'], 1, 10, 'Un octet (byte) = 8 bits.'],
  ['Que désigne le « cloud » ?', ['Des serveurs distants accessibles via Internet', 'Un type de câble réseau', 'Un écran tactile', 'Un antivirus'], 0, 20, 'Le cloud met à disposition stockage et calcul à distance, à la demande.'],
  ['Parmi ces extensions, laquelle correspond à une image ?', ['.mp3', '.docx', '.png', '.zip'], 2, 10, 'PNG est un format d’image sans perte.'],
  ['Quel est le rôle d’un moteur de recherche ?', ['Fabriquer des sites web', 'Indexer des pages et les retrouver par mots-clés', 'Protéger contre les virus', 'Héberger vos e-mails'], 1, 20, 'Il explore le Web, indexe les pages et classe les résultats selon leur pertinence.'],
  ['Que faut-il faire avant de partager une information virale ?', ['La partager tout de suite', 'Vérifier la source et la date', 'Ajouter des émojis', 'Attendre qu’elle soit supprimée'], 1, 30, 'Recouper les sources limite la propagation de fausses informations.'],
  ['Que signifie « Wi-Fi » dans l’usage courant ?', ['Un réseau local sans fil', 'Un logiciel de bureautique', 'Un type de processeur', 'Une carte mémoire'], 0, 10, 'Le Wi-Fi relie des appareils à un réseau sans câble.'],
]

async function main() {
  const t = await prisma.teacher.upsert({
    where: { email },
    update: {},
    create: { email, name: process.env.TEACHER_NAME || 'Professeur Démo', passwordHash: await bcrypt.hash(password, 12) },
  })
  const exists = await prisma.quiz.findFirst({ where: { teacherId: t.id, isDemo: true } })
  if (!exists) {
    await prisma.quiz.create({
      data: {
        teacherId: t.id, isDemo: true,
        title: '[DÉMO] Culture numérique — 10 questions',
        description: 'Données de démonstration : quiz d’exemple, modifiable ou supprimable.',
        questions: { create: DEMO.map(([text, options, correctIndex, durationSec, explanation], position) => ({ position, text, options, correctIndex, durationSec, explanation })) },
      },
    })
  }
  console.log(`Compte professeur : ${email}\nQuiz de démonstration prêt.`)
}
main().finally(() => prisma.$disconnect())
