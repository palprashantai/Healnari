import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Patient } from '../patients/patient.entity';

@Entity('symptom_logs')
export class SymptomLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  patient_id: number;

  @Column('simple-array')
  symptoms: string[];

  @Column({ type: 'int' })
  severity: number;

  @Column({ default: 'pending_review' })
  review_status: string; // pending_review | reviewed

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Patient)
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;
}
