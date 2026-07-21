import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OldBoysService } from '../../core/services/old-boys.service';

@Component({
  selector: 'app-member-edit',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    @if (member) {
      <div class="breadcrumb"><a [routerLink]="['/members',id]">{{ member.fullName }}</a><span>›</span><b>Edit profile</b></div>
      <div class="page-head"><div><p>WAVE 2 PREVIEW</p><h2>Edit Old Boy Profile</h2><span>Update contact and professional information. Changes are saved in browser demo storage.</span></div></div>

      <form [formGroup]="form" (ngSubmit)="save()">
        <section class="form-card">
          <div class="section-title"><span>01</span><div><h3>Personal & school details</h3><p>Core identity information for the directory.</p></div></div>
          <div class="form-grid">
            <label class="wide">Full name<input formControlName="fullName"><small>Required</small></label>
            <label>Batch / year<input formControlName="batch"></label>
            <label>Admission number<input formControlName="admissionNumber"></label>
          </div>
        </section>

        <section class="form-card">
          <div class="section-title"><span>02</span><div><h3>Contact information</h3><p>Numbers and email used by the association.</p></div></div>
          <div class="form-grid">
            <label>Primary mobile<input formControlName="mobile"><small>Required</small></label>
            <label>WhatsApp number<input formControlName="whatsapp"></label>
            <label>Email address<input type="email" formControlName="email"></label>
            <label>City<input formControlName="city"></label>
            <label>Country<input formControlName="country"></label>
            <label class="wide">Postal address<textarea formControlName="address" rows="3"></textarea></label>
          </div>
        </section>

        <section class="form-card">
          <div class="section-title"><span>03</span><div><h3>Profession & administration</h3><p>Work information and internal notes.</p></div></div>
          <div class="form-grid">
            <label>Profession<input formControlName="profession"></label>
            <label>Company / workplace<input formControlName="company"></label>
            <label>Status<select formControlName="status"><option value="pending">Pending</option><option value="verified">Verified</option><option value="inactive">Inactive</option><option value="duplicate">Possible duplicate</option><option value="rejected">Rejected</option></select></label>
            <label class="wide">Admin notes<textarea formControlName="notes" rows="4"></textarea></label>
          </div>
        </section>

        <div class="form-actions"><a [routerLink]="['/members',id]">Cancel</a><button type="submit" [disabled]="form.invalid || saving()">{{ saving() ? 'Saving…' : 'Save changes' }}</button></div>
      </form>
    }
  `,
  styleUrl: './member-edit.component.scss'
})
export class MemberEditComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly oldBoys = inject(OldBoysService);
  readonly id = this.route.snapshot.paramMap.get('id') ?? '';
  readonly member = this.oldBoys.getById(this.id);
  readonly saving = signal(false);
  readonly form = this.fb.nonNullable.group({
    fullName:[this.member?.fullName ?? '',Validators.required], batch:[this.member?.batch ?? '',Validators.required], admissionNumber:[this.member?.admissionNumber ?? ''],
    mobile:[this.member?.mobile ?? '',Validators.required], whatsapp:[this.member?.whatsapp ?? ''], email:[this.member?.email ?? '',Validators.email],
    city:[this.member?.city ?? '',Validators.required], country:[this.member?.country ?? '',Validators.required], address:[this.member?.address ?? ''],
    profession:[this.member?.profession ?? '',Validators.required], company:[this.member?.company ?? ''], status:[this.member?.status ?? 'pending'], notes:[this.member?.notes ?? '']
  });
  save():void{if(this.form.invalid){this.form.markAllAsTouched();return;}this.saving.set(true);this.oldBoys.updateMember(this.id,this.form.getRawValue());window.setTimeout(()=>this.router.navigate(['/members',this.id]),350);}
}
