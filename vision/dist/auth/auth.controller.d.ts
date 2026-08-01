import { AuthService } from './auth.service';
export declare class LoginDto {
    email: string;
    password: string;
}
export declare class RegisterDto {
    name: string;
    email: string;
    password: string;
    role: string;
}
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(body: LoginDto): Promise<{
        success: boolean;
        message: string;
        data: any;
        timestamp: string;
    }>;
    register(body: RegisterDto): Promise<{
        success: boolean;
        message: string;
        data: any;
        timestamp: string;
    }>;
}
