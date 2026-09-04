import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core'
import { FormBuilder, ReactiveFormsModule } from '@angular/forms'
import { RouterModule } from '@angular/router'
import { firstValueFrom } from 'rxjs'

import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzSelectModule } from 'ng-zorro-antd/select'

import { MatCardModule } from '@angular/material/card'
import { DialogModule, DialogService, ProtectedComponent, TagService, UserService } from '@platon/core/browser'
import { Level, Topic, User, UserPrefs, UserRoles } from '@platon/core/common'
import { MatIconModule } from '@angular/material/icon'

@Component({
  selector: 'app-account-about-me',
  templateUrl: './about-me.page.html',
  styleUrls: ['./about-me.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatInputModule,
    MatSelectModule,
    MatFormFieldModule,
    MatIconModule,
    NzSelectModule,
    NzButtonModule,
    DialogModule,
    ProtectedComponent,
  ],
})
export class AccountAboutMePage {
  private readonly fb = inject(FormBuilder)
  private readonly tagService = inject(TagService)
  private readonly userService = inject(UserService)
  private readonly dialogService = inject(DialogService)
  private readonly changeDetectorRef = inject(ChangeDetectorRef)

  protected readonly form = this.fb.group({
    firstName: this.fb.control({ value: '', disabled: true }),
    lastName: this.fb.control({ value: '', disabled: true }),
    email: this.fb.control({ value: '', disabled: true }),
    role: this.fb.control({ value: UserRoles.teacher, disabled: true }),
    discordId: this.fb.control({ value: '', disabled: true }),
    topics: this.fb.control<string[]>({ value: [], disabled: false }),
    levels: this.fb.control<string[]>({ value: [], disabled: false }),
  })

  private user!: User

  protected prefs: UserPrefs | undefined
  protected topics: Topic[] = []
  protected levels: Level[] = []
  protected icon = 'lock'

  protected async onConnect(user: User): Promise<void> {
    this.user = user
    const [prefs, topics, levels] = await Promise.all([
      firstValueFrom(this.userService.findUserPrefs(user.username)),
      firstValueFrom(this.tagService.listTopics()),
      firstValueFrom(this.tagService.listLevels()),
    ])

    this.prefs = prefs
    this.topics = topics
    this.levels = levels

    this.form.patchValue({
      ...user,
      levels: prefs.levels.map((level) => level.id),
      topics: prefs.topics.map((topic) => topic.id),
    })
  }

  protected async update(): Promise<void> {
    try {
      await Promise.all([
        firstValueFrom(
          this.userService.updateUserPrefs(this.user.username, {
            levels: this.form.value.levels || [],
            topics: this.form.value.topics || [],
          })
        ),
        await firstValueFrom(
          this.userService.update(this.user.id, { discordId: this.form.get('discordId')?.value ?? undefined })
        ),
      ])
      this.dialogService.success('Vos informations ont été mises à jour !')
    } catch {
      this.dialogService.error('Une erreur est survenue, veuillez réessayer un peu plus tard !')
    } finally {
      this.changeDetectorRef.markForCheck()
    }
  }

  protected async editDiscordId() {
    if (this.form.get('discordId')?.enabled) {
      this.icon = 'lock'
      this.form.get('discordId')?.disable()
      if (this.form.get('discordId')?.value !== this.user.discordId) {
        try {
          await firstValueFrom(
            this.userService.update(this.user.id, { discordId: this.form.get('discordId')?.value ?? undefined })
          )
        } catch {
          this.dialogService.error('Une erreur est survenue, veuillez réessayer un peu plus tard !')
        }
        this.dialogService.success('Votre identifiant Discord a été mis à jour !')
      }
    } else {
      this.icon = 'lock_open'
      this.form.get('discordId')?.enable()
    }
  }
}
