import type { Message } from "@/types/agent";

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isAgent = message.role === "agent";

  return (
    <div className={`flex ${isAgent ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[85%] md:max-w-[70%] p-4 border ${
          isAgent
            ? "bg-transparent border-border text-foreground"
            : "bg-accent text-background border-accent"
        }`}
      >
        {isAgent && (
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-mono">
            ChemSafe
          </div>
        )}
        <div className="font-sans text-sm leading-relaxed whitespace-pre-wrap">
          {renderContent(message.content)}
        </div>
        <div className="text-[10px] text-muted-foreground mt-2 font-mono">
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
    </div>
  );
}

function renderContent(content: string): React.ReactNode {
  const parts = content.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}
