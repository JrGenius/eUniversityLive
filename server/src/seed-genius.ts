import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

// Seed du quiz « GENIUS GROUPS — Startup, garba & production » :
// 20 questions fun sur l'univers startup africain + 3 sondages sans points
// (correctIndex NULL → répartition des votes, aucune bonne réponse).
// Usage : HELLO_PASSWORD='...' tsx --env-file=../.env src/seed-genius.ts

const prisma = new PrismaClient()
const email = (process.env.HELLO_EMAIL || 'hello@genius.ci').toLowerCase()
const helloPassword: string = process.env.HELLO_PASSWORD || ''
if (!helloPassword) {
  console.error('Définissez HELLO_PASSWORD (ex. HELLO_PASSWORD=xxx npm run seed:genius -w server).')
  process.exit(1)
}

// correctIndex null = sondage : pas de bonne réponse, pas de points.
type Q = [text: string, options: string[], correctIndex: number | null, durationSec: number, explanation: string | null]

const QUESTIONS: Q[] = [
  ['Le MVP, c’est quoi ?', ['Minimum Viable Product', 'Mon Vieux, Patiente', 'Même Version, Problèmes', 'Maintenant, Vendez le PowerPoint'], 0, 30, 'Mais quand la démo plante, B devient notre stratégie de communication.'],
  ['Un prospect dit : « Votre solution est intéressante. » On a obtenu…', ['Un contrat signé', 'Une levée de fonds', 'Un intérêt à qualifier', 'Le droit de commander les nouveaux bureaux'], 2, 30, 'Le comptable confirme : « intéressant » n’est pas un moyen de paiement.'],
  ['Pourquoi GBAKA veut simplifier le paiement du transport ?', ['Pour transformer les apprentis en développeurs', 'Pour faciliter le paiement et réduire l’attente de monnaie', 'Pour ajouter un mot de passe au gbaka', 'Pour remplacer le chauffeur par un chatbot'], 1, 30, 'Tu es arrivé à destination, mais tes 100 francs sont encore en voyage.'],
  ['« Ça fonctionne sur ma machine » signifie surtout…', ['Que le produit est prêt pour un million de clients', 'Que le client doit acheter ton ordinateur', 'Que les tests sont désormais inutiles', 'Qu’il faut encore vérifier l’environnement de déploiement'], 3, 30, 'On commercialise l’application, pas le PC de Michael.'],
  ['Quel est le meilleur signal de demande pour une startup ?', ['Des clients qui paient et reviennent', 'Le cousin du fondateur qui dit « c’est lourd »', 'Un logo avec une animation 3D', 'Le nombre de personnes dans le groupe WhatsApp'], 0, 30, 'Le cousin est déjà conseiller stratégique de sept startups.'],
  ['Avant d’acheter un téléphone d’occasion, le réflexe CHECK consiste à…', ['Vérifier si le vendeur parle avec assurance', 'Demander si la batterie tient jusqu’à Yopougon', 'Consulter les informations disponibles sur l’identifiant et le statut du bien', 'Regarder uniquement si la coque est propre'], 2, 30, '« C’est propre, chef » n’est pas un certificat de propriété.'],
  ['Quelle phrase décrit réellement un problème utilisateur ?', ['« Il nous faut absolument de l’IA. »', '« Les étudiants ne retrouvent pas leur salle à temps. »', '« On doit faire une app comme Uber. »', '« Le concurrent a mis un bouton violet. »'], 1, 30, 'Le bouton violet n’a toujours pas retrouvé l’amphi.'],
  ['Un client demande « juste un petit bouton ». Que faut-il faire ?', ['Répondre « cinq minutes » sans regarder', 'Le développer directement en production', 'Envoyer immédiatement une facture de dix millions', 'Clarifier son fonctionnement et son impact avant d’estimer'], 3, 30, 'Derrière le petit bouton : trois rôles, deux API et un nouveau métier.'],
  ['Le rôle d’un webhook de paiement est de…', ['Redessiner la page de paiement', 'Doubler automatiquement le chiffre d’affaires', 'Notifier le système d’un événement lié au paiement', 'Envoyer « courage » au service financier'], 2, 30, 'Le message « j’ai payé » du client n’est pas un webhook.'],
  ['Un utilisateur doit appeler le développeur pour trouver « Payer ». Le problème principal est…', ['Le parcours et la clarté de l’interface', 'Le manque de motivation de l’utilisateur', 'La couleur de son téléphone', 'L’absence d’un groupe WhatsApp de formation'], 0, 30, 'Si chaque bouton nécessite un séminaire, on a créé une école.'],
  ['Pour tester un produit auprès des transporteurs, le meilleur départ est…', ['Une conférence de presse avant le premier trajet', 'Une présentation de 96 slides', 'Une promesse de couvrir toute l’Afrique lundi', 'Un pilote limité avec observation sur le terrain'], 3, 30, 'Le terrain n’a pas lu notre business plan.'],
  ['À quoi sert principalement un système d’authentification comme GeniusAuth ?', ['À deviner le mot de passe du voisin', 'À vérifier l’identité de l’utilisateur qui se connecte', 'À garantir qu’aucun bug n’existera jamais', 'À remplacer tous les développeurs backend'], 1, 30, '« C’est moi, ouvre » reste une méthode d’authentification peu convaincante.'],
  ['Une startup peut-elle avoir beaucoup d’inscriptions et peu de valeur créée ?', ['Non, une inscription garantit une vente', 'Non, surtout si le logo est orange', 'Oui, si les inscrits n’utilisent pas réellement le produit', 'Impossible après une publication LinkedIn'], 2, 30, '10 000 comptes, trois utilisateurs actifs… dont le fondateur sur deux téléphones.'],
  ['Quel est le bon réflexe avant un déploiement important ?', ['Vérifier les fonctions critiques et prévoir un retour arrière', 'Couper les notifications et partir manger', 'Renommer le dossier “final_final_vraiment_final”', 'Espérer que les clients dorment'], 0, 30, 'L’espoir est utile. Le rollback aussi.'],
  ['Dans eUniversité Quiz, qu’est-ce qui fait gagner des points selon notre barème ?', ['Être assis au premier rang', 'Répondre correctement, avec un bonus de rapidité', 'Appeler le professeur “boss”', 'Actualiser la page quinze fois'], 1, 30, 'La flatterie n’est pas encore intégrée au moteur de score.'],
  ['Une facture envoyée à un client représente-t-elle déjà de l’argent disponible ?', ['Oui, dès que le PDF est joli', 'Oui, si le client répond « bien reçu »', 'Oui, après trois relances', 'Non, il faut que le règlement soit effectivement reçu'], 3, 30, '« Le virement est en cours » ne paie pas encore la connexion Internet.'],
  ['Quelle est la meilleure utilisation de l’IA dans une équipe produit ?', ['Accélérer le travail tout en vérifiant les résultats', 'Lui donner toutes les décisions sans contrôle', 'Ajouter “AI-powered” sur chaque écran', 'Lui demander de trouver des clients pendant qu’on dort'], 0, 30, 'L’IA peut écrire le code. Elle ne doit pas écrire seule les excuses.'],
  ['Quand une équipe reçoit dix demandes de fonctionnalités, elle doit…', ['Tout promettre pour vendredi', 'Choisir celle qui a le plus bel emoji', 'Prioriser selon la valeur, l’effort et l’objectif produit', 'Ouvrir dix nouveaux projets'], 2, 30, 'Une roadmap n’est pas la liste de toutes les idées entendues au déjeuner.'],
  ['Quelle mission résume GENIUS GROUPS ?', ['Créer un logo pour chaque jour de la semaine', 'Simplifier l’innovation en Afrique', 'Remplacer toutes les réunions par des vocaux', 'Déployer avant de choisir le nom du projet'], 1, 30, 'Même si le département « nouveaux noms de produits » est particulièrement productif.'],
  ['Le CEO arrive avec : « J’ai une petite idée… » Quel est le meilleur réflexe produit ?', ['Acheter immédiatement cinq domaines', 'Créer le groupe WhatsApp avant de comprendre', 'Annoncer une disponibilité dans 36 pays', 'Clarifier le problème, la cible et le premier test'], 3, 30, 'Respirez. Cette fois, on définit le MVP avant le logo. Enfin… on essaie.'],
  ['Qui es-tu dans une startup ?', ['« J’ai une idée. »', '« Ça marche en local. »', '« Le client a confirmé ? »', '« Qui a touché à la production ? »'], null, 20, 'À vous de défendre votre vote !'],
  ['Quelle phrase déclenche le plus de silence dans l’équipe ?', ['« On peut faire ça pour demain ? »', '« J’ai modifié un petit truc en prod. »', '« Le client veut repartir de zéro. »', '« On fait une réunion rapide ? »'], null, 20, 'À vous de défendre votre vote !'],
  ['Si GENIUS GROUPS était un gbaka…', ['Le CEO annoncerait trois nouvelles destinations en route.', 'Les devs optimiseraient le moteur pendant le trajet.', 'Les commerciaux rempliraient le véhicule avant son arrivée.', 'La finance demanderait qui a encaissé la recette.'], null, 20, 'À vous de défendre votre vote !'],
]

