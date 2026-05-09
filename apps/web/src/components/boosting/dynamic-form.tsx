'use client';

import { Input } from '@getx/ui';

export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'radio'
  | 'boolean'
  | 'file';

export type SelectOption = string | { label: string; value: string };

export interface FormField {
  name: string;
  label: string;
  type: FormFieldType;
  placeholder?: string;
  required?: boolean;
  min?: number;
  max?: number;
  options?: SelectOption[];
  conditional?: string;
  helpText?: string;
}

export interface AddOn {
  name: string;
  label: string;
  description?: string;
  price?: number;
  default?: boolean;
}

interface Props {
  formFields: FormField[];
  addons: AddOn[];
  values: Record<string, unknown>;
  onChange: (name: string, value: unknown) => void;
  errors?: Record<string, string>;
}

function optionValue(opt: SelectOption): string {
  return typeof opt === 'string' ? opt : opt.value;
}

function optionLabel(opt: SelectOption): string {
  return typeof opt === 'string' ? opt : opt.label;
}

export function DynamicForm({ formFields, addons, values, onChange, errors = {} }: Props) {
  const isVisible = (field: FormField): boolean => {
    if (!field.conditional) return true;
    const [depName, depValue] = field.conditional.split('=');
    if (!depName) return true;
    return values[depName] === depValue;
  };

  return (
    <div className="space-y-5">
      {formFields.map((field) => {
        if (!isVisible(field)) return null;

        const error = errors[field.name];
        const rawValue = values[field.name];
        const value = rawValue ?? '';

        return (
          <div key={field.name} className="space-y-1.5">
            {field.type !== 'boolean' && (
              <label className="text-sm font-medium block">
                {field.label}
                {field.required && <span className="text-destructive ml-0.5">*</span>}
              </label>
            )}

            {field.type === 'text' && (
              <Input
                type="text"
                value={typeof value === 'string' || typeof value === 'number' ? value : ''}
                onChange={(e) => onChange(field.name, e.target.value)}
                placeholder={field.placeholder}
              />
            )}

            {field.type === 'textarea' && (
              <textarea
                value={typeof value === 'string' ? value : ''}
                onChange={(e) => onChange(field.name, e.target.value)}
                placeholder={field.placeholder}
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            )}

            {field.type === 'number' && (
              <Input
                type="number"
                value={typeof value === 'number' || typeof value === 'string' ? value : ''}
                onChange={(e) =>
                  onChange(field.name, e.target.value === '' ? '' : Number(e.target.value))
                }
                placeholder={field.placeholder}
                min={field.min}
                max={field.max}
              />
            )}

            {field.type === 'select' && (
              <select
                value={typeof value === 'string' ? value : ''}
                onChange={(e) => onChange(field.name, e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Select...</option>
                {field.options?.map((opt) => (
                  <option key={optionValue(opt)} value={optionValue(opt)}>
                    {optionLabel(opt)}
                  </option>
                ))}
              </select>
            )}

            {field.type === 'multiselect' && (
              <div className="space-y-1.5">
                {field.options?.map((opt) => {
                  const ov = optionValue(opt);
                  const arr = Array.isArray(rawValue) ? (rawValue as string[]) : [];
                  const checked = arr.includes(ov);
                  return (
                    <label key={ov} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...arr, ov]
                            : arr.filter((v) => v !== ov);
                          onChange(field.name, next);
                        }}
                        className="rounded"
                      />
                      {optionLabel(opt)}
                    </label>
                  );
                })}
              </div>
            )}

            {field.type === 'radio' && (
              <div className="space-y-1.5">
                {field.options?.map((opt) => {
                  const ov = optionValue(opt);
                  return (
                    <label key={ov} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name={field.name}
                        value={ov}
                        checked={value === ov}
                        onChange={(e) => onChange(field.name, e.target.value)}
                      />
                      {optionLabel(opt)}
                    </label>
                  );
                })}
              </div>
            )}

            {field.type === 'boolean' && (
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!value}
                  onChange={(e) => onChange(field.name, e.target.checked)}
                  className="rounded"
                />
                {field.label}
                {field.required && <span className="text-destructive">*</span>}
              </label>
            )}

            {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        );
      })}

      {addons.length > 0 && (
        <div className="pt-4 border-t">
          <h3 className="text-sm font-semibold mb-3">Optional Add-ons</h3>
          <div className="space-y-2">
            {addons.map((addon) => (
              <label key={addon.name} className="flex items-start gap-3 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!values[`addon_${addon.name}`]}
                  onChange={(e) => onChange(`addon_${addon.name}`, e.target.checked)}
                  className="mt-0.5 rounded"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{addon.label}</span>
                    {addon.price !== undefined && (
                      <span className="text-xs text-primary font-semibold">+${addon.price}</span>
                    )}
                  </div>
                  {addon.description && (
                    <p className="text-xs text-muted-foreground">{addon.description}</p>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
