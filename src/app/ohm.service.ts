import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OhmService {

  constructor(
    private http: HttpClient
  ) { }

  getEvents(date, bbox=null, amount = 20, from=null, to=null): Observable<any> {
    if(bbox){
      return this.http.get('https://api.events.openhistorymap.org/events/timeline.json?bbox='+bbox.join(',')+'&date=' + date + '&limit=' + amount+'&from='+from+'&to='+to);
    } else {
      return of([]);
    }
  }

  getStats(date, bbox=null, amount = 20, from=null, to=null): Observable<any> {
    if(bbox){
      return this.http.get('https://api.stats.openhistorymap.org/stats.json?bbox='+bbox.join(',')+'&date=' + date + '&limit=' + amount+'&from='+from+'&to='+to);
    } else {
      return of([]);
    }
  }

  drilldown(lnglat, radius=100, time='now'): Observable<any[]>{
    console.log('getting the elements around the selected point')
    return of([]);
  }
}
