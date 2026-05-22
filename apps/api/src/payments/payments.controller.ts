import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';
import type { ProviderName } from './providers/payment.interface';
import { firstOriginFromCsv } from '../common/config-helpers';

interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

const MockPaySchema = z.object({
  sessionId: z.string().min(1).max(200),
  orderId: z.string().min(1).max(200),
});

/* Minimal HTML attribute/text escaper for the mock checkout template.
   Mock pages are dev-only but XSS-safe-by-default is still the rule. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function assertNonProd() {
  if (process.env.NODE_ENV === 'production') {
    throw new NotFoundException();
  }
}

@Controller('payments')
export class PaymentsController {
  constructor(private payments: PaymentsService) {}

  @Public()
  @Post('webhook/:provider')
  @HttpCode(HttpStatus.OK)
  async handleProviderWebhook(
    @Param('provider') provider: string,
    @Headers() headers: Record<string, string>,
    @Req() req: RawBodyRequest,
  ) {
    const body = req.rawBody?.toString() ?? JSON.stringify(req.body ?? {});
    return this.payments.handleProviderWebhook(
      provider as ProviderName,
      headers,
      body,
    );
  }

  /**
   * Legacy multi-provider webhook endpoint. Retained as a back-compat
   * shim for any provider dashboards still pointed at /payments/webhook;
   * new integrations MUST use /payments/webhook/:provider so the
   * dispatcher cannot fall through to the wrong provider on a missing
   * secret. Disabled entirely in production via NODE_ENV gate.
   */
  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Headers() headers: Record<string, string>,
    @Req() req: RawBodyRequest,
  ) {
    if (process.env.PAYMENTS_ALLOW_LEGACY_WEBHOOK !== 'true') {
      throw new NotFoundException();
    }
    const body = req.rawBody?.toString() ?? JSON.stringify(req.body ?? {});
    return this.payments.handleWebhook(headers, body);
  }

  /**
   * Mock checkout page — simulates a hosted checkout when no provider
   * secret is configured. NODE_ENV=production refuses to serve it so
   * a misconfigured prod environment can never reach the mock flow.
   */
  @Public()
  @Get('mock-checkout/:sessionId')
  mockCheckout(
    @Param('sessionId') sessionId: string,
    @Query('orderId') orderId: string,
    @Query('amount') amount: string,
    @Res() res: Response,
  ) {
    assertNonProd();

    const webUrl = firstOriginFromCsv(process.env.WEB_URL, 'http://localhost:3000');
    const dollars = ((parseInt(amount, 10) || 0) / 100).toFixed(2);
    const safeSession = escapeHtml(sessionId);
    const safeOrder = escapeHtml(orderId);
    const safeWeb = escapeHtml(webUrl);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>GETX Mock Checkout</title>
<style>
  body { font-family: Poppins, system-ui, sans-serif; max-width: 500px; margin: 50px auto; padding: 20px; background: #f8fafc; color: #0f172a; }
  .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; background: white; }
  h1 { margin-top: 0; }
  button { background: #2563eb; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; margin-right: 8px; font-size: 14px; font-weight: 500; }
  button.secondary { background: #ef4444; }
  .info { background: #fef3c7; padding: 12px; border-radius: 6px; margin: 16px 0; font-size: 13px; }
  code { background: #f1f5f9; padding: 1px 6px; border-radius: 3px; font-size: 12px; }
</style></head>
<body><div class="card">
  <h1>Mock Checkout</h1>
  <div class="info"><strong>Dev mode:</strong> real payments require a provider secret. Click "Pay" to simulate success.</div>
  <p><strong>Session:</strong> <code>${safeSession}</code></p>
  <p><strong>Order:</strong> <code>${safeOrder}</code></p>
  <p><strong>Amount:</strong> $${dollars}</p>
  <form method="POST" action="/api/v1/payments/mock-pay">
    <input type="hidden" name="sessionId" value="${safeSession}" />
    <input type="hidden" name="orderId" value="${safeOrder}" />
    <button type="submit">Simulate successful payment</button>
    <a href="${safeWeb}/orders/${safeOrder}?payment=cancelled" style="text-decoration:none;">
      <button type="button" class="secondary">Cancel</button>
    </a>
  </form>
</div></body></html>`);
  }

  /**
   * Mock-pay simulates a webhook for a single order. NODE_ENV=production
   * blocks the route entirely; outside prod the request must be
   * authenticated AND the order must belong to the caller, so even a
   * leaked sessionId cannot mark someone else's order PAID.
   */
  @Post('mock-pay')
  async mockPay(
    @Body() rawBody: unknown,
    @CurrentUser('id') userId: string,
    @Res() res: Response,
  ) {
    assertNonProd();
    if (!userId) throw new ForbiddenException();

    const body = MockPaySchema.parse(rawBody);

    await this.payments.simulateMockPayment(
      body.sessionId,
      body.orderId,
      userId,
    );
    const webUrl = firstOriginFromCsv(process.env.WEB_URL, 'http://localhost:3000');
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
