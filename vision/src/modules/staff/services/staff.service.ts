import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { ProfileRole } from '@/shared/interfaces/profile.interface';
import { AuthUser } from '@/core/decorators/current-user.decorator';
import { ERROR_MESSAGES } from '@/core/constants/errors.constant';
import { CreateLeaveDto, CreateStaffDto, UpdateStaffDto } from '@/modules/staff/controllers/staff.controller';

@Injectable()
export class StaffService {
  constructor(
    private readonly supabase: SupabaseService,
  ) {}

  private requireDoctor(user: AuthUser) {
    if (user.profile.role !== ProfileRole.DOCTOR) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
  }

  async list(user: AuthUser) {
    this.requireDoctor(user);
    const { data } = await this.supabase.admin.from('staff_members').select().eq('doctor_id', user.id).order('created_at', { ascending: true });
    return data || [];
  }

  async create(user: AuthUser, body: CreateStaffDto) {
    this.requireDoctor(user);
    const { data } = await this.supabase.admin.from('staff_members').insert({
      doctor_id: user.id,
      name: body.name,
      role: body.role,
      shift: body.shift,
      phone: body.phone,
    }).select().single();
    return data;
  }

  private async ownStaff(user: AuthUser, id: string) {
    const { data: staff } = await this.supabase.admin.from('staff_members').select().eq('id', id).single();
    if (!staff) throw new NotFoundException(ERROR_MESSAGES.STAFF_NOT_FOUND);
    if (staff.doctor_id !== user.id) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
    return staff;
  }

  async update(user: AuthUser, id: string, body: UpdateStaffDto) {
    this.requireDoctor(user);
    await this.ownStaff(user, id);
    const { data } = await this.supabase.admin.from('staff_members').update(body).eq('id', id).select().single();
    return data;
  }

  async remove(user: AuthUser, id: string) {
    this.requireDoctor(user);
    await this.ownStaff(user, id);
    await this.supabase.admin.from('staff_members').delete().eq('id', id);
    return { id };
  }

  async listLeaves(user: AuthUser) {
    this.requireDoctor(user);
    const { data } = await this.supabase.admin.from('leave_requests').select().eq('doctor_id', user.id).order('created_at', { ascending: false });
    return data || [];
  }

  async createLeave(user: AuthUser, body: CreateLeaveDto) {
    this.requireDoctor(user);
    await this.ownStaff(user, body.staffId);
    const { data } = await this.supabase.admin.from('leave_requests').insert({
      staff_id: body.staffId,
      doctor_id: user.id,
      leave_type: body.leaveType,
      from_date: body.fromDate,
      to_date: body.toDate,
    }).select().single();
    return data;
  }

  async updateLeave(user: AuthUser, id: string, status: string) {
    this.requireDoctor(user);
    const { data: leave } = await this.supabase.admin.from('leave_requests').select().eq('id', id).single();
    if (!leave) throw new NotFoundException(ERROR_MESSAGES.LEAVE_NOT_FOUND);
    if (leave.doctor_id !== user.id) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);

    const { data } = await this.supabase.admin.from('leave_requests').update({ status }).eq('id', id).select().single();
    return data;
  }
}
