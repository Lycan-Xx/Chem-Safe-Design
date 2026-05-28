import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { 
  useCreateAnthropicConversation, 
  useListAnthropicMessages, 
  useCreateAssessment,
  getListAnthropicMessagesQueryKey,
  AssessmentInput
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Send, Upload, ChevronRight, AlertCircle } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";

export default function Interview() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const createConversation = useCreateAnthropicConversation();
  const createAssessment = useCreateAssessment();

  const { data: messages = [] } = useListAnthropicMessages(conversationId!, {
    query: {
      enabled: !!conversationId,
      queryKey: getListAnthropicMessagesQueryKey(conversationId!),
    }
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamContent]);

  useEffect(() => {
    createConversation.mutate(
      { data: { title: "Assessment Interview" } },
      {
        onSuccess: (data) => {
          setConversationId(data.id);
        },
        onError: () => {
          setError("Failed to initialize conversation.");
        }
      }
    );
  }, []); // Run once on mount

  const handleSend = async (text: string = input) => {
    if (!text.trim() || !conversationId || isStreaming) return;

    const userMessage = text;
    setInput("");
    setError(null);
    
    // Optimistically update UI (this requires cache mutation, but we'll let the refetch handle it or just wait)
    // Actually, we should stream immediately.
    setIsStreaming(true);
    setStreamContent("");

    try {
      // Create message in backend and get stream
      const response = await fetch(`/api/anthropic/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: userMessage })
      });

      if (!response.ok) throw new Error("Failed to send message");
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "content_block_delta" && data.delta?.text) {
                accumulatedResponse += data.delta.text;
                setStreamContent(accumulatedResponse);
              }
            } catch (e) {
              // Ignore parse errors for partial chunks
            }
          }
        }
      }

      // Refresh messages list
      queryClient.invalidateQueries({ queryKey: getListAnthropicMessagesQueryKey(conversationId) });
      
      // Check for ASSESSMENT_READY
      if (accumulatedResponse.includes("ASSESSMENT_READY:")) {
        const match = accumulatedResponse.match(/ASSESSMENT_READY:\s*({.*})/s);
        if (match && match[1]) {
          try {
            const assessmentData: AssessmentInput = JSON.parse(match[1]);
            assessmentData.source = "interview";
            assessmentData.conversation_id = conversationId;
            
            createAssessment.mutate(
              { data: assessmentData },
              {
                onSuccess: (data) => {
                  setLocation(`/results/${data.id}`);
                },
                onError: () => {
                  setError("Failed to create assessment from data. Continue on form.");
                  sessionStorage.setItem("chemsafe_backup", JSON.stringify(assessmentData));
                }
              }
            );
          } catch (e) {
            console.error("Failed to parse assessment data", e);
          }
        }
      }
    } catch (err) {
      console.error(err);
      setError("Connection lost — your progress is saved. Continue on the form →");
    } finally {
      setIsStreaming(false);
      setStreamContent("");
    }
  };

  const quickReplies = [
    "I don't know",
    "It's PVC",
    "Underground",
    "About 10 years old",
    "Used for drinking water"
  ];

  return (
    <div className="h-[100dvh] flex flex-col pt-16 bg-background overflow-hidden">
      <Navbar />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Image Context (Desktop only) */}
        <div className="hidden lg:block w-1/3 border-r relative bg-black">
          <img 
            src="/interview-bg.png" 
            alt="Pipe infrastructure" 
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 p-8 flex flex-col justify-end">
            <h2 className="text-3xl text-white mix-blend-difference uppercase">AI Agent Active</h2>
            <p className="text-white/70 font-sans mt-2">Gathering specifications for risk model.</p>
          </div>
        </div>

        {/* Right Panel - Chat */}
        <div className="flex-1 flex flex-col relative">
          {error && (
            <div className="bg-accent text-background p-4 flex justify-between items-center cursor-pointer" onClick={() => setLocation('/assess')}>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm font-bold uppercase">{error}</span>
              </div>
              <ChevronRight className="w-5 h-5" />
            </div>
          )}

          {/* Progress Bar (Mock representation) */}
          <div className="h-1 bg-border/20 w-full">
            <div className="h-full bg-accent transition-all duration-500" style={{ width: `${Math.min((messages.length / 10) * 100, 100)}%` }} />
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] md:max-w-[70%] p-4 border ${msg.role === 'user' ? 'bg-accent text-background border-accent' : 'bg-transparent border-border text-foreground'}`}>
                  <p className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{msg.content.replace(/ASSESSMENT_READY:[\s\S]*/, '')}</p>
                </div>
              </div>
            ))}
            
            {/* Optimistic User Message */}
            {isStreaming && !streamContent && (
              <div className="flex justify-end">
                <div className="max-w-[85%] md:max-w-[70%] p-4 border bg-accent text-background border-accent">
                  <p className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{input}</p>
                </div>
              </div>
            )}

            {/* Streaming Message */}
            {isStreaming && streamContent && (
              <div className="flex justify-start">
                <div className="max-w-[85%] md:max-w-[70%] p-4 border bg-transparent border-border text-foreground">
                  <p className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{streamContent.replace(/ASSESSMENT_READY:[\s\S]*/, '')}</p>
                </div>
              </div>
            )}
            
            {isStreaming && !streamContent && (
              <div className="flex justify-start">
                <div className="p-4 flex gap-1">
                  <span className="w-2 h-2 bg-foreground rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                  <span className="w-2 h-2 bg-foreground rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t bg-background p-4">
            <div className="flex flex-wrap gap-2 mb-4">
              {quickReplies.map((reply, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(reply)}
                  className="pill-chip px-4 py-2 border border-border text-xs uppercase hover:bg-foreground hover:text-background transition-colors"
                >
                  {reply}
                </button>
              ))}
            </div>
            
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex gap-2"
            >
              <button type="button" className="p-4 border hover:bg-foreground hover:text-background transition-colors">
                <Upload className="w-5 h-5" />
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Describe your infrastructure..."
                className="flex-1 bg-transparent border p-4 font-sans text-sm outline-none focus:ring-1 focus:ring-accent"
                disabled={isStreaming}
              />
              <button 
                type="submit" 
                disabled={isStreaming || !input.trim()} 
                className="p-4 border bg-foreground text-background hover:bg-accent transition-colors disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}