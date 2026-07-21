import { DatePipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { OldBoy } from '../../core/models/old-boy.model';
import { OldBoysService } from '../../core/services/old-boys.service';

@Component({
  selector:'app-approvals', standalone:true, imports:[FormsModule,RouterLink,DatePipe],
  template:`
    <div class="page-head"><div><p>WAVE 2 PREVIEW</p><h2>Review new submissions</h2><span>Approve, reject or flag incoming Old Boys records.</span></div><div class="queue-count"><strong>{{ pendingMembers.length }}</strong><span>waiting</span></div></div>
    @if(notice()){<div class="notice">{{notice()}}</div>}
    <section class="info-banner"><span>i</span><div><strong>Frontend workflow preview</strong><p>These actions update browser demo storage. Connect them to Supabase status fields and audit logs before production.</p></div></section>
    <section class="approval-card">
      <div class="toolbar"><div class="search"><span>⌕</span><input [(ngModel)]="search" placeholder="Search pending records…"></div><select [(ngModel)]="sort"><option value="oldest">Oldest first</option><option value="newest">Newest first</option><option value="batch">Batch</option></select></div>
      @if(filtered.length){
        <div class="approval-list">
          @for(member of filtered;track member.id){
            <article>
              <div class="person"><span class="avatar">{{initials(member.fullName)}}</span><div><a [routerLink]="['/members',member.id]">{{member.fullName}}</a><span>{{member.profession}} · {{member.city}}, {{member.country}}</span></div></div>
              <div class="facts"><div><small>Batch</small><b>{{member.batch}}</b></div><div><small>Mobile</small><b>{{member.mobile}}</b></div><div><small>Submitted</small><b>{{member.submittedAt|date:'MMM d, h:mm a'}}</b></div></div>
              <div class="actions"><button class="review" [routerLink]="['/members',member.id]">Review profile</button><button class="reject" (click)="act(member,'rejected')">Reject</button><button class="approve" (click)="act(member,'verified')">✓ Verify</button></div>
            </article>
          }
        </div>
      }@else{
        <div class="empty"><span>✓</span><h3>Approval queue is clear</h3><p>There are no pending submissions matching your search.</p></div>
      }
    </section>
  `,
  styleUrl:'./approvals.component.scss'
})
export class ApprovalsComponent{
  search='';sort='oldest';readonly notice=signal('');
  constructor(private oldBoys:OldBoysService){}
  get pendingMembers():OldBoy[]{return this.oldBoys.members().filter(m=>m.status==='pending');}
  get filtered():OldBoy[]{const q=this.search.toLowerCase().trim();return this.pendingMembers.filter(m=>!q||[m.fullName,m.batch,m.mobile,m.profession,m.city,m.country].join(' ').toLowerCase().includes(q)).sort((a,b)=>this.sort==='newest'?b.submittedAt.localeCompare(a.submittedAt):this.sort==='batch'?a.batch.localeCompare(b.batch):a.submittedAt.localeCompare(b.submittedAt));}
  initials(name:string):string{return name.split(' ').slice(0,2).map(x=>x[0]).join('').toUpperCase();}
  act(member:OldBoy,status:'verified'|'rejected'):void{this.oldBoys.setStatus(member.id,status);this.notice.set(`${member.fullName} was ${status==='verified'?'verified':'rejected'}.`);setTimeout(()=>this.notice.set(''),2300);}
}
