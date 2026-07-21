import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OldBoy } from '../../core/models/old-boy.model';
import { OldBoysService } from '../../core/services/old-boys.service';

@Component({
  selector:'app-reports',standalone:true,imports:[FormsModule],
  template:`
    <div class="page-head"><div><p>REPORTING CENTRE</p><h2>Directory insights & exports</h2><span>Apply filters, review summaries and export the matching contact list.</span></div></div>
    <section class="filters-card">
      <div class="filter-grid"><label>Batch<select [(ngModel)]="batch"><option value="">All batches</option>@for(item of batches;track item){<option [value]="item">{{item}}</option>}</select></label><label>Profession<select [(ngModel)]="profession"><option value="">All professions</option>@for(item of professions;track item){<option [value]="item">{{item}}</option>}</select></label><label>Country<select [(ngModel)]="country"><option value="">All countries</option>@for(item of countries;track item){<option [value]="item">{{item}}</option>}</select></label><label>Status<select [(ngModel)]="status"><option value="">All statuses</option><option value="verified">Verified</option><option value="pending">Pending</option><option value="inactive">Inactive</option><option value="duplicate">Possible duplicate</option><option value="rejected">Rejected</option></select></label><button (click)="clear()">Clear filters</button></div>
      <div class="match-line"><strong>{{filtered.length}}</strong> matching records will be included in the export.</div>
    </section>
    <div class="report-grid">
      <section class="panel summary-panel"><div class="panel-title"><div><span>SUMMARY</span><h3>Current result set</h3></div></div><div class="summary-grid"><div><small>Records</small><strong>{{filtered.length}}</strong></div><div><small>Verified</small><strong>{{countStatus('verified')}}</strong></div><div><small>Batches</small><strong>{{unique('batch')}}</strong></div><div><small>Countries</small><strong>{{unique('country')}}</strong></div></div></section>
      <section class="panel export-panel"><div class="panel-title"><div><span>EXPORT</span><h3>Download filtered contacts</h3></div></div><p>Phone numbers are quoted as text in CSV so leading zeros are retained.</p><button class="csv" (click)="exportCsv()"><span>⇩</span><div><strong>Export CSV</strong><small>{{filtered.length}} matching records</small></div></button><button class="xlsx" disabled><span>▦</span><div><strong>Export XLSX</strong><small>Enable during Wave 2 backend integration</small></div></button></section>
      <section class="panel chart-panel"><div class="panel-title"><div><span>TOP BATCHES</span><h3>Representation by year</h3></div></div><div class="bars">@for(item of topBatches;track item.name){<div><span>{{item.name}}</span><i><b [style.width.%]="item.percent"></b></i><strong>{{item.count}}</strong></div>}</div></section>
      <section class="panel chart-panel"><div class="panel-title"><div><span>TOP PROFESSIONS</span><h3>Professional network</h3></div></div><div class="bars professions">@for(item of topProfessions;track item.name){<div><span>{{item.name}}</span><i><b [style.width.%]="item.percent"></b></i><strong>{{item.count}}</strong></div>}</div></section>
    </div>
    <section class="panel field-panel"><div class="panel-title"><div><span>EXPORT FIELDS</span><h3>Choose columns for the CSV file</h3></div><button (click)="selectAll()">Select all</button></div><div class="field-grid">@for(field of fields;track field.key){<label><input type="checkbox" [(ngModel)]="field.selected"><span>{{field.label}}</span></label>}</div></section>
  `,
  styleUrl:'./reports.component.scss'
})
export class ReportsComponent{
  batch='';profession='';country='';status='';
  fields:{key:keyof OldBoy;label:string;selected:boolean}[]=[
    {key:'fullName',label:'Full name',selected:true},{key:'batch',label:'Batch',selected:true},{key:'admissionNumber',label:'Admission number',selected:true},{key:'mobile',label:'Mobile',selected:true},{key:'whatsapp',label:'WhatsApp',selected:true},{key:'email',label:'Email',selected:true},{key:'profession',label:'Profession',selected:true},{key:'company',label:'Company',selected:true},{key:'city',label:'City',selected:true},{key:'country',label:'Country',selected:true},{key:'status',label:'Status',selected:true},{key:'submittedAt',label:'Submitted date',selected:true},{key:'notes',label:'Admin notes',selected:false}
  ];
  constructor(private oldBoys:OldBoysService){}
  get members():OldBoy[]{return this.oldBoys.members();}get batches():string[]{return [...new Set(this.members.map(m=>m.batch))].sort();}get professions():string[]{return [...new Set(this.members.map(m=>m.profession))].sort();}get countries():string[]{return [...new Set(this.members.map(m=>m.country))].sort();}
  get filtered():OldBoy[]{return this.members.filter(m=>(!this.batch||m.batch===this.batch)&&(!this.profession||m.profession===this.profession)&&(!this.country||m.country===this.country)&&(!this.status||m.status===this.status));}
  countStatus(status:string):number{return this.filtered.filter(m=>m.status===status).length;}unique(key:'batch'|'country'):number{return new Set(this.filtered.map(m=>m[key])).size;}
  distribution(key:'batch'|'profession'):{name:string;count:number;percent:number}[]{const map=new Map<string,number>();for(const member of this.filtered)map.set(member[key],(map.get(member[key])??0)+1);const list=[...map].map(([name,count])=>({name,count,percent:0})).sort((a,b)=>b.count-a.count).slice(0,5);const max=Math.max(1,...list.map(x=>x.count));return list.map(x=>({...x,percent:(x.count/max)*100}));}
  get topBatches(){return this.distribution('batch');}get topProfessions(){return this.distribution('profession');}
  clear():void{this.batch=this.profession=this.country=this.status='';}selectAll():void{const all=this.fields.every(f=>f.selected);this.fields.forEach(f=>f.selected=!all);}
  exportCsv():void{this.oldBoys.exportCsv(this.filtered,this.fields.filter(f=>f.selected).map(f=>f.key));}
}
