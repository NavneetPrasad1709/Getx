'use client';

import {
  motion,
  Button,
  MagneticButton,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Input,
  Label,
  Textarea,
  Badge,
  Skeleton,
  GradientMesh,
  ScrollReveal,
  ThemeToggle,
  staggerContainer,
  fadeUp,
} from '@getx/ui';

const swatches = [
  { name: 'Primary', class: 'bg-primary' },
  { name: 'Accent', class: 'bg-accent' },
  { name: 'Surface', class: 'bg-surface border border-border' },
  { name: 'Success', class: 'bg-success' },
  { name: 'Warning', class: 'bg-warning' },
  { name: 'Error', class: 'bg-error' },
] as const;

export default function TestDesignPage() {
  return (
    <div className="relative min-h-screen overflow-hidden noise-overlay">
      <GradientMesh variant="subtle" />

      <div className="container relative z-10 mx-auto space-y-16 px-4 py-16">
        {/* Header */}
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-6xl font-bold tracking-tight">
              GET<span className="gradient-text">X</span>
            </h1>
            <p className="mt-2 text-lg text-muted-foreground">Design system test · Cobalt Calm</p>
          </div>
          <ThemeToggle />
        </header>

        {/* Buttons */}
        <ScrollReveal>
          <Card>
            <CardHeader>
              <CardTitle>Buttons</CardTitle>
              <CardDescription>All variants, sizes, and the magnetic interaction</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap gap-3">
                <Button variant="default">Default</Button>
                <Button variant="accent">Accent</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link</Button>
                <Button variant="gradient">Gradient</Button>
                <Button variant="destructive">Destructive</Button>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm">Small</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large</Button>
                <Button size="xl" variant="gradient">
                  Extra Large
                </Button>
              </div>
              <div className="flex flex-wrap gap-3">
                <MagneticButton variant="default">Magnetic Default</MagneticButton>
                <MagneticButton variant="gradient" strength={0.4}>
                  Magnetic Gradient
                </MagneticButton>
              </div>
            </CardContent>
          </Card>
        </ScrollReveal>

        {/* Inputs */}
        <ScrollReveal delay={0.05}>
          <Card>
            <CardHeader>
              <CardTitle>Form fields</CardTitle>
              <CardDescription>Text, email, textarea, with labels</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@getx.gg" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" placeholder="trainer_red" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" placeholder="Tell other trainers about yourself..." rows={4} />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button variant="ghost">Cancel</Button>
              <Button variant="default">Save changes</Button>
            </CardFooter>
          </Card>
        </ScrollReveal>

        {/* Badges */}
        <ScrollReveal delay={0.1}>
          <Card>
            <CardHeader>
              <CardTitle>Badges</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Badge>Default</Badge>
              <Badge variant="accent">Accent</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="success">Verified</Badge>
              <Badge variant="destructive">Banned</Badge>
              <Badge variant="outline">Draft</Badge>
            </CardContent>
          </Card>
        </ScrollReveal>

        {/* Stagger cards */}
        <section className="space-y-4">
          <h2 className="font-display text-3xl font-semibold">Stagger reveal</h2>
          <motion.div
            className="grid gap-4 md:grid-cols-3"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-50px' }}
          >
            {[1, 2, 3].map((i) => (
              <motion.div key={i} variants={fadeUp}>
                <Card>
                  <CardHeader>
                    <CardTitle>Card {i}</CardTitle>
                    <CardDescription>Hover for the lift</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Each card waits its turn — staggered by 80ms — then fades up with an
                    ease-out-expo curve.
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* Skeletons */}
        <ScrollReveal delay={0.15}>
          <Card>
            <CardHeader>
              <CardTitle>Skeleton loaders</CardTitle>
              <CardDescription>Shimmer, no spinners</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </ScrollReveal>

        {/* Typography */}
        <ScrollReveal delay={0.2}>
          <Card>
            <CardHeader>
              <CardTitle>Typography</CardTitle>
              <CardDescription>
                Cal Sans display · Plus Jakarta body · JetBrains mono
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="font-display text-5xl font-bold leading-tight">Get X.</p>
              <p className="font-display text-5xl font-bold leading-tight gradient-text">
                Get gaming.
              </p>
              <p className="text-base">
                Plus Jakarta Sans body text — clean, modern, and friendly to read at any size.
              </p>
              <p className="font-mono text-lg">$99.99 — JetBrains Mono for prices &amp; codes</p>
            </CardContent>
          </Card>
        </ScrollReveal>

        {/* Color palette */}
        <ScrollReveal delay={0.25}>
          <Card>
            <CardHeader>
              <CardTitle>Color palette</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3 md:grid-cols-6">
                {swatches.map((color) => (
                  <div key={color.name} className="space-y-2">
                    <div className={`${color.class} h-20 w-full rounded-lg shadow-sm`} />
                    <p className="text-center text-sm font-medium">{color.name}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </ScrollReveal>

        {/* Glass card demo */}
        <ScrollReveal delay={0.3}>
          <div className="glass relative overflow-hidden rounded-2xl p-8">
            <h3 className="font-display text-2xl font-semibold">Glass morphism</h3>
            <p className="mt-2 text-muted-foreground">
              Backdrop blur + translucent fill. Sits on the gradient mesh underneath.
            </p>
          </div>
        </ScrollReveal>

        <footer className="pt-8 text-center text-sm text-muted-foreground">
          GETX design system · Prompt 2 of 16
        </footer>
      </div>
    </div>
  );
}
