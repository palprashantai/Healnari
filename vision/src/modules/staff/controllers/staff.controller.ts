import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { StaffService } from '@/modules/staff/services/staff.service';
import { ResponseHelper } from '@/core/helpers/response.helper';
import { SUCCESS_MESSAGES } from '@/core/constants/messages.constant';
import { CurrentUser } from '@/core/decorators/current-user.decorator';
import type { AuthUser } from '@/core/decorators/current-user.decorator';

export class CreateStaffDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() role: string;
  @ApiProperty() @IsString() shift: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() phone?: string;
}

export class UpdateStaffDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() name?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() role?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() shift?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() phone?: string;
  @ApiProperty({ required: false, enum: ['On Duty', 'Off Duty'] }) @IsOptional() @IsIn(['On Duty', 'Off Duty']) status?: string;
}

export class CreateLeaveDto {
  @ApiProperty() @IsString() staffId: string;
  @ApiProperty() @IsString() leaveType: string;
  @ApiProperty() @IsString() fromDate: string;
  @ApiProperty() @IsString() toDate: string;
}

export class UpdateLeaveDto {
  @ApiProperty({ enum: ['Approved', 'Rejected'] }) @IsIn(['Approved', 'Rejected']) status: string;
}

@ApiTags('Staff')
@Controller('api/staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @ApiOperation({ summary: "List the caller (doctor)'s clinic staff" })
  @Get()
  async list(@CurrentUser() user: AuthUser) {
    const data = await this.staffService.list(user);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @ApiOperation({ summary: 'Add a staff member' })
  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() body: CreateStaffDto) {
    const data = await this.staffService.create(user, body);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.STAFF_ADDED);
  }

  @ApiOperation({ summary: 'Update a staff member' })
  @ApiParam({ name: 'id' })
  @Put(':id')
  async update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: UpdateStaffDto) {
    const data = await this.staffService.update(user, id, body);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.STAFF_UPDATED);
  }

  @ApiOperation({ summary: 'Remove a staff member' })
  @ApiParam({ name: 'id' })
  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const data = await this.staffService.remove(user, id);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.STAFF_REMOVED);
  }

  @ApiOperation({ summary: "List the caller (doctor)'s staff leave requests" })
  @Get('leaves')
  async listLeaves(@CurrentUser() user: AuthUser) {
    const data = await this.staffService.listLeaves(user);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @ApiOperation({ summary: 'File a leave request for a staff member' })
  @Post('leaves')
  async createLeave(@CurrentUser() user: AuthUser, @Body() body: CreateLeaveDto) {
    const data = await this.staffService.createLeave(user, body);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.LEAVE_UPDATED);
  }

  @ApiOperation({ summary: 'Approve or reject a leave request' })
  @ApiParam({ name: 'id' })
  @Put('leaves/:id')
  async updateLeave(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: UpdateLeaveDto) {
    const data = await this.staffService.updateLeave(user, id, body.status);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.LEAVE_UPDATED);
  }
}
