import { User } from '../auth/user.entity';
import { Appointment } from '../appointments/appointment.entity';
import { Prescription } from '../records/prescription.entity';
export declare class Doctor {
    id: number;
    user_id: number;
    specialization: string;
    consultation_fee: number;
    rating: number;
    user: User;
    appointments: Appointment[];
    prescriptions: Prescription[];
}
