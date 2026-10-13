import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

type Message = {
  id: number;
  role: "assistant" | "user";
  text: string;
  isError?: boolean;
};

function SparkleIcon({ small = false }: { small?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={small ? "sparkle-icon sparkle-icon-small" : "sparkle-icon"}
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M12 2.5 14.35 9.65 21.5 12l-7.15 2.35L12 21.5l-2.35-7.15L2.5 12l7.15-2.35L12 2.5Z"
        fill="currentColor"
      />
      <path d="m19 2 .9 2.1L22 5l-2.1.9L19 8l-.9-2.1L16 5l2.1-.9L19 2Z" fill="currentColor" />
    </svg>
  );
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const conversationEnd = useRef<HTMLDivElement>(null);
  const nextMessageId = useRef(0);

  useEffect(() => {
    conversationEnd.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, isLoading]);

  async function askQuestion(value: string) {
    const trimmedQuestion = value.trim();
    if (!trimmedQuestion || isLoading) return;

    setMessages((current) => [
      ...current,
      { id: nextMessageId.current++, role: "user", text: trimmedQuestion }
    ]);
    setQuestion("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmedQuestion })
      });
      const data: { answer?: string; error?: string } = await response.json();
      if (!response.ok) throw new Error(data.error || "I couldn't get an answer. Please try again.");
      if (typeof data.answer !== "string" || !data.answer.trim()) {
        throw new Error("The assistant returned an empty answer. Please try again.");
      }

      setMessages((current) => [
        ...current,
        { id: nextMessageId.current++, role: "assistant", text: data.answer! }
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong. Please try again.";
      setMessages((current) => [
        ...current,
        { id: nextMessageId.current++, role: "assistant", text: message, isError: true }
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void askQuestion(question);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void askQuestion(question);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="Sanjivani home">
          <span className="brand-mark"><SparkleIcon /></span>
          <span className="brand-name">sanjivani<span>.</span><small>FARMER INSIGHTS</small></span>
        </a>

        <div className="sidebar-section-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          <a className="nav-link nav-link-active" href="#assistant" aria-current="page">
            <span className="nav-icon">✳</span>
            Farmer assistant
          </a>
        </nav>

        <div className="sidebar-bottom">
          <div className="data-card">
            <span className="data-card-icon">⌘</span>
            <div>
              <strong>Your data, connected</strong>
              <p>Answers use your farmer records.</p>
            </div>
            <span className="status-dot" aria-label="Assistant ready" />
          </div>
          <div className="sidebar-caption">SUGAR FACTORY OPERATIONS</div>
        </div>
      </aside>

      <main className="main-content" id="assistant">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-divider">/</span><strong>Farmer assistant</strong></div>
          <div className="topbar-status"><span className="status-dot" /> Assistant ready</div>
        </header>

        <div className="content-wrap">
          <section className="welcome-section">
            <div className="eyebrow"><span className="eyebrow-line" /> FARM OPERATIONS</div>
            <h1>Good questions grow<br /><span>better decisions.</span></h1>
            <p>Ask about farmer supply, sugarcane totals, or pending payments.</p>
          </section>

          <section className="assistant-panel" aria-label="Farmer data assistant">
            <div className="panel-header">
              <div className="assistant-avatar"><SparkleIcon small /></div>
              <div className="assistant-heading">
                <strong>Farmer data assistant</strong>
                <span>Grounded in your PostgreSQL records</span>
              </div>
              <span className="panel-badge"><span className="status-dot" /> READY</span>
            </div>

            {messages.length === 0 ? (
              <div className="empty-state">
                <div className="empty-sparkle"><SparkleIcon /></div>
                <h2>Ask your own question</h2>
                <p>Type a question below. The assistant will look up the farmer records and answer.</p>
              </div>
            ) : (
              <div className="conversation" aria-live="polite">
                <div className="message-list">
                  {messages.map((message) => (
                    <article className={`message message-${message.role}`} key={message.id}>
                      {message.role === "assistant" && <span className="message-avatar"><SparkleIcon small /></span>}
                      <div className={`message-bubble${message.isError ? " message-error" : ""}`}>
                        {message.text}
                      </div>
                    </article>
                  ))}
                  {isLoading && (
                    <article className="message message-assistant">
                      <span className="message-avatar"><SparkleIcon small /></span>
                      <div className="message-bubble loading-message">
                        <span className="typing-dots"><i /><i /><i /></span>
                        Looking through your farmer records
                      </div>
                    </article>
                  )}
                  <div ref={conversationEnd} />
                </div>
              </div>
            )}

            <form className="composer" onSubmit={handleSubmit}>
              <label className="sr-only" htmlFor="question">Ask a question about your farmer records</label>
              <textarea
                id="question"
                maxLength={1000}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about sugarcane, farmers, or payments..."
                rows={1}
                value={question}
              />
              <div className="composer-footer">
                <span className="composer-hint">Your answers are based on connected records.</span>
                <button className="send-button" disabled={!question.trim() || isLoading} type="submit">
                  Ask assistant <span aria-hidden="true">↗</span>
                </button>
              </div>
            </form>
          </section>

          <footer className="page-footer">
            <span>✳</span> Made for the people who keep the harvest moving.
          </footer>
        </div>
      </main>
    </div>
  );
}

export default App;
