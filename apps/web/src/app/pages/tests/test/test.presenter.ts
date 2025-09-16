import { inject, Injectable } from '@angular/core'
import { DialogService } from '@platon/core/browser'
import { TestsService } from '@platon/feature/tests/browser'
import { CreateTestsCandidates } from '@platon/feature/tests/common'
import { firstValueFrom } from 'rxjs'

@Injectable()
export class TestPresenter {
  private readonly testsService = inject(TestsService)
  private readonly dialogService = inject(DialogService)

  async createManyTestsCandidates(input: CreateTestsCandidates[]): Promise<void> {
    try {
      await firstValueFrom(this.testsService.createManyTestsCandidates(input))
    } catch (error) {
      this.alertError()
    }
  }

  private alertError(): void {
    this.dialogService.error('Une erreur est survenue lors de cette action, veuillez réessayer un peu plus tard !')
  }
}
