import { EditorJsData } from './tests.model'

export const defaultTerms: EditorJsData = {
  blocks: [
    {
      id: 'nPndLj1PoF',
      data: { text: 'Bienvenue sur le test {{ testName }}', level: 2 },
      type: 'header',
      tunes: { textVariant: '', textAlignment: { alignment: 'left' } },
    },
    {
      id: '8pPVTO8v0Z',
      data: {
        text: "Vous êtes sur le point de commencer une épreuve individuelle d'une durée de {{ duration }}. Ce test est personnel et soumis à des règles strictes de surveillance automatique. Veuillez lire attentivement les consignes suivantes pour éviter tout blocage prématuré de votre session.",
      },
      type: 'paragraph',
      tunes: { textVariant: '', textAlignment: { alignment: 'left' } },
    },
    { id: 'dRZyD5hZVZ', data: {}, type: 'delimiter' },
    {
      id: 'ClAPP60eq7',
      data: { text: 'Règles importantes à respecter', level: 2 },
      type: 'header',
      tunes: { textVariant: '', textAlignment: { alignment: 'left' } },
    },
    {
      id: 'mzZZ-0oKIe',
      data: {
        items: [
          {
            items: [],
            content:
              "Restez dans cet onglet pendant toute la durée de l'épreuve. Passer à un autre onglet, réduire la fenêtre ou changer d'application entraînera l'arrêt immédiat du test.",
          },
          {
            items: [],
            content:
              "Ne rechargez pas la page. Cela pourrait provoquer la perte de vos réponses et l'arrêt de la session.",
          },
          {
            items: [],
            content:
              'Utilisez un ordinateur avec une connexion stable. Évitez de passer le test sur un téléphone ou une tablette.',
          },
          {
            items: [],
            content:
              "Fermez les autres applications ou notifications susceptibles de vous distraire ou d'interférer avec la surveillance automatique.",
          },
        ],
        style: 'unordered',
      },
      type: 'list',
    },
    { id: '7cM2xDoCN7', data: {}, type: 'delimiter' },
    {
      id: 'RblkzVEg89',
      data: { text: 'Conseils pour bien réussir', level: 2 },
      type: 'header',
      tunes: { textVariant: '', textAlignment: { alignment: 'left' } },
    },
    {
      id: 'tDexDUNXxP',
      data: {
        items: [
          { items: [], content: 'Installez vous dans un environnement calme, sans interruption.' },
          { items: [], content: 'Assurez-vous que votre ordinateur est branché ou suffisamment chargé.' },
          { items: [], content: 'Prenez quelques instants pour respirer et vous concentrer avant de commencer.' },
        ],
        style: 'unordered',
      },
      type: 'list',
    },
    { id: 'rsEch8F3MC', data: {}, type: 'delimiter' },
    {
      id: 'U4yQFFelnd',
      data: { text: "Déclaration sur l'honneur", level: 2 },
      type: 'header',
      tunes: { textVariant: '', textAlignment: { alignment: 'left' } },
    },
    {
      id: '7NVW7ChjX5',
      data: {
        text: "Je soussigné {{ lastName }} {{ firstName }}, atteste sur l’honneur que je passe le test suivant seul (sans aide), en personne (pas quelqu'un d'autre), et aujourd'hui {{ date }}. J'affirme avoir lu les règles ci-dessus. J'ai connaissance qu'un test de niveau me sera exigé en présentiel si mon dossier est accepté. Et qu'un échec à ce second test pourra invalider mon inscription si le résultat de celui ci est trop inférieur au présent test que je passe aujourd'hui. Que toute tentative de passer plusieurs fois le test dans une même session de sélection est éliminatoire. J’ai connaissance des sanctions pénales encourues par l’auteur en cas de fausse déclaration sur l’honneur.",
      },
      type: 'paragraph',
      tunes: { textVariant: '', textAlignment: { alignment: 'left' } },
    },
  ],
}
