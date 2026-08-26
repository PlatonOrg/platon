import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  inject,
  OnInit,
} from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatSelectModule } from '@angular/material/select'
import { NzAlertModule } from 'ng-zorro-antd/alert'

export interface AIPromptModalData {
  prompt: string
  apiKey: string
  provider: 'openai' | 'anthropic' | 'mistral'
  model: string
}

@Component({
  selector: 'lib-ai-prompt-modal',
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
    NzAlertModule,
  ],
  templateUrl: './ai-prompt-modal.component.html',
  styleUrls: ['./ai-prompt-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AIPromptModalComponent implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<AIPromptModalComponent>)
  private readonly changeDetectorRef = inject(ChangeDetectorRef)

  protected prompt = ''
  protected apiKey = ''
  protected provider: 'openai' | 'anthropic' | 'mistral' = 'openai'
  protected model = 'gpt-4o-mini'

  protected readonly openaiModels = [
    { value: 'gpt-4o', label: 'GPT-4o (Recommandé)' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Rapide & économique)' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Économique)' },
  ]

  protected readonly anthropicModels = [
    { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (Recommandé)' },
    { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
    { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku (Rapide)' },
  ]

  protected readonly mistralModels = [
    { value: 'mistral-large-latest', label: 'Mistral Large (Recommandé)' },
    { value: 'mistral-medium-latest', label: 'Mistral Medium' },
    { value: 'mistral-small-latest', label: 'Mistral Small (Économique)' },
    { value: 'open-mistral-7b', label: 'Open Mistral 7B (Gratuit)' },
    { value: 'open-mixtral-8x7b', label: 'Open Mixtral 8x7B' },
    { value: 'open-mixtral-8x22b', label: 'Open Mixtral 8x22B' },
  ]

  protected readonly examplePrompts = [
    'Traduis tous les textes en anglais',
    'Rends tous les nombres deux fois plus grands',
    "Change tous les titres pour qu'ils soient plus accrocheurs",
    "Transforme les descriptions pour qu'elles soient plus courtes et percutantes",
    "Adapte le contenu pour un public d'enfants de 10 ans",
  ]

  ngOnInit(): void {
    const savedProvider = localStorage.getItem('ai_provider') as 'openai' | 'anthropic' | 'mistral'
    const savedModel = localStorage.getItem('ai_model')

    if (savedProvider) {
      this.provider = savedProvider
      this.onProviderChange()
    }
    if (savedModel) this.model = savedModel

    this.changeDetectorRef.markForCheck()
  }

  protected onProviderChange(): void {
    // Changer le modèle par défaut selon le provider
    if (this.provider === 'openai') {
      this.model = 'gpt-4o-mini'
    } else if (this.provider === 'anthropic') {
      this.model = 'claude-3-5-sonnet-20241022'
    } else if (this.provider === 'mistral') {
      this.model = 'mistral-large-latest'
    }
    this.changeDetectorRef.markForCheck()
  }

  protected useExamplePrompt(prompt: string): void {
    this.prompt = prompt
    this.changeDetectorRef.markForCheck()
  }

  protected onCancel(): void {
    this.dialogRef.close(null)
  }

  protected onSubmit(): void {
    if (!this.prompt.trim() || !this.apiKey.trim()) {
      return
    }

    localStorage.setItem('ai_provider', this.provider)
    localStorage.setItem('ai_model', this.model)

    const result: AIPromptModalData = {
      prompt: this.prompt.trim(),
      apiKey: this.apiKey.trim(),
      provider: this.provider,
      model: this.model,
    }

    this.dialogRef.close(result)
  }
}
