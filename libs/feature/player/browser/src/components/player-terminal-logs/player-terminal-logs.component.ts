import { CommonModule } from '@angular/common'
import { Component, input, OnInit } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { NzToolTipModule } from 'ng-zorro-antd/tooltip'
import { AuthService, DialogService } from '@platon/core/browser'
import { LogType, PlatonLog } from '@platon/feature/player/common'
import { User, UserRoles } from '@platon/core/common'

@Component({
  standalone: true,
  selector: 'player-terminal-logs',
  templateUrl: './player-terminal-logs.component.html',
  styleUrls: ['./player-terminal-logs.component.scss'],
  imports: [CommonModule, MatIconModule, MatButtonModule, NzToolTipModule],
})
export class PlayerTerminalLogsComponent implements OnInit {
  logs = input<PlatonLog[]>([])
  title = input('Terminal PlaTon')
  protected isTeacherOrAdmin = false

  constructor(private readonly dialogService: DialogService, private readonly authService: AuthService) {}

  async ngOnInit(): Promise<void> {
    const user = (await this.authService.ready()) as User
    this.isTeacherOrAdmin = !!user && [UserRoles.admin, UserRoles.teacher].includes(user.role)
  }

  protected getLogClass(log: PlatonLog): string {
    switch (log.type) {
      case LogType.ERROR:
        return 'terminal-line error-line'
      case LogType.WARNING:
        return 'terminal-line warning-line'
      case LogType.DEBUG:
        return 'terminal-line debug-line'
      case LogType.INFO:
      default:
        return 'terminal-line info-line'
    }
  }

  protected getLogIcon(log: PlatonLog): string {
    switch (log.type) {
      case LogType.ERROR:
        return 'error'
      case LogType.WARNING:
        return 'warning'
      case LogType.DEBUG:
        return 'bug_report'
      case LogType.INFO:
      default:
        return 'info'
    }
  }

  protected getLogsAsText(): string {
    return (
      this.logs()
        ?.map((log) => `[${log.type.toUpperCase()}] ${log.message}`)
        .join('\n') ?? ''
    )
  }

  protected async copyToClipboard(): Promise<void> {
    const text = this.getLogsAsText()
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      this.dialogService.success('Contenu copié dans le presse-papier')
    } catch {
      this.dialogService.error('Impossible de copier le contenu')
    }
  }
}
