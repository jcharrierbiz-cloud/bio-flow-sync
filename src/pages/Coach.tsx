import UnlocksCard from "@/components/UnlocksCard";
import { useState, useRef, useEffect } from "react";
import { Bot, Sparkles, Send, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAgendaStore, type Task } from "@/lib/agendaStore";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/coach-chat`;

const Coach = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { tasks, setTasks, setOptimized } = useAgendaStore();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const parseAgendaFromResponse = (content: string) => {
    const match = content.match(/```json_agenda\s*([\s\S]*?)```/);
    if (match) {
      try {
        const parsed = JSON.parse(match[1]) as Task[];
        const newTasks = parsed.map((t, i) => ({ ...t, id: i + 1 }));
        setTasks(newTasks);
        setOptimized(true);
        toast.success("Agenda mis à jour par le Coach !");
      } catch (e) {
        console.error("Failed to parse agenda JSON", e);
      }
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Msg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";
    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          agenda: tasks,
        }),
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({}));
        toast.error(err.error || "Erreur de connexion au Coach IA");
        setIsLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      const upsert = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
          }
          return [...prev, { role: "assistant", content: assistantSoFar }];
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, nl);
          textBuffer = textBuffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsert(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      parseAgendaFromResponse(assistantSoFar);
    } catch (e) {
      console.error(e);
      toast.error("Erreur de connexion");
    }
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-screen max-w-lg mx-auto bg-background">
      {/* Header */}
      <div className="px-5 pt-12 pb-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-10 h-10 rounded-full bg-ai-violet/20 flex items-center justify-center">
          <Bot className="w-5 h-5 text-ai-violet" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground text-sm">Coach Bio-Flow</h3>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-ai-violet" /> IA active
          </span>
        </div>
      </div>

      {/* Chat messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 space-y-3 pb-4">
        {messages.length === 0 && (
          <div className="text-center py-12 space-y-3">
            <div className="w-16 h-16 rounded-full bg-ai-violet/10 flex items-center justify-center mx-auto">
              <Bot className="w-8 h-8 text-ai-violet" />
            </div>
            <p className="text-sm text-muted-foreground">
              Dis-moi comment optimiser ta journée.<br />
              Je peux réorganiser ton agenda en temps réel.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {["Réorganise mon après-midi", "Je suis fatigué", "Ajoute une pause à 15h"].map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-xs px-3 py-1.5 rounded-full bg-ai-violet/10 text-ai-violet border border-ai-violet/15 hover:bg-ai-violet/20 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-ai-violet/20 text-foreground rounded-br-md"
                  : "glass-card text-secondary-foreground rounded-bl-md"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-invert prose-sm max-w-none [&_p]:my-1">
                  <ReactMarkdown>{msg.content.replace(/```json_agenda[\s\S]*?```/g, "✅ *Agenda mis à jour !*")}</ReactMarkdown>
                </div>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start">
            <div className="glass-card rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-ai-violet animate-pulse" />
                <span className="w-2 h-2 rounded-full bg-ai-violet animate-pulse [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-ai-violet animate-pulse [animation-delay:0.4s]" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-5 pb-24 pt-2">
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
          className="flex items-center gap-2 glass-card px-4 py-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Parle à ton Coach..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="w-9 h-9 rounded-xl bg-ai-violet/20 flex items-center justify-center text-ai-violet hover:bg-ai-violet/30 transition-colors disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Coach;
