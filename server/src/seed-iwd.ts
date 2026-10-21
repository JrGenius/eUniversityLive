import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

// Seed du cours « Infographie & Web Design — UPB L2 MIAGE » :
// crée le compte professeur et les 8 quiz (42 questions).
// Usage : JEREMIE_PASSWORD='...' tsx --env-file=../.env src/seed-iwd.ts

const prisma = new PrismaClient()
const email = (process.env.JEREMIE_EMAIL || 'jeremie@genius.ci').toLowerCase()
const password = process.env.JEREMIE_PASSWORD
if (!password) {
  console.error('Définissez JEREMIE_PASSWORD (ex. JEREMIE_PASSWORD=xxx npm run seed:iwd -w server).')
  process.exit(1)
}

type Q = [text: string, options: string[], correctIndex: number, durationSec: number, explanation: string]

const QUIZZES: { title: string; description: string; questions: Q[] }[] = [
  {
    title: 'IWD · Quiz 1 — Quel format choisiriez-vous ?',
    description: 'Atelier 01 · Personal Branding (p. 14). Choisir le bon format d’image : SVG / JPEG / PNG / WEBP.',
    questions: [
      ['Le logo de votre portfolio, net à toutes les tailles', ['SVG', 'JPEG', 'PNG', 'WEBP'], 0, 20, 'Le SVG est vectoriel : il reste parfaitement net à toutes les tailles, idéal pour un logo.'],
      ['Une photo de votre équipe pour la page « À propos »', ['SVG', 'JPEG', 'PNG', 'WEBP'], 1, 20, 'Le JPEG compresse bien les photos avec des millions de couleurs, pour un poids raisonnable.'],
      ['Une capture avec fond transparent, sans perte', ['SVG', 'JPEG', 'PNG', 'WEBP'], 2, 20, 'Le PNG gère la transparence et la compression sans perte, parfait pour les captures et interfaces.'],
      ['Une image d’illustration légère pour le Web', ['SVG', 'JPEG', 'PNG', 'WEBP'], 3, 20, 'Le WEBP offre une meilleure compression que JPEG/PNG à qualité équivalente : pages plus rapides.'],
    ],
  },
  {
    title: 'IWD · Quiz 2 — Problème ou solution déguisée ?',
    description: 'Atelier 02 · Product Ideation (p. 22). Classer chaque proposition, puis reformuler les « solutions » en problèmes.',
    questions: [
      ['« Je veux créer une appli de covoiturage pour le campus. »', ['Problème', 'Solution'], 1, 20, 'C’est une solution déguisée : elle part de l’idée (l’appli) avant d’avoir validé le problème.'],
      ['« Des étudiants arrivent en retard faute de trouver leur salle. »', ['Problème', 'Solution'], 0, 20, 'Un vrai problème : il décrit une situation vécue, observable, sans proposer de réponse.'],
      ['« Il faudrait un chatbot pour la scolarité. »', ['Problème', 'Solution'], 1, 20, '« Il faudrait + un outil » = une solution. Le problème sous-jacent reste à découvrir.'],
      ['« Des vendeuses perdent des ventes faute de monnaie. »', ['Problème', 'Solution'], 0, 20, 'Un problème concret : qui est touché, dans quelle situation, avec quelle conséquence.'],
    ],
  },
  {
    title: 'IWD · Quiz 3 — Plutôt UX ou plutôt UI ?',
    description: 'Atelier 03 · Design to Code (p. 33). Classer chaque proposition, puis discuter : où les deux se rejoignent-ils ?',
    questions: [
      ['Le temps pour retrouver son prochain cours', ['UX', 'UI'], 0, 20, 'L’efficacité du parcours (temps, effort pour atteindre l’information) relève de l’expérience utilisateur.'],
      ['La couleur et l’arrondi du bouton principal', ['UX', 'UI'], 1, 20, 'L’apparence des éléments d’interface (couleurs, formes) relève de l’UI.'],
      ['Le nombre d’étapes avant de voir l’information', ['UX', 'UI'], 0, 20, 'La structure du parcours et le nombre d’actions nécessaires sont des questions d’UX.'],
      ['La grille et l’espacement des cartes', ['UX', 'UI'], 1, 20, 'La mise en page visuelle (grille, espacements) relève de l’UI — même si elle sert l’UX.'],
    ],
  },
  {
    title: 'IWD · Quiz 4 — Triez les questions d’entretien',
    description: 'Atelier 04 · Product Sprint · Empathie (p. 47). Questions ouvertes sur des faits vécus = à garder ; questions qui suggèrent la réponse = à éviter.',
    questions: [
      ['« La dernière fois que… ? »', ['À garder', 'À éviter'], 0, 20, 'Ancre l’échange dans un fait vécu et récent : réponses concrètes, pas des opinions.'],
      ['« Qu’avez-vous essayé ? »', ['À garder', 'À éviter'], 0, 20, 'Question ouverte qui explore les solutions déjà tentées, sans suggérer de réponse.'],
      ['« Qu’est-ce qui était difficile ? »', ['À garder', 'À éviter'], 0, 20, 'Fait verbaliser la friction réelle : matière première pour définir le problème.'],
      ['« Vous aimez mon app ? »', ['À garder', 'À éviter'], 1, 20, 'Question fermée et orientée : la politesse pousse à répondre « oui », aucune info fiable.'],
      ['« Vous paieriez, n’est-ce pas ? »', ['À garder', 'À éviter'], 1, 20, 'Suggère la réponse et mesure une intention hypothétique, pas un comportement réel.'],
      ['« Ce bouton est bien, non ? »', ['À garder', 'À éviter'], 1, 20, 'Induit la réponse (« non ? ») et demande un jugement au lieu d’observer l’usage.'],
    ],
  },
  {
    title: 'IWD · Quiz 5 — Identité visuelle et portfolio',
    description: 'Atelier 01 · Personal Branding. Clarifier son positionnement avant de dessiner, et soigner la hiérarchie de son portfolio.',
    questions: [
      ['Avant de créer son logo, que faut-il clarifier ?', ['Son logiciel préféré', 'Son positionnement et son public', 'Ses animations'], 1, 30, 'Le design sert un message : on définit d’abord pour qui et pour quoi, puis on choisit les outils.'],
      ['À quoi sert principalement une direction artistique ?', ['Rendre les choix visuels cohérents avec un message', 'Multiplier les effets', 'Suivre toutes les tendances'], 0, 30, 'Une direction artistique garantit que couleurs, typographies et images racontent la même histoire.'],
      ['Quel élément devrait attirer l’attention en premier sur un portfolio ?', ['Les mentions légales', 'La liste des logiciels utilisés', 'Le nom et l’activité de la personne'], 2, 30, 'Le visiteur doit comprendre en quelques secondes qui vous êtes et ce que vous faites.'],
      ['Quelle présentation de projet est la plus convaincante ?', ['Une capture sans explication', 'Problème, rôle, solution et résultat', 'Le nom du projet uniquement'], 1, 30, 'Raconter le contexte, votre rôle et l’impact prouve votre démarche, pas seulement le rendu final.'],
      ['Sur une carte de visite, quelle information est prioritaire ?', ['Un moyen de contact lisible', 'Une citation longue', 'Toutes les expériences scolaires'], 0, 30, 'La carte sert à être recontacté : un e-mail ou téléphone lisible prime sur tout le reste.'],
      ['Le texte d’un bouton est difficile à lire sur son fond. Que corriger en priorité ?', ['L’arrondi', 'L’animation', 'Le contraste'], 2, 30, 'La lisibilité avant l’esthétique : un contraste suffisant est une exigence d’accessibilité.'],
    ],
  },
  {
    title: 'IWD · Quiz 6 — Du problème au MVP',
    description: 'Atelier 02 · Product Ideation. Formuler un problème précis, une proposition de valeur claire, et trancher le périmètre du MVP.',
    questions: [
      ['Quel est l’objectif principal d’un MVP ?', ['Tester une hypothèse avec un produit minimal utilisable', 'Proposer toutes les fonctionnalités', 'Éviter les retours utilisateurs'], 0, 30, 'Un MVP sert à apprendre vite et à moindre coût : valider (ou invalider) l’hypothèse centrale.'],
      ['Quelle proposition de valeur est la plus précise ?', ['« Une application révolutionnaire »', '« La technologie du futur »', '« Retrouver sa salle de cours en quelques secondes »'], 2, 30, 'Elle dit qui bénéficie de quoi, avec un résultat mesurable — pas un slogan vague.'],
      ['Une équipe a une semaine pour créer une application de planning. Quelle fonction privilégier ?', ['Personnaliser son avatar', 'Consulter son prochain cours et sa salle', 'Discuter avec tous les étudiants'], 1, 30, 'La fonction qui résout le problème central passe d’abord ; le reste attend.'],
      ['Quelle observation décrit le mieux un problème concret ?', ['« Sur cinq étudiants interrogés, trois ont cherché leur salle plus de dix minutes »', '« Tout le monde veut notre application »', '« Notre idée est forcément utile »'], 0, 30, 'Un problème concret s’appuie sur des faits observés et chiffrés, pas sur des opinions.'],
      ['Une fonction demande beaucoup de travail et apporte peu de valeur. Que faire dans le MVP ?', ['La développer en premier', 'La rendre obligatoire', 'L’écarter du périmètre'], 2, 30, 'Coût élevé + valeur faible = hors périmètre. Le MVP garde l’essentiel testable.'],
      ['Après un pitch, plusieurs personnes ne comprennent pas le problème présenté. Que revoir d’abord ?', ['Le logo', 'La formulation du problème et les exemples', 'Le nombre d’animations'], 1, 30, 'Si le problème n’est pas compris, aucune solution ne convaincra : clarifier le fond avant la forme.'],
    ],
  },
  {
    title: 'IWD · Quiz 7 — Interfaces et parcours utilisateur',
    description: 'Atelier 03 · Design to Code. Wireframes, prototypes, états vides, messages utiles et responsive.',
    questions: [
      ['À quoi sert principalement un wireframe ?', ['Choisir les photographies finales', 'Structurer le contenu et les écrans', 'Déployer le site'], 1, 30, 'Le wireframe organise l’information et les zones de chaque écran, sans détail graphique.'],
      ['Qu’apporte un prototype interactif par rapport à une maquette statique ?', ['La possibilité de tester le passage entre les écrans', 'Une base de données réelle automatiquement', 'Un hébergement public automatique'], 0, 30, 'Le prototype rend le parcours testable : on clique et on observe la navigation réelle.'],
      ['Un étudiant doit effectuer six actions pour consulter son prochain cours. Que faut-il examiner en premier ?', ['La forme du logo', 'La couleur du pied de page', 'L’utilité de chaque étape'], 2, 30, 'Six actions pour une info clé signalent un parcours trop long : chaque étape doit se justifier.'],
      ['Après l’envoi d’un formulaire, quel message est le plus utile ?', ['Aucun message', '« Inscription enregistrée. Tu peux rejoindre la session. »', '« Traitement système terminé : code 200 »'], 1, 30, 'Un bon retour confirme l’action en langage humain et indique la suite.'],
      ['Une liste de cours est vide. Quel affichage aide le mieux l’utilisateur ?', ['« Aucun cours prévu aujourd’hui. Voir les autres jours. »', 'Une page blanche', 'Une animation sans fin'], 0, 30, 'Un état vide utile explique la situation et propose une action.'],
      ['Une interface responsive doit surtout…', ['Réduire tous les textes sur mobile', 'Masquer toutes les fonctionnalités', 'Adapter sa disposition à l’espace disponible'], 2, 30, 'Responsive = la mise en page s’adapte à l’écran, sans supprimer l’essentiel.'],
    ],
  },
  {
    title: 'IWD · Quiz 8 — Construire, tester et livrer',
    description: 'Atelier 03 · Design to Code. Rôles de HTML/CSS/JavaScript, conduite d’un test utilisateur et preuve de livraison.',
    questions: [
      ['Quel langage structure le contenu d’une page Web ?', ['CSS', 'HTML', 'JavaScript'], 1, 30, 'HTML décrit la structure et le sens du contenu (titres, paragraphes, boutons).'],
      ['Quel langage gère principalement la présentation visuelle d’une page Web ?', ['CSS', 'SQL', 'HTML'], 0, 30, 'CSS contrôle couleurs, typographies, espacements et mise en page.'],
      ['Pour programmer une réaction à un clic dans le navigateur, on utilise généralement…', ['Du texte alternatif', 'Une image PNG', 'JavaScript'], 2, 30, 'JavaScript ajoute l’interactivité : écouter les événements et modifier la page.'],
      ['Lors d’un test utilisateur, quelle consigne est la plus pertinente ?', ['« Cliquez ici, puis là »', '« Retrouvez votre prochain cours »', '« Vous trouvez mon interface belle ? »'], 1, 30, 'On donne un objectif réel, pas un mode d’emploi : on observe comment la personne s’y prend.'],
      ['Un utilisateur hésite pendant un test. Que doit faire l’observateur en premier ?', ['Observer et noter la difficulté sans guider immédiatement', 'Prendre le téléphone et terminer la tâche', 'Expliquer que l’interface est pourtant simple'], 0, 30, 'L’hésitation est une donnée précieuse : guider trop tôt fausse le test.'],
      ['Quelle preuve montre le mieux qu’un parcours Web a été livré ?', ['Une capture de la maquette', 'Une déclaration « Ça fonctionne »', 'Une URL accessible où le parcours peut être réalisé'], 2, 30, 'Livré = utilisable par d’autres : une URL où le parcours se déroule vraiment.'],
    ],
  },
]

async function main() {
  const teacher = await prisma.teacher.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: process.env.JEREMIE_NAME || 'Jérémie',
      passwordHash: await bcrypt.hash(password, 12),
    },
  })
  let created = 0
  for (const qz of QUIZZES) {
    const exists = await prisma.quiz.findFirst({ where: { teacherId: teacher.id, title: qz.title } })
    if (exists) {
      console.log(`Déjà présent, ignoré : ${qz.title}`)
      continue
    }
    await prisma.quiz.create({
      data: {
        teacherId: teacher.id,
        title: qz.title,
        description: qz.description,
        questions: {
          create: qz.questions.map(([text, options, correctIndex, durationSec, explanation], position) => ({
            position, text, options, correctIndex, durationSec, explanation,
          })),
        },
      },
    })
    created++
    console.log(`Créé : ${qz.title} (${qz.questions.length} questions)`)
  }
  console.log(`\nCompte professeur : ${email}`)
  console.log(`${created} quiz créé(s), ${QUIZZES.length - created} déjà présent(s).`)
}
main().finally(() => prisma.$disconnect())
