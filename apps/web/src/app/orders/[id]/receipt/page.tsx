'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Printer, ArrowLeft, ShieldCheck } from 'lucide-react';
import { Skeleton } from '@getx/ui';
import { useOrder } from '@/hooks/use-orders';
import { formatMoney } from '@/lib/currency';

/* /orders/[id]/receipt — printable order receipt.

   Rendered as a tall single-column A4-friendly page with @media print
   rules that strip browser chrome + buttons. The user hits Cmd/Ctrl+P
   and "Save as PDF" — same effect as a backend-rendered PDF without
   adding a runtime dep on Puppeteer/pdfkit. Includes:
     · Order number, dates, status
     · Buyer + seller + payment provider
     · Item / amount / fee / tax / wallet / loyalty breakdown
     · Final paid total in the order's currency
     · GETX legal footer block */

export default function ReceiptPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: order, isLoading } = useOrder(id);

  React.useEffect(() => {
    /* Set the print title so "Save as PDF" suggests a sane filename. */
    if (!order) return;
    if (typeof document !== 'undefined') {
      document.title = `Receipt · ${order.orderNumber} · GETX`;
    }
  }, [order]);

  if (isLoading || !order) {
    return (
      <main className="mx-auto max-w-[760px] px-6 py-12 space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </main>
    );
  }

  const itemTitle =
    order.productListing?.title ?? order.customRequest?.title ?? 'GETX order';
  const buyerName =
    order.buyer.name ?? order.buyer.username ?? order.buyer.email ?? '—';
  const sellerName = order.seller.name ?? order.seller.username ?? '—';
  const paid = Math.max(
    0,
    order.buyerTotal -
      (order.walletApplied ?? 0) -
      (order.loyaltyUsdApplied ?? 0),
  );

  return (
    <main className="bg-white text-black min-h-screen">
      {/* Print/share toolbar — hidden in print preview */}
      <div
        className="print:hidden border-b border-gray-200 bg-gray-50"
        aria-hidden={false}
      >
        <div className="mx-auto max-w-[760px] px-6 py-3 flex items-center justify-between">
          <Link
            href={`/orders/${order.id}`}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-gray-700 hover:text-black"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to order
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-black text-white text-[12.5px] font-semibold hover:bg-gray-800"
          >
            <Printer className="h-3.5 w-3.5" />
            Print / Save as PDF
          </button>
        </div>
      </div>

      <article className="mx-auto max-w-[760px] px-6 py-10 print:py-6 print:max-w-full font-sans">
        {/* Header */}
        <header className="flex items-start justify-between pb-6 border-b border-gray-200">
          <div>
            <div className="font-display text-3xl font-extrabold tracking-tight">
              GETX
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">
              getx.live · support@getx.live
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.18em] text-gray-500">
              Order receipt
            </div>
            <div className="font-mono text-sm font-bold mt-1">
              {order.orderNumber}
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">
              Paid {order.paidAt ? new Date(order.paidAt).toLocaleString() : '—'}
            </div>
          </div>
        </header>

        {/* Buyer / seller / payment */}
        <section className="grid grid-cols-2 gap-6 py-6 border-b border-gray-200 text-[12px]">
          <div>
            <div className="text-[10px] uppercase tracking-[0.15em] text-gray-500 mb-1">
              Buyer
            </div>
            <div className="font-semibold">{buyerName}</div>
            {order.buyer.email ? (
              <div className="text-gray-500">{order.buyer.email}</div>
            ) : null}
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.15em] text-gray-500 mb-1">
              Seller
            </div>
            <div className="font-semibold">
              @{order.seller.username ?? sellerName}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.15em] text-gray-500 mb-1">
              Status
            </div>
            <div className="font-semibold">{order.status}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.15em] text-gray-500 mb-1">
              Payment
            </div>
            <div className="font-semibold">
              {order.paymentProvider ?? 'Mock'}
              {order.paymentTransactionId ? (
                <span className="block text-[10px] text-gray-500 font-mono">
                  {order.paymentTransactionId}
                </span>
              ) : null}
            </div>
          </div>
        </section>

        {/* Line items */}
        <section className="py-6 border-b border-gray-200">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-[0.15em] text-gray-500">
                <th className="pb-2 font-semibold">Description</th>
                <th className="pb-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-100">
                <td className="py-3">
                  <div className="font-semibold">{itemTitle}</div>
                  {order.productListing?.sku ? (
                    <div className="text-[11px] text-gray-500 font-mono">
                      {order.productListing.sku}
                    </div>
                  ) : null}
                </td>
                <td className="py-3 text-right tabular-nums">
                  {formatMoney(order.amount, order.currency)}
                </td>
              </tr>
              <tr className="border-t border-gray-100">
                <td className="py-2 text-gray-600">Service fee</td>
                <td className="py-2 text-right tabular-nums">
                  {formatMoney(order.buyerFee, order.currency)}
                </td>
              </tr>
              {order.taxAmount && order.taxAmount > 0 ? (
                <tr className="border-t border-gray-100">
                  <td className="py-2 text-gray-600">Tax</td>
                  <td className="py-2 text-right tabular-nums">
                    {formatMoney(order.taxAmount, order.currency)}
                  </td>
                </tr>
              ) : null}
              {order.walletApplied && order.walletApplied > 0 ? (
                <tr className="border-t border-gray-100">
                  <td className="py-2 text-gray-600">GETX Coins applied</td>
                  <td className="py-2 text-right tabular-nums">
                    -{formatMoney(order.walletApplied, order.currency)}
                  </td>
                </tr>
              ) : null}
              {order.loyaltyUsdApplied && order.loyaltyUsdApplied > 0 ? (
                <tr className="border-t border-gray-100">
                  <td className="py-2 text-gray-600">
                    Loyalty points ({order.loyaltyPointsApplied?.toLocaleString()} pts)
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    -{formatMoney(order.loyaltyUsdApplied, order.currency)}
                  </td>
                </tr>
              ) : null}
              <tr className="border-t-2 border-gray-300">
                <td className="pt-3 font-display text-base font-extrabold">
                  Total paid
                </td>
                <td className="pt-3 text-right font-display text-lg font-extrabold tabular-nums">
                  {formatMoney(paid, order.currency)}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Trust block */}
        <section className="py-5 border-b border-gray-200 flex items-start gap-3 text-[11.5px] text-gray-600">
          <ShieldCheck className="h-4 w-4 text-gray-700 shrink-0 mt-0.5" />
          <p>
            This order is protected by GETX Shield. Funds remain in escrow
            until delivery is confirmed. Tax shown above was calculated
            automatically by our payment provider based on your billing
            address.
          </p>
        </section>

        <footer className="pt-6 text-[10.5px] text-gray-500 leading-relaxed">
          <p>
            GETX is operated globally. Receipt valid for accounting and
            reimbursement purposes — no separate VAT/GST invoice will be
            issued unless requested at{' '}
            <a
              href="mailto:support@getx.live?subject=Billing%20enquiry"
              className="underline text-gray-700"
            >
              support@getx.live
            </a>
            . Retain this receipt for at least 7 years if your jurisdiction
            requires it.
          </p>
          <p className="mt-2">
            Generated{' '}
            {new Date().toLocaleString('en-US', {
              timeZone: 'UTC',
              year: 'numeric',
              month: 'short',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              timeZoneName: 'short',
            })}{' '}
            · GETX order {order.orderNumber}
          </p>
        </footer>
      </article>
    </main>
  );
}
