import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Send } from "lucide-react";

export const Route = createFileRoute("/rag")({
  component: RagPage,
});

const SUGGESTED_PROMPTS = [
  "Who are the top 5 goal scorers?",
  "Show me Messi's statistics",
  "Which team scored the most goals?",
  "Who has the best pass completion rate?",
  "Which match had the most shots?",
  "Show me players with most assists",
  "Which competitions are in the database?",
  "What was the highest scoring match?",
  "Show me teams in La Liga",
  "Who played the most matches?",
];

function RagPage() {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/rag/chat",
    }),
  });

  const [input, setInput] = useState("");

  const [textareaHeight, setTextareaHeight] = useState(56);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "56px";
      const scrollHeight = textareaRef.current.scrollHeight;
      const newHeight = Math.min(Math.max(scrollHeight, 56), 200);
      textareaRef.current.style.height = `${newHeight}px`;
      setTextareaHeight(newHeight);
    }
  }, [input]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-focus input when AI finishes responding
  useEffect(() => {
    if (status === "ready" && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [status]);

  const handleSuggestedPrompt = (prompt: string) => {
    sendMessage({ text: prompt });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && status === "ready") {
      sendMessage({ text: input });
      setInput("");
    }
  };

  const showSuggestions = messages.length === 0 && status === "ready";

  return (
    <div className="flex flex-col h-[calc(100vh-73px)] bg-background">
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto max-w-4xl px-4 py-8">
          {showSuggestions && (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
              <h1 className="text-3xl font-bold text-foreground mb-3">
                Ask about football statistics
              </h1>
              <p className="text-muted-foreground mb-8 text-center">
                Chat with AI to explore player stats, match data, and more
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                {SUGGESTED_PROMPTS.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestedPrompt(prompt)}
                    className="px-4 py-3 text-left text-sm bg-card hover:bg-accent border border-border rounded-lg transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.length > 0 && (
            <div className="space-y-4 mb-6">
              {messages.map((message) => {
                // Extract text from message parts
                const textContent = message.parts
                  .filter((part) => part.type === "text")
                  .map((part) => part.text)
                  .join("");

                // Don't render empty messages
                if (!textContent.trim()) {
                  return null;
                }

                return (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <Card
                      className={`max-w-[85%] md:max-w-[70%] px-4 py-3 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-card text-card-foreground"
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words text-sm">
                        {textContent}
                      </div>
                    </Card>
                  </div>
                );
              })}

              {status !== "ready" && (
                <div className="flex justify-start">
                  <Card className="max-w-[85%] md:max-w-[70%] px-4 py-3 bg-card">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Spinner className="w-4 h-4" />
                      <span className="text-sm">Analyzing data...</span>
                    </div>
                  </Card>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border bg-card">
        <div className="container mx-auto max-w-4xl px-4 py-4">
          <form onSubmit={handleSubmit} className="flex gap-3 items-start">
            <div className="flex-1">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (input.trim() && status === "ready") {
                      handleSubmit(e as any);
                    }
                  }
                }}
                placeholder="Ask about football statistics..."
                disabled={status !== "ready"}
                className="w-full px-4 py-3.5 bg-background border border-input rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base overflow-hidden leading-normal"
                rows={1}
                style={{ height: `${textareaHeight}px`, lineHeight: "1.5" }}
                id="rag-textarea"
              />
            </div>

            <Button
              type="submit"
              disabled={!input.trim() || status !== "ready"}
              size="icon"
              className="h-14 w-14 shrink-0"
            >
              {status !== "ready" ? (
                <Spinner className="w-5 h-5" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
