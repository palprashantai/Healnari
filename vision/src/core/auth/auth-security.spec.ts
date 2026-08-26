import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { AuthService } from '@/core/auth/auth.service';
import { SupabaseAuthGuard } from '@/core/guards/supabase-auth.guard';
import { ProfileRole } from '@/shared/interfaces/profile.interface';
import { ERROR_MESSAGES } from '@/core/constants/errors.constant';

describe('Authentication, Security & Access Control QA Suite', () => {
  let authService: AuthService;
  let supabaseMock: any;

  beforeEach(() => {
    supabaseMock = {
      anon: {
        auth: {
          signInWithPassword: jest.fn(),
          refreshSession: jest.fn(),
          getUser: jest.fn(),
        },
      },
      admin: {
        auth: {
          admin: {
            createUser: jest.fn(),
          },
        },
        from: jest.fn(),
        storage: {
          from: jest.fn(),
        },
      },
    };
    authService = new AuthService(supabaseMock);
  });

  describe('AuthService — Login & Suspension Verification', () => {
    it('successfully logs in an active user and returns JWT tokens + app user profile', async () => {
      supabaseMock.anon.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: 'patient-uuid-1', email: 'ananya@example.com' },
          session: {
            access_token: 'valid_access_jwt',
            refresh_token: 'valid_refresh_token',
          },
        },
        error: null,
      });

      const mockProfile = {
        id: 'patient-uuid-1',
        role: ProfileRole.PATIENT,
        full_name: 'Ananya Sharma',
        phone: '+919876543210',
        status: 'Active',
        kyc_verified: false,
      };

      supabaseMock.admin.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockProfile }),
          }),
        }),
      });

      const result = await authService.login(
        'ananya@example.com',
        'password123',
      );
      expect(result.accessToken).toBe('valid_access_jwt');
      expect(result.refreshToken).toBe('valid_refresh_token');
      expect(result.user.name).toBe('Ananya Sharma');
      expect(result.user.role).toBe(ProfileRole.PATIENT);
    });

    it('rejects login for suspended accounts with ACCOUNT_SUSPENDED error', async () => {
      supabaseMock.anon.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: {
            id: 'patient-uuid-suspended',
            email: 'suspended@example.com',
          },
          session: {
            access_token: 'valid_access_jwt',
            refresh_token: 'valid_refresh_token',
          },
        },
        error: null,
      });

      const suspendedProfile = {
        id: 'patient-uuid-suspended',
        role: ProfileRole.PATIENT,
        full_name: 'Suspended User',
        status: 'Suspended',
      };

      supabaseMock.admin.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: suspendedProfile }),
          }),
        }),
      });

      await expect(
        authService.login('suspended@example.com', 'pass123'),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        authService.login('suspended@example.com', 'pass123'),
      ).rejects.toThrow(ERROR_MESSAGES.ACCOUNT_SUSPENDED);
    });

    it('rejects invalid password credentials with INVALID_CREDENTIALS error', async () => {
      supabaseMock.anon.auth.signInWithPassword.mockResolvedValue({
        data: { session: null, user: null },
        error: new Error('Invalid login credentials'),
      });

      await expect(
        authService.login('user@example.com', 'wrong_pass'),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        authService.login('user@example.com', 'wrong_pass'),
      ).rejects.toThrow(ERROR_MESSAGES.INVALID_CREDENTIALS);
    });
  });

  describe('SupabaseAuthGuard — Token & Suspension Enforcement', () => {
    let reflectorMock: any;
    let guard: SupabaseAuthGuard;

    beforeEach(() => {
      reflectorMock = {
        getAllAndOverride: jest.fn().mockReturnValue(false), // not public
      };
      guard = new SupabaseAuthGuard(reflectorMock, supabaseMock);
    });

    it('rejects requests with missing Authorization header', async () => {
      const contextMock: any = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({ headers: {} }),
        }),
      };

      await expect(guard.canActivate(contextMock)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(guard.canActivate(contextMock)).rejects.toThrow(
        'Missing bearer token',
      );
    });

    it('rejects requests when account is marked Suspended mid-session', async () => {
      const mockRequest: any = {
        headers: { authorization: 'Bearer token123' },
      };
      const contextMock: any = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      };

      // Mock user resolution
      supabaseMock.anon.auth.getUser = jest.fn().mockResolvedValue({
        data: { user: { id: 'user-uuid-1', email: 'test@example.com' } },
        error: null,
      });

      // Mock profile returning Suspended
      supabaseMock.admin.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'user-uuid-1', status: 'Suspended' },
            }),
          }),
        }),
      });

      await expect(guard.canActivate(contextMock)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(contextMock)).rejects.toThrow(
        ERROR_MESSAGES.ACCOUNT_SUSPENDED,
      );
    });
  });
});
