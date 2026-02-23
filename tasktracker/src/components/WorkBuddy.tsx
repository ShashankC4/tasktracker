import { useState, useEffect, useRef } from "react";
import { getDatabase } from "../db";

interface Message {
  id: number;
  role: "user" | "assistant";
  text: string;
  timestamp: Date;
}

interface WorkBuddyProps {
  onClose: () => void;
}

type AIProvider = "openrouter" | "ollama";

export default function WorkBuddy({ onClose }: WorkBuddyProps) {
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
  const [showSettings, setShowSettings] = useState(false);
  
  // Settings
  const [aiProvider, setAiProvider] = useState<AIProvider>(
    (localStorage.getItem("aiProvider") as AIProvider) || "ollama"
  );
  const [openrouterApiKey, setOpenrouterApiKey] = useState(
    localStorage.getItem("openrouterApiKey") || ""
  );
  const [openrouterModel, setOpenrouterModel] = useState(
    localStorage.getItem("openrouterModel") || "arcee-ai/trinity-large-preview:free"
  );
  const [ollamaModel, setOllamaModel] = useState(
    localStorage.getItem("ollamaModel") || "qwen2.5:3b"
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    localStorage.setItem("aiProvider", aiProvider);
    localStorage.setItem("openrouterApiKey", openrouterApiKey);
    localStorage.setItem("openrouterModel", openrouterModel);
    localStorage.setItem("ollamaModel", ollamaModel);
  }, [aiProvider, openrouterApiKey, openrouterModel, ollamaModel]);

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
    if (tasks.length === 0) return "No tasks in the system.";

    const byProject: Record<string, any[]> = {};
    tasks.forEach(t => {
      if (!byProject[t.project_name]) byProject[t.project_name] = [];
      byProject[t.project_name].push(t);
    });

    let context = `TOTAL TASKS: ${tasks.length}\n\n`;

    Object.entries(byProject).forEach(([project, projectTasks]) => {
      context += `PROJECT: ${project}\n`;
      context += `Task count: ${projectTasks.length}\n`;
      projectTasks.forEach((t, idx) => {
        context += `\nTask ${idx + 1}:\n`;
        context += `  Title: ${t.title}\n`;
        context += `  Status: ${t.status}\n`;
        context += `  Priority: ${t.priority}\n`;
        if (t.blocker) context += `  Blocker: ${t.blocker}\n`;
        if (t.description) context += `  Description: ${t.description}\n`;
        if (t.start_date) context += `  Started: ${t.start_date.split('T')[0]}\n`;
        if (t.end_date) context += `  Completed: ${t.end_date.split('T')[0]}\n`;
      });
      context += `\n`;
    });

    return context;
  }

  function buildPrompt(question: string, context: string, history: Message[]) {
    const historyText = history
      .slice(-8)
      .map(m => `${m.role === "user" ? "USER" : "WORKBUDDY"}: ${m.text}`)
      .join("\n");

    return `You are WorkBuddy, a task management assistant for a software developer.

CRITICAL INSTRUCTIONS:
1. Use ONLY the data provided below. Do not invent, assume, or guess ANY information.
2. When counting tasks, count EXACTLY what matches the criteria in the data.
3. When listing tasks, show them on separate lines for readability.
4. Be concise and direct. No unnecessary elaboration.
5. If asked something unrelated to tasks (greetings, casual chat, personal questions), respond briefly and naturally WITHOUT dumping task data. Only mention tasks if specifically asked.

STATUS WORKFLOW:
Not Started → Started → Code Changed → Local Tested → Beta Testing → PR Raised → Prod Deployed

DEFINITIONS:
- "PR Raised" status = Pull Request has been raised
- "Prod Deployed" status = Task is completed and in production
- "blocked" tasks = Tasks that have a Blocker field filled in
- "in progress" = Tasks with status: Started or Code Changed
- "testing" = Tasks with status: Local Tested or Beta Testing

${context}

RECENT CONVERSATION:
${historyText}

EXAMPLES OF GOOD RESPONSES:

User: "hi"
WorkBuddy: "Hey! What do you want to know?"

User: "How many projects?"
WorkBuddy: "2 projects."

User: "What are they?"
WorkBuddy: "ELP 2.0 APIs
VandeMataram APIs"

User: "How many tasks in ELP?"
WorkBuddy: "2 tasks in ELP 2.0 APIs."

User: "Which tasks?"
WorkBuddy: "Youth APIs (Code Changed)
Creator APIs (Beta Testing)"

User: "How many in prod?"
WorkBuddy: "0 tasks in Prod Deployed."

User: "What's blocked?"
WorkBuddy: "No blocked tasks."

Now answer this question using ONLY the data above:

USER: ${question}
WORKBUDDY:`;
  }

  async function askOpenRouter(question: string, context: string, history: Message[]) {
    if (!openrouterApiKey) {
      throw new Error("OpenRouter API key not set. Click settings to add it.");
    }

    const prompt = buildPrompt(question, context, history);

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openrouterApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: openrouterModel,
        messages: [
          { role: "user", content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 200,
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "OpenRouter API error");
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  }

  async function askOllama(question: string, context: string, history: Message[]) {
    const prompt = buildPrompt(question, context, history);

    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ollamaModel,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.1,
          num_predict: 200,
        }
      })
    });

    if (!response.ok) {
      throw new Error("Failed to connect to Ollama. Make sure it's running.");
    }

    const data = await response.json();
    return data.response.trim();
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
      
      let answer: string;
      if (aiProvider === "openrouter") {
        answer = await askOpenRouter(userText, context, currentMessages);
      } else {
        answer = await askOllama(userText, context, currentMessages);
      }

      const aiMessage: Message = {
        id: Date.now() + 1,
        role: "assistant",
        text: answer,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);

    } catch (error: any) {
      const errorMessage: Message = {
        id: Date.now() + 1,
        role: "assistant",
        text: `⚠️ ${error.message || "Something went wrong."}`,
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

  function getModelDisplayName() {
    if (aiProvider === "openrouter") {
      return "OpenRouter";
    }
    return ollamaModel;
  }

  return (
    <div className="workbuddy">
      <div className="workbuddy-header">
        <div className="workbuddy-title">
          <span className="workbuddy-icon">🤖</span>
          <span>WorkBuddy</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span className={`workbuddy-status ${isLoading ? 'status-thinking' : 'status-ready'}`}>
            {isLoading ? "Thinking..." : getModelDisplayName()}
          </span>
          <button 
            className="settings-btn" 
            onClick={() => setShowSettings(!showSettings)}
            title="Settings"
          >
            ⚙️
          </button>
          <button 
            className="close-btn" 
            onClick={onClose}
            title="Close AI Assistant"
          >
            ×
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="settings-panel">
          <h3>AI Settings</h3>
          
          <div className="setting-group">
            <label>AI Provider</label>
            <select value={aiProvider} onChange={(e) => setAiProvider(e.target.value as AIProvider)}>
              <option value="openrouter">OpenRouter (Cloud, Free)</option>
              <option value="ollama">Ollama (Local, Private)</option>
            </select>
          </div>

          {aiProvider === "openrouter" && (
            <>
              <div className="setting-group">
                <label>OpenRouter API Key</label>
                <input
                  type="password"
                  value={openrouterApiKey}
                  onChange={(e) => setOpenrouterApiKey(e.target.value)}
                  placeholder="sk-or-..."
                />
                <small>Get free key at <a href="https://openrouter.ai/models?order=newest&supported_parameters=tools&q=free" target="_blank">OpenRouter</a></small>
              </div>
              <div className="setting-group">
                <label>Model</label>
                <select value={openrouterModel} onChange={(e) => setOpenrouterModel(e.target.value)}>
                  <option value="nvidia/nemotron-3-nano-30b-a3b:free">Nvidia (Free)</option>
                  <option value="stepfun/step-3.5-flash:free">Step fun (Free)</option>
                  <option value="arcee-ai/trinity-large-preview:free">Acree (Free)</option>
                </select>
              </div>
            </>
          )}

          {aiProvider === "ollama" && (
            <div className="setting-group">
              <label>Ollama Model</label>
              <input
                type="text"
                value={ollamaModel}
                onChange={(e) => setOllamaModel(e.target.value)}
                placeholder="qwen2.5:3b"
              />
              <small>Any Ollama model name (e.g., llama3.2:3b, qwen2.5:3b)</small>
            </div>
          )}

          <button className="close-settings-btn" onClick={() => setShowSettings(false)}>
            Done
          </button>
        </div>
      )}

      <div className="workbuddy-messages">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.role === "user" ? "message-user" : "message-assistant"}`}
          >
            <div className="message-bubble">
              {message.text.split('\n').map((line, i) => (
                <div key={i}>{line || '\u00A0'}</div>
              ))}
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