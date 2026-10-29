import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

// Seed du quiz « GENIUS GROUPS — Qui a le droit de faire quoi ? » (IT, Product, Sales, Admin) :
// 20 questions sur RBAC, rôles & permissions, GRANT, policies, gates, middleware
// + 3 sondages sans points (correctIndex NULL → répartition des votes).
// Usage : HELLO_PASSWORD='...' tsx --env-file=../.env src/seed-genius-rbac.ts

const prisma = new PrismaClient()
const email = (process.env.HELLO_EMAIL || 'hello@genius.ci').toLowerCase()
const helloPassword: string = process.env.HELLO_PASSWORD || ''
if (!helloPassword) {
  console.error('Définissez HELLO_PASSWORD (ex. HELLO_PASSWORD=xxx tsx --env-file=../.env src/seed-genius-rbac.ts).')
  process.exit(1)
}

// correctIndex null = sondage : pas de bonne réponse, pas de points.
type Q = [text: string, options: string[], correctIndex: number | null, durationSec: number, explanation: string | null]

const QUESTIONS: Q[] = [
  // --- RBAC & rôles ---
  ['RBAC, ça veut dire quoi ?', ['Role-Based Access Control', 'Really Big Admin Control', 'Rapid Backend Access Code', 'Rien Ne Bouge Après Connexion'], 0, 30, 'Le « Really Big Admin Control » existe aussi : c’est le compte partagé que tout le monde utilise.'],
  ['Dans un RBAC, les droits sont attribués en priorité à…', ['Chaque utilisateur, un par un, au feeling', 'Des rôles, auxquels on rattache les utilisateurs', 'Celui qui parle le plus fort en réunion', 'Celui qui a le plus d’ancienneté sur WhatsApp'], 1, 30, 'Un rôle, c’est un badge. Pas un cadeau personnalisé.'],
  ['Quelle est la différence entre un rôle et une permission ?', ['Aucune, c’est le même mot en plus chic', 'Le rôle est une action précise, la permission est un titre', 'Le rôle regroupe des permissions, la permission autorise une action précise', 'La permission est réservée à la finance'], 2, 30, '« Commercial » est un rôle. « Voir les factures » est une permission.'],
  ['Quel est le principe du moindre privilège ?', ['Donner à chacun uniquement les accès nécessaires à sa mission', 'Donner tous les accès pour éviter les demandes', 'Retirer les accès le vendredi soir', 'Réserver les accès aux fondateurs'], 0, 30, '« Il pourrait en avoir besoin un jour » n’est pas une analyse de risque.'],
  ['Un stagiaire Sales a le rôle « Super Admin » « pour gagner du temps ». Le vrai problème est…', ['Il va sûrement aller plus vite', 'Le rôle est trop beau pour lui', 'Le serveur risque de s’ennuyer', 'Un accès excessif : erreur ou compromission = dégâts sur tout le système'], 3, 30, 'Gagner du temps, oui. Jusqu’au jour où la base de production perd un peu de poids.'],
  ['Quelle équipe doit normalement pouvoir modifier les tarifs publics sur la plateforme ?', ['Tout le monde, c’est collaboratif', 'Un rôle explicitement autorisé (ex. Product ou Admin, selon la règle définie)', 'Le premier qui ouvre l’écran', 'Le client, s’il insiste'], 1, 30, 'Un tarif modifié « par erreur » finit toujours en réunion à 18 h.'],
  ['La séparation des tâches (separation of duties) consiste à…', ['Mettre l’équipe IT dans une autre pièce', 'Séparer les développeurs des commerciaux au déjeuner', 'Éviter qu’une seule personne contrôle tout un processus sensible', 'Interdire les réunions à plus de trois personnes'], 2, 30, 'Celui qui crée le paiement ne devrait pas être le seul à le valider.'],
  ['Un employé change de poste de Sales à Product. Le bon réflexe RBAC est de…', ['Lui ajouter le nouveau rôle et garder l’ancien « au cas où »', 'Lui laisser tous ses accès pour la continuité', 'Mettre à jour ses rôles et retirer ceux qui ne sont plus utiles', 'Créer un nouveau compte sans supprimer l’ancien'], 2, 30, 'Sinon, au bout de cinq ans, il a plus d’accès que le CEO.'],

  // --- GRANT ---
  ['En SQL, que fait la commande GRANT ?', ['Elle supprime une table', 'Elle accorde des privilèges à un utilisateur ou un rôle', 'Elle sauvegarde la base', 'Elle accorde une augmentation'], 1, 30, 'Dommage pour le dernier choix. Ce serait une excellente fonctionnalité.'],
  ['Quelle commande SQL retire un privilège précédemment accordé ?', ['DROP', 'DENY ALL ET PRIER', 'REVOKE', 'ROLLBACK'], 2, 30, 'GRANT donne, REVOKE reprend. Comme la cantine, mais en plus strict.'],
  ['Pour une application qui ne fait que lire les statistiques, quel accès SQL est le plus adapté ?', ['GRANT ALL PRIVILEGES sur toutes les bases', 'GRANT SELECT sur les tables nécessaires', 'Le mot de passe root dans le .env', 'GRANT DROP pour nettoyer plus vite'], 1, 30, 'Un dashboard n’a pas besoin de pouvoir supprimer la base. Même s’il le mérite parfois.'],
  ['Pourquoi éviter d’utiliser le compte root de la base dans l’application ?', ['Parce que root est trop fatigué', 'Parce qu’une faille donnerait le contrôle total de la base', 'Parce que ça ralentit les requêtes', 'Parce que root n’aime pas Prisma'], 1, 30, 'Un compte applicatif doit avoir les clés d’une pièce, pas du bâtiment entier.'],

  // --- Policies & Gates ---
  ['Une Gate (ex. Laravel) sert surtout à…', ['Décider si un utilisateur peut effectuer une action donnée', 'Gérer la porte d’entrée du bureau', 'Compresser les images', 'Planifier les congés'], 0, 30, 'Pas de badge, pas de gate. Pas de gate, pas de bouton « Supprimer ».'],
  ['Une Policy est généralement associée à…', ['Un fichier CSS', 'Un ordre de grandeur du budget', 'Un modèle ou une ressource : voir, créer, modifier, supprimer', 'Une règle de la cantine'], 2, 30, 'PostPolicy, InvoicePolicy, UserPolicy : une ressource, ses règles.'],
  ['Quelle règle est le mieux placée dans une Policy ?', ['« Un commercial ne peut modifier que ses propres devis »', '« Le bouton est bleu »', '« Le serveur redémarre à minuit »', '« Le mot de passe du wifi est affiché »'], 0, 30, 'Autoriser selon le rôle ET selon le propriétaire de la ressource : c’est le cœur d’une policy.'],
  ['Quelle est la différence courante entre Gate et Policy ?', ['La gate est une règle simple et globale, la policy regroupe les règles d’une ressource', 'La gate est payante, la policy est gratuite', 'La policy est pour l’IT, la gate pour le Sales', 'Il n’y en a aucune, les deux se valent toujours'], 0, 30, 'Gate : « peut-on voir le tableau de bord admin ? » Policy : « peut-on modifier CE devis ? »'],

  // --- Middleware ---
  ['Un middleware est…', ['Un logiciel installé au milieu du bureau', 'Une couche exécutée entre la requête et le traitement final', 'Un rôle réservé au manager intermédiaire', 'Une base de données secondaire'], 1, 30, 'La requête passe, le middleware regarde, puis décide : continuer ou refuser.'],
  ['Un utilisateur non connecté tente d’ouvrir /admin. Que doit faire le middleware d’authentification ?', ['Laisser passer, il a l’air sympa', 'Afficher « bonne chance »', 'Refuser ou rediriger vers la connexion (401/redirect)', 'Créer un compte admin automatiquement'], 2, 30, 'Un 401 n’est pas une insulte. C’est une invitation à s’identifier.'],
  ['Un utilisateur connecté (rôle Sales) tente d’accéder à une page réservée à Admin. Le code HTTP le plus adapté est…', ['200 OK', '404 pour tout le monde, toujours', '403 Forbidden', '500 parce que c’est dramatique'], 2, 30, '401 = « qui es-tu ? ». 403 = « je sais qui tu es, mais non ».'],
  ['Où faut-il faire respecter les permissions pour qu’elles soient réellement sûres ?', ['Uniquement en masquant le bouton dans l’interface', 'Côté serveur (middleware, gates, policies), en plus de l’interface', 'Dans un commentaire du code', 'Dans un message Slack'], 1, 30, 'Un bouton caché n’est pas une sécurité : n’importe qui peut appeler l’API directement.'],

  // --- Sondages ---
  ['Quel accès as-tu déjà demandé « juste pour deux minutes » ?', ['Administrateur de la base de données', 'Le compte de l’outil de facturation', 'Le serveur de production', 'Tous. Et j’ai oublié de les rendre.'], null, 20, 'À vous de défendre votre vote !'],
  ['Quelle phrase fait le plus trembler l’équipe IT ?', ['« Donne-moi les accès admin, c’est urgent. »', '« Je peux avoir le mot de passe sur WhatsApp ? »', '« On a tous le même compte, non ? »', '« J’ai supprimé quelque chose, mais je ne sais plus quoi. »'], null, 20, 'À vous de défendre votre vote !'],
  ['Dans GENIUS GROUPS, qui aurait le rôle « Super Admin » si on tirait au sort ?', ['Le CEO, avec une petite idée', 'Le développeur, avec une énorme responsabilité', 'Le commercial, qui promet déjà la fonctionnalité', 'L’Admin, qui voudra d’abord une demande écrite'], null, 20, 'À vous de défendre votre vote !'],
]

