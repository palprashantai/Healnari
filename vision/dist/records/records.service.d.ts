import { Repository } from 'typeorm';
import { Prescription } from './prescription.entity';
export declare class RecordsService {
    private readonly prescriptionRepository;
    constructor(prescriptionRepository: Repository<Prescription>);
    getAllPrescriptions(): Promise<Prescription[]>;
    getPrescriptionById(id: number): Promise<Prescription>;
    createPrescription(data: any): Promise<Prescription>;
}
