import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, OnInit, ViewChild } from '@angular/core'
import {
  AbstractControl,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms'
import { ActivatedRoute, Router, RouterModule } from '@angular/router'

import { MatCheckboxModule } from '@angular/material/checkbox'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'

import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzCollapseModule } from 'ng-zorro-antd/collapse'
import { NzSelectModule } from 'ng-zorro-antd/select'
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton'
import { NzSpinModule } from 'ng-zorro-antd/spin'

import { SelectionModel } from '@angular/cdk/collections'
import { AuthService, DialogModule, DialogService, TagService, UserService } from '@platon/core/browser'
import { Level, Topic, User, UserCharter } from '@platon/core/common'
import {
  CircleTreeComponent,
  ResourceItemComponent,
  ResourcePipesModule,
  ResourceSearchBarComponent,
  ResourceService,
} from '@platon/feature/resource/browser'
import {
  CircleTree,
  LATEST,
  Resource,
  ResourceTypes,
  branchFromCircleTree,
  circleAncestors,
  flattenCircleTree,
} from '@platon/feature/resource/common'
import { UiStepDirective, UiStepperComponent } from '@platon/shared/ui'
import { NzIconModule } from 'ng-zorro-antd/icon'
import { NzPageHeaderModule } from 'ng-zorro-antd/page-header'
import { NzTagModule } from 'ng-zorro-antd/tag'
import { firstValueFrom } from 'rxjs'
import { UserCharterComponent } from '../../../widgets/toolbar/user-charter/user-charter.component'

type TemplateSource = {
  circle: CircleTree
  count: number
  templates: Resource[]
}

@Component({
  standalone: true,
  selector: 'app-resource-create',
  templateUrl: './create.page.html',
  styleUrls: ['./create.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,

    MatInputModule,
    MatCheckboxModule,
    MatFormFieldModule,

    NzTagModule,
    NzSpinModule,
    NzIconModule,
    NzButtonModule,
    NzSelectModule,
    NzCollapseModule,
    NzSkeletonModule,
    NzPageHeaderModule,

    UiStepDirective,
    UiStepperComponent,
    DialogModule,

    CircleTreeComponent,
    ResourcePipesModule,
    ResourceItemComponent,
    ResourceSearchBarComponent,
    UserCharterComponent,
  ],
})
export class ResourceCreatePage implements OnInit {
  protected type!: ResourceTypes
  protected parentId?: string
  protected parentName?: string
  protected template?: Resource

  protected loading = true
  protected creating = false
  protected editionMode?: 'scratch' | 'template'
  protected loadingTemplates = false
  protected isFinished = false
  protected user?: User

  // Used to check if the user has accepted the charter
  protected userCharterAccepted = true
  protected userCharter?: UserCharter
  protected userCharterModalVisible = true

  protected tree!: CircleTree
  protected topics: Topic[] = []
  protected levels: Level[] = []
  protected templateSources: TemplateSource[] = []
  protected selectedTemplateSources = new SelectionModel<TemplateSource>(true, [])
  protected infos = new FormGroup({
    name: new FormControl('', [Validators.required]),
    code: new FormControl(''),
    desc: new FormControl('', [Validators.required]),
  })
  protected tags = new FormGroup({
    topics: new FormControl<string[]>([]),
    levels: new FormControl<string[]>([]),
  })

  @ViewChild(UiStepperComponent)
  protected stepper!: UiStepperComponent

  @HostListener('window:keydown.meta.enter')
  protected async handleKeyDown(): Promise<void> {
    if (this.stepper.isValid) {
      this.stepper.isLast ? await this.create() : this.stepper.nextStep()
    }
  }

