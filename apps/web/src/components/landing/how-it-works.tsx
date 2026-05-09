import { Card, CardContent } from '@getx/ui';

const steps = [
  {
    number: '01',
    title: 'Choose your service',
    description:
      'Browse listings or post a custom request. Filter by game, price, and seller rating.',
    label: 'Discover',
  },
  {
    number: '02',
    title: 'Pay securely',
    description: 'Money held in GETX escrow. Sellers only get paid after you confirm delivery.',
    label: 'Protect',
  },
  {
    number: '03',
    title: 'Receive instantly',
    description:
      'Get your account, items, or service delivered. Auto-release after 3 days if no issues.',
    label: 'Deliver',
  },
];

export function HowItWorks() {
  return (
    <section className="py-20 border-b bg-muted/30">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">How GETX works</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Buy gaming services in 3 simple steps. Protected by TradeShield escrow.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {steps.map((step) => (
            <Card key={step.number}>
              <CardContent className="p-8">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary">{step.label}</span>
                  </div>
                  <span className="font-display text-3xl font-bold text-muted-foreground/30">
                    {step.number}
                  </span>
                </div>
                <h3 className="font-display text-xl font-bold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
