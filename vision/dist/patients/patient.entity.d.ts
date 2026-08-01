import { User } from '../auth/user.entity';
import { Appointment } from '../appointments/appointment.entity';
export declare class Patient {
    id: number;
    user_id: number;
    phone: string;
    city: string;
    date_of_birth: Date;
    user: User;
    appointments: Appointment[];
}
