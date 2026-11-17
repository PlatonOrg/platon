# Raccourcis clavier : l'action principale au clavier

Issue : [#660](https://github.com/PlatonOrg/platon/issues/660). Cette spec s'appuie sur la règle de
la nouvelle interface de l'upstream (`cisstech/platon`, `design/docs/04-direction.md`) : « une
action principale par surface, toujours au même endroit ». Le raccourci clavier en est la suite
directe : puisqu'une surface n'a qu'une action principale, une seule touche suffit pour la lancer.

## Deux raccourcis, selon ce que fait l'action

| Raccourci                       | Nature de l'action                                                                                    | Exemples                                                                                   |
| ------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **⌘↵** (macOS), **Ctrl+Entrée** | Faire avancer ou soumettre : on passe à la suite, on valide, on crée, on déplace.                     | Suivant, Créer, Déplacer, Valider la réponse, Publier une version                          |
| **⌘S** (macOS), **Ctrl+S**      | Conserver l'état : rien ne change de page, rien n'est soumis, l'action peut être répétée sans risque. | Enregistrer, Sauvegarder (paramètres, informations d'une ressource, réponse d'un exercice) |

Le raccourci suit la nature de l'action, pas la couleur du bouton. Un bouton Enregistrer répond à
⌘S même s'il n'est pas l'action principale de la surface (pied de formulaire, bouton secondaire).

## Règles

1. **⌘↵ lance l'action `submit` de la surface active.** Si cette surface n'a pas d'action
   `submit`, ⌘↵ lance son action `save` (règle tolérante : qui a pris l'habitude « bouton
   principal = ⌘↵ » n'est jamais bloqué, et enregistrer est sans risque). Le bouton affiche
   quand même ⌘S.
2. **⌘S lance l'action `save` de la surface active**, jamais une action `submit`.
3. **La surface active** est la plus proche du focus. Les surfaces sont la page, les dialogues
   (`role="dialog"`) et les zones marquées comme surfaces (un exercice dans le lecteur, l'aperçu
   de l'atelier). Si la surface du focus n'a aucune action du type demandé, on remonte vers la
   surface qui la contient, jusqu'à la page.
4. **Un dialogue ouvert garde le clavier.** Tant qu'il est ouvert, seules ses actions répondent,
   même si le focus est ailleurs ; on ne remonte jamais au-delà.
5. **Bouton unique sur la page.** Quand aucune surface sur le chemin n'a d'action, et que la page
   entière n'en montre qu'une seule de ce type, c'est celle-ci qui est lancée. C'est le cas
   courant de l'issue : un exercice seul sur la page se valide sans chercher le bouton.
6. **Jamais de choix arbitraire.** Deux actions du même type dans la même surface : rien ne se
   passe. Une action désactivée ou en cours (chargement) : rien ne se passe.
7. **Seules les actions visibles comptent.** Un bouton masqué, hors du rendu ou sous `inert` ne
   répond pas.
8. **⌘S n'ouvre jamais la fenêtre « Enregistrer la page sous » du navigateur** sur un écran qui a
   une action `save`, même si elle est désactivée ou en concurrence avec une autre. Ailleurs,
   le navigateur garde son comportement.
9. **Ce qui a déjà traité la touche a la priorité.** Un éditeur de code, un champ de commentaire
   ou un composant qui gère lui-même ⌘↵ (et appelle `preventDefault`) n'est pas doublé. Le
   raccourci ne se déclenche pas pendant une composition (IME) ni quand la touche est maintenue.
10. **Le dernier essai ne se valide pas au clavier.** Quand il ne reste qu'une tentative,
    « Valider la réponse » n'a pas de raccourci : l'action irréversible reste un clic délibéré.
    Par la règle tolérante, ⌘↵ sauvegarde alors la réponse (quand Sauvegarder est proposé) : la
    touche ne perd rien et ne soumet rien.

## Montrer le raccourci

- Le bouton porte `aria-keyshortcuts` (`Meta+Enter`, `Control+Enter`, `Meta+S`, `Control+S`
  selon la plateforme), comme le bouton Valider de l'écran Corrections de la nouvelle interface.
- Le bouton porte une infobulle « Raccourci clavier : ⌘↵ » (ou « Ctrl+Entrée »), sauf s'il a déjà
  sa propre infobulle.

## Cas de l'issue et état

| Écran                                                     | Action                         | Raccourci | État                                                                   |
| --------------------------------------------------------- | ------------------------------ | --------- | ---------------------------------------------------------------------- |
| Assistants de création (ressource, cours, activité, test) | Suivant / Créer                | ⌘↵        | Fait. Corrige aussi Ctrl+Entrée, qui ne marchait pas hors macOS        |
| Déplacer une ressource                                    | Déplacer                       | ⌘↵        | Fait                                                                   |
| Informations d'une ressource                              | Sauvegarder                    | ⌘S (⌘↵)   | Fait. Le bouton garde son libellé et tourne pendant l'enregistrement   |
| Lecteur, un exercice                                      | Valider la réponse             | ⌘↵        | Fait. Chaque exercice est une surface                                  |
| Lecteur, un exercice                                      | Sauvegarder la réponse         | ⌘S        | Fait                                                                   |
| Lecteur, commentaires                                     | Envoyer le commentaire         | ⌘↵        | Fait. Corrige Ctrl+Entrée hors macOS, n'atteint plus le Valider        |
| Éditeur de code                                           | Enregistrer puis prévisualiser | ⌘↵        | Existait déjà (commande de l'éditeur, qui enregistre avant l'aperçu)   |
| Aperçu (éditeur, atelier)                                 | Valider la réponse             | ⌘↵        | Fait via le lecteur : l'aperçu est une iframe, son clavier est le sien |
| Atelier (builder) et ses paramètres                       | Enregistrer                    | ⌘S        | Déjà en place, gestion propre à l'écran. À migrer, voir plus bas       |

## Mise en œuvre

- `libs/shared/ui/src/shortcuts` : le service `UiShortcutService` (un seul écouteur `keydown`
  sur le document) et deux directives.
  - `uiShortcut="submit" | "save"` sur le bouton de l'action ;
  - `uiShortcutSurface` sur un conteneur qui forme sa propre surface (les dialogues le sont
    déjà par leur `role`).
- Un écran ne déclare plus d'écouteur `window:keydown` pour ces deux raccourcis : il marque son
  bouton. Le raccourci passe par un `click()` sur le bouton, donc exactement le même chemin que
  la souris (validation du formulaire, état désactivé, chargement).
- Dans la nouvelle interface, le `Button` du design system (`variant="primary"`) pourra porter
  la même directive : le comportement suivra les écrans au fil du portage.

## Points ouverts

- **Atelier (builder).** ⌘S y est géré par l'écran et ses paramètres, avec une priorité entre les
  deux boutons Enregistrer. À migrer avec la refonte de l'atelier de la nouvelle interface, où
  l'aperçu garde son Valider en action principale (une surface) et Enregistrer répond à ⌘S
  depuis n'importe où.
- **Exercices avec un éditeur de code.** L'éditeur (Monaco) garde Ctrl+Entrée pour lui (insérer
  une ligne) : ⌘↵ y insère une ligne au lieu de valider. À trancher : désactiver ce raccourci de
  l'éditeur dans le lecteur, ou garder le comportement de l'éditeur.
- **« Exercice suivant » dans le lecteur.** Il n'a pas de raccourci : il serait en concurrence avec
  Valider. Une suite possible : après une validation réussie, ⌘↵ passe à l'exercice suivant.
- **⌘S sans rien à enregistrer.** Le bouton désactivé ne fait rien ; une confirmation discrète
  « Déjà enregistré » serait plus parlante.
- **Upstream.** Proposer la règle et l'infobulle à `cisstech/platon`, pour que les écrans portés
  la gardent.
