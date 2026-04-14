import { Injectable } from '@angular/core'
import { ShepherdService, TutorialStep } from './shepherd/shepherd.service'
import { User } from '@platon/core/common'
import { Resource, ResourceStatus, ResourceTypes } from '@platon/feature/resource/common'

@Injectable({
  providedIn: 'root',
})
export class ResourcePageTutorialService {
  constructor(private shepherdService: ShepherdService) {}

  startResourcePageTutorial(resource: Resource, isOwner: boolean, isMember: boolean, isWatcher: boolean): void {
    const steps = this.buildTutorialSteps(resource, isOwner, isMember, isWatcher)

    this.shepherdService.startTutorial(steps, {
      tourName: 'resource-page-tutorial',
      useModalOverlay: true,
      confirmCancel: true,
      confirmCancelMessage: 'Voulez-vous vraiment quitter le tutoriel de la page ressource ?',
    })
  }

  private buildTutorialSteps(
    //user: User,
    resource: Resource,
    isOwner: boolean,
    isMember: boolean,
    isWatcher: boolean
  ): TutorialStep[] {
    const steps: TutorialStep[] = [
      {
        id: 'welcome',
        title: `Bienvenue sur la page de ${resource.type === 'CIRCLE' ? 'ce cercle' : 'cette ressource'} !`,
        text: `Découvrons ensemble les fonctionnalités disponibles pour ${this.getResourceTypeText(
          resource.type
        )}. Ce tutoriel vous montrera comment interagir avec cette ressource.`,
        buttons: [
          {
            text: 'Passer le tutoriel',
            secondary: true,
            action: () => this.shepherdService.cancel(),
          },
          {
            text: 'Commencer le tutoriel',
            action: () => this.shepherdService.next(),
          },
        ],
      },
      {
        id: 'breadcrumb',
        title: 'Navigation',
        text: "Le fil d'Ariane vous montre où vous êtes dans la hiérarchie. Vous pouvez cliquer sur le parent pour remonter d'un niveau ou sur l'icône d'arbre pour voir la structure complète.",
        attachTo: {
          element: '#tuto-breadcrumb',
          on: 'bottom',
        },
      },
      {
        id: 'resource-name',
        title: 'Nom de la ressource',
        text: isOwner
          ? 'En tant que propriétaire, vous pouvez modifier le nom en cliquant dessus.'
          : 'Voici le nom de la ressource. Seul le propriétaire peut le modifier.',
        attachTo: {
          element: '#tuto-resource-name-item',
          on: 'bottom',
        },
      },
      {
        id: 'description',
        title: 'Description',
        text: isOwner
          ? 'Cliquez sur la description pour la modifier et donner plus de contexte sur votre ressource.'
          : "La description vous donne des informations sur le contenu et l'objectif de cette ressource.",
        attachTo: {
          element: '#tuto-resource-description',
          on: 'bottom',
        },
      },
      {
        id: 'status',
        title: 'Statut de la ressource',
        text: this.buildStatusText(resource.status, isOwner),
        attachTo: {
          element: '#tuto-status',
          on: 'bottom',
        },
      },
    ]

    steps.push({
      id: 'watch-button',
      title: isWatcher ? 'Ne plus suivre' : 'Suivre la ressource',
      text: isWatcher
        ? 'Vous suivez actuellement cette ressource. Cliquez pour ne plus recevoir de notifications lors des mises à jour.'
        : "Suivre une ressource vous permet de l'ajouter dans vos cours/activités et de recevoir des notifications lors des mises à jour.",
      attachTo: {
        element: '#tuto-watch-button',
        on: 'bottom',
      },
    })

    if (resource.type === 'CIRCLE' && !isOwner && !isMember) {
      steps.push({
        id: 'join-button',
        title: 'Rejoindre le cercle',
        text: 'Cliquez ici pour demander à rejoindre ce cercle. Le propriétaire recevra une notification et pourra accepter ou refuser votre demande.',
        attachTo: {
          element: '#tuto-join-button',
          on: 'bottom',
        },
      })
    }

    steps.push({
      id: 'action-buttons',
      title: 'Actions disponibles',
      text: this.buildActionsText(resource, isOwner),
      attachTo: {
        element: '#tuto-resource-actions',
        on: 'top',
      },
    })

    // Si ce n'est pas un cercle, ajouter les boutons spécifiques
    if (resource.type !== 'CIRCLE') {
      steps.push(
        {
          id: 'share-button',
          title: 'Partager',
          text: "Partagez cette ressource avec d'autres utilisateurs ou cercles en définissant des permissions spécifiques.",
          attachTo: {
            element: '#tuto-share-button',
            on: 'left',
          },
        },
        {
          id: 'preview-button',
          title: 'Prévisualiser',
          text: "Testez la ressource pour voir comment elle fonctionne avant de l'utiliser dans vos cours.",
          attachTo: {
            element: '#tuto-preview-button',
            on: 'left',
          },
        }
      )
    }

    // Onglets de navigation
    steps.push(
      {
        id: 'tabs',
        title: 'Navigation par onglets',
        text: `<div style="text-align: center; padding: 20px;">
           <h4>Navigation par onglets</h4>
           <p>Cette ressource est organisée en plusieurs sections accessibles via les onglets ci-dessous :</p>

           <div style="text-align: left; margin: 20px 0;">
             <p><strong>Vue d'ensemble</strong> : Statistiques et informations générales</p>
             <p><strong>Explorer</strong> : ${
               resource.type === 'CIRCLE' ? 'Contenu du cercle' : 'Fichiers et contenu'
             }</p>
             <p><strong>Événements</strong> : Historique des modifications</p>
             <p><strong>Paramètres</strong> : Configuration et permissions</p>
           </div>

           <p style="font-size: 14px; color: var(--brand-text-secondary);">
             Cliquez sur chaque onglet pour explorer les différentes sections !
           </p>
         </div>`,
        attachTo: {
          element: '#tuto-resource-tabs',
          on: 'bottom',
        },
        when: {},
      },
      {
        id: 'tutorial-complete',
        title: 'Tutoriel terminé !',
        text: this.buildCompletionText(resource),
        buttons: [
          {
            text: 'Terminer',
            action: () => this.shepherdService.complete(),
          },
        ],
      }
    )

    return steps
  }

