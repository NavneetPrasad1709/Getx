import { Button } from '@getx/ui';

const benefits = [
  'Earn from your gaming skills',
  'Reach buyers in 50+ countries',
  'Get paid securely via escrow',
  'Powerful seller dashboard',
  'Instant USD payments',
  'No upfront costs - just commission',
];

export function ForSellers() {
  const sellerUrl = process.env.NEXT_PUBLIC_SELLER_URL || 'http://localhost:3001';

  return (
    <section className="py-20 border-b bg-muted/30">
      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          <div>
            <span className="text-sm font-semibold text-accent">FOR SELLERS</span>
            <h2 className="font-display text-3xl md:text-5xl font-bold mt-2 mb-4">
              Turn your gaming passion into income
            </h2>
            <p className="text-muted-foreground mb-6">
              Join hundreds of sellers earning consistent income on GETX. Whether you&apos;re a
              Pokemon GO expert or have spare game accounts, start earning today.
            </p>

            <ul className="space-y-3 mb-8">
              {benefits.map((b) => (
                <li key={b} className="flex items-center gap-3">
                  <span
                    className="h-5 w-5 rounded-full bg-success/20 text-success text-xs flex items-center justify-center font-bold"
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            <a href={sellerUrl}>
              <Button size="lg">Become a Seller →</Button>
            </a>
          </div>

          <div className="relative">
            <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 p-8 flex items-center justify-center">
              <div className="text-center">
                <div className="font-display text-5xl md:text-6xl font-bold mb-3">$15,000+</div>
                <div className="text-muted-foreground">Average top seller monthly earnings</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
