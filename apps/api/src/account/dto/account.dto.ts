import { z } from 'zod';
import { safeHttpUrl, safeImageUrl } from '../../common/validators/safe-url';

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8, 'At least 8 characters')
    .max(128)
    .regex(/[a-z]/, 'Needs a lowercase letter')
    .regex(/[A-Z]/, 'Needs an uppercase letter')
    .regex(/[0-9]/, 'Needs a digit'),
});
export type ChangePasswordDto = z.infer<typeof ChangePasswordSchema>;

export const UpdateNotificationsSchema = z
  .object({
    emailNotifications: z.boolean().optional(),
    pushNotifications: z.boolean().optional(),
    smsNotifications: z.boolean().optional(),
    marketingOptIn: z.boolean().optional(),
  })
  .refine(
    (d) =>
      d.emailNotifications !== undefined ||
      d.pushNotifications !== undefined ||
      d.smsNotifications !== undefined ||
      d.marketingOptIn !== undefined,
    { message: 'Provide at least one flag' },
  );
export type UpdateNotificationsDto = z.infer<typeof UpdateNotificationsSchema>;

export const SubmitKycSchema = z.object({
  /* Aadhaar is 12 digits. We never store plaintext — controller hashes
     before persistence. Accept either spaces or compact form. */
  aadhaarNumber: z
    .string()
    .transform((s) => s.replace(/\s+/g, ''))
    .pipe(z.string().regex(/^\d{12}$/, 'Aadhaar must be 12 digits')),
  selfieUrl: safeImageUrl(),
  frontImageUrl: safeImageUrl(),
  backImageUrl: safeImageUrl().optional(),
});
export type SubmitKycDto = z.infer<typeof SubmitKycSchema>;

/* Profile edit — every field optional; we PATCH only what changed.
   Social handles accept username-only (no full URL), max 40 chars.
   Website requires http(s). */
export const UpdateProfileSchema = z
  .object({
    displayName: z.string().min(1).max(60).optional().nullable(),
    bio: z.string().max(500).optional().nullable(),
    // RES-HIGH-022: safeHttpUrl rejects data:text/html XSS payloads
    avatar: safeHttpUrl().optional().nullable(),
    website: z
      .string()
      .url('Must be a full https URL')
      .max(200)
      .optional()
      .nullable(),
    twitterHandle: z
      .string()
      .max(40)
      .regex(/^[A-Za-z0-9_]+$/, 'Letters / numbers / underscore only')
      .optional()
      .nullable(),
    discordHandle: z.string().max(40).optional().nullable(),
    youtubeHandle: z.string().max(40).optional().nullable(),
    twitchHandle: z
      .string()
      .max(40)
      .regex(/^[A-Za-z0-9_]+$/, 'Letters / numbers / underscore only')
      .optional()
      .nullable(),
    preferredLanguages: z.array(z.string().length(2)).max(8).optional(),
    timezone: z.string().max(60).optional().nullable(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: 'Provide at least one field to update',
  });
export type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>;

export const DeleteAccountSchema = z.object({
  /* Defensive confirm gate — buyer types the literal phrase to proceed.
     Prevents accidental deletes from a stale tab. */
  confirm: z.literal('DELETE MY ACCOUNT'),
  password: z.string().min(1),
});
export type DeleteAccountDto = z.infer<typeof DeleteAccountSchema>;
