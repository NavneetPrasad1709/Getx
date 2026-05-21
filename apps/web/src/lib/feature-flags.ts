/* Feature flags — read once at bundle build from NEXT_PUBLIC_* env so
   they tree-shake correctly. Defaults are conservative so a missing
   env doesn't accidentally expose a half-built flow. */

/* When true, the buy/checkout drawer is gated behind a "Coming soon"
   toast. Stripe isn't wired yet (PaymentsService falls back to
   MockProvider which would silently create PAID orders without a
   real charge) — so until STRIPE_SECRET_KEY lands we don't want any
   real buyer pressing "Buy". Flip to `false` after Stripe is live. */
export const CHECKOUT_DISABLED =
  process.env.NEXT_PUBLIC_CHECKOUT_DISABLED !== 'false';

/* Hook-like helper for components that need to gate a checkout
   action behind the flag. Returns a wrapper that either calls the
   passed onBuy or shows the user a "coming soon" toast. Lives here
   rather than inline at each call site so the gate is consistent
   across the desktop BuyPanel, mobile buy bar, and any future
   surface that opens the CheckoutDrawer. */
export function gateCheckout(onBuy: () => void, toast: { info: (m: string) => void }) {
  return () => {
    if (CHECKOUT_DISABLED) {
      toast.info('Checkout opens in a few days — sign up to get notified at launch.');
      return;
    }
    onBuy();
  };
}
