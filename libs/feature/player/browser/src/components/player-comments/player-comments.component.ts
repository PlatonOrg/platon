import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnChanges, OnInit } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { firstValueFrom } from 'rxjs'

import { NzCommentModule } from 'ng-zorro-antd/comment'
import { NzFormModule } from 'ng-zorro-antd/form'
import { NzInputModule } from 'ng-zorro-antd/input'
import { NzListModule } from 'ng-zorro-antd/list'

import { ResultService } from '@platon/feature/result/browser'

import { AuthService, DialogModule, DialogService, UserAvatarComponent } from '@platon/core/browser'
import { User } from '@platon/core/common'
import { SessionComment } from '@platon/feature/result/common'
import { NzButtonModule } from 'ng-zorro-antd/button'
import { NzEmptyModule } from 'ng-zorro-antd/empty'
import { ExercisePlayer } from '@platon/feature/player/common'
import { MatCardModule } from '@angular/material/card'
import { NzSpinModule } from 'ng-zorro-antd/spin'
import { MatMenuModule } from '@angular/material/menu'
import { MatIconModule } from '@angular/material/icon'
import { MatButtonModule } from '@angular/material/button'

@Component({
  standalone: true,
  selector: 'player-comments',
  templateUrl: './player-comments.component.html',
  styleUrls: ['./player-comments.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatMenuModule,
    MatIconModule,
    MatButtonModule,

    NzFormModule,
    NzListModule,
    NzInputModule,
    NzButtonModule,
    NzCommentModule,
    NzEmptyModule,
    NzSpinModule,

    DialogModule,
    UserAvatarComponent,
  ],
})
export class PlayerCommentsComponent implements OnInit, OnChanges {
  @Input() answers: ExercisePlayer[] = []
  @Input() canComment = false

  protected comments: SessionComment[] = []
  protected input = ''
  protected user!: User
  protected submitting = false
  private sessionId = ''
  private answerId = ''
  protected isLoading = true
  protected previousComments: SessionComment[] = []
  protected showSuggestions = false

  constructor(
    private readonly authService: AuthService,
    private readonly dialogService: DialogService,
    private readonly resultService: ResultService,
    private readonly changeDetectorRef: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    this.user = (await this.authService.ready()) as User
    this.sessionId = this.answers[this.answers.length - 1].sessionId
    this.answerId = this.answers[this.answers.length - 1].answerId as string
    const response = await firstValueFrom(this.resultService.listComments(this.sessionId, this.answerId))
    this.isLoading = false
    this.comments = response.resources
    this.changeDetectorRef.markForCheck()
  }

  async ngOnChanges(): Promise<void> {
    this.sessionId = this.answers[this.answers.length - 1].sessionId
    this.answerId = this.answers[this.answers.length - 1].answerId as string
    const response = await firstValueFrom(this.resultService.listComments(this.sessionId, this.answerId))
    this.isLoading = false
    this.comments = response.resources
    this.changeDetectorRef.markForCheck()
  }

  protected async onSubmitComment(): Promise<void> {
    try {
      this.submitting = true
      const comment = await firstValueFrom(
        this.resultService.createComment(this.sessionId, this.answerId, { comment: this.input })
      )
      this.input = ''
      this.comments = [...this.comments, comment]
      this.previousComments = [...this.previousComments, comment]
    } catch {
      this.dialogService.error(`Le commentaire n'a pas pu être envoyé. Veuillez réessayer plus tard.`)
    } finally {
      this.submitting = false
      this.changeDetectorRef.markForCheck()
    }
  }

  protected async blockEvents(event: KeyboardEvent): Promise<void> {
    if (event.metaKey && event.key === 'Enter') {
      await this.onSubmitComment()
      event.preventDefault()
      event.stopPropagation()
    }
    event.stopPropagation()
  }
}
