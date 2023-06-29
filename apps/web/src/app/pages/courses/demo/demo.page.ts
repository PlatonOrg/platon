import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-course-demo',
  templateUrl: './demo.page.html',
  styleUrls: ['./demo.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
})
export class CourseDemoPage implements OnInit {
  constructor() {}
  async ngOnInit(): Promise<void> {}
}
