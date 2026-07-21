import { DatePipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OldBoy } from '../../core/models/old-boy.model';
import { OldBoysService } from '../../core/services/old-boys.service';

@Component({
  selector: 'app-member-profile',
  standalone: true,
  imports: [RouterLink, DatePipe],
  template: `
    @if (member; as person) {
      <div class="breadcrumb"><a routerLink="/members">All Old Boys</a><span>›</span><b>{{ person.fullName }}</b></div>

      @if (notice()) { <div class="notice">{{ notice() }}</div> }

      <section class="profile-hero">
        <div class="hero-left">
          <div class="large-avatar">{{ initials(person.fullName) }}</div>
          <div class="identity">
            <div class="identity-top"><h2>{{ person.fullName }}</h2><span class="status" [class]="'status '+person.status">{{ statusLabel(person.status) }}</span></div>
            <p>{{ person.profession }} @if (person.company) { <span>at {{ person.company }}</span> }</p>
            <div class="meta"><span>Batch <b>{{ person.batch }}</b></span><span>Admission <b>{{ person.admissionNumber || 'Not provided' }}</b></span><span>Source <b>{{ person.source }}</b></span></div>
          </div>
        </div>
        <div class="hero-actions">
          <a class="action call" [href]="'tel:'+person.mobile"><span>☎</span><b>Call</b></a>
          <button class="action copy" (click)="copy(person.mobile)"><span>▣</span><b>Copy number</b></button>
          <a class="action edit" [routerLink]="['/members',person.id,'edit']"><span>✎</span><b>Edit profile</b></a>
        </div>
      </section>

      <div class="profile-layout">
        <div class="main-column">
          <section class="panel">
            <div class="panel-head"><div><span>CONTACT INFORMATION</span><h3>How to reach {{ firstName(person.fullName) }}</h3></div><span class="privacy">Private admin view</span></div>
            <div class="details-grid">
              <div class="detail"><span class="detail-icon">☎</span><div><small>Primary mobile</small><strong>{{ person.mobile }}</strong><button (click)="copy(person.mobile)">Copy</button></div></div>
              <div class="detail"><span class="detail-icon whatsapp">◉</span><div><small>WhatsApp</small><strong>{{ person.whatsapp || 'Not provided' }}</strong>@if(person.whatsapp){<a [href]="whatsappUrl(person.whatsapp)" target="_blank">Open WhatsApp</a>}</div></div>
              <div class="detail"><span class="detail-icon email">✉</span><div><small>Email address</small><strong>{{ person.email || 'Not provided' }}</strong>@if(person.email){<a [href]="'mailto:'+person.email">Send email</a>}</div></div>
              <div class="detail"><span class="detail-icon location">⌖</span><div><small>Current location</small><strong>{{ person.city }}, {{ person.country }}</strong><span>{{ person.address || 'No postal address provided' }}</span></div></div>
            </div>
          </section>

          <section class="panel">
            <div class="panel-head"><div><span>PROFESSIONAL DETAILS</span><h3>Work and expertise</h3></div></div>
            <div class="professional-grid">
              <div><small>Profession</small><strong>{{ person.profession }}</strong></div>
              <div><small>Company / workplace</small><strong>{{ person.company || 'Not provided' }}</strong></div>
              <div><small>Batch</small><strong>{{ person.batch }}</strong></div>
              <div><small>Admission number</small><strong>{{ person.admissionNumber || 'Not provided' }}</strong></div>
            </div>
          </section>

          <section class="panel notes-panel">
            <div class="panel-head"><div><span>ADMIN NOTES</span><h3>Internal information</h3></div></div>
            <p>{{ person.notes || 'No internal notes have been added for this old boy.' }}</p>
          </section>
        </div>

        <aside class="side-column">
          <section class="panel status-panel">
            <div class="panel-head"><div><span>MEMBER STATUS</span><h3>Review controls</h3></div></div>
            <div class="current-status"><span class="status-dot" [class]="person.status"></span><div><small>Current status</small><strong>{{ statusLabel(person.status) }}</strong></div></div>
            @if (person.status !== 'verified') {
              <button class="full-button verify" (click)="setStatus('verified')">✓ Verify member</button>
            }
            @if (person.status !== 'inactive') {
              <button class="full-button deactivate" (click)="setStatus('inactive')">Deactivate profile</button>
            } @else {
              <button class="full-button verify" (click)="setStatus('verified')">Reactivate profile</button>
            }
            <p class="wave-note">Status actions are included as a frontend preview for Wave 2. Connect them to Supabase audit logging before production use.</p>
          </section>

          <section class="panel timeline-panel">
            <div class="panel-head"><div><span>RECORD DETAILS</span><h3>Submission timeline</h3></div></div>
            <div class="timeline-item"><i></i><div><strong>Record submitted</strong><span>{{ person.submittedAt | date:'medium' }}</span></div></div>
            <div class="timeline-item"><i></i><div><strong>Last updated</strong><span>{{ person.updatedAt | date:'medium' }}</span></div></div>
            <div class="timeline-item"><i></i><div><strong>Data source</strong><span>{{ person.source }}</span></div></div>
          </section>
        </aside>
      </div>
    } @else {
      <section class="not-found-card"><span>!</span><h2>Old Boy not found</h2><p>The requested record does not exist or was removed.</p><a routerLink="/members">Return to directory</a></section>
    }
  `,
  styleUrl: './member-profile.component.scss'
})
export class MemberProfileComponent {
  readonly id: string;
  readonly notice = signal('');

  constructor(private route: ActivatedRoute, private oldBoys: OldBoysService) {
    this.id = this.route.snapshot.paramMap.get('id') ?? '';
  }

  get member(): OldBoy | undefined { return this.oldBoys.getById(this.id); }
  initials(name:string):string{return name.split(' ').slice(0,2).map(x=>x[0]).join('').toUpperCase();}
  firstName(name:string):string{return name.split(' ')[0];}
  statusLabel(status:string):string{return status==='duplicate'?'Possible duplicate':status.charAt(0).toUpperCase()+status.slice(1);}
  whatsappUrl(number:string):string{return `https://wa.me/${number.replace(/\D/g,'')}`;}
  async copy(value:string):Promise<void>{await navigator.clipboard.writeText(value);this.flash('Mobile number copied to clipboard.');}
  setStatus(status:'verified'|'inactive'):void{this.oldBoys.setStatus(this.id,status);this.flash(status==='verified'?'Member has been verified.':'Profile has been deactivated.');}
  private flash(message:string):void{this.notice.set(message);window.setTimeout(()=>this.notice.set(''),2600);}
}
