import { redirect } from 'next/navigation';

/* /profile root has no first-class page — historically it 404'd because
   the Next App Router only generated /profile/orders, /profile/wallet,
   etc. Redirecting to /profile/orders is the safest default: it's the
   buyer's most-visited sub-page, the auth guard inside it will bounce
   anonymous visitors to /auth/login, and clicking "Account" in the
   header dropdown now lands somewhere useful. */
export default function ProfileIndex() {
  redirect('/profile/orders');
}
