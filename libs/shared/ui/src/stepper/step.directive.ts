import { Directive, Input, TemplateRef } from '@angular/core'

@Directive({
  standalone: true,
  selector: '[uiStepperStep]',
})
export class UiStepDirective {
  @Input() stepTitle?: string
  @Input() stepIcon?: string | TemplateRef<void>
  @Input() stepValidator?: boolean

  constructor(readonly templateRef: TemplateRef<unknown>) {}
}
