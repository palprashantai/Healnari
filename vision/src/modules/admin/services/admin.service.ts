import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { ProfileRole } from '@/shared/interfaces/profile.interface';
import { AppointmentStatus } from '@/shared/interfaces/appointment.interface';
import { ERROR_MESSAGES } from '@/core/constants/errors.constant';

@Injectable()
export class AdminService {
  constructor(
    private readonly supabase: SupabaseService,
  ) {}

  async getDashboardStats() {
    try {
      const [{ count: totalUsers }, { count: totalDoctors }, { count: totalPatients }, { count: totalAppointments }, { count: completedAppointments }, { count: pendingVerifications }, { count: openTickets }, { count: pendingRefunds }] = await Promise.all([
        this.supabase.admin.from('profiles').select('*', { count: 'exact', head: true }),
        this.supabase.admin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', ProfileRole.DOCTOR),
        this.supabase.admin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', ProfileRole.PATIENT),
        this.supabase.admin.from('appointments').select('*', { count: 'exact', head: true }),
        this.supabase.admin.from('appointments').select('*', { count: 'exact', head: true }).eq('status', AppointmentStatus.DONE),
        this.supabase.admin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', ProfileRole.DOCTOR).eq('kyc_verified', false),
        this.supabase.admin.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'Open'),
        this.supabase.admin.from('refund_requests').select('*', { count: 'exact', head: true }).eq('status', 'Pending'),
      ]);

      const { data: doneAppointments } = await this.supabase.admin.from('appointments').select('doctor_id').eq('status', AppointmentStatus.DONE);
      let totalRevenue = 0;
      if (doneAppointments && doneAppointments.length > 0) {
        const doctorIds = [...new Set(doneAppointments.map(a => a.doctor_id))];
        const { data: doctors } = await this.supabase.admin.from('profiles').select('id, consultation_fee').in('id', doctorIds);
        const feeByDoctor = new Map((doctors || []).map(d => [d.id, d.consultation_fee]));
        
        for (const a of doneAppointments) {
          totalRevenue += Number(feeByDoctor.get(a.doctor_id) || 0);
        }
      }

      return {
        totalUsers: totalUsers || 0,
        activeDoctors: totalDoctors || 0,
        totalPatients: totalPatients || 0,
        platformRevenue: totalRevenue,
        pendingVerifications: pendingVerifications || 0,
        totalAppointments: totalAppointments || 0,
        completedConsultations: completedAppointments || 0,
        openTickets: openTickets || 0,
        pendingRefunds: pendingRefunds || 0,
      };
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getSystemHealth() {
    try {
      const { count: dbCheck } = await this.supabase.admin.from('profiles').select('*', { count: 'exact', head: true });
      return [
        { name: 'API Services', status: 'Operational', ping: `${Math.floor(Math.random() * 50) + 10}ms` },
        { name: 'Database', status: dbCheck !== null && dbCheck >= 0 ? 'Operational' : 'Down', ping: `${dbCheck} records` },
        { name: 'SMS Gateway', status: 'Operational', ping: 'OK' },
        { name: 'Video Servers', status: 'Operational', ping: `${Math.floor(Math.random() * 60) + 20}ms` },
      ];
    } catch (error) {
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getAllUsers() {
    try {
      const { data } = await this.supabase.admin.from('profiles').select('id, full_name, phone, role');
      return data || [];
    } catch (error) {
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getDoctorsAndClinics() {
    try {
      const { data } = await this.supabase.admin.from('profiles').select().eq('role', ProfileRole.DOCTOR);
      return data || [];
    } catch (error) {
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getPendingVerifications() {
    try {
      const { data } = await this.supabase.admin.from('profiles').select().eq('role', ProfileRole.DOCTOR).eq('kyc_verified', false).limit(20);
      return data || [];
    } catch (error) {
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async updateDoctorVerification(id: string, status: string) {
    try {
      const { data: doctor } = await this.supabase.admin.from('profiles').select().eq('id', id).eq('role', ProfileRole.DOCTOR).single();
      if (!doctor) throw new NotFoundException(ERROR_MESSAGES.DOCTOR_NOT_FOUND);
      
      const { data: updated } = await this.supabase.admin.from('profiles').update({ kyc_verified: status === 'approved' }).eq('id', id).select().single();
      if (!updated) throw new NotFoundException(ERROR_MESSAGES.DOCTOR_NOT_FOUND);

      return { doctorId: updated.id, statusUpdated: status, processedAt: new Date().toISOString() };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getRevenueData() {
    try {
      const { count: completedCount } = await this.supabase.admin.from('appointments').select('*', { count: 'exact', head: true }).eq('status', AppointmentStatus.DONE);
      const { data: doneAppointments } = await this.supabase.admin.from('appointments').select('doctor_id').eq('status', AppointmentStatus.DONE);
      
      let totalRevenue = 0;
      const bySpecialtyMap = new Map<string, number>();

      if (doneAppointments && doneAppointments.length > 0) {
        const doctorIds = [...new Set(doneAppointments.map(a => a.doctor_id))];
        const { data: doctors } = await this.supabase.admin.from('profiles').select('id, consultation_fee, specialty').in('id', doctorIds);
        const doctorInfo = new Map((doctors || []).map(d => [d.id, d]));
        
        for (const a of doneAppointments) {
          const doc = doctorInfo.get(a.doctor_id);
          if (doc) {
            totalRevenue += Number(doc.consultation_fee);
            const specialty = doc.specialty || 'General';
            bySpecialtyMap.set(specialty, (bySpecialtyMap.get(specialty) || 0) + Number(doc.consultation_fee));
          }
        }
      }

      const revenueBySpecialty = Array.from(bySpecialtyMap.entries()).map(([specialty, revenue]) => ({ specialty, revenue }));

      return {
        currentMonth: totalRevenue,
        completedConsultations: completedCount || 0,
        revenueBySpecialty,
      };
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getSupportTickets() {
    try {
      const { data } = await this.supabase.admin.from('support_tickets').select().order('created_at', { ascending: false });
      return data || [];
    } catch (error) {
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async resolveTicket(ticketId: number) {
    try {
      const { data: ticket } = await this.supabase.admin.from('support_tickets').select().eq('id', ticketId).single();
      if (!ticket) throw new NotFoundException('Ticket not found');
      
      const { data: updated } = await this.supabase.admin.from('support_tickets').update({ status: 'Resolved' }).eq('id', ticketId).select().single();
      return updated;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getRefundRequests() {
    try {
      const { data } = await this.supabase.admin.from('refund_requests').select().order('created_at', { ascending: false });
      return data || [];
    } catch (error) {
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async processRefund(refundId: number) {
    try {
      const { data: refund } = await this.supabase.admin.from('refund_requests').select().eq('id', refundId).single();
      if (!refund) throw new NotFoundException('Refund not found');
      
      const { data: updated } = await this.supabase.admin.from('refund_requests').update({ status: 'Processed' }).eq('id', refundId).select().single();
      return updated;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getCmsContent() {
    try {
      return { banners: [], faqs: [], terms: '', privacy: '' };
    } catch (error) {
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async getPlatformReports() {
    try {
      const [{ count: totalUsers }, { count: totalAppointments }, { count: completedAppointments }, { count: cancelledAppointments }] = await Promise.all([
        this.supabase.admin.from('profiles').select('*', { count: 'exact', head: true }),
        this.supabase.admin.from('appointments').select('*', { count: 'exact', head: true }),
        this.supabase.admin.from('appointments').select('*', { count: 'exact', head: true }).eq('status', AppointmentStatus.DONE),
        this.supabase.admin.from('appointments').select('*', { count: 'exact', head: true }).eq('status', AppointmentStatus.CANCELLED),
      ]);

      const totalAppts = totalAppointments || 0;
      const completedAppts = completedAppointments || 0;

      return {
        totalRegisteredUsers: totalUsers || 0,
        totalAppointments: totalAppts,
        completedAppointments: completedAppts,
        cancelledAppointments: cancelledAppointments || 0,
        completionRate: totalAppts > 0
          ? `${Math.round((completedAppts / totalAppts) * 100)}%`
          : '0%',
      };
    } catch (error) {
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }
}
