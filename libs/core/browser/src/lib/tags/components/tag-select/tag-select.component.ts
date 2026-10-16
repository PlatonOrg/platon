import { ChangeDetectionStrategy, Component, OnInit, forwardRef, inject, input, signal } from '@angular/core'
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms'
import { Level, Topic } from '@platon/core/common'
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal'
import { NzSelectModule } from 'ng-zorro-antd/select'
import { Observable, firstValueFrom } from 'rxjs'
import { DialogService } from '../../../dialog'
import { TagService } from '../../api/tag.service'

type Tag = Topic | Level
type TagKind = 'topic' | 'level'
type ConflictAction = 'cancel' | 'force' | 'similar'

interface TagKindConfig {
  label: string
  list: (service: TagService) => Observable<Tag[]>
  create: (service: TagService, name: string, force?: boolean) => Observable<Tag>
}

const KINDS: Record<TagKind, TagKindConfig> = {
  topic: {
    label: 'Topic',
    list: (s) => s.listTopics(),
    create: (s, name, force) => s.createTopic({ name, force }),
  },
  level: {
    label: 'Niveau',
    list: (s) => s.listLevels(),
    create: (s, name, force) => s.createLevel({ name, force }),
  },
}

/**
 * Sélecteur de topics/niveaux compatible avec les formulaires Angular (`formControlName`, `ngModel`).
 * La valeur est la liste des ids sélectionnés. Les nouveaux tags saisis par l'utilisateur sont créés
 * dès la sélection, après confirmation si un tag similaire existe déjà.
 */
@Component({
  selector: 'tag-select',
  template: `
    <nz-select
      nzAllowClear
      nzShowSearch
      nzMode="tags"
      style="width: 100%"
      [nzSize]="size()"
      [nzPlaceHolder]="placeholder()"
      [nzLoading]="loading()"
      [nzDisabled]="disabled() || loading()"
      [ngModel]="value()"
      (ngModelChange)="onSelectionChange($event)"
    >
      @for (item of options(); track item.id) {
      <nz-option [nzLabel]="item.name" [nzValue]="item.id" />
      }
    </nz-select>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, NzSelectModule, NzModalModule],
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TagSelectComponent),
      multi: true,
    },
  ],
})
export class TagSelectComponent implements ControlValueAccessor, OnInit {
  private readonly tagService = inject(TagService)
  private readonly modal = inject(NzModalService)
  private readonly dialogService = inject(DialogService)

  readonly kind = input.required<TagKind>()
  readonly placeholder = input('Cliquez pour sélectionner')
  readonly size = input<'large' | 'default' | 'small'>('large')

  protected readonly options = signal<Tag[]>([])
  protected readonly value = signal<string[]>([])
  protected readonly disabled = signal(false)
  protected readonly loading = signal(false)

  private onChange: (value: string[]) => void = () => undefined
  private onTouched: () => void = () => undefined

  async ngOnInit(): Promise<void> {
    this.loading.set(true)
    try {
      this.options.set(await firstValueFrom(this.config.list(this.tagService)))
    } catch {
      this.dialogService.error('Erreur lors du chargement des données')
    } finally {
      this.loading.set(false)
    }
  }

  writeValue(value: string[] | null): void {
    this.value.set(value ?? [])
  }

  registerOnChange(fn: (value: string[]) => void): void {
    this.onChange = fn
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn
  }

  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled)
  }

  protected async onSelectionChange(values: string[]): Promise<void> {
    this.onTouched()
    this.value.set(values)

    const known = new Set(this.options().map((o) => o.id))
    if (values.every((v) => known.has(v))) {
      this.onChange(values)
      return
    }

    this.loading.set(true)
    try {
      const resolved = new Set<string>()
      for (const v of values) {
        const id = known.has(v) ? v : await this.createTag(v)
        if (id) resolved.add(id)
      }
      const result = [...resolved]
      this.value.set(result)
      this.onChange(result)
    } finally {
      this.loading.set(false)
    }
  }

  private get config(): TagKindConfig {
    return KINDS[this.kind()]
  }

  /** Crée le tag et retourne son id, ou `null` si la création est annulée ou échoue. */
  private async createTag(name: string): Promise<string | null> {
    const { label, create } = this.config
    try {
      let tag = await firstValueFrom(create(this.tagService, name))
      if (tag.existing) {
        const action = await this.askConflictAction(label, name, tag.name)
        if (action === 'cancel') return null
        if (action === 'force') {
          tag = await firstValueFrom(create(this.tagService, name, true))
        }
        // If action is 'similar', we keep the existing tag, so no need to call create again
      }
      const created = tag
      this.options.update((options) => (options.some((o) => o.id === created.id) ? options : [...options, created]))
      return tag.id
    } catch (error) {
      console.error(`Erreur lors de la création du tag "${name}":`, error)
      this.dialogService.error(`Erreur lors de la création de "${name}"`)
      return null
    }
  }

  private askConflictAction(label: string, name: string, originalName: string): Promise<ConflictAction> {
    return new Promise((resolve) => {
      const close = (action: ConflictAction) => {
        modalRef.destroy()
        resolve(action)
      }
      const modalRef = this.modal.create({
        nzTitle: `${label} similaire trouvé`,
        nzContent: `Le ${label} "${name}" est similaire à un autre intitulé "${originalName}". Que voulez-vous faire ?`,
        nzClosable: false,
        nzMaskClosable: false,
        nzCancelText: null,
        nzOkText: null,
        nzFooter: [
          { label: "Prendre l'intitulé similaire", type: 'default', onClick: () => close('similar') },
          { label: "Forcer l'ajout", type: 'primary', danger: true, onClick: () => close('force') },
          { label: 'Annuler', type: 'default', onClick: () => close('cancel') },
        ],
      })
    })
  }
}
