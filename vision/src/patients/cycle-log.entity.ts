import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Patient } from '../patients/patient.entity';

@Entity('cycle_logs')
export class CycleLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  patient_id: number;

  @Column()
  cycle_start_date: Date;

  @Column({ type: 'int', default: 28 })
  cycle_length: number;

  @Column({ default: 'menstrual' })
  current_phase: string; // menstrual | follicular | ovulation | luteal

  @Column({ type: 'int', default: 1 })
  current_day: number;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Patient)
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;
}
