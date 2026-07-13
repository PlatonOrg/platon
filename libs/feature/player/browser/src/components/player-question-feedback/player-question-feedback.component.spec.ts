/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { of, throwError } from 'rxjs'
import { FeedbackCategoryValue } from '@platon/feature/player/common'
import { PlayerService } from '../../api/player.service'
import { PlayerQuestionFeedbackComponent } from './player-question-feedback.component'

describe('PlayerQuestionFeedbackComponent', () => {
  let component: PlayerQuestionFeedbackComponent
  let fixture: ComponentFixture<PlayerQuestionFeedbackComponent>
  let playerService: { submitFeedback: jest.Mock }
  let internals: any

  beforeEach(async () => {
    playerService = { submitFeedback: jest.fn() }

    await TestBed.configureTestingModule({
      imports: [PlayerQuestionFeedbackComponent],
      providers: [{ provide: PlayerService, useValue: playerService }],
    }).compileComponents()

    fixture = TestBed.createComponent(PlayerQuestionFeedbackComponent)
    component = fixture.componentInstance
    internals = component
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should toggle the expanded panel open and closed', () => {
    expect(internals.expanded()).toBe(false)

    internals.toggle()
    expect(internals.expanded()).toBe(true)

    internals.toggle()
    expect(internals.expanded()).toBe(false)
  })

  it('should reset the message when the category changes', () => {
    internals.message.set('un brouillon')
    internals.onCategoryChange()
    expect(internals.message()).toBe('')
  })

  describe('submit', () => {
    it('should do nothing when no category is selected', async () => {
      internals.message.set('un message')
      await internals.submit()
      expect(playerService.submitFeedback).not.toHaveBeenCalled()
    })

    it('should do nothing when the message is empty', async () => {
      internals.category.set(FeedbackCategoryValue.STATEMENT)
      await internals.submit()
      expect(playerService.submitFeedback).not.toHaveBeenCalled()
    })

    it('should submit the feedback and mark it as submitted on success', async () => {
      playerService.submitFeedback.mockReturnValue(of(undefined))
      internals.category.set(FeedbackCategoryValue.STATEMENT)
      internals.message.set("L'énoncé n'est pas clair")

      await internals.submit()

      expect(playerService.submitFeedback).toHaveBeenCalledWith(
        expect.objectContaining({
          category: FeedbackCategoryValue.STATEMENT,
          message: "L'énoncé n'est pas clair",
        })
      )
      expect(internals.submitted()).toBe(true)
    })

    it('should not mark as submitted when the request fails', async () => {
      playerService.submitFeedback.mockReturnValue(throwError(() => new Error('network error')))
      internals.category.set(FeedbackCategoryValue.STATEMENT)
      internals.message.set("L'énoncé n'est pas clair")

      await internals.submit()

      expect(internals.submitted()).toBe(false)
    })
  })

  describe('close', () => {
    it('should reset expanded, submitted, category and message', () => {
      internals.expanded.set(true)
      internals.submitted.set(true)
      internals.category.set(FeedbackCategoryValue.OTHER)
      internals.message.set('test')

      internals.close()

      expect(internals.expanded()).toBe(false)
      expect(internals.submitted()).toBe(false)
      expect(internals.category()).toBeNull()
      expect(internals.message()).toBe('')
    })
  })
})
