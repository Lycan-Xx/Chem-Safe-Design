import { Link } from "wouter";
import { useState } from "react";

export function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background">
      <div className="flex items-center justify-between h-16 px-5 lg:px-8">
        <Link href="/" className="font-display text-xl lg:text-2xl hover:text-accent transition-colors">
          CHEMSAFE · WATER MONITOR
        </Link>
        {/* Mobile menu button */}
        <button
          className="md:hidden text-foreground hover:text-accent"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {/* Simple hamburger */}
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={open ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
          </svg>
        </button>
        {/* Links - visible on md+, or in dropdown on mobile when open */}
        <div className={`${open ? "block" : "hidden"} absolute top-16 left-0 w-full bg-background md:relative md:flex md:items-center md:gap-4 md:static md:w-auto md:bg-transparent`}> 
          <Link href="/about" className="block px-5 py-2 md:inline-block hover:text-accent transition-colors">
            About
          </Link>
        </div>
      </div>
    </nav>
  );
}
