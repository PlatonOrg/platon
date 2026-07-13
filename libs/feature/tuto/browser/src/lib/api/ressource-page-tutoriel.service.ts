import { Injectable } from '@angular/core'
import { ShepherdService, TutorialStep } from './shepherd/shepherd.service'
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
    resource: Resource,
    isOwner: boolean,
    isMember: boolean,
    isWatcher: boolean
  ): TutorialStep[] {
    const resourceLabel = resource.type === 'CIRCLE' ? 'ce cercle' : 'cette ressource'

    const steps: TutorialStep[] = [
      {
        id: 'welcome',
        title: `Page de ${resource.type === 'CIRCLE' ? 'cercle' : 'ressource'}`,
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Ce tutoriel vous présente les fonctionnalités disponibles pour interagir avec
                 <strong style="color: var(--brand-text-primary);">${resourceLabel}</strong>.
               </p>
               <div style="background: var(--brand-background-components); border-radius: 8px; padding: 10px;
                           border-left: 4px solid rgba(var(--brand-color-primary-rgb), 0.8);">
                 <small style="color: var(--brand-text-secondary);">
                   Les options disponibles varient selon vos droits sur cette ressource.
                 </small>
               </div>`,
        buttons: [
          {
            text: 'Passer le tutoriel',
            secondary: true,
            action: () => this.shepherdService.cancel(),
          },
          {
            text: 'Commencer',
            action: () => this.shepherdService.next(),
          },
        ],
      },
      {
        id: 'breadcrumb',
        title: "Fil d'Ariane",
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Le fil d'Ariane indique votre position dans la
                 <strong style="color: var(--brand-text-primary);">hiérarchie des ressources</strong>.
               </p>
               <div style="background: var(--brand-background-components); border-radius: 8px; padding: 10px;">
                 <small style="color: var(--brand-text-secondary);">
                   Cliquez sur un élément parent pour remonter d'un niveau,
                   ou sur l'icône d'arbre pour voir la structure complète.
                 </small>
               </div>`,
        attachTo: {
          element: '#tuto-breadcrumb',
          on: 'bottom',
        },
      },
      {
        id: 'resource-name',
        title: 'Nom de la ressource',
        text: isOwner
          ? `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
               En tant que <strong style="color: var(--brand-text-primary);">propriétaire</strong>,
               vous pouvez modifier le nom en cliquant directement dessus.
             </p>`
          : `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
               Voici le nom de la ressource. Seul le
               <strong style="color: var(--brand-text-primary);">propriétaire</strong> peut le modifier.
             </p>`,
        attachTo: {
          element: '#tuto-resource-name-item',
          on: 'bottom',
        },
      },
      {
        id: 'description',
        title: 'Description',
        text: isOwner
          ? `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
               Cliquez sur la description pour la modifier et donner plus de
               <strong style="color: var(--brand-text-primary);">contexte</strong> sur votre ressource.
             </p>`
          : `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
               La description présente le contenu et les
               <strong style="color: var(--brand-text-primary);">objectifs pédagogiques</strong> de la ressource.
             </p>`,
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
        ? `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
             Vous suivez actuellement cette ressource. Cliquez pour
             <strong style="color: var(--brand-text-primary);">ne plus recevoir</strong>
             de notifications lors des mises à jour.
           </p>`
        : `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
             Suivre une ressource vous permet de l'
             <strong style="color: var(--brand-text-primary);">intégrer dans vos cours</strong>
             et de recevoir des notifications lors des mises à jour.
           </p>`,
      attachTo: {
        element: '#tuto-watch-button',
        on: 'bottom',
      },
    })

    if (resource.type === 'CIRCLE' && !isOwner && !isMember) {
      steps.push({
        id: 'join-button',
        title: 'Rejoindre le cercle',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 Cliquez ici pour <strong style="color: var(--brand-text-primary);">demander à rejoindre</strong>
                 ce cercle. Le propriétaire recevra une notification et pourra accepter ou refuser votre demande.
               </p>`,
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

    if (resource.type !== 'CIRCLE') {
      steps.push(
        {
          id: 'share-button',
          title: 'Partager',
          text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                   Partagez cette ressource avec d'autres utilisateurs ou cercles en définissant des
                   <strong style="color: var(--brand-text-primary);">permissions spécifiques</strong>.
                 </p>`,
          attachTo: {
            element: '#tuto-share-button',
            on: 'left',
          },
        },
        {
          id: 'preview-button',
          title: 'Prévisualiser',
          text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                   Testez la ressource pour voir comment elle fonctionne
                   <strong style="color: var(--brand-text-primary);">en conditions réelles</strong>
                   avant de l'utiliser dans vos cours.
                 </p>`,
          attachTo: {
            element: '#tuto-preview-button',
            on: 'left',
          },
        }
      )
    }

    steps.push(
      {
        id: 'tabs',
        title: 'Navigation par onglets',
        text: `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                 La ressource est organisée en plusieurs sections accessibles via les onglets.
               </p>
               <div style="display: flex; flex-direction: column; gap: 6px;">
                 <div style="background: var(--brand-background-components); border-radius: 6px; padding: 8px;">
                   <small style="color: var(--brand-text-secondary);"><strong>Vue d'ensemble</strong> — statistiques et informations générales</small>
                 </div>
                 <div style="background: var(--brand-background-components); border-radius: 6px; padding: 8px;">
                   <small style="color: var(--brand-text-secondary);"><strong>Explorer</strong> — ${
                     resource.type === 'CIRCLE' ? 'contenu du cercle' : 'fichiers et contenu'
                   }</small>
                 </div>
                 <div style="background: var(--brand-background-components); border-radius: 6px; padding: 8px;">
                   <small style="color: var(--brand-text-secondary);"><strong>Événements</strong> — historique des modifications</small>
                 </div>
                 <div style="background: var(--brand-background-components); border-radius: 6px; padding: 8px;">
                   <small style="color: var(--brand-text-secondary);"><strong>Paramètres</strong> — configuration et permissions</small>
                 </div>
               </div>`,
        attachTo: {
          element: '#tuto-resource-tabs',
          on: 'bottom',
        },
        when: {},
      },
      {
        id: 'tutorial-complete',
        title: 'Tutoriel terminé',
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

  private buildStatusText(status: ResourceStatus, isOwner: boolean): string {
    const statusDescriptions: Record<ResourceStatus, string> = {
      DRAFT: "La ressource est en cours de création et n'est pas encore publiée.",
      READY: 'La ressource est prête à être utilisée.',
      BUGGED: 'La ressource contient des anomalies connues qui doivent être corrigées.',
      NOT_TESTED: "La ressource n'a pas encore été testée et nécessite une validation.",
      DEPRECATED: 'La ressource est obsolète et ne devrait plus être utilisée.',
    }

    let text = `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
                  <strong style="color: var(--brand-text-primary);">Statut actuel :</strong>
                  ${statusDescriptions[status]}
                </p>`

    if (isOwner) {
      text += `<div style="background: var(--brand-background-components); border-radius: 8px; padding: 10px;">
                 <small style="color: var(--brand-text-secondary);">
                   En tant que propriétaire, vous pouvez modifier le statut selon l'état d'avancement de votre ressource.
                 </small>
               </div>`
    }

    return text
  }

  private buildActionsText(resource: Resource, isOwner: boolean): string {
    const actions: string[] = []

    if (isOwner && resource.type !== 'CIRCLE') {
      actions.push('<strong>Supprimer</strong> — retirer définitivement la ressource')
    }

    if (resource.type === 'EXERCISE' && isOwner) {
      actions.push("<strong>Déplacer</strong> — changer l'emplacement de l'exercice")
    }

    actions.push("<strong>Ouvrir dans l'éditeur</strong> — modifier le contenu de la ressource")

    if (resource.type !== 'CIRCLE') {
      actions.push("<strong>Partager</strong> — donner accès à d'autres utilisateurs")
      actions.push('<strong>Prévisualiser</strong> — tester la ressource')
    }

    return `<p style="color: var(--brand-text-secondary); line-height: 1.5; margin: 0 0 12px 0;">
               Actions disponibles selon vos droits sur cette ressource :
             </p>
             <div style="display: flex; flex-direction: column; gap: 6px;">
               ${actions
                 .map(
                   (a) =>
                     `<div style="background: var(--brand-background-components); border-radius: 6px; padding: 8px;"><small style="color: var(--brand-text-secondary);">${a}</small></div>`
                 )
                 .join('')}
             </div>`
  }

  private buildCompletionText(resource: Resource): string {
    const extras =
      resource.type === 'CIRCLE'
        ? `<div style="background: var(--brand-background-components); border-radius: 6px; padding: 8px;">
           <small style="color: var(--brand-text-secondary);">Rejoindre des cercles pour accéder aux ressources partagées</small>
         </div>`
        : ''

    return `<div style="text-align: center; padding: 20px;">
               <h3 style="color: var(--brand-text-primary); margin: 0 0 16px 0;">
                 Vous maîtrisez cette page !
               </h3>
               <div style="background: var(--brand-background-components); border-radius: 8px;
                           padding: 16px; margin: 16px 0;
                           border-left: 4px solid rgba(var(--brand-color-primary-rgb), 0.8);">
                 <div style="display: flex; flex-direction: column; gap: 6px; text-align: left;">
                   <div style="background: var(--brand-background-card); border-radius: 6px; padding: 8px;">
                     <small style="color: var(--brand-text-secondary);">Naviguer dans la hiérarchie des ressources</small>
                   </div>
                   <div style="background: var(--brand-background-card); border-radius: 6px; padding: 8px;">
                     <small style="color: var(--brand-text-secondary);">Comprendre et modifier le statut</small>
                   </div>
                   <div style="background: var(--brand-background-card); border-radius: 6px; padding: 8px;">
                     <small style="color: var(--brand-text-secondary);">Suivre les ressources pour recevoir des notifications</small>
                   </div>
                   ${extras}
                   <div style="background: var(--brand-background-card); border-radius: 6px; padding: 8px;">
                     <small style="color: var(--brand-text-secondary);">Utiliser les actions et explorer les onglets</small>
                   </div>
                 </div>
               </div>
               <p style="color: var(--brand-text-secondary); font-size: 13px; margin: 0;">
                 Explorez les différents onglets pour découvrir toutes les fonctionnalités.
               </p>
             </div>`
  }
}
