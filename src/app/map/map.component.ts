import {
  OhmService
} from './../ohm.service';
import {
  OfmService
} from './../ofm.service';
import {
  DateComponent
} from './../date/date.component';
import {
  DecimaldatePipe
} from './../decimaldate.pipe';
import {
  Component,
  OnInit,
  Input,
  isDevMode,
  AfterContentInit,
  ViewChild
} from '@angular/core';

import {
  MnDockerService
} from '@modalnodes/mn-docker';
import {
  HttpClient
} from '@angular/common/http';

import env from '../../assets/env.json';
import {
  ActivatedRoute
} from '@angular/router';
import {
  Location
} from '@angular/common';
import {
  NicedatePipe
} from '../nicedate.pipe';
import {
  timeInterval
} from 'rxjs/operators';
import {
  MatDialog
} from '@angular/material/dialog';
import {
  Observable
} from 'rxjs';
import {
  MatSnackBar
} from '@angular/material/snack-bar';
import {
  NgxCaptureService
} from 'ngx-capture';
import {
  MatSidenav
} from '@angular/material/sidenav';
import {
  Clipboard
} from '@angular/cdk/clipboard';

//declare const mapboxgl;
declare const maplibregl;
declare const vis;
declare const turf;


@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit, AfterContentInit {
  map;
  ts;

  layers;
  startstopicons = {
    stop: 'play_arrow',
    play: 'stop'
  };
  startstopicon = 'play_arrow';
  startstopstatus = 'stop';
  startstopInterval;

  @Input() style;

  ofm_meta: any;

  start = {
    center: [1.57, 43.67],
    zoom: 3.5
  };

  rels;

  atDate = 866.001;
  atMacroDate = 800;
  atMicroDate = 870;

  tl: string;

  timeline;

  speed = 2000;

  events: Observable < any[] > ;

  infoData: any;

  title;

  @ViewChild('ibar') ibar: MatSidenav;
  @ViewChild('sharebar') sharebar: MatSidenav;
  @ViewChild('screen') screen: any;

  share_link: string;


  showInfo = false;
  showSearch = false;
  searchResults = []
  showLegend = false;
  showTools = false;
  showShare = false;


  hideAll() {
    this.showInfo = false;
    this.showSearch = false;
    this.showLegend = false;
    this.showTools = false;
    this.showShare = false;
  }

  p = null;

  measuring = false;

  measured = "";
  times = [];



  geojson = {
    'type': 'FeatureCollection',
    'features': []
  };
  linestring = {
    'type': 'Feature',
    'geometry': {
      'type': 'LineString',
      'coordinates': []
    }
  };

  constructor(
    private ds: MnDockerService,
    private ar: ActivatedRoute,
    private l: Location,
    private md: MatDialog,
    private ohm: OfmService,
    private ofm: OfmService,
    private http: HttpClient,
    private _snackBar: MatSnackBar,
    private clipboard: Clipboard,
    private capture: NgxCaptureService
  ) {}

  ngAfterContentInit(): void {


    this.map = new maplibregl.Map({
      container: 'ohm_map',
      style: 'https://static.fantasymaps.org/' + this.ar.snapshot.params.timeline + '/map.json', // stylesheet location
      center: this.start.center, // starting position [lng, lat]
      zoom: this.start.zoom, // starting zoom
      projection: 'equirectangular',
      maxPitch: 85,
      minPitch: 0,
      attributionControl: false,
      preserveDrawingBuffer: true,
      transformRequest: (url, resourceType) => {
        let nurl = url;
        if (isDevMode()) {
          nurl = nurl.replace('https://tiles.fantasymaps.org/' + this.tl, this.ts + this.tl);
          nurl = nurl.replace('https://a.tiles.fantasymaps.org/' + this.tl, this.ts + this.tl);
          nurl = nurl.replace('https://b.tiles.fantasymaps.org/' + this.tl, this.ts + this.tl);
          nurl = nurl.replace('https://c.tiles.fantasymaps.org/' + this.tl, this.ts + this.tl);
        }
        if (resourceType === 'Tile' && url.indexOf('openhistory') >= 0) {
          return {
            url: nurl.replace('{atDate}', this.atDate.toString())
          };
        }
      }

    });

    console.log(this.map);

    this.map.on('load', () => {
      this.showRels();
      this.map.on('zoomend', () => {
        if (this.map.getZoom() == 22 && this.ofm_meta.relatedLayers) {
          const features = this.map.queryRenderedFeatures({
            layers: this.ofm_meta ?.relatedLayers
          });
          if (features.length == 1) {
            const move_to = this.ar.snapshot.params.timeline + "-" + features[0].properties[this.ofm_meta.relatedField].toLowerCase();
            this.warpTo(this.atDate, move_to);
          }
        } else if (this.map.getZoom() < 1 && this.ofm_meta.parentMap) {
          this.warpTo(this.atDate, this.ofm_meta.parentMap, 20, this.ofm_meta.parentLocation);
        }
      })

    });


    this.map.on('load', () => {
      this.showOverlays();
      //this.map.setTerrain({source:'dem', 'exaggeration': 1.2})
      //this.map.addLauer({
      //  'id': 'sky',
      //  'type': 'sky',
      //  'paint': {
      //  'sky-type': 'atmosphere',
      //  'sky-atmosphere-sun': [0.0, 0.0],
      //  'sky-atmosphere-sun-intensity': 15
      //  }});


      for (let layer of this.ofm_meta.clickLayers) {
        this.map.on('click', layer, (e) => {
          this.hideAll();
          this.p = e.features[0].properties;
          this.showInfo = true;
        });
        this.map.on('mouseenter', layer, () => {
          this.map.getCanvas().style.cursor = this.measuring ? 'crosshair' : 'pointer';
        });

        // Change it back to a pointer when it leaves.
        this.map.on('mouseleave', layer, () => {
          this.map.getCanvas().style.cursor = '';
        });
      }


      this.map.addSource('geojson', {
        'type': 'geojson',
        'data': this.geojson
      });

      // Add styles to the map
      this.map.addLayer({
        id: 'measure-points',
        type: 'circle',
        source: 'geojson',
        paint: {
          'circle-radius': 4,
          'circle-color': 'rgba(245,245,245,0.5)'
        },
        filter: ['in', '$type', 'Point']
      });
      this.map.addLayer({
        id: 'measure-lines',
        type: 'line',
        source: 'geojson',
        layout: {
          'line-cap': 'round',
          'line-join': 'round'
        },
        paint: {
          'line-color': 'rgba(245,245,245,0.5)',
          'line-width': 2.5,
          'line-dasharray': [2, 2]
        },
        filter: ['in', '$type', 'LineString']
      });

    });




    this.map.on('moveend', () => {
      this.changeUrl();
    });

  }

  
  panTo(coords) {
    this.map.panTo(coords);
  }

  ngOnInit(): void {
    this.http.get('assets/info.json').subscribe(data => {
      this.infoData = data;
    })
    maplibregl.accessToken = 'pk.eyJ1IjoiYWJyaWNrbyIsImEiOiJjanRkajJ4dzYwZGcwNDNvOGQybnZ2aWU0In0.dHeKsAVs3BmZ0biKTOi7wg';
    this.ts = this.ds.getEnv('TILESERVER');

    this.atDate = this.ar.snapshot.params.year;
    this.start.center = [this.ar.snapshot.params.x, this.ar.snapshot.params.y];
    this.start.zoom = this.ar.snapshot.params.z;
    this.rels = this.ar.snapshot.params.rels;
    this.style = this.style;


    this.ofm.getMap(this.ar.snapshot.params.timeline).subscribe((data: any) => {
      this.title = data.name;
      this.ofm_meta = data.metadata.ofm;

      for (let l of this.ofm_meta.togglable) {
        this.layers[l.name] = true;
      }
    });

    const container = document.getElementById('visualization');

    const items = new vis.DataSet([]);

    this.ar.params.subscribe(params => {
      this.atDate = params.year;
      this.start.center = [params.x, params.y];
      this.start.zoom = params.z;
      this.tl = params.timeline;
      if (this.map) {
        this.map.panTo(this.start.center);
      }
    });

    // Create a Timeline
    this.timeline = new vis.Timeline(container, items, {
      showCurrentTime: false
    });

    this.timeline.addCustomTime(this.toFloatDate(this.atDate), 'atTime');
    const d = this.toFloatDate(this.atDate);
    // tslint:disable-next-line:max-line-length
    this.timeline.setWindow(new Date(d.getFullYear() - 10, d.getMonth(), d.getDate()), new Date(d.getFullYear() + 10, d.getMonth(), d.getDate()));


    this.timeline.on('click', (properties) => {
      this.atDate = this.toDateFloat(properties.time);
      this.timeline.setCustomTime(properties.time, 'atTime');
      this.changeUrl(this.atDate);
    });

    this.timeline.on('rangechanged', (properties) => {});
  }

  changeUrl(ev = null): void {
    const c = this.map.getCenter();
    this.l.go(`/${this.tl}/${this.atDate}/${this.map.getZoom()}/${c.lat}/${c.lng}` + (this.rels ? '/' + this.rels : ''));
    if (ev) {
      for (let tm of this.ofm_meta.timed) {
        const s = this.map.getSource(tm.source);
        console.log(s);
        if (s.type === 'geojson') {
          this.http.get(s._options.data.replace('{atDate}', this.atDate)).subscribe(data => {
            try {
              s.setData(data);
            } catch (ex) {
              console.log(ex);
            }
          })
        }
      }
    }
    this.events = this.ohm.getEvents(this.tl, this.atDate, 10);
  }

  changeStyle(style): void {
    this.style = style;
    this.map.setStyle(style);
  }

  toDateFloat(date: Date): number {
    let ret = date.getFullYear();
    ret += (date.getMonth() + 1) / 12;
    ret += (date.getDate()) * (1 / 12 / 31);
    ret += (date.getHours()) * (1 / 12 / 31 / 24);
    ret += (date.getMinutes()) * (1 / 12 / 31 / 24 / 60);
    ret += (date.getSeconds()) * (1 / 12 / 31 / 24 / 60 / 60);
    return ret;
  }

  toFloatDate(date: number): Date {
    const dd = new DecimaldatePipe();
    return dd.transform(date);
  }

  startstop() {
    this.startstopstatus = this.startstopstatus === 'play' ? 'stop' : 'play';
    this.startstopicon = this.startstopicons[this.startstopstatus];
    if (this.startstopstatus === 'play') {
      this.startstopInterval = setInterval(() => {
        const delta = 1 / 12 / 30;
        this.atDate = parseFloat(this.atDate.toString()) + delta;
        this.timeline.setCustomTime(this.toFloatDate(this.atDate), 'atTime');
        this.changeUrl(this.atDate);
      }, this.speed);
    } else {
      clearInterval(this.startstopInterval);
    }
  }

  selectDate() {
    const ref = this.md.open(DateComponent, {
      data: this.atDate
    });
    ref.afterClosed().subscribe(date => {
      this.atDate = date;
    });
  }

  setSpeed(speed) {
    this.speed = speed;
    if (this.startstopInterval) {
      clearInterval(this.startstopInterval);
      this.startstop();
    }
  }

  info() {}

  showOverlays() {
    console.log('run');
    /*this.map.addLayer({
      id: 'ships',
      type: 'circle',
      source: 'ohm-ephemeral',
      'source-layer': 'movement',
      filter: [
        'all',
        ['==', 'type', 'ship']
      ],
      paint: {
        'circle-opacity': 0.6,
        'circle-color': 'rgb(53, 175, 109)',
        'circle-radius': 2
      }
    });
    this.map.addLayer({
      id: 'planes',
      type: 'circle',
      source: 'ohm-ephemeral',
      'source-layer': 'movement',
      filter: [
        'all',
        ['==', 'type', 'aircraft']
      ],
      paint: {
        'circle-opacity': 0.6,
        'circle-color': '#dd3333',
        'circle-radius': 2
      }
    });
    this.map.addLayer({
      id: 'human',
      type: 'circle',
      source: 'ohm-ephemeral',
      'source-layer': 'movement',
      filter: [
        'all',
        ['==', 'type', 'human']
      ],
      paint: {
        'circle-opacity': 0.6,
        'circle-color': 'rgb(53, 53, 200)',
        'circle-radius': 2
      }
    });
    /*
    this.map.addLayer({
      id: 'ships-labels',
      type: 'symbol',
      source: 'ohm-ephemeral',
      'source-layer': 'movement',
      filter: [
        'any',
        ['==', 'type', 'ship'],
        ['==', 'type', 'aircraft'],
      ],
      layout: {
        'text-field': {
          stops: [
            [1, ''],
            [2, '{service} {name}'],
            [5, '{service} {name} - {ship:nationality}'],
            [13, '{service} {name} - {ship:nationality}']
          ]
        },
        'text-size': {
          stops: [[6, 10], [10, 13]]
        },
        'text-allow-overlap': true,
        'text-ignore-placement': false,
        'text-offset': [0, -1],
        'text-max-width': 12
      }
    });
    */
    /*
    this.map.addLayer({
      id: 'human-labels',
      type: 'symbol',
      source: 'ohm-ephemeral',
      'source-layer': 'movement',
      filter: [
        'all',
        ['==', 'type', 'human']
      ],
      layout: {
        'text-field': '{name}',
        'text-font': ['Open Sans Regular'],
        'text-size': 10,
        'text-allow-overlap': false,
        'text-ignore-placement': false,
        'text-offset': [0, -1],
        'text-max-width': 12
      }
    });
    */
    /*this.map.addLayer({
      id: 'events',
      type: 'circle',
      source: 'ohm-ephemeral',
      'source-layer': 'event',
      paint: {
        'circle-opacity': 1,
        'circle-color': '#dd3333',
        'circle-radius': 1.5
      }
    });
    /*
    this.map.addLayer({
      id: 'events-labels',
      type: 'symbol',
      source: 'ohm-ephemeral',
      'source-layer': 'event',
      layout: {
        'text-field': '{name}',
        'text-font': ['Open Sans Regular'],
        'text-size': {
          stops: [[6, 10], [10, 13]]
        },
        'text-allow-overlap': true,
        'text-ignore-placement': false,
        'text-offset': [0, -1],
        'text-max-width': 12
      }
    });
    */
  }

  copy_url() {
    try {
      this.capture.getImage(this.screen, true).subscribe(img => {
        this.hideAll();
        this.ohm.su(window.location.href, img).subscribe(data => {
          this.clipboard.copy(data);
          this.share_link = data;
          this.showShare = true;
          this._snackBar.open('Address ready to share', 'Close', {
            duration: 1000
          });
        });
      })
    } catch (ex) {
      this.clipboard.copy(window.location.href);
      this._snackBar.open('Address ready to share', 'Close', {
        duration: 1000
      });
    }
  }

  goTimeSpace(time: number, space: any): void {
    this.l.go(`${this.tl}/${time}/${this.map.getZoom()}/${space.coordinates[0]}/${space.coordinates[1]}` + (this.rels ? '/' + this.rels : ''));
  }

  warpTo(time: number, timeline: string, zoom: number = 2, space: any = [0, 0]): void {
    setTimeout(() => {
      this.l.go(`/${timeline}/${time}/${zoom}/${space[0]}/${space[1]}/` + (this.rels ? '/' + this.rels : ''));
      window.location.reload();
    }, 100);
  }

  
  toggleLayer(name) {
    if (Object.keys(this.layers).indexOf(name) >= 0) {
      this.layers[name] = !this.layers[name];
      for (let l of this.ofm_meta.togglable.filter(x => x.name === name)[0].layers) {
        this.map.setLayoutProperty(l, 'visibility', this.layers[name] ? 'visible' : 'none');
      }
    } else
      this.layers[name] = true;
  }

  showRels() {
    if (this.rels) {
      const rc = this.rels.split('|');
      const rels = rc.map(x => x.split(':')[0]);
      const cols = rc.map(x => x.split(':').length > 1 ? x.split(':')[1] : '232323');
      const wids = rc.map(x => x.split(':').length > 2 ? parseFloat(x.split(':')[2]) : 2);
      const opas = rc.map(x => x.split(':').length > 3 ? parseFloat(x.split(':')[3]) : 0.2);
      const zip = (arr1, arr2) => arr1.map((k, i) => [k, arr2[i]]);

      const rcs = zip(rels, cols);


      console.log(rcs);

      this.map.addSource('ohm-movement-rels', {
        type: 'geojson',
        data: 'http://51.15.160.236:9034/relation/' + rels.join('|'),
      });
      rcs.forEach((irc, i) => {
        this.map.addLayer({
          id: 'rel-movements-' + irc[0],
          type: 'line',
          source: 'ohm-movement-rels',
          filter: [
            'all',
            ['==', 'relation', irc[0]]
          ],
          paint: {
            'line-opacity': opas[i],
            'line-color': '#' + irc[1],
            'line-width': wids[i],
          }
        });
      });
      this.map.addLayer({
        id: 'rel-movements-labels',
        type: 'symbol',
        source: 'ohm-movement-rels',
        layout: {
          'text-field': {
            stops: [
              [1, ''],
              [4, '{name}']
            ]
          },
          'text-size': 9
        }
      });
    }

  }

  
  clearDistance() {
    this.measuring = false;
    this.measured = '';
    this.times = [];
    this.geojson = {
      'type': 'FeatureCollection',
      'features': []
    };
    this.linestring = {
      'type': 'Feature',
      'geometry': {
      'type': 'LineString',
      'coordinates': []
      }
    };
      
    this.map.getSource('geojson').setData(this.geojson);

  }

  startDistance() {
    this.measuring = !this.measuring;
    

  //  this.map.on('mousemove', (e) => {
  //    var features = this.map.queryRenderedFeatures(e.point, {
  //      layers: ['measure-points']
  //    });
  //    // UI indicator for clicking/hovering a point on the map
  //    this.map.getCanvas().style.cursor = features.length ?
  //      'pointer' :
  //      'crosshair';
  //  });

    this.map.on('click', (e)=>{
      if(this.measuring){
      var features = this.map.queryRenderedFeatures(e.point, {
        layers: ['measure-points']
      });

      // Remove the linestring from the group
      // So we can redraw it based on the points collection
      if (this.geojson.features.length > 1) this.geojson.features.pop();

      // If a feature was clicked, remove it from the map
      if (features.length) {
        var id = features[0].properties.id;
        this.geojson.features = this.geojson.features.filter((point) => {
          return point.properties.id !== id;
        });
      } else {
        var point = {
          'type': 'Feature',
          'geometry': {
            'type': 'Point',
            'coordinates': [e.lngLat.lng, e.lngLat.lat]
          },
          'properties': {
            'id': String(new Date().getTime())
          }
        };

        this.geojson.features.push(point);
      }

      if (this.geojson.features.length > 1) {
        this.linestring.geometry.coordinates = this.geojson.features.map(
          function (point) {
            return point.geometry.coordinates;
          }
        );

        this.geojson.features.push(this.linestring);

        const ll = turf.length(this.linestring)*this.ofm_meta.distance_multiplier;
        // Populate the distanceContainer with total distance
        const value = '' +
          (ll).toFixed(1) + ' ' +
          this.ofm_meta.distance_unit;
        this.measured = value;
        this.times = [];
        const units = {
          "s":60, 
          "min": 60, 
          "h": 24, 
          "d": 30, 
          "mo": 12, 
          "y": 1
        };
        for(let t of this.ofm_meta.speeds){
          let ms = ll*9.461e+15/(299792458*Math.pow(t.multiplier,10/3));
          let cuu = "s";
          for(let u of Object.keys(units)){
            ms = ms/units[u];
            if (ms >= 1){
              cuu = u;
            } else {
              ms = ms*units[u];
              break;
            }
          }
          this.times.push({
            v: t.multiplier == 1?ll.toFixed(2):(ms).toFixed(2),
            u: cuu,
            l: t.label,
          })
        }
      }

      this.map.getSource('geojson').setData(this.geojson);
    }
    });
  }
}
