import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  OnInit,
  forwardRef,
  inject,
  signal,
} from '@angular/core'
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms'
import { ActivatedRoute, Router, RouterModule } from '@angular/router'
import { firstValueFrom } from 'rxjs'

import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzIconModule } from 'ng-zorro-antd/icon'
import { NzSpinModule } from 'ng-zorro-antd/spin'

import { DialogService } from '@platon/core/browser'
import { Activity, Course, LessonContent } from '@platon/feature/course/common'
import { CourseService } from '@platon/feature/course/browser'
import {
  EditorJsImageUploader,
  EditorJsImageUploadResponse,
  emptyEditorJsData,
  UiEditorJsModule,
} from '@platon/shared/ui'

@Component({
  standalone: true,
  selector: 'app-lesson-editor',
  templateUrl: './lesson-editor.page.html',
  styleUrls: ['./lesson-editor.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    NzButtonModule,
    NzIconModule,
    NzSpinModule,
    UiEditorJsModule,
  ],
  providers: [{ provide: EditorJsImageUploader, useExisting: forwardRef(() => LessonEditorPage) }],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class LessonEditorPage implements OnInit, EditorJsImageUploader {
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly courseService = inject(CourseService)
  private readonly dialogService = inject(DialogService)

  protected readonly loading = signal(true)
  protected readonly saving = signal(false)
  protected readonly hasUnsavedChanges = signal(false)

  protected readonly course = signal<Course | undefined>(undefined)
  protected readonly activity = signal<Activity | undefined>(undefined)

  protected readonly form = new FormGroup({
    lessonTitle: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    content: new FormControl<LessonContent>(emptyEditorJsData() as LessonContent, { nonNullable: true }),
  })

  async ngOnInit(): Promise<void> {
    const courseId = this.route.snapshot.paramMap.get('courseId') as string
    const activityId = this.route.snapshot.paramMap.get('activityId') as string

    try {
      const [course, activity] = await Promise.all([
        firstValueFrom(this.courseService.find({ id: courseId })),
        firstValueFrom(this.courseService.findActivity(courseId, activityId)),
      ])
      this.course.set(course)
      this.activity.set(activity)
      this.form.reset({
        lessonTitle: activity.lessonTitle ?? '',
        content: (activity.content as LessonContent) ?? (emptyEditorJsData() as LessonContent),
      })
      this.form.valueChanges.subscribe(() => this.hasUnsavedChanges.set(true))
    } catch {
      this.dialogService.error('Impossible de charger cette leçon.')
    } finally {
      this.loading.set(false)
    }
  }

  protected async save(): Promise<void> {
    const activity = this.activity()
    if (!activity || !this.form.valid) {
      this.form.markAllAsTouched()
      return
    }

    this.saving.set(true)

    try {
      const { lessonTitle, content } = this.form.getRawValue()
      this.activity.set(await firstValueFrom(this.courseService.updateActivity(activity, { lessonTitle, content })))
      this.hasUnsavedChanges.set(false)
      this.dialogService.success('Leçon enregistrée.')
    } catch {
      this.dialogService.error("Une erreur est survenue lors de l'enregistrement de la leçon.")
    } finally {
      this.saving.set(false)
    }
  }

  protected back(): void {
    this.router.navigate(['/courses', this.course()?.id, 'dashboard']).catch(console.error)
  }

  // Implémente EditorJsImageUploader : branché automatiquement par le bloc `image` d'EditorJS
  // (extensions/image.extension.ts) via l'injection Angular, sans configuration côté template.
  async uploadByFile(file: Blob): Promise<EditorJsImageUploadResponse> {
    const course = this.course()
    if (!course) {
      throw new Error('Cannot upload an image before the course is loaded')
    }
    return firstValueFrom(this.courseService.uploadFile(course.id, file as File))
  }

  async uploadByUrl(url: string): Promise<EditorJsImageUploadResponse> {
    return { success: 1, file: { url } }
  }
}
