import { useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";

export default function About() {
  return (
    <div className="min-h-[100dvh] pt-16 flex flex-col">
      <Navbar />
      
      <main className="flex-1 border-x max-w-4xl mx-auto w-full">
        <header className="p-8 lg:p-12 border-b">
          <h1 className="text-5xl lg:text-7xl mb-4">METHODOLOGY</h1>
          <p className="text-xl opacity-80">How ChemSafe assesses risk</p>
        </header>

        <section className="p-8 lg:p-12 border-b">
          <h2 className="text-3xl mb-6">DATA SOURCES</h2>
          <div className="prose prose-invert max-w-none">
            <p>ChemSafe bases its deterioration models on parameters established under the UN Sustainable Development Goal (SDG) 3.9 framework, which addresses mortality and morbidity from hazardous chemicals and air, water, and soil pollution.</p>
            <p>Polymer degradation rates (specifically for unplasticized polyvinyl chloride - UPVC) are cross-referenced with regional climate data including average UV exposure and temperature fluctuations.</p>
          </div>
        </section>

        <section className="p-8 lg:p-12 border-b">
          <h2 className="text-3xl mb-6">CALCULATING THE SCORE</h2>
          <div className="prose prose-invert max-w-none">
            <p>The ChemSafe risk score (0-100) is a composite index derived from two primary functions:</p>
            <ul className="list-disc pl-5 my-4 space-y-2">
              <li><strong>Thermal Degradation Index (TDI):</strong> Calculates the rate of plasticizer leaching based on ambient temperature and fluid contact time.</li>
              <li><strong>UV Degradation Index (UDI):</strong> Applied exclusively to exposed infrastructure, measuring the embrittlement and subsequent microplastic shedding caused by solar radiation.</li>
            </ul>
            <p>A score above 60 indicates that the infrastructure is likely actively compromising the water supply above WHO recommended safety thresholds.</p>
          </div>
        </section>

        <section className="p-8 lg:p-12 border-b">
          <h2 className="text-3xl mb-6">LIMITATIONS</h2>
          <div className="bg-foreground text-background p-6">
            <p className="font-bold mb-2">What this tool cannot do:</p>
            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li>It cannot detect actual chemical presence in a water sample.</li>
              <li>It cannot account for acute physical damage to pipes (e.g., machinery strikes).</li>
              <li>It is not a substitute for laboratory testing.</li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}