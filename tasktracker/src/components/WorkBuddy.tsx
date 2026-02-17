import { useState, useEffect, useRef } from "react";
import { getDatabase } from "../db";

interface Message {
  id: number;
  role: "user" | "assistant";
  text: string;
  timestamp: Date;
}

export default function WorkBuddy() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "assistant",
      text: "Hey! Ask me about your tasks - what's blocked, what's in progress, how many PRs raised, etc.",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  async function fetchAllTasks() {
    const db = await getDatabase();
    const tasks = await db.select<any[]>(
      `SELECT t.*, p.name as project_name 
       FROM tasks t
       JOIN projects p ON t.project_id = p.id
       ORDER BY t.updated_at DESC`
    );
    return tasks;
  }

  function buildContext(tasks: any[]) {
    if (tasks.length === 0) return "No tasks found.";

    const byProject: Record<string, any[]> = {};
    tasks.forEach(t => {
      if (!byProject[t.project_name]) byProject[t.project_name] = [];
      byProject[t.project_name].push(t);
    });

    let context = `TOTAL TASKS: ${tasks.length}\n\n`;

    Object.entries(byProject).forEach(([project, projectTasks]) => {
      context += `PROJECT: "${project}" (${projectTasks.length} tasks)\n`;
      projectTasks.forEach(t => {
        context += `  - "${t.title}" | Status: ${t.status} | Priority: ${t.priority}`;
        if (t.blocker) context += ` | Blocker: ${t.blocker}`;
        if (t.description) context += ` | Description: ${t.description}`;
        if (t.start_date) context += ` | Started: ${t.start_date.split('T')[0]}`;
        if (t.end_date) context += ` | Completed: ${t.end_date.split('T')[0]}`;
        context += `\n`;
      });
      context += `\n`;
    });

    return context;
  }

  async function askOllama(question: string, context: string, history: Message[]) {
    const historyText = history
      .slice(-6)
      .map(m => `${m.role === "user" ? "User" : "WorkBuddy"}: ${m.text}`)
      .join("\n");

    const prompt = `You are WorkBuddy, an assistant inside a developer's task tracker app.

STATUS WORKFLOW (in order):
Not Started → Started → Code Changed → Local Tested → Beta Testing → PR Raised → Prod Deployed

TERMINOLOGY:
- "PR Raised" = Pull Request raised for code review
- "Prod Deployed" = task completed and live in production
- "PR" or "pull request" = PR Raised status
- "done" or "completed" = Prod Deployed status
- "in progress" = Started or Code Changed status
- "blocked" = task has a Blocker value set
- "testing" = Local Tested or Beta Testing status

TASK DATA (use ONLY this, do not guess):
${context}

CONVERSATION HISTORY:
${historyText}

RULES:
- Answer ONLY using the task data above. Never guess or assume.
- Be short and direct. No fluff.
- If asked to list tasks, keep it brief - just title and status.
- No bullet points for simple count questions.
- No "Would you like to know more?" or similar filler endings.
- Remember previous messages in conversation history.
- If user asks something not related to tasks or work (e.g. jokes, general chat, personal questions), 
  respond with something like: "I'm here to help with your tasks. Try asking about blockers, status, or progress."

User: ${question}
WorkBuddy:`;

    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3.2:3b",
        prompt: prompt,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error("Failed to connect to Ollama");
    }

    const data = await response.json();
    return data.response;
  }

  async function handleSend() {
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput("");

    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      text: userText,
      timestamp: new Date(),
    };

    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);
    setIsLoading(true);

    try {
      const tasks = await fetchAllTasks();
      const context = buildContext(tasks);
      const answer = await askOllama(userText, context, currentMessages);

      const aiMessage: Message = {
        id: Date.now() + 1,
        role: "assistant",
        text: answer,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      const errorMessage: Message = {
        id: Date.now() + 1,
        role: "assistant",
        text: "⚠️ Can't connect to Ollama. Make sure it's running on your computer.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyPress(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function formatTime(date: Date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="workbuddy">
      {/* Header */}
      <div className="workbuddy-header">
        <div className="workbuddy-title">
          <span className="workbuddy-icon">🤖</span>
          <span>WorkBuddy</span>
        </div>
        <span className={`workbuddy-status ${isLoading ? 'status-thinking' : 'status-ready'}`}>
          {isLoading ? "Thinking..." : "Ready"}
        </span>
      </div>

      {/* Messages */}
      <div className="workbuddy-messages">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.role === "user" ? "message-user" : "message-assistant"}`}
          >
            <div className="message-bubble">
              {message.text}
            </div>
            <div className="message-time">
              {formatTime(message.timestamp)}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="message message-assistant">
            <div className="message-bubble message-loading">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="workbuddy-input-area">
        <textarea
          className="workbuddy-input"
          placeholder="Ask about your tasks..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          rows={2}
          disabled={isLoading}
        />
        <button
          className="workbuddy-send-btn"
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
        >
          {isLoading ? "Thinking..." : "Send"}
        </button>
      </div>
    </div>
  );
}