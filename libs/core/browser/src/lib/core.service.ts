import { Injectable } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { NzIconService } from 'ng-zorro-antd/icon';
import { ThemeService } from './services/theme.service';

@Injectable({ providedIn: 'root' })
export class CoreService {
  constructor(
    private readonly themeService: ThemeService,
    private readonly iconRegistry: MatIconRegistry,
    private readonly nzIconService: NzIconService,
  ) { }

  init() {
    this.themeService.loadTheme();
    this.nzIconService.changeAssetsSource('assets/vendors/@ant-design');
    this.iconRegistry.setDefaultFontSetClass('material-icons-outlined');
  }

}
