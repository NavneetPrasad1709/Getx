'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AxiosError } from 'axios';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Skeleton, toast } from '@getx/ui';
import { Header } from '@/components/header';
import { LandingFooter } from '@/components/landing/landing-footer';
import { useService } from '@/hooks/use-games';
import { useAuth } from '@/hooks/use-auth';
import { useCreateRequest } from '@/hooks/use-custom-requests';
import { DynamicForm, type AddOn, type FormField } from '@/components/boosting/dynamic-form';

interface ServicePayload {
  slug: string;
  name?: string;
  description?: string;
  estimatedTime?: string;
  formFields?: FormField[];
  addons?: AddOn[];
}

export default function BoostingServiceFormPage() {
  const params = useParams<{ serviceSlug: string }>();
  const router = useRouter();
  const serviceSlug = params.serviceSlug;

  const { isAuthenticated } = useAuth();
  const { data, isLoading } = useService('pokemon-go', serviceSlug);
  const service = data as ServicePayload | undefined;
  const createMutation = useCreateRequest();

  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [deliveryDays, setDeliveryDays] = useState('7');

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-8">
          <Skeleton className="h-96 w-full" />
        </main>
        <LandingFooter />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-16">
          <Card>
            <CardContent className="p-12 text-center">
              <h1 className="font-display text-2xl font-bold mb-2">Service not found</h1>
              <p className="text-muted-foreground mb-6">
                We couldn&apos;t find that boosting service.
              </p>
              <Link href="/games/pokemon-go/boosting">
                <Button>Browse all services</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
        <LandingFooter />
      </div>
    );
  }

  const formFields = service.formFields ?? [];
  const addons = service.addons ?? [];

  const handleFieldChange = (name: string, value: unknown) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title || title.length < 5) newErrors._title = 'Title must be at least 5 characters';
    if (!description || description.length < 20) {
      newErrors._description = 'Description must be at least 20 characters';
    }

    const min = parseFloat(budgetMin);
    const max = parseFloat(budgetMax);
    if (!min || min < 1) newErrors._budgetMin = 'Minimum budget required';
    if (!max || max < 1) newErrors._budgetMax = 'Maximum budget required';
    if (min && max && max < min) newErrors._budgetMax = 'Max must be ≥ min';

    formFields.forEach((field) => {
      if (!field.required) return;

      // Skip validation for hidden conditional fields
      if (field.conditional) {
        const [dep, depVal] = field.conditional.split('=');
        if (dep && formValues[dep] !== depVal) return;
      }

      const v = formValues[field.name];
      const isEmpty =
        v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
      if (isEmpty) {
        newErrors[field.name] = `${field.label} is required`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      toast.info('Please login to post a request');
      router.push(`/auth/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    if (!validate()) {
      toast.error('Please fix the errors below');
      return;
    }

    const attributes: Record<string, unknown> = {};
    const addonValues: Record<string, boolean> = {};

    Object.entries(formValues).forEach(([key, value]) => {
      if (key.startsWith('addon_')) {
        addonValues[key.replace('addon_', '')] = !!value;
      } else if (value !== undefined && value !== null && value !== '') {
        attributes[key] = value;
      }
    });

    const platform = typeof attributes.platform === 'string' ? attributes.platform : undefined;

    try {
      const request = await createMutation.mutateAsync({
        gameSlug: 'pokemon-go',
        tabType: 'BOOSTING',
        subCategory: serviceSlug,
        title,
        description,
        budgetMin: parseFloat(budgetMin),
        budgetMax: parseFloat(budgetMax),
        currency: 'USD',
        attributes,
        addons: addonValues,
        deliveryDays: parseInt(deliveryDays, 10),
        platform,
      });

      toast.success('Request posted! Sellers will start bidding.');
      router.push(`/requests/${request.id}`);
    } catch (error) {
      const msg =
        error instanceof AxiosError
          ? (error.response?.data as { message?: string } | undefined)?.message
          : null;
      toast.error(msg ?? 'Failed to create request');
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container py-8">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1 text-sm text-muted-foreground mb-4"
        >
          <Link href="/games/pokemon-go/boosting" className="hover:text-foreground">
            ← Back to Boosting
          </Link>
        </nav>

        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold mb-2">{service.name}</h1>
          {service.description && <p className="text-muted-foreground">{service.description}</p>}
          {service.estimatedTime && (
            <p className="text-sm text-muted-foreground mt-2">
              ⏱️ Estimated time: {service.estimatedTime}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Request Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium block">
                      Request Title
                      <span className="text-destructive ml-0.5">*</span>
                    </label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={`e.g., Need ${service.name} for my account`}
                      maxLength={150}
                    />
                    {errors._title && <p className="text-xs text-destructive">{errors._title}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium block">
                      Description
                      <span className="text-destructive ml-0.5">*</span>
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe your needs in detail. The more info, the better offers you'll get."
                      rows={5}
                      maxLength={2000}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {description.length}/2000 characters
                      </span>
                      {errors._description && (
                        <span className="text-xs text-destructive">{errors._description}</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {formFields.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{service.name} Specifics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DynamicForm
                      formFields={formFields}
                      addons={addons}
                      values={formValues}
                      onChange={handleFieldChange}
                      errors={errors}
                    />
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="lg:sticky lg:top-20 lg:self-start">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Budget &amp; Timeline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium block">
                      Budget Range (USD)
                      <span className="text-destructive ml-0.5">*</span>
                    </label>
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={budgetMin}
                        onChange={(e) => setBudgetMin(e.target.value)}
                        min={1}
                      />
                      <span className="text-xs text-muted-foreground">to</span>
                      <Input
                        type="number"
                        placeholder="Max"
                        value={budgetMax}
                        onChange={(e) => setBudgetMax(e.target.value)}
                        min={1}
                      />
                    </div>
                    {(errors._budgetMin || errors._budgetMax) && (
                      <p className="text-xs text-destructive">
                        {errors._budgetMin || errors._budgetMax}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Sellers bid within your range. Realistic budgets get more offers.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium block">Delivery time (days)</label>
                    <Input
                      type="number"
                      value={deliveryDays}
                      onChange={(e) => setDeliveryDays(e.target.value)}
                      min={1}
                      max={60}
                    />
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? 'Posting...' : 'Get Offers'}
                  </Button>

                  {!isAuthenticated && (
                    <p className="text-xs text-muted-foreground text-center">
                      You&apos;ll be asked to login first
                    </p>
                  )}

                  <ul className="space-y-1.5 text-xs text-muted-foreground border-t pt-4">
                    <li>✓ Free to post</li>
                    <li>✓ Get offers in minutes</li>
                    <li>✓ Choose the best one</li>
                    <li>✓ Money in escrow until delivery</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </main>

      <LandingFooter />
    </div>
  );
}
