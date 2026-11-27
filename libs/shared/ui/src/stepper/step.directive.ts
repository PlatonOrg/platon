import { Directive, Input, TemplateRef, inject } from '@angular/core'

@Directive({
  standalone: true,
  selector: '[uiStepperStep]',
})
export class UiStepDirective {
  readonly templateRef = inject<TemplateRef<unknown>>(TemplateRef)

  @Input() stepTitle?: string
  @Input() stepIcon?: string | TemplateRef<void>
  @Input() stepValidator?: boolean
}
