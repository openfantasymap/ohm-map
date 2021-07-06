import { Component, OnInit } from '@angular/core';

import { MnDockerService } from '@modalnodes/mn-docker';
import { HttpClient } from '@angular/common/http';
import { MatomoInjector } from 'ngx-matomo';

import env from '../assets/env.json';

declare const mapboxgl;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {

  constructor(
    private matomoInjector: MatomoInjector
  ) {}

  ngOnInit() {
    this.matomoInjector.init('//tracker.openhistorymap.org/', 2);
  }
}
