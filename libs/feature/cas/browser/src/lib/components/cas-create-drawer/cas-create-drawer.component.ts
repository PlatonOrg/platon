import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  inject,
} from '@angular/core'
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms'

import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'

import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzIconModule } from 'ng-zorro-antd/icon'
import { NzTooltipModule } from 'ng-zorro-antd/tooltip'

import { DialogModule, DialogService } from '@platon/core/browser'
import { CreateCas, Cas } from '@platon/feature/cas/common'
import { UiModalDrawerComponent } from '@platon/shared/ui'
import { firstValueFrom } from 'rxjs'
import { CasService } from '../../api/cas.service'
import { Lms } from '@platon/feature/lti/common'

@Component({
  selector: 'cas-create-drawer',
  templateUrl: './cas-create-drawer.component.html',
  styleUrls: ['./cas-create-drawer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    NzIconModule,
    NzButtonModule,
    NzTooltipModule,
    UiModalDrawerComponent,
    DialogModule,
  ],
})
export class CasCreateDrawerComponent {
  private readonly casService = inject(CasService)
  private readonly formBuilder = inject(FormBuilder)
  private readonly dialogService = inject(DialogService)
  private readonly changeDetectorRef = inject(ChangeDetectorRef)

  protected form = this.createForm()

  @ViewChild(UiModalDrawerComponent, { static: true })
  protected modal!: UiModalDrawerComponent
  @Output() created = new EventEmitter<Cas>()

  @Input() lmses: Lms[] = []

  open(): void {
    this.modal.open()
  }

  protected async create(): Promise<void> {
    try {
      const res = this.casService.createCas(this.form.value as unknown as CreateCas)
      res.subscribe((cas) => {
        this.created.emit(cas)
        this.modal.close()
      })
      const cas = await firstValueFrom(res)
      this.created.emit(cas)
      this.modal.close()
    } catch {
      this.dialogService.error(
        'Une erreur est survenue lors de la création du CAS, veuillez réessayer un peu plus tard !'
      )
    } finally {
      this.changeDetectorRef.markForCheck()
    }
  }

  protected createForm() {
    return this.formBuilder.group({
      name: ['', Validators.required],
      loginURL: ['', Validators.required],
      serviceValidateURL: ['', Validators.required],
      version: ['3.0', [Validators.required, Validators.pattern(/^(1\.0|2\.0|3\.0|saml1\.1)$/)]],
      lmses: ['', Validators.required],
    })
  }
}
