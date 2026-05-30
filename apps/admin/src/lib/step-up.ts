/* AUTH-008 — client side of step-up auth.

   When the API answers a CRITICAL action with 403 { code: 'step_up_required' },
   the axios interceptor (lib/api.ts) calls requestStepUpToken(). The
   StepUpProvider registers a requester that pops the re-auth modal and resolves
   with a fresh step-up token, which the interceptor replays as X-Step-Up-Token.
   Decoupled via this tiny registry so the non-React axios layer can drive a
   React modal without a circular import. */

type StepUpRequester = () => Promise<string>;

let requester: StepUpRequester | null = null;

export function setStepUpRequester(fn: StepUpRequester | null): void {
  requester = fn;
}

export function requestStepUpToken(): Promise<string> {
  if (!requester) {
    return Promise.reject(
      new Error('Re-authentication UI is not mounted. Reload and try again.'),
    );
  }
  return requester();
}
