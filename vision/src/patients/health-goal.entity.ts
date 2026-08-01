import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Patient } from '../patients/patient.entity';

@Entity('health_goals')
export class HealthGoal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  patient_id: number;

  @Column()
  label: string;

  @Column({ type: 'int', default: 0 })
  progress_pct: number;

  @Column({ default: 'bg-emerald-500' })
  color: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Patient)
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;
}
