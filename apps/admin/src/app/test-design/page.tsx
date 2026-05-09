'use client';

import {
  motion,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Input,
  Label,
  Badge,
  Skeleton,
  ScrollReveal,
  ThemeToggle,
  staggerContainer,
  fadeUp,
} from '@getx/ui';

export default function TestDesignPage() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto space-y-12 px-4 py-16">
        <header className="flex items-start justify-between gap-4">
          <div>
            <Badge variant="destructive" className="mb-3">
              Admin · Internal
            </Badge>
            <h1 className="font-display text-5xl font-bold tracking-tight">
              GETX <span className="gradient-text">Admin</span>
            </h1>
            <p className="mt-2 text-muted-foreground">admin.getx.gg · Design test</p>
          </div>
          <ThemeToggle />
        </header>

        <ScrollReveal>
          <Card>
            <CardHeader>
              <CardTitle>Quick actions</CardTitle>
              <CardDescription>Operational primitives</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button variant="default">Approve</Button>
              <Button variant="accent">Mark verified</Button>
              <Button variant="outline">Send notice</Button>
              <Button variant="destructive">Suspend account</Button>
            </CardContent>
          </Card>
        </ScrollReveal>

        <ScrollReveal delay={0.05}>
          <Card>
            <CardHeader>
              <CardTitle>Search users</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label htmlFor="q">Email or order number</Label>
              <Input id="q" placeholder="user@example.com or GTX-2026-00042" />
            </CardContent>
          </Card>
        </ScrollReveal>

        <section className="space-y-4">
          <h2 className="font-display text-2xl font-semibold">Today&apos;s metrics</h2>
          <motion.div
            className="grid gap-4 md:grid-cols-4"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-50px' }}
          >
            {[
              { label: 'Orders', value: '142' },
              { label: 'GMV', value: '$8,420' },
              { label: 'Disputes', value: '3' },
              { label: 'Pending KYC', value: '17' },
            ].map((stat) => (
              <motion.div key={stat.label} variants={fadeUp}>
                <Card>
                  <CardHeader>
                    <CardDescription>{stat.label}</CardDescription>
                    <CardTitle className="font-mono text-3xl">{stat.value}</CardTitle>
                  </CardHeader>
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
          Admin theme · Prompt 2 of 16
        </footer>
      </div>
    </div>
  );
}
