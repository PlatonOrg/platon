import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from '@angular/core'

import { CoursePresenter } from '../../../courses/course/course.presenter'
import { Subscription } from 'rxjs'
import { Router, RouterModule } from '@angular/router'
import { DialogModule, DialogService } from '@platon/core/browser'
import { TestPresenter } from '../test.presenter'
import { CsvImportComponent, CsvImportData } from '@platon/shared/ui'

@Component({
  selector: 'app-test-csv-import',
  templateUrl: './csv-import.page.html',
  styleUrls: ['./csv-import.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule, CsvImportComponent, DialogModule],
})
export class CsvImportPage implements OnInit, OnDestroy {
  private readonly presenter = inject(CoursePresenter)
  private readonly testPresenter = inject(TestPresenter)
  private readonly changeDetectorRef = inject(ChangeDetectorRef)
  private readonly subscriptions: Subscription[] = []
  private readonly router = inject(Router)
  private readonly dialogService = inject(DialogService)

  protected headersOptions = [
    { value: 'none', label: '...' },
    { value: 'firstName', label: 'Prénom' },
    { value: 'lastName', label: 'Nom' },
    { value: 'email', label: 'Email' },
  ]

  protected context = this.presenter.defaultContext()

  async ngOnInit(): Promise<void> {
    this.subscriptions.push(
      this.presenter.contextChange.subscribe(async (context) => {
        this.context = context
        this.changeDetectorRef.markForCheck()
      })
    )
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((s) => s.unsubscribe())
  }

  protected async onCsvImportConfirmed(data: CsvImportData[]): Promise<void> {
    const candidatesArray = data.map((row) => ({
      firstName: row['firstName'],
      lastName: row['lastName'],
      email: row['email'],
    }))

    const addedMembers = await this.presenter.addTestMembers(candidatesArray)
    console.log('addedMembers')
    addedMembers.forEach((m) => console.error(m))

    const testCandidates = addedMembers.map((member) => ({
      userId: member.user?.id || '',
      courseMemberId: member.id,
    }))

    console.log('testCandidates')
    testCandidates.forEach((c) => console.error(c))

    await this.testPresenter.createManyTestsCandidates(testCandidates)

    this.router
      .navigate(['/tests', this.context.course?.id, 'candidates'], {
        replaceUrl: true,
        state: {
          addedMembers,
        },
      })
      .catch(console.error)
  }

  protected onCsvImportError(error: { message: string }): void {
    this.dialogService.error(error.message || "Une erreur est survenue lors de l'importation.")
  }
}
