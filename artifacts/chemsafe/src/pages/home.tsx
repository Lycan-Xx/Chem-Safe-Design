import { Navbar } from "@/components/layout/Navbar";
import { Link } from "wouter";

export default function Home() {
  return (
    <div className="min-h-[100dvh] flex flex-col pt-16">
      <Navbar />
      
      <main className="flex-1 flex flex-col">
        <section className="relative flex-1 flex flex-col justify-between border-b min-h-[calc(100vh-64px)]">
          <div className="absolute inset-0 z-0">
            <img 
              src="/hero-bg.png" 
              alt="Industrial pipe infrastructure" 
              className="w-full h-full object-cover opacity-40 grayscale"
            />
          </div>
          
          <div className="relative z-10 p-5 lg:p-8 flex-1 flex flex-col justify-center">
            <h1 className="text-6xl md:text-8xl lg:text-[10rem] leading-none mb-12 max-w-5xl mix-blend-difference">
              WATER TURNS TOXIC <span className="font-serif text-accent lowercase">silently</span>
            </h1>
          </div>

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 border-t">
            <Link 
              href="/interview" 
              className="group p-8 lg:p-12 border-b md:border-b-0 md:border-r hover:bg-foreground hover:text-background transition-colors flex flex-col justify-between min-h-[200px]"
            >
              <h2 className="text-3xl md:text-4xl">GUIDE ME THROUGH IT</h2>
              <span className="text-sm mt-8 opacity-70 group-hover:opacity-100">AI ASSISTANT / PHOTO UPLOAD →</span>
            </Link>
            <Link 
              href="/assess" 
              className="group p-8 lg:p-12 hover:bg-accent hover:text-background transition-colors flex flex-col justify-between min-h-[200px]"
            >
              <h2 className="text-3xl md:text-4xl">I KNOW MY SPECS</h2>
              <span className="text-sm mt-8 opacity-70 group-hover:opacity-100">EXPERT FORM / 90 SECONDS →</span>
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 border-b">
          <div className="p-8 border-b md:border-b-0 md:border-r">
            <h3 className="text-2xl mb-4">1. DESCRIBE</h3>
            <p className="text-sm opacity-80 leading-relaxed">Tell us about your infrastructure. Use plain language or upload photos of your pipes and fittings.</p>
          </div>
          <div className="p-8 border-b md:border-b-0 md:border-r">
            <h3 className="text-2xl mb-4">2. MODEL</h3>
            <p className="text-sm opacity-80 leading-relaxed">Our agent maps your inputs to WHO SDG 3.9 deterioration curves for polymer leaching.</p>
          </div>
          <div className="p-8">
            <h3 className="text-2xl mb-4">3. GET RESULT</h3>
            <p className="text-sm opacity-80 leading-relaxed">Receive an actionable risk score and timeline for potential contamination thresholds.</p>
          </div>
        </section>

        <section className="bg-accent text-background p-8 border-b">
          <div className="max-w-4xl">
            <h4 className="text-xl mb-2">SCOPE DISCLAIMER</h4>
            <p className="text-sm font-bold">This is a predictive model, not a diagnostic test. It identifies risk probability based on material science deterioration curves. It does not replace physical water testing for VOCs or heavy metals.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
