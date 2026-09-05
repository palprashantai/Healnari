import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '@/core/supabase/supabase.service';
import { ERROR_MESSAGES, ERROR_CODES } from '@/core/constants/errors.constant';
import { AuthUser } from '@/core/decorators/current-user.decorator';
import { RegisterDto, UpdateMeDto } from '@/core/auth/auth.controller';
import { Profile, ProfileRole } from '@/shared/interfaces/profile.interface';

const AVATAR_BUCKET = 'avatars';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly supabase: SupabaseService) {}

  toAppUser(user: AuthUser) {
    const p = user.profile;
    return {
      id: p.id,
      email: user.email || (p as any).email || '',
      role: p.role,
      name: p.full_name,
      phone: p.phone || '',
      avatarUrl: p.avatar_url || '',
      specialty: p.specialty || '',
      regNo: p.registration_no || '',
      consultationFee: p.consultation_fee || 799,
      consultFee: p.consultation_fee || 799,
      bio: p.bio || '',
      currency: (p.currency || 'INR').toUpperCase() === 'USD' ? 'USD' : 'INR',
      country: p.country || ((p.currency || 'INR').toUpperCase() === 'USD' ? 'US' : 'IN'),
      kycVerified: p.kyc_verified,
      kycSubmittedAt: p.kyc_submitted_at || null,
      emailNotifications: true,
      smsNotifications: true,
      profile: p,
    };
  }

  async register(body: RegisterDto) {
    const cleanEmail = (body.email || '').trim().toLowerCase();

    // 1. Check if email already exists in profiles
    const { data: existingProfile } = await this.supabase.admin
      .from('profiles')
      .select('id, role, full_name')
      .ilike('email', cleanEmail)
      .maybeSingle();

    if (existingProfile) {
      if (existingProfile.role === ProfileRole.DOCTOR) {
        throw new ConflictException(
          'A doctor account with this email address already exists. Please sign in to access your doctor dashboard.',
        );
      } else {
        throw new ConflictException(
          'An account with this email address is already registered on HealNari. Please sign in or use a different email address.',
        );
      }
    }

    const { data, error } = await this.supabase.admin.auth.admin.createUser({
      email: cleanEmail,
      password: body.password,
      email_confirm: true,
      user_metadata: {
        role: body.role,
        full_name: body.fullName,
        specialty: body.specialty,
      },
    });

    if (error) {
      const errMsg = (error.message || '').toLowerCase();
      if (
        errMsg.includes('already') ||
        errMsg.includes('registered') ||
        errMsg.includes('exists') ||
        errMsg.includes('duplicate')
      ) {
        throw new ConflictException(
          body.role === ProfileRole.DOCTOR
            ? 'A doctor account with this email address already exists. Please sign in to access your doctor dashboard or reset your password.'
            : 'An account with this email address is already registered. Please sign in instead.',
        );
      }
      this.logger.error(`Registration failed for email ${cleanEmail}: ${error.message}`, error);
      throw new BadRequestException({
        message: 'Registration failed. Please check your details and try again.',
        errorCode: ERROR_CODES.BAD_REQUEST,
      });
    }

    if (body.registrationNo) {
      await this.supabase.admin
        .from('profiles')
        .update({ registration_no: body.registrationNo })
        .eq('id', data.user.id);
    }

    // The DB trigger that creates the profiles row fires asynchronously off
    // the auth.users insert above; sign in right away to also hand back a
    // session, by which point it has committed.
    const { data: session, error: signInError } =
      await this.supabase.anon.auth.signInWithPassword({
        email: body.email,
        password: body.password,
      });
    if (signInError || !session.session)
      throw new InternalServerErrorException(
        ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      );

    const { data: profile } = await this.supabase.admin
      .from('profiles')
      .select()
      .eq('id', data.user.id)
      .single();
    if (!profile)
      throw new InternalServerErrorException(
        'Failed to fetch profile after registration',
      );

    return {
      accessToken: session.session.access_token,
      refreshToken: session.session.refresh_token,
      user: this.toAppUser({
        id: profile.id,
        email: data.user.email as string,
        profile,
      }),
    };
  }

  async login(email: string, password: string) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();
    const { data, error } = await this.supabase.anon.auth.signInWithPassword({
      email: cleanEmail,
      password: cleanPassword,
    });
    if (error || !data?.session || !data?.user)
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_CREDENTIALS);

    const { data: profile } = await this.supabase.admin
      .from('profiles')
      .select()
      .eq('id', data.user.id)
      .single();
    if (!profile)
      throw new UnauthorizedException(ERROR_MESSAGES.USER_NOT_FOUND);
    if (profile.status === 'Suspended')
      throw new UnauthorizedException(ERROR_MESSAGES.ACCOUNT_SUSPENDED);

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: this.toAppUser({
        id: profile.id,
        email: data.user.email as string,
        profile,
      }),
    };
  }

  async forgotPassword(email: string) {
    try {
      const clientUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
      const redirectTo = `${clientUrl.replace(/\/$/, '')}/reset-password`;
      await this.supabase.anon.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo,
      });
    } catch {
      // Gracefully swallow error to prevent account enumeration
    }
  }

  async refresh(refreshToken: string) {
    const { data, error } = await this.supabase.anon.auth.refreshSession({
      refresh_token: refreshToken,
    });
    if (error || !data.session)
      throw new UnauthorizedException('Session expired, please log in again.');
    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    };
  }

  async logout(token: string) {
    // Invalidate the session on Supabase so the refresh token is actually revoked.
    // 'global' logs them out of all active sessions across devices.
    await this.supabase.admin.auth.admin.signOut(token, 'global');
  }

  async updateMe(userId: string, body: UpdateMeDto) {
    const patch: Partial<Profile> = {};
    if (body.fullName !== undefined) patch.full_name = body.fullName;
    if (body.phone !== undefined) patch.phone = body.phone;
    if (body.specialty !== undefined) patch.specialty = body.specialty;
    if (body.registrationNo !== undefined)
      patch.registration_no = body.registrationNo;
    if (body.consultationFee !== undefined)
      patch.consultation_fee = Number(body.consultationFee);
    if (body.bio !== undefined) patch.bio = body.bio;
    if (body.currency !== undefined) {
      const cleanCurrency = body.currency.toUpperCase() === 'USD' ? 'USD' : 'INR';
      patch.currency = cleanCurrency;
      if (!body.country) {
        patch.country = cleanCurrency === 'USD' ? 'US' : 'IN';
      }
    }
    if (body.country !== undefined) patch.country = body.country.toUpperCase() === 'US' ? 'US' : 'IN';

    // Safely sync notification preferences to notification_preferences table (not profiles table)
    if (body.emailNotifications !== undefined || body.smsNotifications !== undefined) {
      try {
        const notifPatch: any = { user_id: userId, updated_at: new Date().toISOString() };
        if (body.emailNotifications !== undefined) {
          notifPatch.appointment_reminders = body.emailNotifications;
          notifPatch.consultation_updates = body.emailNotifications;
        }
        await this.supabase.admin
          .from('notification_preferences')
          .upsert(notifPatch, { onConflict: 'user_id' });
      } catch (err: any) {
        this.logger.warn(`Could not sync notification preferences for ${userId}: ${err?.message}`);
      }
    }

    if (Object.keys(patch).length > 0) {
      const { error } = await this.supabase.admin
        .from('profiles')
        .update(patch)
        .eq('id', userId);
      if (error) {
        this.logger.error(
          `Failed to update profile for user ${userId}: ${error.message}`,
          error,
        );
        throw new InternalServerErrorException({
          message: 'Unable to update profile. Please try again later.',
          errorCode: ERROR_CODES.INTERNAL_SERVER_ERROR,
        });
      }
    }
    const { data: profile } = await this.supabase.admin
      .from('profiles')
      .select()
      .eq('id', userId)
      .single();
    if (!profile) {
      throw new NotFoundException({
        message: ERROR_MESSAGES.USER_NOT_FOUND,
        errorCode: ERROR_CODES.USER_NOT_FOUND,
      });
    }

    return this.toAppUser({ id: profile.id, email: profile.email || '', profile });
  }

  /** Re-verifies the current password via a real sign-in before allowing the change. */
  async updatePassword(
    user: AuthUser,
    currentPassword: string,
    newPassword: string,
  ) {
    const { error: verifyError } =
      await this.supabase.anon.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
    if (verifyError)
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_CREDENTIALS);

    const { error } = await this.supabase.admin.auth.admin.updateUserById(
      user.id,
      { password: newPassword },
    );
    if (error) {
      this.logger.error(
        `Password update failed for user ${user.id}: ${error.message}`,
        error,
      );
      throw new BadRequestException({
        message: 'Unable to update password. Please check password requirements and try again.',
        errorCode: ERROR_CODES.BAD_REQUEST,
      });
    }
  }

  async uploadAvatar(user: AuthUser, file: Express.Multer.File) {
    const ext = (file.originalname.split('.').pop() || 'jpg').toLowerCase();
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await this.supabase.admin.storage
      .from(AVATAR_BUCKET)
      .upload(path, file.buffer, { contentType: file.mimetype, upsert: true });
    if (uploadError) {
      this.logger.error(
        `Avatar upload failed for user ${user.id}: ${uploadError.message}`,
        uploadError,
      );
      throw new InternalServerErrorException({
        message: 'Unable to upload profile photo. Please try again.',
        errorCode: ERROR_CODES.INTERNAL_SERVER_ERROR,
      });
    }

    const { data: publicUrlData } = this.supabase.admin.storage
      .from(AVATAR_BUCKET)
      .getPublicUrl(path);
    // Cache-bust so the browser picks up a re-uploaded photo at the same path immediately.
    const avatarUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;
    await this.supabase.admin
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', user.id);

    const { data: profile } = await this.supabase.admin
      .from('profiles')
      .select()
      .eq('id', user.id)
      .single();
    if (!profile)
      throw new InternalServerErrorException(
        'Profile not found after avatar upload',
      );
    return this.toAppUser({ id: profile.id, email: user.email, profile });
  }

  async removeAvatar(user: AuthUser) {
    const COMMON_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    await this.supabase.admin.storage
      .from(AVATAR_BUCKET)
      .remove(COMMON_EXTS.map((ext) => `${user.id}/avatar.${ext}`));
    await this.supabase.admin
      .from('profiles')
      .update({ avatar_url: null })
      .eq('id', user.id);

    const { data: profile } = await this.supabase.admin
      .from('profiles')
      .select()
      .eq('id', user.id)
      .single();
    if (!profile)
      throw new InternalServerErrorException(
        'Profile not found after avatar removal',
      );
    return this.toAppUser({ id: profile.id, email: user.email, profile });
  }
}
