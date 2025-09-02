import { NgModule, Pipe, PipeTransform } from '@angular/core'

@Pipe({
  name: 'formatTime',
})
export class TimePipe implements PipeTransform {
  transform(totalSeconds: number | null | undefined): string {
    if (totalSeconds === null || totalSeconds === undefined || totalSeconds < 0) {
      return '00:00'
    }

    const seconds = Math.floor(totalSeconds)

    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60

    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
  }
}

@NgModule({
  declarations: [TimePipe],
  exports: [TimePipe],
})
export class TimePipeModule {}
