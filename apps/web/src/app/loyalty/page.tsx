import { redirect } from 'next/navigation';

/* Short alias for the loyalty dashboard. `/loyalty` is the brand-facing
   entry point we publish on receipts and email footers; it redirects
   permanently to the canonical `/profile/loyalty` so deep-links from
   one place keep working forever. Auth gate is enforced on the target
   page so a logged-out visitor still gets bounced to /auth/login. */

export default function LoyaltyAliasRedirect() {
  redirect('/profile/loyalty');
}
