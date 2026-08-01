import { Repository } from 'typeorm';
import { User } from './user.entity';
import { Patient } from '../patients/patient.entity';
import { Doctor } from '../doctors/doctor.entity';
export declare class AuthService {
    private readonly userRepository;
    private readonly patientRepository;
    private readonly doctorRepository;
    constructor(userRepository: Repository<User>, patientRepository: Repository<Patient>, doctorRepository: Repository<Doctor>);
    login(email: string): Promise<{
        accessToken: string;
        user: User;
    }>;
    register(data: any): Promise<{
        accessToken: string;
        user: User[];
    }>;
}