const TITLE = 'GENIUS GROUPS — Qui a le droit de faire quoi ? 🔐'

async function main() {
  const teacher = await prisma.teacher.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: process.env.HELLO_NAME || 'GENIUS GROUPS',
      passwordHash: await bcrypt.hash(helloPassword, 12),
    },
  })
  const description = '20 questions + 3 sondages pour toute l’équipe (IT, Product, Sales, Admin) : RBAC, rôles & permissions, GRANT, policies, gates, middleware. GENIUS GROUPS SAS.'
  const exists = await prisma.quiz.findFirst({ where: { teacherId: teacher.id, title: TITLE } })
  if (exists) {
    console.log(`Déjà présent, ignoré : ${TITLE}`)
    return
  }
  await prisma.quiz.create({
    data: {
      teacherId: teacher.id,
      title: TITLE,
      description,
      questions: {
        create: QUESTIONS.map(([text, options, correctIndex, durationSec, explanation], position) => ({
          position, text, options, correctIndex, durationSec, explanation,
        })),
      },
    },
  })
  console.log(`Créé : ${TITLE} (${QUESTIONS.length} questions dont ${QUESTIONS.filter((q) => q[2] === null).length} sondages)`)
  console.log(`\nCompte professeur : ${email}`)
}
main().finally(() => prisma.$disconnect())
