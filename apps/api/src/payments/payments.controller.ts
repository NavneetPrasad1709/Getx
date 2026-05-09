import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';

interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

@Controller('payments')
export class PaymentsController {
  constructor(private payments: PaymentsService) {}

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Headers() headers: Record<string, string>,
    @Req() req: RawBodyRequest,
  ) {
    const body = req.rawBody?.toString() ?? JSON.stringify(req.body ?? {});
    return this.payments.handleWebhook(headers, body);
  }

  /**
   * Mock checkout page — simulates Paddle hosted checkout when PADDLE_API_KEY unset.
   */
  @Public()
  @Get('mock-checkout/:sessionId')
  mockCheckout(
    @Param('sessionId') sessionId: string,
    @Query('orderId') orderId: string,
    @Query('amount') amount: string,
    @Res() res: Response,
  ) {
    const webUrl = process.env.WEB_URL ?? 'http://localhost:3000';
    const dollars = ((parseInt(amount, 10) || 0) / 100).toFixed(2);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>GETX Mock Checkout</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 500px; margin: 50px auto; padding: 20px; background: #f8fafc; color: #0f172a; }
  .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; background: white; }
  h1 { margin-top: 0; }
  button { background: #2563eb; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; margin-right: 8px; font-size: 14px; font-weight: 500; }
  button.secondary { background: #ef4444; }
  .info { background: #fef3c7; padding: 12px; border-radius: 6px; margin: 16px 0; font-size: 13px; }
  code { background: #f1f5f9; padding: 1px 6px; border-radius: 3px; font-size: 12px; }
</style></head>
<body><div class="card">
  <h1>🧪 Mock Checkout</h1>
  <div class="info"><strong>Dev mode:</strong> real payments require <code>PADDLE_API_KEY</code>. Click "Pay" to simulate success.</div>
  <p><strong>Session:</strong> <code>${sessionId}</code></p>
  <p><strong>Order:</strong> <code>${orderId}</code></p>
  <p><strong>Amount:</strong> $${dollars}</p>
  <form method="POST" action="/api/v1/payments/mock-pay">
    <input type="hidden" name="sessionId" value="${sessionId}" />
    <input type="hidden" name="orderId" value="${orderId}" />
    <button type="submit">✅ Simulate successful payment</button>
    <a href="${webUrl}/orders/${orderId}?payment=cancelled" style="text-decoration:none;">
      <button type="button" class="secondary">❌ Cancel</button>
    </a>
  </form>
</div></body></html>`);
  }

  @Public()
  @Post('mock-pay')
  async mockPay(
    @Body() body: { sessionId: string; orderId: string },
    @Res() res: Response,
  ) {
    await this.payments.simulateMockPayment(body.sessionId, body.orderId);
    const webUrl = process.env.WEB_URL ?? 'http://localhost:3000';
    res.redirect(`${webUrl}/orders/${body.orderId}?payment=success`);
  }

  @Post('checkout/:orderId')
  createCheckout(
    @Param('orderId') orderId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.payments.createCheckoutSession(orderId, userId);
  }
}
