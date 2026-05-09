import { Card, CardContent } from '@getx/ui';

const testimonials = [
  {
    name: 'Marcus T.',
    location: 'United States',
    text: 'Got a Lvl 50 account in 2 hours. Seller was super responsive. Worth every penny.',
    rating: 5,
    purchase: 'Pokemon GO Account',
  },
  {
    name: 'Priya S.',
    location: 'India',
    text: 'Earned ₹85,000 last month selling boosting services. GETX took care of everything else.',
    rating: 5,
    purchase: 'Top seller',
  },
  {
    name: 'Yuki M.',
    location: 'Japan',
    text: 'The custom request feature is genius. Got 5 offers in 10 minutes for my exact needs.',
    rating: 5,
    purchase: 'Custom Request',
  },
];

export function Testimonials() {
  return (
    <section className="py-20 border-b">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">
            Loved by gamers worldwide
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">Real reviews from real users.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {testimonials.map((t) => (
            <Card key={t.name}>
              <CardContent className="p-6">
                <div
                  className="flex gap-1 mb-3 text-warning"
                  aria-label={`${t.rating} out of 5 stars`}
                >
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <span key={i} aria-hidden="true">
                      ★
                    </span>
                  ))}
                </div>
                <p className="text-sm mb-4">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <div className="font-semibold">{t.name}</div>
                    <div className="text-muted-foreground text-xs">{t.location}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">{t.purchase}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
