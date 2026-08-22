import { BadRequestException, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { ERROR_MESSAGES } from '@/core/constants/errors.constant';
import { AuthUser } from '@/core/decorators/current-user.decorator';
import { RegisterDto, UpdateMeDto } from '@/core/auth/auth.controller';
import { Profile } from '@/shared/interfaces/profile.interface';

const AVATAR_BUCKET = 'avatars';

@Injectable()
export class AuthService {
  constructor(
    private readonly supabase: SupabaseService,
  ) {}

  toAppUser(user: AuthUser) {
    const p = user.profile;
    return {
      id: p.id,
      email: user.email,
      role: p.role,
      name: p.full_name,
      phone: p.phone || '',
      avatarUrl: p.avatar_url || '',
      specialty: p.specialty || '',
      regNo: p.registration_no || '',
      kycVerified: p.kyc_verified,
      kycSubmittedAt: p.kyc_submitted_at || null,
      emailNotifications: p.email_notifications,
      smsNotifications: p.sms_notifications,
    };
  }

  async register(body: RegisterDto) {
    const { data, error } = await this.supabase.admin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: { role: body.role, full_name: body.fullName, specialty: body.specialty },
    });
    if (error) throw new BadRequestException(error.message);

    if (body.registrationNo) {
      await this.supabase.admin.from('profiles').update({ registration_no: body.registrationNo }).eq('id', data.user.id);
    }

    // The DB trigger that creates the profiles row fires asynchronously off
    // the auth.users insert above; sign in right away to also hand back a
    // session, by which point it has committed.
    const { data: session, error: signInError } = await this.supabase.anon.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });
    if (signInError || !session.session) throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);

    const { data: profile } = await this.supabase.admin.from('profiles').select().eq('id', data.user.id).single();
    if (!profile) throw new InternalServerErrorException('Failed to fetch profile after registration');

    return {
      accessToken: session.session.access_token,
      refreshToken: session.session.refresh_token,
      user: this.toAppUser({ id: profile.id, email: data.user.email as string, profile }),
    };
  }

  async login(email: string, password: string) {
    const { data, error } = await this.supabase.anon.auth.signInWithPassword({ email, password });
    if (error || !data?.session || !data?.user) throw new UnauthorizedException(ERROR_MESSAGES.INVALID_CREDENTIALS);

    const { data: profile } = await this.supabase.admin.from('profiles').select().eq('id', data.user.id).single();
    if (!profile) throw new UnauthorizedException(ERROR_MESSAGES.USER_NOT_FOUND);
    if (profile.status === 'Suspended') throw new UnauthorizedException(ERROR_MESSAGES.ACCOUNT_SUSPENDED);

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: this.toAppUser({ id: profile.id, email: data.user.email as string, profile }),
    };
  }

  async refresh(refreshToken: string) {
    const { data, error } = await this.supabase.anon.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session) throw new UnauthorizedException('Session expired, please log in again.');
    return { accessToken: data.session.access_token, refreshToken: data.session.refresh_token };
  }

  async updateMe(userId: string, body: UpdateMeDto) {
    const patch: Partial<Profile> = {};
    if (body.fullName !== undefined) patch.full_name = body.fullName;
    if (body.phone !== undefined) patch.phone = body.phone;
    if (body.specialty !== undefined) patch.specialty = body.specialty;
    if (body.registrationNo !== undefined) patch.registration_no = body.registrationNo;
    if (body.emailNotifications !== undefined) patch.email_notifications = body.emailNotifications;
    if (body.smsNotifications !== undefined) patch.sms_notifications = body.smsNotifications;

    if (Object.keys(patch).length > 0) {
      await this.supabase.admin.from('profiles').update(patch).eq('id', userId);
    }
    const { data: profile } = await this.supabase.admin.from('profiles').select().eq('id', userId).single();
    if (!profile) throw new InternalServerErrorException('Profile not found after update');

    return this.toAppUser({ id: profile.id, email: '', profile });
  }

  /** Re-verifies the current password via a real sign-in before allowing the change. */
  async updatePassword(user: AuthUser, currentPassword: string, newPassword: string) {
    const { error: verifyError } = await this.supabase.anon.auth.signInWithPassword({ email: user.email, password: currentPassword });
    if (verifyError) throw new UnauthorizedException(ERROR_MESSAGES.INVALID_CREDENTIALS);

    const { error } = await this.supabase.admin.auth.admin.updateUserById(user.id, { password: newPassword });
    if (error) throw new BadRequestException(error.message);
  }

  async uploadAvatar(user: AuthUser, file: Express.Multer.File) {
    const ext = (file.originalname.split('.').pop() || 'jpg').toLowerCase();
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await this.supabase.admin.storage
      .from(AVATAR_BUCKET)
      .upload(path, file.buffer, { contentType: file.mimetype, upsert: true });
    if (uploadError) throw new BadRequestException(uploadError.message);

    const { data: publicUrlData } = this.supabase.admin.storage.from(AVATAR_BUCKET).getPublicUrl(path);
    // Cache-bust so the browser picks up a re-uploaded photo at the same path immediately.
    const avatarUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;
    await this.supabase.admin.from('profiles').update({ avatar_url: avatarUrl }).eq('id', user.id);

    const { data: profile } = await this.supabase.admin.from('profiles').select().eq('id', user.id).single();
    if (!profile) throw new InternalServerErrorException('Profile not found after avatar upload');
    return this.toAppUser({ id: profile.id, email: user.email, profile });
  }

  async removeAvatar(user: AuthUser) {
    const COMMON_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    await this.supabase.admin.storage.from(AVATAR_BUCKET).remove(COMMON_EXTS.map(ext => `${user.id}/avatar.${ext}`));
    await this.supabase.admin.from('profiles').update({ avatar_url: null }).eq('id', user.id);

    const { data: profile } = await this.supabase.admin.from('profiles').select().eq('id', user.id).single();
    if (!profile) throw new InternalServerErrorException('Profile not found after avatar removal');
    return this.toAppUser({ id: profile.id, email: user.email, profile });
  }
}
