import Link from 'next/link';

export function LandingFooter() {
  return (
    <footer className="bg-surface border-t">
      <div className="container py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <div className="font-display text-2xl font-bold text-primary mb-2">GETX</div>
            <p className="text-sm text-muted-foreground mb-4">Get X. Get gaming.</p>
            <p className="text-xs text-muted-foreground">The premium gaming marketplace.</p>
          </div>

          <div>
            <h3 className="font-semibold mb-3 text-sm">Marketplace</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/games" className="hover:text-foreground">
                  All Games
                </Link>
              </li>
              <li>
                <Link href="/games/pokemon-go" className="hover:text-foreground">
                  Pokemon GO
                </Link>
              </li>
              <li>
                <Link href="/games/pokemon-go/boosting" className="hover:text-foreground">
                  Boosting
                </Link>
              </li>
              <li>
                <Link href="/requests/new" className="hover:text-foreground">
                  Custom Requests
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3 text-sm">Company</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/about" className="hover:text-foreground">
                  About
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="hover:text-foreground">
                  How it Works
                </Link>
              </li>
              <li>
                <Link href="/trust" className="hover:text-foreground">
                  Trust &amp; Safety
                </Link>
              </li>
              <li>
                <Link href="/careers" className="hover:text-foreground">
                  Careers
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3 text-sm">Legal</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/terms" className="hover:text-foreground">
                  Terms
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-foreground">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/refund" className="hover:text-foreground">
                  Refunds
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-foreground">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© 2026 Deccanport Technologies Pvt Ltd. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a
              href="https://twitter.com/getx_gg"
              className="hover:text-foreground"
              rel="noopener noreferrer"
              target="_blank"
            >
              Twitter
            </a>
            <a
              href="https://discord.gg/getx"
              className="hover:text-foreground"
              rel="noopener noreferrer"
              target="_blank"
            >
              Discord
            </a>
            <a
              href="https://instagram.com/getx.gg"
              className="hover:text-foreground"
              rel="noopener noreferrer"
              target="_blank"
            >
              Instagram
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
