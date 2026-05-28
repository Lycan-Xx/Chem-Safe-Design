import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { useGetAssessment, getGetAssessmentQueryKey } from "@workspace/api-client-react";
import { Navbar } from "@/components/layout/Navbar";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine, ResponsiveContainer } from "recharts";
import { Copy, Download, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Results() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { data: assessment, isLoading } = useGetAssessment(id!, {
    query: {
      enabled: !!id,
      queryKey: getGetAssessmentQueryKey(id!),
    }
  });

  const [expanded, setExpanded] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    // Force light mode for this page
    document.documentElement.classList.remove('dark');
    return () => document.documentElement.classList.add('dark');
  }, []);

  useEffect(() => {
    if (!assessment) return;
    let current = 0;
    const target = Math.round(assessment.risk_score);
    const interval = setInterval(() => {
      current += Math.max(1, Math.floor(target / 20));
      if (current >= target) {
        setScore(target);
        clearInterval(interval);
      } else {
        setScore(current);
      }
    }, 30);
    return () => clearInterval(interval);
  }, [assessment]);

  if (isLoading || !assessment) {
    return (
      <div className="min-h-screen bg-[#f5f2ec] text-[#0f0f0e] flex items-center justify-center">
        <div className="text-2xl font-display uppercase animate-pulse">Calculating Model...</div>
      </div>
    );
  }

  const isLow = assessment.risk_score <= 30;
  const isMod = assessment.risk_score > 30 && assessment.risk_score <= 60;
  const colorHex = isLow ? "#2ecc71" : isMod ? "#f1c40f" : "#e74c3c";
  
  // Generate chart data
  const chartData = Array.from({ length: 10 }).map((_, i) => {
    const month = Math.floor((assessment.months_to_threshold * 1.5 / 9) * i);
    // Exponential curve approaching 100
    const val = Math.min(100, Math.pow(i/9, 2) * 100 * (assessment.risk_score/50));
    return { month, leachate: val };
  });

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Link copied to clipboard", duration: 2000 });
  };

  const printPdf = () => {
    window.print();
  };

  return (
    <div className="min-h-[100dvh] pt-16 flex flex-col bg-[#f5f2ec] text-[#0f0f0e]">
      <div className="print:hidden">
        <Navbar />
      </div>
      
      <main className="flex-1 max-w-4xl mx-auto w-full border-x border-[#0f0f0e]/20 print:border-none">
        
        {/* HERO */}
        <section className="p-8 lg:p-12 border-b border-[#0f0f0e]/20 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="text-sm font-bold uppercase tracking-widest mb-4 opacity-50">CHEMSAFE RISK ASSESSMENT</div>
          
          <h1 
            className="text-[120px] md:text-[180px] leading-none font-display font-black"
            style={{ color: colorHex }}
          >
            {score}
          </h1>
          
          <div className="mt-4">
            <h2 className="text-3xl md:text-5xl font-display uppercase tracking-tight" style={{ color: colorHex }}>
              {assessment.risk_band.replace('_', ' ')} RISK
            </h2>
            <p className="mt-4 text-xl font-serif max-w-2xl mx-auto leading-relaxed">
              Based on the provided parameters, this infrastructure is {isLow ? 'unlikely' : isMod ? 'potentially' : 'highly likely'} to be compromising the water supply above safe thresholds.
            </p>
          </div>

          {assessment.source === 'interview' && (assessment.avg_confidence || 1) < 0.85 && (
            <div className="mt-6 inline-block border border-[#f1c40f] text-[#b9960c] px-4 py-2 text-sm font-bold uppercase">
              NOTE: Score range {assessment.score_min?.toFixed(0)}–{assessment.score_max?.toFixed(0)}. Some values were estimated by AI.
            </div>
          )}
        </section>

        {/* ACTION CARD */}
        <section className="p-8 lg:p-12 border-b border-[#0f0f0e]/20 bg-black/5">
          <h3 className="text-xl font-bold uppercase mb-4">RECOMMENDED ACTION</h3>
          <p className="text-lg leading-relaxed border-l-4 pl-4" style={{ borderColor: colorHex }}>
            {assessment.action_recommendation}
          </p>
        </section>

        {/* CHART */}
        <section className="p-8 lg:p-12 border-b border-[#0f0f0e]/20">
          <h3 className="text-xl font-bold uppercase mb-8">DETERIORATION TRAJECTORY</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#0f0f0e" opacity={0.1} vertical={false} />
                <XAxis dataKey="month" stroke="#0f0f0e" opacity={0.5} tick={{fontFamily: 'Space Mono', fontSize: 12}} />
                <YAxis stroke="#0f0f0e" opacity={0.5} tick={{fontFamily: 'Space Mono', fontSize: 12}} />
                <ReferenceLine y={60} stroke="#e74c3c" strokeDasharray="3 3" label={{ position: 'top', value: 'WHO THRESHOLD', fill: '#e74c3c', fontSize: 10, fontFamily: 'Space Mono' }} />
                <Line type="monotone" dataKey="leachate" stroke={colorHex} strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-sm mt-4 opacity-70">Projected leachate accumulation over time (months). Horizontal line represents the maximum safe threshold.</p>
        </section>

        {/* PARAMS TABLE */}
        <section className="border-b border-[#0f0f0e]/20">
          <button 
            onClick={() => setExpanded(!expanded)} 
            className="w-full p-8 lg:p-12 flex justify-between items-center hover:bg-black/5 transition-colors print:hidden"
          >
            <h3 className="text-xl font-bold uppercase">PARAMETER BREAKDOWN</h3>
            {expanded ? <ChevronUp /> : <ChevronDown />}
          </button>
          
          <h3 className="text-xl font-bold uppercase p-8 hidden print:block">PARAMETER BREAKDOWN</h3>

          {(expanded || true) && (
            <div className={`border-t border-[#0f0f0e]/20 print:block ${expanded ? 'block' : 'hidden print:block'}`}>
              <div className="divide-y divide-[#0f0f0e]/10">
                {[
                  { label: "Material", val: assessment.pipe_material, key: "pipe_material" },
                  { label: "Gum Type", val: assessment.gum_type, key: "gum_type" },
                  { label: "Age (Years)", val: assessment.installation_age_years, key: "installation_age_years" },
                  { label: "Diameter (mm)", val: assessment.pipe_diameter_mm || 'Unknown', key: "pipe_diameter_mm" },
                  { label: "Temp (°C)", val: assessment.avg_temp_celsius, key: "avg_temp_celsius" },
                  { label: "UV Hours", val: assessment.daily_uv_hours, key: "daily_uv_hours" },
                  { label: "Flow Rate", val: assessment.water_flow_rate, key: "water_flow_rate" },
                  { label: "Context", val: assessment.use_context, key: "use_context" },
                ].map((row, i) => {
                  const conf = assessment.confidence_scores?.[row.key];
                  const isEstimated = conf !== undefined && conf < 0.9;
                  return (
                    <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 px-8 hover:bg-black/5 transition-colors">
                      <span className="font-bold uppercase opacity-60 w-1/3">{row.label}</span>
                      <span className="text-lg uppercase flex-1">{row.val}</span>
                      <div className="mt-2 sm:mt-0 sm:w-1/4 flex justify-end">
                        {assessment.source === 'interview' ? (
                          <span className={`text-xs px-2 py-1 font-bold uppercase border ${isEstimated ? 'border-[#f1c40f] text-[#b9960c]' : 'border-[#1a4fc8] text-[#1a4fc8]'}`}>
                            {isEstimated ? 'Estimated' : 'Confirmed'}
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-1 font-bold uppercase border border-[#0f0f0e] text-[#0f0f0e]">Provided</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* DISCLAIMER */}
        <section className="p-8 lg:p-12 text-sm opacity-70 leading-relaxed font-bold">
          This is a predictive model, not a diagnostic test. It does not replace physical water testing. Generated by ChemSafe on {new Date(assessment.created_at).toLocaleDateString()}.
        </section>
      </main>

      {/* STICKY BOTTOM BAR */}
      <div className="sticky bottom-0 left-0 right-0 border-t border-[#0f0f0e]/20 bg-[#f5f2ec] print:hidden z-50">
        <div className="max-w-4xl mx-auto flex">
          <button onClick={copyLink} className="flex-1 flex items-center justify-center gap-2 p-4 border-r border-[#0f0f0e]/20 hover:bg-black/5 transition-colors uppercase text-sm font-bold">
            <Copy className="w-4 h-4" /> Copy Link
          </button>
          <button onClick={printPdf} className="flex-1 flex items-center justify-center gap-2 p-4 border-r border-[#0f0f0e]/20 hover:bg-black/5 transition-colors uppercase text-sm font-bold">
            <Download className="w-4 h-4" /> Download PDF
          </button>
          <button onClick={() => window.location.href = '/'} className="flex-1 flex items-center justify-center gap-2 p-4 hover:bg-black/5 transition-colors uppercase text-sm font-bold text-[#1a4fc8]">
            <RefreshCw className="w-4 h-4" /> New Assessment
          </button>
        </div>
      </div>
    </div>
  );
}