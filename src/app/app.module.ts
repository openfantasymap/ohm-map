import { AppRoutingModule } from './app-routing.module';
import { SharedModule } from './shared.module';
import { MnConfiguratorModule } from '@modalnodes/mn-configurator';
import { MnDockerModule } from '@modalnodes/mn-docker';
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { MatomoModule } from 'ngx-matomo';

import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MapComponent } from './map/map.component';
import { StyleSelectorComponent } from './style-selector/style-selector.component';
import { DecimaldatePipe } from './decimaldate.pipe';
import { NicedatePipe } from './nicedate.pipe';
import { DateComponent } from './date/date.component';
import {ClipboardModule} from '@angular/cdk/clipboard';

@NgModule({
  declarations: [
    AppComponent,
    MapComponent,
    StyleSelectorComponent,
    DecimaldatePipe,
    NicedatePipe,
    DateComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    ClipboardModule,
    MnDockerModule,
    MnConfiguratorModule,
    SharedModule,
    MatomoModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
