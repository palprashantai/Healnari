import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  IsNotEmpty,
} from 'class-validator';
import type { Response } from 'express';
import { BillingService } from '@/modules/billing/services/billing.service';
import { ResponseHelper } from '@/core/helpers/response.helper';
import { SUCCESS_MESSAGES } from '@/core/constants/messages.constant';
import { CurrentUser } from '@/core/decorators/current-user.decorator';
import type { AuthUser } from '@/core/decorators/current-user.decorator';
import { Public } from '@/core/decorators/public.decorator';

export class CreatePaymentOrderDto {
  @ApiProperty() @IsUUID() appointmentId: string;
}

export class RequestPayoutDto {
  @ApiProperty({ example: '5000' })
  @IsNotEmpty()
  amount: string | number;

  @ApiProperty({ required: false, example: 'INR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ enum: ['Bank Account', 'UPI', 'Wallet'], default: 'Bank Account' })
  @IsOptional()
  @IsString()
  method?: string;

  @ApiProperty({ required: false, example: 'req-idemp-98124' })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  destinationDetails?: Record<string, any>;
}

export class RecordChargeDto {
  @ApiProperty() @IsUUID() patientId: string;
  @ApiProperty({ example: 'Follow-up Consultation Fee' })
  @IsString()
  service: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() category?: string;
  @ApiProperty() @IsNumber() @IsPositive() amount: number;
  @ApiProperty() @IsString() method: string;
  @ApiProperty({ enum: ['Paid', 'Pending', 'Insurance Claimed'] })
  @IsIn(['Paid', 'Pending', 'Insurance Claimed'])
  status: string;
}

@ApiTags('Billing')
@Controller('api/billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @ApiOperation({
    summary:
      "List the caller's transactions (patient: own payments; doctor: payments they billed)",
  })
  @Get('transactions')
  async transactions(@CurrentUser() user: AuthUser) {
    const data = await this.billingService.getTransactions(user);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @ApiOperation({
    summary:
      'Doctor earnings summary (this month / last month / pending / YTD)',
  })
  @Get('summary')
  async summary(@CurrentUser() user: AuthUser) {
    const data = await this.billingService.getEarningsSummary(user);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @ApiOperation({
    summary:
      'Create a real Cashfree payment order for an appointment (patient only) — returns a payment_session_id for the Drop-in checkout',
  })
  @Post('pay/order')
  async createPaymentOrder(
    @CurrentUser() user: AuthUser,
    @Body() body: CreatePaymentOrderDto,
  ) {
    const data = await this.billingService.createPaymentOrder(
      user,
      body.appointmentId,
    );
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @ApiOperation({
    summary:
      "Force a fresh server-to-server check of a Cashfree order's status and apply it to our payment row — call this right after the Drop-in checkout closes",
  })
  @ApiParam({ name: 'orderId' })
  @Get('pay/status/:orderId')
  async paymentStatus(
    @CurrentUser() user: AuthUser,
    @Param('orderId') orderId: string,
  ) {
    const data = await this.billingService.getStatusForUser(user, orderId);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @ApiOperation({
    summary:
      'Cashfree webhook — order/payment status change. The payload is only ever used to know WHICH order to re-check; the resulting status always comes from a fresh server-to-server call to Cashfree, never from the payload itself',
  })
  @Public()
  @Post('webhook/cashfree')
  async cashfreeWebhook(@Body() body: any) {
    const orderId = body?.data?.order?.order_id || body?.order_id;
    if (orderId)
      await this.billingService.reconcileCashfreeOrder(orderId).catch(() => {});
    return { ok: true };
  }

  @ApiOperation({
    summary:
      'Record a manual charge/payment for a patient — e.g. cash collected in-clinic (doctor only)',
  })
  @Post('charges')
  async recordCharge(
    @CurrentUser() user: AuthUser,
    @Body() body: RecordChargeDto,
  ) {
    const data = await this.billingService.recordCharge(user, body);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.PAYMENT_RECORDED);
  }

  @ApiOperation({ summary: "List the caller (doctor)'s payout requests" })
  @Get('payouts')
  async payouts(@CurrentUser() user: AuthUser) {
    const data = await this.billingService.getPayouts(user);
    return ResponseHelper.success(data, SUCCESS_MESSAGES.DATA_RETRIEVED);
  }

  @ApiOperation({
    summary: 'Request a payout of the settled balance (doctor only)',
  })
  @Post('payouts')
  async requestPayout(
    @CurrentUser() user: AuthUser,
    @Body() body: RequestPayoutDto,
  ) {
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

  @ApiOperation({
    summary:
      'Download a transaction as a PDF invoice (owner patient or doctor only)',
  })
  @ApiParam({ name: 'id' })
  @Get('transactions/:id/invoice')
  async invoice(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { pdf, filename } = await this.billingService.getInvoicePdf(user, id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdf.length,
    });
    res.send(pdf);
  }
}
