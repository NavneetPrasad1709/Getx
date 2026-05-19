import { z } from 'zod';

const baseAddressFields = {
  fullName: z.string().min(2).max(120),
  phone: z
    .string()
    .max(20)
    .optional()
    .nullable(),
  line1: z.string().min(3).max(200),
  line2: z.string().max(200).optional().nullable(),
  city: z.string().min(2).max(80),
  state: z.string().min(2).max(80),
  postalCode: z.string().min(3).max(16),
  country: z.string().min(2).max(2).default('US'),
  label: z.string().max(40).optional().nullable(),
  /* Generic tax ID — India GSTIN (15 chars), EU VAT ID, US EIN, BR
     CPF/CNPJ, etc. We accept 6-40 chars alphanumeric + punctuation;
     country-specific validation is enforced at invoice-generation
     time (not at save time). */
  taxId: z
    .string()
    .min(6)
    .max(40)
    .regex(/^[A-Z0-9.\-/]+$/i, 'Invalid tax ID format')
    .optional()
    .nullable(),
  isDefault: z.boolean().optional(),
};

export const CreateAddressSchema = z.object(baseAddressFields);
export const UpdateAddressSchema = z.object({
  fullName: baseAddressFields.fullName.optional(),
  phone: baseAddressFields.phone,
  line1: baseAddressFields.line1.optional(),
  line2: baseAddressFields.line2,
  city: baseAddressFields.city.optional(),
  state: baseAddressFields.state.optional(),
  postalCode: baseAddressFields.postalCode.optional(),
  country: baseAddressFields.country.optional(),
  label: baseAddressFields.label,
  taxId: baseAddressFields.taxId,
  isDefault: z.boolean().optional(),
});
export type CreateAddressDto = z.infer<typeof CreateAddressSchema>;
export type UpdateAddressDto = z.infer<typeof UpdateAddressSchema>;
