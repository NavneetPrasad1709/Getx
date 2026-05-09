import Link from 'next/link';
import { Button } from '@getx/ui';

export function FinalCTA() {
  return (
    <section className="py-20 border-b">
      <div className="container">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">Ready to level up?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join thousands of gamers buying and selling on the safest gaming marketplace.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/register">
              <Button size="lg" className="w-full sm:w-auto">
                Create Free Account
              </Button>
            </Link>
            <Link href="/games">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Browse Marketplace
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
