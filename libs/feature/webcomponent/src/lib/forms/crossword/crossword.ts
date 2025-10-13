import { defineWebComponent, IWebComponent, WebComponentTypes } from '../../web-component'

export interface Words {
  clue : string,
  answer : string,
}

export interface ResultPLE {
  answer : string,
  number : number,
}

export interface CrosswordState extends IWebComponent {
  appearance: 'outline' | 'inline', // inline definion and crossword are side by side, outline definition is on the top
  cellSize: number,
  words: Words[],
  definition: boolean,
  disabled : boolean,
  results : ResultPLE[],
  grid : string[][],
  correctionColor : boolean,
}

export const CrosswordComponentDefinition = defineWebComponent({
  type: WebComponentTypes.form,
  name: 'Crossword',
  selector: 'wc-crossword',
  description:
    "Composant de grille interactive de mots croisés. Conçu pour la saisie mot par mot, il est idéal pour les exercices de vocabulaire ciblés et l'association terme-définition.",
  schema: {
    $schema: 'http://json-schema.org/draft-07/schema',
    type: 'object',
    title: 'Crossword',
    properties: {
      appearance: {
        type: 'string',
        default: 'inline',
        description: "L'alignement des définitions et du mot croisé.",
        enum: ['outline', 'inline'],
      },
      cellSize: {
        type: 'number',
        default: 30,
        description : "La taille des cellules de la grille à remplir.",
      },
      disabled: {
        type: 'boolean',
        default: false,
        description: 'Désactiver le champ de saisi?',
      },
      words: {
        type: 'array',
        default : [],
        description : 'Liste des mots et de leurs définitions.',
        items: {
          type : "object",
          description : 'Liste des mots et de leurs définition.',
          properties : { 'clue' : { type : 'string'}, 'answer' : {type : 'string'}},
        },
      },
      results: {
        type : 'array',
        default : [],
        description : 'Réponses de l\'apprenant.',
        items:{
          type : "object",
          description : "La réponse et le numéro de la définition.",
          properties : {'answer': {type : 'string'}, 'number': {type : 'number'}}
        }
      },
      definition:{
        type: 'boolean',
        default: true,
        description : 'Affiche les définitions si activé'
      },
      correctionColor:{
        type: 'boolean',
        default: false,
        description : 'Colorie la case de la grille pour indiquer si la saisie est correcte ou non.'
      },
      grid:{
        type : 'array',
        default :[],
        description : 'Grille ligne par ligne contenant les caractéres à aficher.',
        items : {
          type : 'array',
          default: [],
          items : {
            type : 'string',
            default : '',
            description : 'Caractère à placer dans la grille de mots croisés. \'-\' permet de ne pas afficher la case.'
          },
        }
      }
    },
  },
  showcase: {
    appearance: "outline",
    cellSize: 40,
    words: [  {
      "clue": "Contraire de 'vrai'",
      "answer": "faux"
    },
    {
      "clue": "Organe de la pensée, logé dans le crâne",
      "answer": "cerveau"
    },
    {
      "clue": "Chiffre entre quatre et six",
      "answer": "cinq"
    },
    {
      "clue": "L'endroit où l'on achète des livres",
      "answer": "librairie"
    },
    {
      "clue": "Nom d'un félin rayé",
      "answer": "tigre"
    }],
  },
  playgrounds: {
  },
})
