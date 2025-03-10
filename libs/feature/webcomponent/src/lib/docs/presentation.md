# Introduction aux composants

## Prérequis

Avant de commencer, il est supposé que vous avez une connaissance de base en [HTML, CSS](https://www.w3schools.com/) et que vous êtes familiarisé avec la documentation de PLaTon. Des compétences en JavaScript et Python pourraient également vous être utiles.

## Qu'est-ce que le Framework de Composants ?

Le Framework de Composants est une boîte à outils d'interface utilisateur pour construire des exercices performants, complexes et esthétiques. Un composant implémente et encapsule un comportement complexe qui peut ensuite être réutilisé à plusieurs endroits d'un exercice.

## Objectifs

- **Basé sur les standards du web** : Les composants sont construits sur la base des dernières technologies web standardisées, ce qui leur permet de fonctionner sur tous les navigateurs modernes.

- **Encapsulation** : Un aspect important des composants est leur encapsulation. La structure (HTML), le style (CSS) et le comportement (JS) d'un composant sont isolés des autres codes de la page, évitant ainsi les conflits.

- **Simplicité** : Les composants sont conçus pour être simples d'utilisation, rendant la création d'exercices accessible à quiconque avec un minimum de connaissances en programmation. Certains composants offrent des fonctionnalités d'auto-correction.

- **Réutilisabilité** : Tous les composants sont réutilisables sans avoir besoin d'étendre un fichier. Vous fournissez vos données et le composant s'affiche de lui-même.

- **Extensibilité** : Le framework est conçu pour être extensible, vous pouvez donc personnaliser les styles, les animations et les propriétés des composants.

## Comment ça marche ?

Généralement, lorsqu'un enseignant souhaite créer un exercice, il réfléchit aux points suivants :

- Quelles données présenter à l'étudiant ?
- Que verra visuellement l'étudiant ?
- Comment créer l'interface utilisateur complexe ?
- Comment gérer les actions de l'étudiant sur les données pour évaluer la réponse ?

Le Framework de Composants utilise le motif de conception MVC pour répondre à ces questions.

- **Modèle** : Le modèle d'un composant sont les propriétés (données) qui définissent le composant. Les propriétés doivent être spécifiées au format JSON. Par exemple, le modèle du composant `SortList` est un tableau d'éléments à trier.

- **Vue** : La vue d'un composant est le sélecteur HTML qui permet de le rendre sur la page. Chaque composant a son propre sélecteur HTML. Tous les sélecteurs commencent par le préfixe `wc-`. Par exemple, `<wc-sort-list></wc-sort-list>` est le sélecteur du composant `SortList`.

- **Contrôleur** : Le contrôleur d'un composant est le framework lui-même. Durant le cycle de vie d'un exercice, le framework suit les modifications apportées par l'enseignant à un composant et les actions de l'étudiant sur celui-ci.

## Exemple de composant

Le widget suivant est le résultat du composant `MatchList` avec son modèle de données affiché en JSON.
Ce composant permet d'associer des éléments entre eux en faisant du glisser-déposer, vous pouvez le manipuler pour voir les changements du modèle en temps réél.

<wc-match-list data-script-id="mycid" cid="mycid"></wc-match-list>

<script type="application/json" id="mycid">
{
  "nodes": [
    {
      "id": "Node1",
      "type": "source",
      "content": "trois champs nom(char*), prénom(char*) et age(int)"
    },
    {
      "id": "Node2",
      "type": "source",
      "content": "Une matrice rectangulaire m par n (deux entiers)"
    },
    {
      "id": "Node3",
      "type": "source",
      "content": "Un noeud d'arbre de personnes (char* nom et char* prénom)"
    },
    {
      "id": "Node4",
      "type": "source",
      "content": "Une chaine (char[64]) de moins de 63 caractère"
    },
    {
      "id": "Node5",
      "type": "source",
      "content": "Une cellule de liste chaînée de floatant"
    },

    {
      "id": "Node6",
      "type": "target",
      "content": "trois mallocs"
    },
    {
      "id": "Node7",
      "type": "target",
      "content": "un malloc puis malloc dans un for"
    },
    {
      "id": "Node8",
      "type": "target",
      "content": "deux mallocs"
    },
    {
      "id": "Node9",
      "type": "target",
      "content": "aucun malloc"
    },
    {
      "id": "Node10",
      "type": "target",
      "content": "un malloc"
    }
  ],
  "debug": true
}
</script>

## Comment contribuer ?

Si vous souhaitez contribuer et ajouter votre propre composant ou améliorer un composant éxistant, suivez les étapes ci-dessous :

1. **Fork du dépôt GitHub** : Rendez-vous sur notre [dépôt GitHub](https://github.com/PlatonOrg/platon) et faites un fork du projet.

2. **Clonez votre fork** : Clonez le dépôt forké sur votre machine locale.

   ```bash
   git clone https://github.com/[votre-utilisateur]/platon.git
   cd platon
   ```

3. **Créez une nouvelle branche** : Créez une nouvelle branche pour votre fonctionnalité ou correctif.

   ```bash
   git checkout -b [ma-nouvelle-fonctionnalite]
   ```

4. **Ajoutez votre composant** : Vous pouvez vous inspirer des [composants](https://github.com/PlatonOrg/platon/tree/main/libs/feature/webcomponent/src/lib) éxistants pour créer le votre. Vous pouvez suivre la structure et les conventions utilisées dans le projet. Voici les étapes pour créer un composant :

   - **Définissez l'interface de l'état du composant** : Créez une interface pour définir les propriétés de l'état du composant.

     ```typescript
     export interface MyComponentState extends IWebComponent {
       // Définissez les propriétés de l'état ici
     }
     ```

   - **Définissez le composant** : Utilisez `defineWebComponent` pour définir le composant.

     ```typescript
     export const MyComponentDefinition = defineWebComponent({
       type: WebComponentTypes.form,
       name: 'MyComponent',
       // Autres propriétés de définition
     })
     ```

   - **Créez le composant Angular** : Créez un composant Angular avec les fichiers `.ts`, `.html` et `.scss`.

   Votre composant doit implémenter l'interface `WebComponentHooks` et utiliser le décorateur `@WebComponent` pour définir le composant.
   Vous pouvez aussi utiliser le service `WebComponentService` pour gérer les interactions avec le composant.

   ```typescript
   @Component({
     selector: 'wc-my-component',
     templateUrl: 'my-component.component.html',
     styleUrls: ['my-component.component.scss'],
     changeDetection: ChangeDetectionStrategy.OnPush,
   })
   @WebComponent(MyComponentDefinition)
   export class MyComponent implements WebComponentHooks<MyComponentState> {
     @Input() state!: MyComponentState
     @Output() stateChange = new EventEmitter<MyComponentState>()

     // Implémentez les méthodes nécessaires
   }
   ```

   - **Ajoutez le module Angular** : Créez un module Angular pour votre composant.

     ```typescript
     @NgModule({
       declarations: [MyComponent],
       imports: [CommonModule, FormsModule, MatRadioModule],
       exports: [MyComponent],
     })
     export class MyComponentModule implements IDynamicModule {
       component: Type<unknown> = MyComponent
     }
     ```

   - **Enregistrez votre composant** : Enregistrez votre composant dans le fichier [`web-component-registry.ts`](https://github.com/PlatonOrg/platon/blob/main/libs/feature/webcomponent/src/lib/web-component-registry.ts)

   ```typescript
   // Les autres imports
   import { MyComponentDefinition } from './[forms|widget]/my-component/my-component'

   export const WEB_COMPONENTS_BUNDLES: NgeElementDef[] = [
     // Les autres composants
     {
       selector: 'wc-my-component',
       module: () =>
         import(/* webpackChunkName: "wc-my-component" */ './[forms|widget]/my-component/my-component.module').then(
           (m) => m.MyComponentModule
         ),
     },
   ]

   export const WEB_COMPONENTS_REGISTRY: Provider[] = [
     // Les autre composants
     {
       provide: WEB_COMPONENT_DEFINITIONS,
       multi: true,
       useValue: MyComponentDefinition,
     },
   ]
   ```

   - **Ajoutez la documentation** : Documentez votre composant dans un fichier Markdown.

5. **Testez votre composant** : Assurez-vous que votre composant fonctionne correctement et ajoutez des tests si nécessaire.

6. **Commitez vos changements** : Commitez vos modifications avec un message de commit clair.

   ```bash
   git add .
   git commit -m "feat(webcomponent): ajout du composant MyComponent"
   ```

7. **Poussez votre branche** : Poussez votre branche sur votre fork.

   ```bash
   git push origin [ma-nouvelle-fonctionnalite]
   ```

8. **Ouvrez une Pull Request** : Allez sur le dépôt original et ouvrez une Pull Request depuis votre fork. Décrivez les changements que vous avez effectués et pourquoi ils sont nécessaires.

9. **Demandez de l'aide** : Si vous avez besoin d'aide, n'hésitez pas à ouvrir une issue sur notre [dépôt GitHub](https://github.com/PlatonOrg/platon/issues) ou à nous contacter sur [Discord](https://discord.gg/GzgzRAAeP6).

Nous sommes impatients de voir vos contributions !
