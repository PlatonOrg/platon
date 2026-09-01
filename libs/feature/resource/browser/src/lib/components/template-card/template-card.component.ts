import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
} from '@angular/core'
import { type Resource } from '@platon/feature/resource/common'
import { MatIconModule } from '@angular/material/icon'
import { MatTooltipModule } from '@angular/material/tooltip'
import { NzIconModule } from 'ng-zorro-antd/icon'

import { ViewChild } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { v4 as uuidv4 } from 'uuid'
import { StorageService } from '@platon/core/browser'
import { UiModalIFrameComponent } from '@platon/shared/ui'
import { getPreviewOverridesStorageKey } from '../resource-item/resource-item.component'
import { Variables } from '@platon/feature/compiler'

@Component({
  selector: 'resource-template-card',
  templateUrl: './template-card.component.html',
  styleUrls: ['./template-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, MatTooltipModule, NzIconModule, UiModalIFrameComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class TemplateCardComponent {
  @Input({ required: true }) template!: Resource
  @Output() templateSelected = new EventEmitter<Resource>()

  private readonly storageService = inject(StorageService)
  protected previewOverrides: Variables = { name: 'Student', class: '1A' }

  @ViewChild('previewIframe') private readonly previewModal!: UiModalIFrameComponent

  protected onSelectTemplate(): void {
    this.templateSelected.emit(this.template)
  }

  protected templateReferences(): number {
    return this.template.statistic?.exercise?.references?.template ?? 0
  }

  protected templateUtilizations(): number {
    return this.template.statistic?.exercise?.references?.referencesAttemptCount ?? 0
  }

  get previewUrl(): string {
    const sessionId = uuidv4()

    firstValueFrom(
      this.storageService.set(getPreviewOverridesStorageKey(sessionId), JSON.stringify(this.previewOverrides))
    ).catch(console.error)

    return `/player/preview/${this.template.id}?version=latest&sessionId=${sessionId}`
  }

  openPreview(event?: MouseEvent): void {
    event?.stopPropagation()
    this.previewModal.open(this.previewUrl)
  }
}