const TITLE_CI = 'On connaît papier ! 🇨🇮😂'

const QUESTIONS_CI: Q[] = [
  ['Quelle est la capitale politique de la Côte d’Ivoire ?', ['Abidjan', 'Bouaké', 'Yamoussoukro', 'San-Pédro'], 2, 20, null],
  ['Quel est l’ordre des couleurs du drapeau ivoirien, depuis la hampe ?', ['Vert, blanc, orange', 'Orange, blanc, vert', 'Blanc, orange, vert', 'Orange, vert, blanc'], 1, 20, null],
  ['Le garba, dans sa version classique, c’est…', ['Attiéké et thon frit', 'Riz et poulet', 'Alloco et œufs', 'Foutou et sauce graine'], 0, 20, 'Si tu rates ça, le vendeur garde ton supplément poisson.'],
  ['L’attiéké est fabriqué principalement à partir de…', ['Maïs', 'Igname', 'Riz', 'Manioc'], 3, 20, null],
  ['Quel est le surnom de l’équipe nationale ivoirienne de football ?', ['Les Lions', 'Les Éléphants', 'Les Aigles', 'Les Panthères'], 1, 20, null],
  ['Quelle fête nationale célèbre-t-on le 7 août en Côte d’Ivoire ?', ['La fête du Travail', 'La fête de la Musique', 'L’Indépendance', 'La fête des Mères'], 2, 20, null],
  ['Quel groupe ivoirien a interprété « Premier Gaou » ?', ['Magic System', 'Espoir 2000', 'Toofan', 'P-Square'], 0, 20, null],
  ['Alpha Blondy est principalement associé à quel genre musical ?', ['Jazz', 'Rap', 'Country', 'Reggae'], 3, 20, null],
  ['Quel artiste est surnommé « le Daïshikan » ?', ['A’Salfo', 'DJ Arafat', 'Meiway', 'Didi B'], 1, 20, null],
  ['Quel artiste ivoirien est associé au Zoblazo ?', ['Tiken Jah Fakoly', 'Serge Beynaud', 'Meiway', 'Kerozen'], 2, 20, null],
  ['Le groupe Toofan est originaire de quel pays ?', ['Côte d’Ivoire', 'Bénin', 'Ghana', 'Togo'], 3, 20, null],
  ['Combien de cordes possède généralement une guitare classique ?', ['6', '4', '8', '12'], 0, 20, 'Jouer de la guitare imaginaire en soirée ne compte pas comme formation musicale.'],
  ['Contre quel pays la Côte d’Ivoire a-t-elle remporté la finale de la CAN 2023, disputée en 2024 ?', ['Sénégal', 'Ghana', 'Nigeria', 'Cameroun'], 2, 20, null],
  ['Avec quel club Didier Drogba a-t-il remporté la Ligue des champions en 2012 ?', ['Marseille', 'Chelsea', 'Arsenal', 'Real Madrid'], 1, 20, null],
  ['Combien de joueurs une équipe de football aligne-t-elle au coup d’envoi, gardien compris ?', ['9', '10', '12', '11'], 3, 20, 'Les 14 experts devant la télé ne sont pas comptés dans l’équipe.'],
  ['Un joueur réalise un « hat-trick » lorsqu’il marque…', ['3 buts dans un match', '2 buts de la tête', 'Sur 3 matchs consécutifs', 'Depuis le milieu de terrain'], 0, 20, null],
  ['Quel pays a remporté la Coupe du monde masculine de football en 2022 ?', ['France', 'Brésil', 'Argentine', 'Allemagne'], 2, 20, null],
  ['Au basket, un lancer franc réussi vaut combien de points ?', ['2', '1', '3', '4'], 1, 20, null],
  ['Quel pays africain est le plus vaste par sa superficie ?', ['Nigeria', 'RDC', 'Afrique du Sud', 'Algérie'], 3, 20, null],
  ['Quelle planète est surnommée « la planète rouge » ?', ['Mars', 'Vénus', 'Jupiter', 'Saturne'], 0, 20, null],
  ['Quel océan borde la Côte d’Ivoire ?', ['Indien', 'Pacifique', 'Atlantique', 'Arctique'], 2, 20, null],
  ['Quel animal est le plus grand mammifère vivant ?', ['Éléphant d’Afrique', 'Baleine bleue', 'Girafe', 'Hippopotame'], 1, 20, null],
  ['Quelle langue est principalement parlée au Brésil ?', ['Espagnol', 'Français', 'Italien', 'Portugais'], 3, 20, null],
  ['Dans les films Marvel, de quel pays fictif vient Black Panther ?', ['Wakanda', 'Zamunda', 'Asgard', 'Genovia'], 0, 20, 'Abobo était une réponse ambitieuse, mais elle n’était pas proposée.'],
  ['Tu dépasses la personne en deuxième position dans une course. Tu es maintenant…', ['Premier', 'Troisième', 'Deuxième', 'Dernier'], 2, 20, null],
  ['Combien de mois de l’année ont au moins 28 jours ?', ['1', '12', '11', 'Ça dépend de l’année'], 1, 20, null],
  ['Qu’est-ce qui pèse le plus : 1 kg de fer ou 1 kg de coton ?', ['Le fer', 'Le coton', 'Ça dépend du sac', 'Ils pèsent autant'], 3, 20, null],
  ['Tu prends 3 mangues dans un panier de 10 mangues. Combien en as-tu prises ?', ['3', '7', '10', '13'], 0, 20, null],
  ['Un car électrique roule vers Bouaké. De quel côté part la fumée de son moteur électrique ?', ['À gauche', 'À droite', 'Il n’en produit pas', 'Vers Abidjan'], 2, 20, null],
  ['Le père de Mariam a trois filles : Awa, Fatou et…', ['Aminata', 'Mariam', 'Aya', 'Impossible à savoir'], 1, 20, 'La réponse était dans la question. Mais tu étais pressé de prendre les 1 000 points.'],
]

const TITLE = 'GENIUS GROUPS — Startup, garba & production 🚀'

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
  const quizzes: [string, string, Q[]][] = [
    [TITLE, '20 questions startup africaine pour rire et bader + 3 sondages sans points. GENIUS GROUPS SAS · Section EduTech.', QUESTIONS],
    [TITLE_CI, '30 questions pour jeunes Ivoiriens : pays, musique, football, culture générale et pièges. 5 manches de 6 questions.', QUESTIONS_CI],
  ]
  for (const [title, description, questions] of quizzes) {
    const exists = await prisma.quiz.findFirst({ where: { teacherId: teacher.id, title } })
    if (exists) {
      console.log(`Déjà présent, ignoré : ${title}`)
      continue
    }
    await prisma.quiz.create({
      data: {
        teacherId: teacher.id,
        title,
        description,
        questions: {
          create: questions.map(([text, options, correctIndex, durationSec, explanation], position) => ({
            position, text, options, correctIndex, durationSec, explanation,
          })),
        },
      },
    })
    console.log(`Créé : ${title} (${questions.length} questions dont ${questions.filter((q) => q[2] === null).length} sondages)`)
  }
  console.log(`\nCompte professeur : ${email}`)
}
main().finally(() => prisma.$disconnect())
