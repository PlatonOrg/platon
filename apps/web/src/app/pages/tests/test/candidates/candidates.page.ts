import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core'

import { MatCardModule } from '@angular/material/card'
import { TestsCandidatesTableComponent } from '@platon/feature/tests/browser'
import { CourseMember, CourseMemberRoles } from '@platon/feature/course/common'
import { CoursePresenter } from '../../../courses/course/course.presenter'
import { Subscription } from 'rxjs'
import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzToolTipModule } from 'ng-zorro-antd/tooltip'
import { CommonModule } from '@angular/common'
import { RouterModule } from '@angular/router'
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { UiModalTemplateComponent } from '@platon/shared/ui'
import { NzModalModule } from 'ng-zorro-antd/modal'
import { NzFormModule } from 'ng-zorro-antd/form'
import { NzInputModule } from 'ng-zorro-antd/input'
import { TestPresenter } from '../test.presenter'

@Component({
  standalone: true,
  selector: 'app-test-candidates',
  templateUrl: './candidates.page.html',
  styleUrls: ['./candidates.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    TestsCandidatesTableComponent,
    NzButtonModule,
    NzToolTipModule,
    NzModalModule,
    NzFormModule,
    NzInputModule,
    UiModalTemplateComponent,
  ],
})
export class TestCandidatesPage implements OnInit, OnDestroy {
  private readonly presenter = inject(CoursePresenter)
  private readonly testPresenter = inject(TestPresenter)
  private readonly changeDetectorRef = inject(ChangeDetectorRef)
  private formBuilder = inject(FormBuilder)
  private readonly subscriptions: Subscription[] = []

  @ViewChild('addCandidateModal', { static: true })
  protected addCandidateModal!: UiModalTemplateComponent

  protected candidates: CourseMember[] = []
  protected nonDeletables: string[] = []
  protected excludes: string[] = []

  protected addedMembers: CourseMember[] = []

  protected context = this.presenter.defaultContext()

  protected testId = ''

  protected candidateForm: FormGroup = this.formBuilder.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
  })

  protected isSubmittingCandidate = false

  async ngOnInit(): Promise<void> {
    if (history.state.addedMembers) {
      this.addedMembers = history.state.addedMembers
    }

    this.subscriptions.push(
      this.presenter.contextChange.subscribe(async (context) => {
        this.context = context
        this.testId = context.course?.id || ''
        this.changeDetectorRef.markForCheck()
      })
    )

    if (this.context.course?.ownerId) {
      this.nonDeletables.push(this.context.course?.ownerId)
    }

    await this.refreshMembers()

    this.changeDetectorRef.markForCheck()
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe())
  }

  protected get canEdit(): boolean {
    const { course } = this.context
    if (!course) return false
    return !!course.permissions?.update
  }

  private async refreshMembers(): Promise<void> {
    this.candidates = await this.presenter.searchMembers({
      roles: [CourseMemberRoles.student],
    })
    this.excludes = []
    this.candidates.forEach((member) => {
      if (member.user) {
        this.excludes.push(member.user.id)
      }
    })
    this.changeDetectorRef.markForCheck()
  }

  protected async removeMember(member: CourseMember) {
    await this.presenter.deleteMember(member)
    await this.refreshMembers()
  }

  protected openAddCandidateModal(): void {
    this.candidateForm.reset()
    this.candidateForm.markAsUntouched()
    this.addCandidateModal.open()
  }

  protected async addCandidate(): Promise<void> {
    if (this.candidateForm.valid && !this.isSubmittingCandidate) {
      this.isSubmittingCandidate = true

      try {
        const formValue = this.candidateForm.value
        const newCandidate = {
          firstName: formValue.firstName.trim(),
          lastName: formValue.lastName.trim(),
          email: formValue.email.trim().toLowerCase(),
        }

        const addedMembers = await this.presenter.addTestMembers([newCandidate])

        if (addedMembers.length > 0) {
          const testCandidates = addedMembers.map((member: any) => ({
            userId: member.userId,
            courseMemberId: member.id,
          }))
          await this.testPresenter.createManyTestsCandidates(testCandidates)

          this.addCandidateModal.close(true)
          await this.refreshMembers()
        }
      } catch (error) {
        console.error("Erreur lors de l'ajout du candidat:", error)
      } finally {
        this.isSubmittingCandidate = false
        this.changeDetectorRef.markForCheck()
      }
    }
  }

  protected cancelAddCandidate(): void {
    this.candidateForm.reset()
    this.addCandidateModal.close()
  }

  protected get isFormValid(): boolean {
    return this.candidateForm.valid
  }
}
