import { Link } from "wouter";

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background">
      <div className="flex items-center justify-between h-16 px-5 lg:px-8">
        <Link href="/" className="font-display text-xl lg:text-2xl hover:text-accent transition-colors">
          CHEMSAFE · WATER MONITOR
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm uppercase">
          <Link href="/about" className="hover:text-accent transition-colors">How it works</Link>
          <Link href="/about" className="hover:text-accent transition-colors">Methodology</Link>
          <Link href="/about" className="hover:text-accent transition-colors">Scope</Link>
        </div>
      </div>
    </nav>
  );
}
