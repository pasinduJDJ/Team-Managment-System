import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { OldBoy } from '../../core/models/old-boy.model';
import { OldBoysService } from '../../core/services/old-boys.service';

@Component({
  selector: 'app-member-list',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="page-head">
      <div>
        <p>Directory overview</p>
        <h2>Find an old boy quickly</h2>
        <span>Search and filter all submitted member records.</span>
      </div>
      <button class="primary-btn" (click)="exportCurrent()"><span>⇩</span> Export filtered CSV</button>
    </div>

    <section class="stats-grid">
      <article><div class="stat-icon blue">◉</div><div><span>Total records</span><strong>{{ members.length }}</strong><small>All submitted contacts</small></div></article>
      <article><div class="stat-icon green">✓</div><div><span>Verified</span><strong>{{ count('verified') }}</strong><small>{{ percent('verified') }}% of directory</small></div></article>
      <article><div class="stat-icon orange">⌛</div><div><span>Pending</span><strong>{{ count('pending') }}</strong><small>Awaiting admin review</small></div></article>
      <article><div class="stat-icon purple">▦</div><div><span>Batches</span><strong>{{ batchOptions.length }}</strong><small>Years represented</small></div></article>
    </section>

    <section class="directory-card">
      <div class="filter-top">
        <div class="search-box"><span>⌕</span><input [(ngModel)]="searchTerm" (ngModelChange)="resetPage()" placeholder="Search name, batch, mobile, email, profession…"></div>
        <button class="filter-toggle" (click)="filtersOpen = !filtersOpen">☷ Filters <span>{{ activeFilterCount }}</span></button>
      </div>

      <div class="filters" [class.open]="filtersOpen">
        <label>Batch<select [(ngModel)]="batch" (ngModelChange)="resetPage()"><option value="">All batches</option>@for (item of batchOptions; track item) { <option [value]="item">{{ item }}</option> }</select></label>
        <label>Profession<select [(ngModel)]="profession" (ngModelChange)="resetPage()"><option value="">All professions</option>@for (item of professionOptions; track item) { <option [value]="item">{{ item }}</option> }</select></label>
        <label>Location<select [(ngModel)]="location" (ngModelChange)="resetPage()"><option value="">All locations</option>@for (item of locationOptions; track item) { <option [value]="item">{{ item }}</option> }</select></label>
        <label>Status<select [(ngModel)]="status" (ngModelChange)="resetPage()"><option value="">All statuses</option><option value="verified">Verified</option><option value="pending">Pending</option><option value="inactive">Inactive</option><option value="duplicate">Possible duplicate</option><option value="rejected">Rejected</option></select></label>
        <label>Sort by<select [(ngModel)]="sort" (ngModelChange)="resetPage()"><option value="newest">Newest submission</option><option value="oldest">Oldest submission</option><option value="name">Name A–Z</option><option value="batch">Batch</option></select></label>
        <button class="clear-btn" (click)="clearFilters()">Clear all</button>
      </div>

      <div class="result-bar">
        <div><strong>{{ filteredMembers.length }}</strong> records found @if (activeFilterCount > 0) { <span>· {{ activeFilterCount }} filter{{ activeFilterCount === 1 ? '' : 's' }} active</span> }</div>
        <div class="view-note">Synced directory data</div>
      </div>

      @if (pagedMembers.length) {
        <div class="desktop-table">
          <table>
            <thead><tr><th>Old Boy</th><th>Batch</th><th>Contact</th><th>Profession</th><th>Location</th><th>Status</th><th></th></tr></thead>
            <tbody>
              @for (member of pagedMembers; track member.id) {
                <tr>
                  <td><a class="person-cell" [routerLink]="['/members',member.id]"><span class="person-avatar">{{ initials(member.fullName) }}</span><span><strong>{{ member.fullName }}</strong><small>{{ member.admissionNumber || 'No admission number' }}</small></span></a></td>
                  <td><span class="batch-pill">{{ member.batch }}</span></td>
                  <td><div class="contact-cell"><strong>{{ member.mobile }}</strong><small>{{ member.email || 'No email provided' }}</small></div></td>
                  <td><div class="profession-cell"><strong>{{ member.profession }}</strong><small>{{ member.company || '—' }}</small></div></td>
                  <td><div class="location-cell"><strong>{{ member.city }}</strong><small>{{ member.country }}</small></div></td>
                  <td><span class="status" [class]="'status ' + member.status">{{ statusLabel(member.status) }}</span></td>
                  <td><a class="open-button" [routerLink]="['/members',member.id]">›</a></td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <div class="mobile-cards">
          @for (member of pagedMembers; track member.id) {
            <a class="member-card" [routerLink]="['/members',member.id]">
              <div class="card-main"><span class="person-avatar">{{ initials(member.fullName) }}</span><div><strong>{{ member.fullName }}</strong><span>{{ member.profession }}</span></div><span class="status" [class]="'status '+member.status">{{ statusLabel(member.status) }}</span></div>
              <div class="card-grid"><div><small>Batch</small><b>{{ member.batch }}</b></div><div><small>Mobile</small><b>{{ member.mobile }}</b></div><div><small>Location</small><b>{{ member.city }}, {{ member.country }}</b></div></div>
            </a>
          }
        </div>
      } @else {
        <div class="empty-state"><span>⌕</span><h3>No records found</h3><p>Try changing the search text or clearing your filters.</p><button (click)="clearFilters()">Clear filters</button></div>
      }

      <footer class="pagination">
        <span>Showing {{ startRecord }}–{{ endRecord }} of {{ filteredMembers.length }}</span>
        <div><button [disabled]="page === 1" (click)="page = page - 1">‹</button>@for (p of pageNumbers; track p) { <button [class.active]="p===page" (click)="page=p">{{ p }}</button> }<button [disabled]="page === totalPages" (click)="page = page + 1">›</button></div>
      </footer>
    </section>
  `,
  styleUrl: './member-list.component.scss'
})
export class MemberListComponent {
  searchTerm = '';
  batch = '';
  profession = '';
  location = '';
  status = '';
  sort = 'newest';
  filtersOpen = false;
  page = 1;
  readonly pageSize = 8;

  constructor(private readonly oldBoys: OldBoysService) {}

  get members(): OldBoy[] { return this.oldBoys.members(); }
  get batchOptions(): string[] { return [...new Set(this.members.map(m => m.batch))].sort(); }
  get professionOptions(): string[] { return [...new Set(this.members.map(m => m.profession))].sort(); }
  get locationOptions(): string[] { return [...new Set(this.members.map(m => m.country))].sort(); }
  get activeFilterCount(): number { return [this.searchTerm,this.batch,this.profession,this.location,this.status].filter(Boolean).length; }

  get filteredMembers(): OldBoy[] {
    const query = this.searchTerm.trim().toLowerCase();
    const result = this.members.filter(member => {
      const searchable = [member.fullName,member.batch,member.mobile,member.whatsapp,member.email,member.profession,member.company,member.city,member.country,member.admissionNumber].filter(Boolean).join(' ').toLowerCase();
      return (!query || searchable.includes(query)) && (!this.batch || member.batch===this.batch) && (!this.profession || member.profession===this.profession) && (!this.location || member.country===this.location) && (!this.status || member.status===this.status);
    });
    return result.sort((a,b) => {
      if (this.sort==='oldest') return a.submittedAt.localeCompare(b.submittedAt);
      if (this.sort==='name') return a.fullName.localeCompare(b.fullName);
      if (this.sort==='batch') return a.batch.localeCompare(b.batch) || a.fullName.localeCompare(b.fullName);
      return b.submittedAt.localeCompare(a.submittedAt);
    });
  }
  get totalPages(): number { return Math.max(1,Math.ceil(this.filteredMembers.length/this.pageSize)); }
  get pageNumbers(): number[] { return Array.from({length:this.totalPages},(_,i)=>i+1).slice(Math.max(0,this.page-3),Math.max(5,this.page+2)); }
  get pagedMembers(): OldBoy[] { const safe=Math.min(this.page,this.totalPages); return this.filteredMembers.slice((safe-1)*this.pageSize,safe*this.pageSize); }
  get startRecord(): number { return this.filteredMembers.length ? (this.page-1)*this.pageSize+1 : 0; }
  get endRecord(): number { return Math.min(this.page*this.pageSize,this.filteredMembers.length); }

  count(status: string): number { return this.members.filter(m=>m.status===status).length; }
  percent(status: string): number { return Math.round((this.count(status)/this.members.length)*100); }
  initials(name: string): string { return name.split(' ').slice(0,2).map(part=>part[0]).join('').toUpperCase(); }
  statusLabel(status: string): string { return status==='duplicate'?'Possible duplicate':status.charAt(0).toUpperCase()+status.slice(1); }
  resetPage(): void { this.page=1; }
  clearFilters(): void { this.searchTerm=this.batch=this.profession=this.location=this.status=''; this.sort='newest'; this.page=1; }
  exportCurrent(): void { this.oldBoys.exportCsv(this.filteredMembers); }
}
