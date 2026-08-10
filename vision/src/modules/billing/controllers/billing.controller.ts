import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';
import { BillingService } from '@/modules/billing/services/billing.service';
import { ResponseHelper } from '@/core/helpers/response.helper';
import { SUCCESS_MESSAGES } from '@/core/constants/messages.constant';
import { CurrentUser } from '@/core/decorators/current-user.decorator';
import type { AuthUser } from '@/core/decorators/current-user.decorator';

export class PayDto {
  @ApiProperty() @IsUUID() appointmentId: string;
  @ApiProperty({ enum: ['UPI', 'Card', 'Net Banking', 'Wallet'] }) @IsIn(['UPI', 'Card', 'Net Banking', 'Wallet']) method: string;
}

export class RequestPayoutDto {
  @ApiProperty() @IsString() amount: string;
  @ApiProperty({ enum: ['Bank Account', 'UPI', 'Wallet'] }) @IsIn(['Bank Account', 'UPI', 'Wallet']) method: string;
}

export class RecordChargeDto {
  @ApiProperty() @IsUUID() patientId: string;
  @ApiProperty({ example: 'Follow-up Consultation Fee' }) @IsString() service: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() category?: string;
  @ApiProperty() @IsNumber() @IsPositive() amount: number;
  @ApiProperty() @IsString() method: string;
  @ApiProperty({ enum: ['Paid', 'Pending', 'Insurance Claimed'] }) @IsIn(['Paid', 'Pending', 'Insurance Claimed']) status: string;
}

@ApiTags('Billing')
@Controller('api/billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @ApiOperation({ summary: "List the caller's transactions (patient: own payments; doctor: payments they billed)" })
  @Get('transactions')
  async transactions(@CurrentUser() user: AuthUser) {
    const data = await this.billingService.getTransactions(user);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @ApiOperation({ summary: 'Doctor earnings summary (this month / last month / pending / YTD)' })
  @Get('summary')
  async summary(@CurrentUser() user: AuthUser) {
    const data = await this.billingService.getEarningsSummary(user);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @ApiOperation({ summary: 'Pay for an appointment (patient only) — settles the linked payment row' })
  @Post('pay')
  async pay(@CurrentUser() user: AuthUser, @Body() body: PayDto) {
    const data = await this.billingService.pay(user, body);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.PAYMENT_RECORDED);
  }

  @ApiOperation({ summary: 'Record a manual charge/payment for a patient — e.g. cash collected in-clinic (doctor only)' })
  @Post('charges')
  async recordCharge(@CurrentUser() user: AuthUser, @Body() body: RecordChargeDto) {
    const data = await this.billingService.recordCharge(user, body);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.PAYMENT_RECORDED);
  }

  @ApiOperation({ summary: "List the caller (doctor)'s payout requests" })
  @Get('payouts')
  async payouts(@CurrentUser() user: AuthUser) {
    const data = await this.billingService.getPayouts(user);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @ApiOperation({ summary: 'Request a payout of the settled balance (doctor only)' })
  @Post('payouts')
  async requestPayout(@CurrentUser() user: AuthUser, @Body() body: RequestPayoutDto) {
    const data = await this.billingService.requestPayout(user, body);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.PAYOUT_REQUESTED);
  }

  @ApiOperation({ summary: 'Get a single transaction (invoice detail)' })
  @ApiParam({ name: 'id' })
  @Get('transactions/:id')
  async transaction(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const data = await this.billingService.getTransaction(user, id);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }
}
