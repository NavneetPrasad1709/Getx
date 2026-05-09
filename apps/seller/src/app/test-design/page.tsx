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
  Input,
  Label,
  Badge,
  Skeleton,
  GradientMesh,
  ScrollReveal,
  ThemeToggle,
  staggerContainer,
  fadeUp,
} from '@getx/ui';

export default function TestDesignPage() {
  return (
    <div className="relative min-h-screen overflow-hidden noise-overlay">
      <GradientMesh variant="subtle" />

      <div className="container relative z-10 mx-auto space-y-12 px-4 py-16">
        <header className="flex items-start justify-between gap-4">
          <div>
            <Badge variant="success" className="mb-3">
              Seller
            </Badge>
            <h1 className="font-display text-5xl font-bold tracking-tight">
              GETX <span className="gradient-text">Seller</span>
            </h1>
            <p className="mt-2 text-muted-foreground">sell.getx.gg · Design test</p>
          </div>
          <ThemeToggle />
        </header>

        <ScrollReveal>
          <Card>
            <CardHeader>
              <CardTitle>Buttons</CardTitle>
              <CardDescription>All variants</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button>Default</Button>
              <Button variant="accent">Accent</Button>
              <Button variant="gradient">Gradient</Button>
              <Button variant="outline">Outline</Button>
              <MagneticButton variant="gradient">Magnetic</MagneticButton>
            </CardContent>
          </Card>
        </ScrollReveal>

        <ScrollReveal delay={0.05}>
          <Card>
            <CardHeader>
              <CardTitle>Listing form</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Listing title</Label>
                <Input id="title" placeholder="Shiny Rayquaza account" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price (USD)</Label>
                <Input id="price" type="number" placeholder="99.99" />
              </div>
            </CardContent>
          </Card>
        </ScrollReveal>

        <section className="space-y-4">
          <h2 className="font-display text-2xl font-semibold">Stagger reveal</h2>
          <motion.div
            className="grid gap-4 md:grid-cols-3"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-50px' }}
          >
            {[
              { status: 'Active', count: 12 },
              { status: 'Pending', count: 4 },
              { status: 'Sold', count: 38 },
            ].map(({ status, count }) => (
              <motion.div key={status} variants={fadeUp}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{status} listings</CardTitle>
                  </CardHeader>
                  <CardContent className="text-3xl font-mono">{count}</CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </section>

        <ScrollReveal delay={0.1}>
          <Card>
            <CardHeader>
              <CardTitle>Loading state</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        </ScrollReveal>

        <footer className="pt-8 text-center text-sm text-muted-foreground">
          Seller theme · Prompt 2 of 16
        </footer>
      </div>
    </div>
  );
}
