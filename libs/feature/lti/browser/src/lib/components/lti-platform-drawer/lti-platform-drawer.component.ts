import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Output,
  ViewChild,
  inject,
} from '@angular/core'
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms'

import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'

import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzSwitchModule } from 'ng-zorro-antd/switch'

import { DialogService } from '@platon/core/browser'
import {
  CreateLtiPlatform,
  Lms,
  LtiIdTokenValidationMethod,
  LtiPlatform,
  UpdateLtiPlatform,
} from '@platon/feature/lti/common'
import { UiModalDrawerComponent } from '@platon/shared/ui'
import { firstValueFrom } from 'rxjs'
import { LTIService } from '../../api/lti.service'

@Component({
  selector: 'lms-lti-platform-drawer',
  templateUrl: './lti-platform-drawer.component.html',
  styleUrls: ['./lti-platform-drawer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    MatSelectModule,
    MatFormFieldModule,
    NzButtonModule,
    NzSwitchModule,
    UiModalDrawerComponent,
  ],
})
export class LtiPlatformDrawerComponent {
  private readonly ltiService = inject(LTIService)
  private readonly formBuilder = inject(FormBuilder)
  private readonly dialogService = inject(DialogService)
  private readonly changeDetectorRef = inject(ChangeDetectorRef)

  protected platform?: LtiPlatform
  protected lmses: Lms[] = []
  protected form = this.createForm()
  private validationMethod: LtiIdTokenValidationMethod = 'JWK_SET'

  @ViewChild(UiModalDrawerComponent, { static: true })
  protected modal!: UiModalDrawerComponent

  @Output() saved = new EventEmitter<LtiPlatform>()
  @Output() deleted = new EventEmitter<LtiPlatform>()

  /** Opens the platform creation form (without argument) or edit form. */
  async open(platform?: LtiPlatform): Promise<void> {
    this.platform = platform
    this.validationMethod = platform?.idTokenValidation.method ?? 'JWK_SET'
    this.form = this.createForm()
    this.modal.open()

    if (!platform) {
      try {
        const limit = 50
        const lmses: Lms[] = []
        let total = 0
        do {
          const response = await firstValueFrom(
            this.ltiService.searchLms({ offset: lmses.length, limit, order: 'NAME' })
          )
          lmses.push(...response.resources)
          total = response.total
          if (!response.resources.length) break
        } while (lmses.length < total)
        this.lmses = lmses
      } catch {
        this.lmses = []
      }
      this.changeDetectorRef.markForCheck()
    }
  }

  protected onSelectLms(lmsId: string | null): void {
    const lms = this.lmses.find((item) => item.id === lmsId)
    if (!lms) return
    const { name, url } = this.form.controls
    if (!name.value) name.setValue(lms.name)
    if (!url.value) url.setValue(lms.url)
  }

  protected async save(): Promise<void> {
    const {
      lmsId,
      name,
      url,
      clientId,
      authenticationEndpoint,
      accessTokenEndpoint,
      authorizationServer,
      key,
      active,
    } = this.form.getRawValue()

    const input = {
      name,
      url,
      clientId,
      authenticationEndpoint,
      accessTokenEndpoint,
      authorizationServer: authorizationServer || undefined,
      idTokenValidation: { method: this.validationMethod, key },
      active,
    } as UpdateLtiPlatform

    try {
      const platform = this.platform
        ? await firstValueFrom(this.ltiService.updateLtiPlatform(this.platform.id, input))
        : await firstValueFrom(
            this.ltiService.createLtiPlatform({ ...input, lmsId: lmsId || undefined } as CreateLtiPlatform)
          )
      this.saved.emit(platform)
      this.modal.close()
    } catch (error) {
      this.dialogService.error(
        (error as { error?: { message?: string } })?.error?.message ||
          "Une erreur est survenue lors de l'enregistrement de la plateforme, veuillez réessayer un peu plus tard !"
      )
    } finally {
      this.changeDetectorRef.markForCheck()
    }
  }

  protected async delete(): Promise<void> {
    const platform = this.platform
    if (!platform) return

    const confirmed = await this.dialogService.confirm({
      nzTitle: 'Supprimer la plateforme',
      nzContent: `Les lancements LTI 1.3 depuis « ${platform.name} » ne fonctionneront plus. Voulez-vous continuer ?`,
      nzOkText: 'Supprimer',
      nzCancelText: 'Annuler',
    })
    if (!confirmed) return

    try {
      await firstValueFrom(this.ltiService.deleteLtiPlatform(platform.id))
      this.deleted.emit(platform)
      this.modal.close()
    } catch {
      this.dialogService.error('Une erreur est survenue lors de la suppression de la plateforme !')
    } finally {
      this.changeDetectorRef.markForCheck()
    }
  }

  protected createForm() {
    const platform = this.platform
    return this.formBuilder.group({
      lmsId: [{ value: '', disabled: !!platform }],
      name: [platform?.name ?? '', Validators.required],
      url: [platform?.url ?? '', Validators.required],
      clientId: [platform?.clientId ?? '', Validators.required],
      authenticationEndpoint: [platform?.authenticationEndpoint ?? '', Validators.required],
      accessTokenEndpoint: [platform?.accessTokenEndpoint ?? '', Validators.required],
      authorizationServer: [platform?.authorizationServer ?? ''],
      key: [platform?.idTokenValidation.key ?? '', Validators.required],
      active: [platform?.active ?? true],
    })
  }
}
