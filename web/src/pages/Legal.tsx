import { Link, useNavigate } from 'react-router-dom'
import { Logo, Screen } from '../components/ui'

const CGU = {
  title: 'Conditions d’utilisation',
  sections: [
    ['Le service', 'eUniversité Quiz permet à un enseignant de créer des quiz et de les animer en direct en classe. Les étudiants participent depuis leur téléphone, sans compte ni installation.'],
    ['Le compte enseignant', 'Vous êtes responsable de la confidentialité de vos identifiants et des contenus que vous publiez. Un compte est personnel : ne partagez pas votre accès.'],
    ['Utilisation acceptable', 'Le service est destiné à l’animation pédagogique. Toute utilisation visant à perturber le service, collecter des données sans consentement ou porter atteinte aux droits d’autrui est interdite.'],
    ['Contenus', 'Vous conservez la propriété de vos quiz et des résultats de vos sessions. Vous garantissez disposer des droits nécessaires sur les contenus diffusés.'],
    ['Disponibilité', 'Le service est fourni en l’état. GENIUS GROUPS SAS s’efforce d’assurer sa disponibilité sans garantie de continuité.'],
    ['Contact', 'Pour toute question : GENIUS GROUPS SAS · Section EduTech — eUniversité, Votre Campus Connecté.'],
  ],
}

const PRIVACY = {
  title: 'Politique de confidentialité',
  sections: [
    ['Données collectées', 'Enseignant : nom, adresse e-mail, mot de passe (stocké uniquement sous forme chiffrée), quiz et sessions. Étudiant : prénom, nom et matricule déclarés lors de la session, ainsi que les réponses données.'],
    ['Finalité', 'Ces données servent exclusivement au fonctionnement des quiz en direct : animation, notation, classement et résultats consultés par l’enseignant.'],
    ['Étudiants', 'Le nom complet et le matricule ne sont visibles que de l’enseignant de la session. Seul le nom public (prénom et initiale du nom) est affiché au classement. Aucun compte n’est requis.'],
    ['Conservation', 'Les données sont conservées pendant la durée d’utilisation du service. Un enseignant peut demander la suppression de son compte et des données associées.'],
    ['Partage', 'Aucune donnée n’est vendue ni partagée à des tiers à des fins commerciales. Les sous-traitants techniques éventuels (hébergement, e-mails) sont limités au strict nécessaire.'],
    ['Vos droits', 'Vous pouvez demander l’accès, la rectification ou la suppression de vos données auprès de GENIUS GROUPS SAS · Section EduTech.'],
  ],
}

export default function Legal({ kind }: { kind: 'cgu' | 'privacy' }) {
  const nav = useNavigate()
  const doc = kind === 'cgu' ? CGU : PRIVACY
  return (
    <Screen>
      <div className="mb-6 mt-4 flex flex-col items-center gap-2"><Link to="/"><Logo className="h-10" /></Link><h1 className="text-2xl font-extrabold">{doc.title}</h1><p className="text-sm text-ink-soft">eUniversité Quiz — Dernière mise à jour : octobre 2026</p></div>
      <div className="card space-y-5">
        {doc.sections.map(([t, body]) => (
          <section key={t}><h2 className="font-bold">{t}</h2><p className="mt-1 leading-relaxed text-ink-soft">{body}</p></section>
        ))}
      </div>
      <p className="mt-4 text-center"><button type="button" className="font-semibold text-ink-soft underline" onClick={() => nav(-1)}>← Retour</button></p>
    </Screen>
  )
}