  constructor(
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly tagService: TagService,
    private readonly dialogService: DialogService,
    private readonly activatedRoute: ActivatedRoute,
    private readonly resourceService: ResourceService,
    private readonly userService: UserService,
    private readonly changeDetectorRef: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    this.type = (this.activatedRoute.snapshot.queryParamMap.get('type') || ResourceTypes.CIRCLE) as ResourceTypes
    this.parentId = this.activatedRoute.snapshot.queryParamMap.get('parent') || undefined
    const templateId = this.activatedRoute.snapshot.queryParamMap.get('template') || undefined
    if (templateId) {
      this.template = await firstValueFrom(this.resourceService.find({ id: templateId }))
      this.editionMode = 'template'
    }

    const user = (await this.authService.ready()) as User
    const [tree, topics, levels, userCharter] = await Promise.all([
      firstValueFrom(this.resourceService.tree()),
      firstValueFrom(this.tagService.listTopics()),
      firstValueFrom(this.tagService.listLevels()),
      firstValueFrom(this.userService.findUserCharterById(user.id)),
    ])

    if (!this.resourceService.canUserCreateResource(user, this.type)) {
      this.router
        .navigateByUrl('/resources', {
          replaceUrl: true,
        })
        .catch(console.error)
      this.dialogService.error("Vous n'avez pas les droits pour cette action !")
      return
    }

    if (this.type === 'CIRCLE') {
      const codes = flattenCircleTree(tree)
        .map((c) => c.code)
        .filter((c) => !!c) as string[]

      this.infos.controls.code.setValidators(Validators.compose([Validators.required, this.codeValidator(codes)]))
      this.infos.updateValueAndValidity()
    }

    this.tree = tree

    this.topics = topics
    this.levels = levels

    this.user = user
    this.userCharter = userCharter
    this.userCharterAccepted = userCharter?.acceptedUserCharter ?? false

    this.loading = false
    this.changeDetectorRef.markForCheck()
  }

  protected onChangeParentId(id?: string): void {
    this.parentId = id
    this.parentName = id ? branchFromCircleTree(this.tree, id)?.name : undefined
  }

  protected async create(): Promise<void> {
    try {
      const infos = this.infos.value
      const tags = this.tags.value

      this.creating = true

      const resource = await firstValueFrom(
        this.resourceService.create({
          type: this.type,
          parentId: this.parentId as string,
          templateId: this.editionMode === 'template' ? this.template?.id : undefined,
          templateVersion: this.editionMode === 'template' ? LATEST : undefined,
          name: infos.name as string,
          desc: infos.desc as string,
          code: infos.code || undefined,
          levels: tags.levels as string[],
          topics: tags.topics as string[],
        })
      )
      if (resource.type === 'EXERCISE' || resource.type === 'ACTIVITY') {
        window.open(`/editor/${resource.id}?version=latest`, '_blank')
      }
      this.router.navigate(['/resources', resource.id, 'overview'], { replaceUrl: true }).catch(console.error)
    } catch {
      this.dialogService.error('Une erreur est survenue lors de cette action, veuillez réessayer un peu plus tard !')
    } finally {
      this.creating = false
      this.changeDetectorRef.markForCheck()
    }
  }

  protected async preloadTemplates(): Promise<void> {
    if (this.loadingTemplates || this.template) return

    this.loadingTemplates = true
    this.templateSources = []
    this.selectedTemplateSources.clear()

    this.changeDetectorRef.markForCheck()

    const ancestors = circleAncestors(this.tree, this.parentId as string, true)
    const response = await firstValueFrom(
      this.resourceService.search({
        types: ['EXERCISE'],
        configurable: true,
        parents: [...ancestors.map((a) => a.id)],
        expands: ['metadata', 'statistic'],
      })
    )

    response.resources = response.resources
      .map((r) => ({
        ...r,
        exerciseLength: r.statistic?.exercise?.references?.total ?? 0,
      }))
      .sort((a, b) => b.exerciseLength - a.exerciseLength)
    this.templateSources = ancestors
      .map((circle) => {
        const templates = response.resources.filter((t) => t.parentId === circle.id)
        return {
          circle,
          count: templates.length,
          templates,
        }
      })
      .filter((s) => s.count > 0)

    const firstNonEmpty = this.templateSources.find((s) => s.count > 0)
    if (firstNonEmpty) {
      this.selectedTemplateSources.select(firstNonEmpty)
    }

    this.loadingTemplates = false

    this.changeDetectorRef.markForCheck()
  }

  private codeValidator(codes: string[]): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const forbidden = [...codes, 'relative'].includes(control.value)
      return forbidden ? { code: true } : null
    }
  }

  protected openTemplateResource(templateId: string): void {
    window.open(`/resources/${templateId}`, '_blank')
  }

  protected selectEditionMode(mode: 'scratch' | 'template', stepper: UiStepperComponent): void {
    if (mode === 'template' && !this.templateSources.length) {
      return
    }
    this.editionMode = mode
    this.infos.markAllAsTouched()
    stepper.nextStep()
  }

  protected endStep(stepper: UiStepperComponent): void {
    if (this.isFinished) return
    this.infos.markAllAsTouched()
    stepper.nextStep()
    this.isFinished = true
  }

  protected onUserCharterAccepted(updateCharter: UserCharter): void {
    this.userCharter = { ...updateCharter }
    this.userCharterAccepted = this.userCharter?.acceptedUserCharter ?? false
    this.changeDetectorRef.detectChanges()
  }
}
