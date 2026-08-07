import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { Patient } from '../patients/patient.entity';
import { Doctor } from '../doctors/doctor.entity';
import { ERROR_MESSAGES } from '../common/constants/errors.constant';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
    @InjectRepository(Doctor)
    private readonly doctorRepository: Repository<Doctor>,
  ) { }

  async login(email: string) {
    try {
      const user = await this.userRepository.findOne({ where: { email } });
      if (!user) throw new BadRequestException(ERROR_MESSAGES.USER_NOT_FOUND);

      return {
        accessToken: `dummy-jwt-token-for-${user.id}`,
        user,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }

  async register(data: any) {
    try {
      const existing = await this.userRepository.findOne({ where: { email: data.email } });
      if (existing) throw new BadRequestException(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS);

      const user: User = this.userRepository.create({
        name: data.name,
        email: data.email,
        password_hash: 'hashed-password',
        role: data.role,
      });

      const savedUser = await this.userRepository.save(user);

      if (data.role === 'patient') {
        const patient = this.patientRepository.create({ user_id: savedUser.id });
        await this.patientRepository.save(patient);
      } else if (data.role === 'doctor') {
        const doctor = this.doctorRepository.create({ user_id: savedUser.id, specialization: 'General' });
        await this.doctorRepository.save(doctor);
      }

      return {
        accessToken: `dummy-jwt-token-for-${savedUser.id}`,
        user: savedUser,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    }
  }
}
