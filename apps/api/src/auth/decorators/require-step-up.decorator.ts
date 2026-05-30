import { SetMetadata } from '@nestjs/common';

/* AUTH-008 — mark a route as requiring fresh re-authentication (step-up).

   The CRITICAL-severity admin actions (ban, force-release, refund, dispute
   resolution, withdrawal approve/reject) move money or irreversibly change
   accounts. A stolen/forgotten admin session should not be enough to fire them:
   StepUpGuard demands a short-lived step-up token minted seconds earlier via
   POST /auth/step-up (password or, if 2FA is on, TOTP). */

export const STEP_UP_KEY = 'requireStepUp';

export const RequireStepUp = () => SetMetadata(STEP_UP_KEY, true);
