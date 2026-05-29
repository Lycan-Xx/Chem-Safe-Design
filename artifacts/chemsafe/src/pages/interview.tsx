import { Navbar } from "@/components/layout/Navbar";
import ConversationalAgent from "@/components/chat/ConversationalAgent";

export default function Interview() {
  return (
    <div className="h-[100dvh] flex flex-col pt-16 bg-background overflow-hidden">
      <Navbar />

      <div className="flex-1 flex overflow-hidden">
        {/* Left panel — desktop only */}
        <div className="hidden lg:block w-1/3 border-r border-border relative bg-black shrink-0">
          <img
            src="/interview-bg.png"
            alt="Pipe infrastructure"
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 p-8 flex flex-col justify-end">
            <p className="font-mono text-[10px] uppercase text-white/50 tracking-widest mb-3">
              AI Agent Active
            </p>
            <h2 className="text-3xl text-white font-display uppercase leading-none">
              Water Risk
              <br />
              Interview
            </h2>
            <p className="text-white/60 font-sans text-sm mt-3 leading-relaxed">
              Answer a few short questions about your pipe infrastructure. No
              technical knowledge needed.
            </p>
            <div className="mt-6 border-t border-white/20 pt-6">
              <p className="font-mono text-[10px] uppercase text-white/40 tracking-widest mb-2">
                Providers
              </p>
              <p className="font-mono text-[10px] text-white/30">
                DeepSeek → OpenAI → Anthropic → Gemini
              </p>
            </div>
          </div>
        </div>

        {/* Right panel — agent */}
        <ConversationalAgent />
      </div>
    </div>
  );
}
