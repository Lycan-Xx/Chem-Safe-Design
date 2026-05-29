import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import MessageBubble from "./MessageBubble";
import ImageUploadFlow from "./ImageUploadFlow";
import type {
  Message,
  AgentTurnRequest,
  AgentTurnResponse,
  UserRegister,
} from "@/types/agent";
import type { PartialInfrastructureParams } from "@/types/infrastructure";
import type { RiskScoreResult } from "@/types/results";
import { Camera, Send, ChevronRight, AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";

interface ConversationalAgentProps {
  onComplete?: (result: RiskScoreResult) => void;
}

const TOTAL_PARAMS = 10;
const REQUIRED_PARAMS = 8;

export default function ConversationalAgent({
  onComplete,
}: ConversationalAgentProps) {
  const [, setLocation] = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [currentParams, setCurrentParams] = useState<PartialInfrastructureParams>({});
  const [confidenceScores, setConfidenceScores] = useState<Record<string, number>>({});
  const [turnCount, setTurnCount] = useState(0);
  const [register, setRegister] = useState<UserRegister>("undetected");
  const [networkError, setNetworkError] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [resultsSessionId, setResultsSessionId] = useState<string | null>(null);
  const [sessionId] = useState(() => crypto.randomUUID());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    sendTurn("", undefined, true);
  }, []);

  const addMessage = (role: Message["role"], content: string): Message => {
    const message: Message = {
      id: crypto.randomUUID(),
      role,
      content,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, message]);
    return message;
  };

  const sendTurn = useCallback(
    async (
      userMessage: string,
      imageData?: { base64: string; mimeType: "image/jpeg" | "image/png" | "image/webp" },
      isFirstTurn = false,
    ) => {
      if (!isFirstTurn && !userMessage.trim() && !imageData) return;

      setIsLoading(true);
      setQuickReplies([]);

      if (!isFirstTurn && userMessage) {
        addMessage("user", userMessage);
      }

      const history = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: (m.role === "agent" ? "assistant" : "user") as "user" | "assistant",
          content: m.content,
        }));

      const requestBody: AgentTurnRequest = {
        sessionId,
        userMessage,
        imageData,
        conversationHistory: history,
        currentParams,
        confidenceScores,
        turnCount,
        register,
      };

      try {
        const response = await fetch("/api/agent-turn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        const data: AgentTurnResponse = await response.json();

        addMessage("agent", data.agentMessage);

        // Build the up-to-date params/scores NOW (before setState is flushed)
        // so finalizeInterview always sees the full picture including this turn's extraction.
        const nextParams = data.extractedParam
          ? { ...currentParams, [data.extractedParam.parameter]: data.extractedParam.value }
          : { ...currentParams };
        const nextScores = data.extractedParam
          ? { ...confidenceScores, [data.extractedParam.parameter]: data.extractedParam.confidence }
          : { ...confidenceScores };

        if (data.extractedParam) {
          setCurrentParams(nextParams);
          setConfidenceScores(nextScores);
        }

        if (data.updatedRegister !== "undetected") {
          setRegister(data.updatedRegister);
        }

        setQuickReplies(data.isComplete ? [] : (data.quickReplies ?? []));
        setTurnCount((prev) => prev + 1);

        if (data.triggerImageUpload) {
          setShowImageUpload(true);
        }

        if (data.error) {
          setNetworkError(true);
          sessionStorage.setItem("chemsafe_params", JSON.stringify(nextParams));
          sessionStorage.setItem("chemsafe_confidence", JSON.stringify(nextScores));
        }

        if (data.isComplete) {
          await finalizeInterview(nextParams, nextScores);
        }
      } catch {
        setNetworkError(true);
        sessionStorage.setItem("chemsafe_params", JSON.stringify(currentParams));
        sessionStorage.setItem("chemsafe_confidence", JSON.stringify(confidenceScores));
        addMessage(
          "agent",
          "I've lost connection. Your progress has been saved — you can continue on the expert form.",
        );
      } finally {
        setIsLoading(false);
        setInputValue("");
        inputRef.current?.focus();
      }
    },
    [messages, currentParams, confidenceScores, turnCount, register, sessionId],
  );

  const finalizeInterview = async (
    params: PartialInfrastructureParams,
    scores: Record<string, number>,
  ) => {
    setIsCalculating(true);
    try {
      const response = await fetch("/api/calculate-risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          params,
          confidenceScores: scores,
          source: "interview",
        }),
      });

      if (!response.ok) throw new Error("Calculation failed");

      const result: RiskScoreResult = await response.json();

      sessionStorage.setItem("chemsafe_result", JSON.stringify(result));

      // Show an inline CTA rather than auto-redirecting — let the user decide when to proceed
      setResultsSessionId(result.sessionId);

      if (onComplete) {
        onComplete(result);
      }
    } catch {
      sessionStorage.setItem("chemsafe_params", JSON.stringify(params));
      sessionStorage.setItem("chemsafe_confidence", JSON.stringify(scores));
      addMessage(
        "agent",
        "I've collected your information but had trouble calculating the result. " +
          "Please continue on the expert form — your answers are saved.",
      );
      setNetworkError(true);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSubmit = () => {
    if (inputValue.trim()) {
      sendTurn(inputValue.trim());
    }
  };

  const handleQuickReply = (reply: string) => {
    sendTurn(reply);
  };

  const handleImageCapture = (
    base64: string,
    mimeType: "image/jpeg" | "image/png" | "image/webp",
  ) => {
    setShowImageUpload(false);
    sendTurn("", { base64, mimeType });
  };

  const collectedCount = Object.keys(currentParams).length;
  const progressPct = Math.min((collectedCount / TOTAL_PARAMS) * 100, 100);

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      {networkError && (
        <div
          className="bg-accent text-background p-4 flex justify-between items-center cursor-pointer shrink-0"
          onClick={() => setLocation("/assess")}
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-bold uppercase">
              Connection lost — your progress is saved. Continue on form →
            </span>
          </div>
          <ChevronRight className="w-5 h-5" />
        </div>
      )}

      {/* Progress bar */}
      <div className="h-1 bg-border/20 w-full shrink-0">
        <div
          className="h-full bg-accent transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <div className="px-4 py-2 border-b border-border flex items-center justify-between shrink-0">
        <span className="font-mono text-[10px] uppercase text-muted-foreground tracking-widest">
          {collectedCount} of {REQUIRED_PARAMS} parameters collected
        </span>
        {isCalculating && (
          <span className="font-mono text-[10px] uppercase text-accent animate-pulse tracking-widest">
            Calculating risk model...
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="p-4 flex gap-1">
              <span className="w-2 h-2 bg-foreground rounded-full animate-bounce" />
              <span
                className="w-2 h-2 bg-foreground rounded-full animate-bounce"
                style={{ animationDelay: "0.2s" }}
              />
              <span
                className="w-2 h-2 bg-foreground rounded-full animate-bounce"
                style={{ animationDelay: "0.4s" }}
              />
            </div>
          </div>
        )}

        {isCalculating && !resultsSessionId && (
          <div className="flex justify-start">
            <div className="border border-border p-4 max-w-sm">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground animate-pulse">
                Running risk model…
              </p>
            </div>
          </div>
        )}

        {resultsSessionId && (
          <div className="flex justify-start">
            <div className="border-2 border-accent p-5 max-w-sm space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-accent shrink-0" />
                <span className="font-mono text-xs uppercase tracking-widest text-accent font-bold">
                  Assessment complete
                </span>
              </div>
              <p className="font-sans text-sm text-foreground leading-relaxed">
                Your risk model is ready. You can view it now or stay here to
                add any extra details first.
              </p>
              <button
                onClick={() => setLocation(`/results/${resultsSessionId}`)}
                className="w-full flex items-center justify-between bg-accent text-background px-4 py-3 font-mono text-xs uppercase tracking-widest hover:opacity-90 transition-opacity"
              >
                <span>View my results</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick replies */}
      {quickReplies.length > 0 && !isLoading && (
        <div className="flex flex-wrap gap-2 px-4 pb-3 shrink-0">
          {quickReplies.map((reply) => (
            <button
              key={reply}
              onClick={() => handleQuickReply(reply)}
              className="px-4 py-2 border border-border text-xs uppercase tracking-widest hover:bg-foreground hover:text-background transition-colors font-mono"
            >
              {reply}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className="border-t border-border bg-background p-4 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="flex gap-2"
        >
          <button
            type="button"
            onClick={() => setShowImageUpload(true)}
            className="p-4 border border-border hover:bg-foreground hover:text-background transition-colors"
            aria-label="Upload photo"
          >
            <Camera className="w-5 h-5" />
          </button>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Describe your infrastructure..."
            className="flex-1 bg-transparent border border-border p-4 font-sans text-sm outline-none focus:ring-1 focus:ring-accent"
            disabled={isLoading || isCalculating}
          />
          <button
            type="submit"
            disabled={isLoading || isCalculating || !inputValue.trim()}
            className="p-4 border border-foreground bg-foreground text-background hover:bg-accent hover:border-accent transition-colors disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>

      {showImageUpload && (
        <ImageUploadFlow
          onCapture={handleImageCapture}
          onCancel={() => setShowImageUpload(false)}
        />
      )}
    </div>
  );
}
