import React, { useState, useCallback } from "react";
import { Navbar } from "../components/Navbar";
import ChatBox from "../components/ChatBox";
import ChatHistorySidebar from "../components/ChatHistorySidebar";
import { ChatSessionOut } from "../types/types";

const Dashboard: React.FC = () => {
  const [activeSession, setActiveSession] = useState<ChatSessionOut | null>(null);
  const [sidebarRefresh, setSidebarRefresh] = useState(0);

  // Called by ChatBox when backend creates a new session
  const handleSessionCreated = useCallback((sessionId: number) => {
    // Refresh the sidebar list so the new session appears
    setSidebarRefresh((n) => n + 1);
    // Update active session id without losing the chat
    setActiveSession((prev) =>
      prev ? { ...prev, id: sessionId } : { id: sessionId, title: "New Conversation", created_at: new Date().toISOString(), updated_at: new Date().toISOString(), message_count: 1 }
    );
  }, []);

  // Called when user clicks a past session in the sidebar
  const handleSelectSession = useCallback((session: ChatSessionOut) => {
    setActiveSession(session);
  }, []);

  // Start a fresh conversation
  const handleNewChat = useCallback(() => {
    setActiveSession(null);
  }, []);

  return (
    <div style={styles.root}>
      {/* Left: Chat history sidebar */}
      <ChatHistorySidebar
        activeSessionId={activeSession?.id ?? null}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        refreshTrigger={sidebarRefresh}
      />

      {/* Right: Main content */}
      <div style={styles.main}>
        <Navbar />
        <ChatBox
          activeSession={activeSession}
          onSessionCreated={handleSessionCreated}
        />
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: "flex",
    height: "100vh",
    overflow: "hidden",
    background: "#0d1117",
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    minWidth: 0,
  },
};

export default Dashboard;