  private getResourceTypeText(type: ResourceTypes): string {
    switch (type) {
      case 'CIRCLE':
        return 'ce cercle'
      case 'EXERCISE':
        return 'cet exercice'
      case 'ACTIVITY':
        return 'cette activité'
      default:
        return 'cette ressource'
    }
  }

  /**
   * Construit le texte d'explication du statut
   */
  private buildStatusText(status: ResourceStatus, isOwner: boolean): string {
    const statusDescriptions: Record<ResourceStatus, string> = {
      DRAFT: "La ressource est en cours de création et n'est pas encore prête.",
      READY: 'La ressource est prête à être utilisée !',
      BUGGED: 'La ressource contient des bugs connus qui doivent être corrigés.',
      NOT_TESTED: "La ressource n'a pas encore été testée et nécessite une validation.",
      DEPRECATED: 'La ressource est obsolète et ne devrait plus être utilisée.',
    }

    let text = `<strong>Statut actuel :</strong> ${statusDescriptions[status]}`

    if (isOwner) {
      text += "<br><br>En tant que propriétaire, vous pouvez changer le statut selon l'état de votre ressource."
    }

    return text
  }

  private buildActionsText(resource: Resource, isOwner: boolean): string {
    let text = '<strong>Actions disponibles :</strong><br><br>'

    const actions = []

    if (isOwner && resource.type !== 'CIRCLE') {
      actions.push('<strong>Supprimer</strong> : Retirer définitivement la ressource')
    }

    if (resource.type === 'EXERCISE' && isOwner) {
      actions.push("<strong>Déplacer</strong> : Changer l'emplacement de l'exercice")
    }

    actions.push("<strong>Ouvrir dans l'éditeur</strong> : Modifier le contenu de la ressource")

    if (resource.type !== 'CIRCLE') {
      actions.push("<strong>Partager</strong> : Donner accès à d'autres utilisateurs")
      actions.push('<strong>Prévisualiser</strong> : Tester la ressource')
    }

    text += actions.join('<br>')

    return text
  }

  /**
   * Construit le texte de fin de tutoriel
   */
  private buildCompletionText(resource: Resource): string {
    return `
      <div style="text-align: center; padding: 20px;">
        <div style="font-size: 48px; margin-bottom: 20px;">🎉</div>
        <h3 style="margin-bottom: 16px;">Bravo ! Vous maîtrisez maintenant cette page.</h3>

        <div style="text-align: left; max-width: 400px; margin: 0 auto;">
          <p style="margin-bottom: 16px;">Vous savez maintenant :</p>
          <ul style="list-style: none; padding: 0;">
            <li style="margin-bottom: 8px;">- Naviguer dans la hiérarchie des ressources</li>
            <li style="margin-bottom: 8px;">- Comprendre et modifier le statut</li>
            <li style="margin-bottom: 8px;">- Suivre les ressources pour recevoir des notifications</li>
            ${resource.type === 'CIRCLE' ? '<li style="margin-bottom: 8px;">- Rejoindre des cercles</li>' : ''}
            <li style="margin-bottom: 8px;">- Utiliser les actions disponibles</li>
            <li style="margin-bottom: 8px;">- Explorer les différents onglets</li>
          </ul>
        </div>

        <p style="margin-top: 16px; font-size: 14px; color: #666;">
          N'hésitez pas à explorer les différents onglets pour découvrir toutes les fonctionnalités !
        </p>
      </div>
    `
  }
}
