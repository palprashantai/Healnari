import { Patient } from '../patients/patient.entity';
import { Doctor } from '../doctors/doctor.entity';
export declare enum UserRole {
    ADMIN = "admin",
    DOCTOR = "doctor",
    PATIENT = "patient"
}
export declare class User {
    id: number;
    name: string;
    email: string;
    password_hash: string;
    role: UserRole;
    patientProfile: Patient;
    doctorProfile: Doctor;
}
