'use client';

import * as React from 'react';
import Script from 'next/script';
import { useAuth } from '@/hooks/use-auth';

/* Crisp live-chat embed.

   Renders the standard Crisp loader when `NEXT_PUBLIC_CRISP_WEBSITE_ID`
   is configured at build/runtime; renders nothing otherwise. When an
   authenticated buyer is on the page we pre-populate the session with
   their email + display name so support sees who they're talking to
   without asking for it. We never push payment info, addresses, or
   KYC fields into Crisp. */

interface CrispWindow extends Window {
  $crisp?: Array<unknown[]>;
  CRISP_WEBSITE_ID?: string;
}

export function CrispChat() {
  const id = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID;
  const { user, isAuthenticated } = useAuth();

  /* Push identity once the SDK has mounted + a logged-in user exists.
     `$crisp.push` queues until the runtime loads, so timing is safe. */
  React.useEffect(() => {
    if (!id) return;
    if (typeof window === 'undefined') return;
    const w = window as unknown as CrispWindow;
    if (!w.$crisp) return;
    if (!isAuthenticated || !user) return;
    w.$crisp.push(['set', 'user:email', [user.email]]);
    if (user.name) {
      w.$crisp.push(['set', 'user:nickname', [user.name]]);
    }
    /* Tag the session so support can filter by role + signup country
       in the Crisp dashboard. */
    w.$crisp.push(['set', 'session:segments', [['buyer']]]);
  }, [id, user, isAuthenticated]);

  if (!id) return null;

  return (
    <Script
      id="crisp-loader"
      strategy="afterInteractive"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{
        __html: `
window.$crisp = [];
window.CRISP_WEBSITE_ID = ${JSON.stringify(id)};
(function(){
  var d = document;
  var s = d.createElement('script');
  s.src = 'https://client.crisp.chat/l.js';
  s.async = 1;
  d.getElementsByTagName('head')[0].appendChild(s);
})();
`,
      }}
    />
  );
}

