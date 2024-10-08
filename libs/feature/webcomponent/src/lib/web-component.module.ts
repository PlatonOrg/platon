import { NgModule } from '@angular/core'
import { NgeElementModule } from '@cisstech/nge/elements'
import { WEB_COMPONENTS_BUNDLES, WEB_COMPONENTS_REGISTRY } from './web-component-registry'
@NgModule({
  imports: [NgeElementModule.forRoot(WEB_COMPONENTS_BUNDLES)],
  exports: [NgeElementModule],
  providers: [WEB_COMPONENTS_REGISTRY],
  declarations: [],
})
export class FeatureWebComponentModule {}
