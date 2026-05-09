const trustItems = [
  {
    title: 'TradeShield Protection',
    description: 'Every transaction protected. 3-day buyer verification window.',
  },
  {
    title: 'KYC Verified Sellers',
    description: 'All active sellers verified through Sumsub identity checks.',
  },
  {
    title: 'Secure Escrow',
    description: 'Money held safely until delivery confirmed. Bank-grade security.',
  },
  {
    title: 'Multiple Payment Options',
    description: 'Card, UPI, PayPal, and crypto. Pay how you want.',
  },
  {
    title: 'Global Reach',
    description: 'Buyers and sellers from 50+ countries. 24/7 support.',
  },
  {
    title: 'Fast Resolution',
    description: 'Disputes resolved within 24 hours by our expert team.',
  },
];

export function TrustSignals() {
  return (
    <section className="py-20 border-b bg-muted/30">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">
            Why thousands trust GETX
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            We&apos;ve built the safest gaming marketplace from the ground up.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {trustItems.map((item) => (
            <div key={item.title} className="flex gap-4 p-6 rounded-lg border bg-surface">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="font-display text-sm font-semibold text-primary">
                  {item.title.slice(0, 1)}
                </span>
              </div>
              <div>
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
