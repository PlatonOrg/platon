import { Component, OnInit } from '@angular/core'
import { RouterModule } from '@angular/router'
import { AuthService } from '@platon/core/browser'
import { CoreService } from '@platon/core/browser'
import { FeatureWebComponentModule } from '@platon/feature/webcomponent'
import { UserRoles } from '@platon/core/common'

@Component({
  imports: [RouterModule, FeatureWebComponentModule],
  selector: 'app-root',
  templateUrl: './app.page.html',
  styleUrls: ['./app.page.scss'],
})
export class AppPage implements OnInit {
  isAdmin = false

  constructor(private readonly core: CoreService, private authService: AuthService) {}

  async ngOnInit() {
    const user = await this.authService.ready()
    this.isAdmin = user?.role === UserRoles.admin
    this.core.init()
  }
}
