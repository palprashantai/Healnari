import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Patient } from '../patients/patient.entity';

@Entity('lab_results')
export class LabResult {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  patient_id: number;

  @Column()
  panel_title: string;

  @Column({ nullable: true })
  ordered_by: string;

  @Column({ nullable: true })
  lab_name: string;

  @Column()
  test_name: string;

  @Column()
  value: string;

  @Column()
  reference_range: string;

  @Column({ default: 'normal' })
  status: string; // 'normal' | 'high' | 'low'

  @Column({ default: false })
  is_reviewed: boolean;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Patient)
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;
}
