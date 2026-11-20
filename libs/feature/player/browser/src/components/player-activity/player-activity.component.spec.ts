/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { HttpErrorResponse } from '@angular/common/http'
import { ActivatedRoute } from '@angular/router'
import { Subject, of, throwError } from 'rxjs'

import { DialogService } from '@platon/core/browser'
import { NotificationService } from '@platon/feature/notification/browser'
import { NzModalService } from 'ng-zorro-antd/modal'

import { PlayerActivityComponent } from './player-activity.component'
import { PlayerService } from '../../api/player.service'
import { ActivityPlayer } from '@platon/feature/player/common'

const createPlayer = (overrides: Partial<ActivityPlayer> = {}): ActivityPlayer =>
  ({
    type: 'activity',
    sessionId: 'session-id',
    activityId: 'activity-id',
    title: 'Examen de test',
    introduction: '',
    conclusion: '',
    state: 'opened',
    serverTime: new Date(),
    navigation: {
      started: false,
      terminated: false,
      exercises: [],
      nextExercisesHistory: [],
      nextExercisesHistoryPosition: -1,
    } as any,
    ...overrides,
  } as ActivityPlayer)

describe('PlayerActivityComponent', () => {
  let fixture: ComponentFixture<PlayerActivityComponent>
  let component: PlayerActivityComponent
  let playerService: { openSessionWithCode: jest.Mock; terminate: jest.Mock; playActivity: jest.Mock }
  let dialogErrorSpy: jest.SpyInstance

  beforeEach(async () => {
    playerService = {
      openSessionWithCode: jest.fn(),
      terminate: jest.fn().mockReturnValue(of({ activity: createPlayer() })),
      playActivity: jest.fn(),
    }
    // DialogModule fournit DialogService via son propre @NgModule({ providers: [DialogService] }).
    // Comme PlayerActivityComponent importe DialogModule directement, cette instance est fournie
    // à l'échelle du composant et masque tout override fourni au niveau racine de TestBed.
    // On patch donc directement le prototype plutôt que de tenter un override de provider inefficace.
    dialogErrorSpy = jest.spyOn(DialogService.prototype, 'error').mockImplementation(() => undefined as any)

    await TestBed.configureTestingModule({
      imports: [PlayerActivityComponent],
      providers: [
        { provide: PlayerService, useValue: playerService },
        { provide: NotificationService, useValue: { paginate: jest.fn().mockReturnValue(of({ notifications: [] })) } },
        { provide: NzModalService, useValue: { create: jest.fn() } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: { has: () => false } } },
        },
      ],
    }).compileComponents()

    fixture = TestBed.createComponent(PlayerActivityComponent)
    component = fixture.componentInstance
    component.player = createPlayer()
    fixture.detectChanges()
  })

  afterEach(() => {
    dialogErrorSpy.mockRestore()
  })

  describe('reprise après réouverture par un enseignant', () => {
    const startedPlayer = (navigation: Record<string, unknown> = {}) =>
      createPlayer({
        navigation: { started: true, terminated: false, exercises: [], ...navigation } as any,
        settings: { security: { terminateOnLeavePage: true } } as any,
      })

    const initWith = (player: ActivityPlayer) => {
      fixture = TestBed.createComponent(PlayerActivityComponent)
      component = fixture.componentInstance
      component.player = player
    }

    it('reprend au chargement quand la réponse porte la reprise consommée', () => {
      initWith(startedPlayer({ resumeGranted: true }))
      const startSpy = jest.spyOn(component as any, 'start').mockResolvedValue(undefined)

      fixture.detectChanges()

      expect(startSpy).toHaveBeenCalled()
      expect(playerService.terminate).not.toHaveBeenCalled()
    })

    it('termine au chargement sans reprise (page quittée ou second navigateur)', () => {
      initWith(startedPlayer())
      const startSpy = jest.spyOn(component as any, 'start').mockResolvedValue(undefined)

      fixture.detectChanges()

      expect(startSpy).not.toHaveBeenCalled()
      expect(playerService.terminate).toHaveBeenCalledWith('session-id')
      expect(component['terminatedAfterLeavePage']).toBe(true)
    })

    describe('sur notification de déblocage', () => {
      let startSpy: jest.SpyInstance

      beforeEach(() => {
        component.player = startedPlayer({ terminated: true })
        startSpy = jest.spyOn(component as any, 'start').mockResolvedValue(undefined)
      })

      it('passe par la reprise unique quand un enseignant a rouvert la session', () => {
        const resumeSpy = jest.spyOn(component as any, 'resumeIfGranted').mockResolvedValue(undefined)

        component['onModerationActivityChanges'](startedPlayer({ resumeGranted: true }))

        expect(resumeSpy).toHaveBeenCalled()
        expect(startSpy).not.toHaveBeenCalled()
        expect(component.player.navigation.terminated).toBe(true)
      })

      it('garde l’écran de fin sur un déblocage par code (pas de reprise accordée)', () => {
        const resumeSpy = jest.spyOn(component as any, 'resumeIfGranted').mockResolvedValue(undefined)

        component['onModerationActivityChanges'](startedPlayer())

        expect(resumeSpy).not.toHaveBeenCalled()
        expect(startSpy).not.toHaveBeenCalled()
        expect(playerService.playActivity).not.toHaveBeenCalled()
        expect(component.player.navigation.terminated).toBe(true)
      })

      it('démarre directement quand la page a déjà repris (sa propre notification de code)', () => {
        component.player = startedPlayer({ terminated: false })

        component['onModerationActivityChanges'](startedPlayer())

        expect(startSpy).toHaveBeenCalled()
      })

      it('démarre directement sans protection « quitter la page »', () => {
        component.player = createPlayer({
          navigation: { started: true, terminated: true, exercises: [] } as any,
          settings: { security: {} } as any,
        })

        component['onModerationActivityChanges'](
          createPlayer({ navigation: { started: true, terminated: false, exercises: [] } as any })
        )

        expect(startSpy).toHaveBeenCalled()
      })

      it('termine la page quand la modération termine la session', () => {
        component.player = startedPlayer({ terminated: false })

        component['onModerationActivityChanges'](startedPlayer({ terminated: true }))

        expect(playerService.terminate).toHaveBeenCalledWith('session-id')
      })

      it('ne termine pas une seconde fois une page déjà terminée', () => {
        component.player = startedPlayer({ terminated: true })

        component['onModerationActivityChanges'](startedPlayer({ terminated: true }))

        expect(playerService.terminate).not.toHaveBeenCalled()
      })

      it('partage la requête de fin en cours avec la notification qu’elle déclenche', async () => {
        component.player = startedPlayer({ terminated: false })
        const response = new Subject<{ activity: ActivityPlayer }>()
        playerService.terminate.mockReturnValue(response)

        const ownTermination = component['terminate']()
        component['onModerationActivityChanges'](startedPlayer({ terminated: true }))
        response.next({ activity: startedPlayer({ terminated: true }) })
        response.complete()
        await ownTermination

        expect(playerService.terminate).toHaveBeenCalledTimes(1)
      })

      it('recharge l’activité et reprend si ce navigateur obtient la reprise', async () => {
        const reloaded = startedPlayer({ resumeGranted: true })
        playerService.playActivity.mockReturnValue(of({ activity: reloaded }))

        await component['resumeIfGranted']()

        expect(playerService.playActivity).toHaveBeenCalledWith({ activityId: 'activity-id' })
        expect(component.player).toBe(reloaded)
        expect(startSpy).toHaveBeenCalled()
      })

      it("reste sur l'écran de fin sans terminer quand la reprise est déjà prise ailleurs", async () => {
        playerService.playActivity.mockReturnValue(of({ activity: startedPlayer() }))

        await component['resumeIfGranted']()

        expect(startSpy).not.toHaveBeenCalled()
        expect(playerService.terminate).not.toHaveBeenCalled()
        expect(component.player.navigation.terminated).toBe(true)
      })

      it("reste sur l'écran de fin si le rechargement échoue", async () => {
        jest.spyOn(console, 'error').mockImplementation(() => undefined)
        playerService.playActivity.mockReturnValue(throwError(() => new Error('network')))

        await component['resumeIfGranted']()

        expect(startSpy).not.toHaveBeenCalled()
        expect(component.player.navigation.terminated).toBe(true)
      })

      it("ne démarre pas si l'activité a été fermée entre-temps", async () => {
        const reloaded = createPlayer({
          ...startedPlayer({ resumeGranted: true }),
          state: 'closed',
        })
        playerService.playActivity.mockReturnValue(of({ activity: reloaded }))

        await component['resumeIfGranted']()

        expect(component['state']).toBe('closed')
        expect(startSpy).not.toHaveBeenCalled()
        expect(playerService.terminate).not.toHaveBeenCalled()
      })

      it("affiche le compte à rebours si l'activité a été reportée entre-temps", async () => {
        const serverTime = new Date()
        const reloaded = createPlayer({
          ...startedPlayer({ resumeGranted: true }),
          state: 'planned',
          serverTime,
          openAt: new Date(serverTime.getTime() + 60 * 60 * 1000),
        })
        playerService.playActivity.mockReturnValue(of({ activity: reloaded }))

        await component['resumeIfGranted']()

        expect(component['state']).toBe('planned')
        expect(component['countdown']).toBeGreaterThan(Date.now() + 59 * 60 * 1000)
        expect(startSpy).not.toHaveBeenCalled()
        expect(playerService.terminate).not.toHaveBeenCalled()
      })

      it('termine au lieu de démarrer si le temps est écoulé entre-temps', async () => {
        const reloaded = createPlayer({
          ...startedPlayer({ resumeGranted: true }),
          closeAt: new Date(Date.now() - 60 * 1000),
        })
        playerService.playActivity.mockReturnValue(of({ activity: reloaded }))

        await component['resumeIfGranted']()

        expect(startSpy).not.toHaveBeenCalled()
        expect(playerService.terminate).toHaveBeenCalledWith('session-id')
      })

      it("oublie la raison de l'ancienne fin automatique une fois la reprise obtenue", async () => {
        component['terminatedAfterLeavePage'] = true
        component['terminatedAfterLoseFocus'] = true
        const reloaded = createPlayer({
          ...startedPlayer({ resumeGranted: true }),
          closeAt: new Date(Date.now() - 60 * 1000),
        })
        playerService.playActivity.mockReturnValue(of({ activity: reloaded }))

        await component['resumeIfGranted']()

        // Ended by its time limit: the end screen must not blame leaving the page any more.
        expect(component['terminatedAfterLeavePage']).toBe(false)
        expect(component['terminatedAfterLoseFocus']).toBe(false)
      })

      it('garde la raison de la fin automatique quand la reprise est prise ailleurs', async () => {
        component['terminatedAfterLoseFocus'] = true
        playerService.playActivity.mockReturnValue(of({ activity: startedPlayer() }))

        await component['resumeIfGranted']()

        expect(component['terminatedAfterLoseFocus']).toBe(true)
      })

      it("garde l'écran de fin sans recharger quand le player n'a pas d'activité", async () => {
        component.player = { ...component.player, activityId: null }

        await component['resumeIfGranted']()

        expect(playerService.playActivity).not.toHaveBeenCalled()
        expect(startSpy).not.toHaveBeenCalled()
        expect(component.player.navigation.terminated).toBe(true)
      })
    })
  })

  describe('onCodeComplete / open', () => {
    it('délègue à open() avec le code saisi', async () => {
      const openSpy = jest.spyOn(component as any, 'open').mockResolvedValue(undefined)

      await component['onCodeComplete']('ABC123')

      expect(openSpy).toHaveBeenCalledWith('ABC123')
    })

    it('rouvre la session avec le bon code et démarre l’activité', async () => {
      const reopenedPlayer = createPlayer({ navigation: { started: true, terminated: false, exercises: [] } as any })
      playerService.openSessionWithCode.mockReturnValue(of({ activity: reopenedPlayer }))
      // start() déclenche toute la mécanique de lancement des exercices, hors-sujet ici :
      // on isole le comportement propre à open() (appel du bon service + mise à jour du player).
      const startSpy = jest.spyOn(component as any, 'start').mockResolvedValue(undefined)

      await component['open']('ABC123')

      expect(playerService.openSessionWithCode).toHaveBeenCalledWith('session-id', 'ABC123')
      expect(component.player).toBe(reopenedPlayer)
      expect(component['isCodeError']).toBe(false)
      expect(startSpy).toHaveBeenCalled()
    })

    it('affiche une erreur et active isCodeError sur un code invalide (403)', async () => {
      jest.useFakeTimers()
      playerService.openSessionWithCode.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 403, error: { message: 'Invalid activity code.' } }))
      )

      await component['open']('WRONG1')

      expect(dialogErrorSpy).toHaveBeenCalledWith("Vous n'êtes pas autorisé à ouvrir cette session.")
      expect(component['isCodeError']).toBe(true)

      jest.advanceTimersByTime(2000)
      expect(component['isCodeError']).toBe(false)
      jest.useRealTimers()
    })

    it('affiche une erreur générique sans toucher à isCodeError sur une erreur inattendue', async () => {
      playerService.openSessionWithCode.mockReturnValue(throwError(() => new Error('boom')))

      await component['open']('ABC123')

      expect(dialogErrorSpy).toHaveBeenCalledWith("Une erreur est survenue lors de l'ouverture de la session.")
      expect(component['isCodeError']).toBe(false)
    })

    it('ne modifie pas le player en cas d’échec (le code reste demandé)', async () => {
      const originalPlayer = component.player
      playerService.openSessionWithCode.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 403, error: {} }))
      )

      await component['open']('WRONG1')

      expect(component.player).toBe(originalPlayer)
    })
  })
})
