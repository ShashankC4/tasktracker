import { useState } from "react";

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
      text: "Hi! I'm WorkBuddy 👋 I can help you find tasks, summarize your work, and answer questions about your projects. AI is coming soon!",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState("");

  function handleSend() {
    if (!input.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      text: input,
      timestamp: new Date(),
    };

    // Add placeholder AI response
    const aiMessage: Message = {
      id: Date.now() + 1,
      role: "assistant",
      text: "AI integration coming soon! I'll be able to answer questions about your tasks and work history.",
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage, aiMessage]);
    setInput("");
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
        <span className="workbuddy-status">AI Coming Soon</span>
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
        />
        <button
          className="workbuddy-send-btn"
          onClick={handleSend}
          disabled={!input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}