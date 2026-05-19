'use client';

import * as React from 'react';
import { AxiosError } from 'axios';
import { Plus, Trash2, Star, MapPin, Pencil } from 'lucide-react';
import { Button, Input, Skeleton, toast } from '@getx/ui';
import {
  useAddresses,
  useCreateAddress,
  useDeleteAddress,
  useUpdateAddress,
  type Address,
} from '@/hooks/use-addresses';

interface FormState {
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  label: string;
  taxId: string;
  isDefault: boolean;
}

const EMPTY: FormState = {
  fullName: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'US',
  label: '',
  taxId: '',
  isDefault: false,
};

export default function AddressesPage() {
  const { data, isLoading } = useAddresses();
  const create = useCreateAddress();
  const update = useUpdateAddress();
  const remove = useDeleteAddress();

  const [editing, setEditing] = React.useState<Address | null>(null);
  const [showForm, setShowForm] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(EMPTY);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY);
    setShowForm(true);
  };

  const openEdit = (a: Address) => {
    setEditing(a);
    setForm({
      fullName: a.fullName,
      phone: a.phone ?? '',
      line1: a.line1,
      line2: a.line2 ?? '',
      city: a.city,
      state: a.state,
      postalCode: a.postalCode,
      country: a.country,
      label: a.label ?? '',
      taxId: a.taxId ?? '',
      isDefault: a.isDefault,
    });
    setShowForm(true);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      fullName: form.fullName,
      phone: form.phone || null,
      line1: form.line1,
      line2: form.line2 || null,
      city: form.city,
      state: form.state,
      postalCode: form.postalCode,
      country: form.country,
      label: form.label || null,
      taxId: form.taxId || null,
      isDefault: form.isDefault,
    };
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, ...payload });
        toast.success('Address updated');
      } else {
        await create.mutateAsync(payload);
        toast.success('Address saved');
      }
      setShowForm(false);
    } catch (err) {
      const msg =
        err instanceof AxiosError
          ? (err.response?.data as { message?: string } | undefined)?.message
          : null;
      toast.error(msg ?? 'Could not save address');
    }
  };

  const onMakeDefault = async (a: Address) => {
    if (a.isDefault) return;
    try {
      await update.mutateAsync({ id: a.id, isDefault: true });
    } catch {
      toast.error('Could not set default');
    }
  };

  const onRemove = async (a: Address) => {
    if (!confirm(`Remove "${a.fullName}" address?`)) return;
    try {
      await remove.mutateAsync(a.id);
    } catch {
      toast.error('Could not remove');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <p className="text-[14px] text-muted-foreground max-w-xl">
          Used for order receipts. Add your tax ID (GSTIN / VAT / EIN / etc.) if
          you&apos;re buying for a registered business.
        </p>
        <Button
          onClick={openAdd}
          variant={showForm && !editing ? 'ghost' : 'default'}
          className="rounded-full shrink-0"
        >
          <Plus className="h-4 w-4" />
          Add address
        </Button>
      </div>

      {showForm ? (
        <form
          onSubmit={onSubmit}
          className="rounded-3xl border border-border/60 bg-surface/60 p-5 space-y-3"
        >
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Full name" required>
              <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </Field>
            <Field label="Phone">
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                inputMode="tel"
              />
            </Field>
          </div>
          <Field label="Address line 1" required>
            <Input value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} />
          </Field>
          <Field label="Address line 2">
            <Input value={form.line2} onChange={(e) => setForm({ ...form, line2: e.target.value })} />
          </Field>
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="City" required>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </Field>
            <Field label="State" required>
              <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            </Field>
            <Field label="Postal code" required>
              <Input value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} />
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Label (Home / Office)">
              <Input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                maxLength={40}
              />
            </Field>
            <Field label="Tax ID (optional)">
              <Input
                value={form.taxId}
                onChange={(e) => setForm({ ...form, taxId: e.target.value.toUpperCase() })}
                placeholder="GSTIN / VAT / EIN / CNPJ"
                maxLength={40}
              />
            </Field>
          </div>
          <label className="inline-flex items-center gap-2 text-[12.5px]">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
              className="accent-[hsl(var(--primary))]"
            />
            Make this my default address
          </label>
          <div className="flex items-center gap-2 pt-2">
            <Button
              type="submit"
              loading={create.isPending || update.isPending}
              loadingText="Saving…"
              className="rounded-full"
              disabled={!form.fullName || !form.line1 || !form.city || !form.state || !form.postalCode}
            >
              {editing ? 'Update address' : 'Save address'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowForm(false)}
              className="rounded-full"
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <EmptyState onAdd={openAdd} />
      ) : (
        <ul className="space-y-3">
          {data.map((a) => (
            <li
              key={a.id}
              className="rounded-2xl border border-border/60 bg-surface/60 p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-display text-[14px] font-extrabold truncate">
                      {a.fullName}
                    </span>
                    {a.label ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-[hsl(var(--surface-elevated))] text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        {a.label}
                      </span>
                    ) : null}
                    {a.isDefault ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))] text-[10px] font-bold uppercase tracking-wider">
                        Default
                      </span>
                    ) : null}
                  </div>
                  <div className="text-[12.5px] text-foreground/85 leading-snug">
                    {a.line1}
                    {a.line2 ? `, ${a.line2}` : ''}
                    <br />
                    {a.city}, {a.state} {a.postalCode}
                    <br />
                    {a.country}
                    {a.phone ? <span> · {a.phone}</span> : null}
                  </div>
                  {a.taxId ? (
                    <div className="mt-2 text-[11px] font-mono text-muted-foreground">
                      Tax ID · {a.taxId}
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {!a.isDefault ? (
                    <button
                      type="button"
                      onClick={() => onMakeDefault(a)}
                      aria-label="Set as default"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-[hsl(var(--primary)/0.08)] hover:text-[hsl(var(--primary))]"
                    >
                      <Star className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => openEdit(a)}
                    aria-label="Edit"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-[hsl(var(--surface-elevated))]"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(a)}
                    aria-label="Remove"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-[hsl(var(--error)/0.1)] hover:text-[hsl(var(--error))]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[12px] font-semibold mb-1.5">
        {label}
        {required ? <span className="text-[hsl(var(--error))] ml-0.5">*</span> : null}
      </label>
      {children}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-surface/40 p-10 text-center">
      <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-[hsl(var(--primary)/0.1)] grid place-items-center">
        <MapPin className="h-5 w-5 text-[hsl(var(--primary))]" />
      </div>
      <h3 className="font-display text-lg font-extrabold mb-1">
        No addresses yet
      </h3>
      <p className="text-[12.5px] text-muted-foreground max-w-sm mx-auto mb-5">
        Add a billing address so order receipts can be generated for your
        completed orders.
      </p>
      <Button onClick={onAdd} className="rounded-full">
        <Plus className="h-4 w-4" />
        Add address
      </Button>
    </div>
  );
}
