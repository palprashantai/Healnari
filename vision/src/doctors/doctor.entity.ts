import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from '../auth/user.entity';
import { Appointment } from '../appointments/appointment.entity';
import { Prescription } from '../records/prescription.entity';

@Entity('doctors')
export class Doctor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @Column({ nullable: true })
  specialization: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  consultation_fee: number;

  @Column('decimal', { precision: 3, scale: 1, default: 0 })
  rating: number;

  @OneToOne(() => User, user => user.doctorProfile)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => Appointment, appointment => appointment.doctor)
  appointments: Appointment[];

  @OneToMany(() => Prescription, prescription => prescription.doctor)
  prescriptions: Prescription[];
}
