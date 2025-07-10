import { Directive, ElementRef, Input, NgModule, OnChanges, OnInit } from '@angular/core'
import { ResourceLoaderService } from '@cisstech/nge/services'
import { take } from 'rxjs/operators'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const d3: any

// https://github.com/magjac/d3-graphviz/tree/v2.6.1

@Directive({
  // eslint-disable-next-line @angular-eslint/directive-selector
  selector: '[renderDot]',
})
export class RenderDotDirective implements OnInit, OnChanges {
  private ready = false

  @Input('renderDot')
  dot?: string

  constructor(private el: ElementRef, private readonly resourceLoader: ResourceLoaderService) {}

  ngOnInit() {
    this.resourceLoader
      .loadAllSync([
        ['script', 'assets/vendors/d3/d3.min.js'],
        ['script', 'assets/vendors/d3-graphviz/d3-graphviz.min.js'],
      ])
      .pipe(take(1))
      .subscribe(() => {
        this.ready = true
        this.render()
      })
  }

  ngOnChanges() {
    if (this.ready) {
      this.render()
    }
  }

  private render() {
    if (this.el && this.dot) {
      d3.select(this.el.nativeElement)
        .graphviz({
          zoom: false,
          fit: true,
          useWorker: false,
        })
        .renderDot(this.dot)
    }
  }
}

@NgModule({
  exports: [RenderDotDirective],
  declarations: [RenderDotDirective],
})
export class RenderDotModule {}
