import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { OfmService } from '../ofm.service';

@Component({
  selector: 'app-timelines',
  templateUrl: './timelines.component.html',
  styleUrls: ['./timelines.component.scss']
})
export class TimelinesComponent implements OnInit {

infoData;
events;

timelines: any[];
seen_timelines: any[];
tags;
selected_tags;

  constructor(
    private ofm: OfmService,
    private ht: HttpClient
  ) { }

  disabled() {
    alert('Login disabled. User accounts and private maps will come soon');
  }

  ngOnInit(): void {
    this.ht.get('assets/info.json').subscribe(data => {
      this.infoData = data;
    })
    this.ofm.getTimelines().subscribe((data:any) => {
      this.timelines = data;
      this.seen_timelines = data;
    })

    this.ofm.getTags().subscribe((data:any)=>{
      this.tags = data.map(x=>{
        return {label:x, selected:true}
      });
      this.selected_tags = data;
    })
  }

  filter(ev, tag){
    console.log(tag);
    this.selected_tags = [tag];
    this.tags.map(x=>x.selected=false);
    this.tags.filter(x=>x.label===tag)[0].selected=true;
    this.seen_timelines = this.timelines.filter(x=>x.tags?.indexOf(tag) >= 0);
  }

}
