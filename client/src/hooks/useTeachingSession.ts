import { useState, useEffect, useRef, useCallback } from "react";
import {
  type ChatMessage,
  type QuizPayload,
  type QuizResultData,
  type AskQuestionPayload,
} from "../types.ts";

export function useTeachingSession() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<QuizPayload | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<AskQuestionPayload | null>(null);
  const [activeThought, setActiveThought] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentTopic, setCurrentTopic] = useState<string>("");
  const [mermaidDag, setMermaidDag] = useState<string | undefined>(undefined);

  const socketRef = useRef<WebSocket | null>(null);
  const sendQueue = useRef<Record<string, unknown>[]>([]);

  // Connect to WebSocket
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    console.log(`[WS Client] Connecting to ${wsUrl}...`);
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log("[WS Client] Connected to Socratic server");
      setIsConnected(true);
      while (sendQueue.current.length > 0) {
        const queued = sendQueue.current.shift();
        if (queued) {
          console.log("[WS Client] Flushing queued message:", queued.type);
          ws.send(JSON.stringify(queued));
        }
      }
    };

    ws.onclose = () => {
      console.log("[WS Client] Disconnected from server");
      setIsConnected(false);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // 1. Session created
        if (data.type === "session_created") {
          setCurrentTopic(data.topic);
          setIsGenerating(true);
        }

        // 2. Stream chunk from teacher
        if (data.type === "chunk") {
          setIsGenerating(true);
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.sender === "teacher") {
              return [
                ...prev.slice(0, -1),
                { ...last, text: last.text + data.text },
              ];
            }
            return [
              ...prev,
              {
                id: `msg-${Date.now()}`,
                sender: "teacher",
                text: data.text,
                timestamp: Date.now(),
              },
            ];
          });
        }

        // 3. Subagent or teacher thought
        if (data.type === "thought") {
          setActiveThought(data.text);
        }

        // 4. Interactive Quiz
        if (data.type === "quiz") {
          setActiveQuiz(data.data);
          setIsGenerating(false);
        }

        // 5. Quiz Result
        if (data.type === "quiz_result") {
          const res = data.data as QuizResultData;
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.quiz) {
              return [
                ...prev.slice(0, -1),
                { ...last, quizResult: res },
              ];
            }
            return prev;
          });
          setActiveQuiz(null);
        }

        // 6. Interactive Ask Question
        if (data.type === "question") {
          setActiveQuestion(data.data);
          setIsGenerating(false);
        }

        // 7. Question Result
        if (data.type === "question_result") {
          setActiveQuestion(null);
        }

        // 8. Turn Completed
        if (data.type === "turn_complete") {
          setIsGenerating(false);
          setActiveThought(null);

          // Check if markdown contained a Mermaid graph to update the DAG visualizer
          const mermaidMatch = data.text?.match(/```mermaid([\s\S]*?)```/);
          if (mermaidMatch) {
            setMermaidDag(mermaidMatch[1].trim());
          }
        }
      } catch (err) {
        console.error("Failed to parse websocket message:", err);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  const send = useCallback((payload: Record<string, unknown>) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(payload));
    } else {
      console.log("[WS Client] Socket not open yet, queueing message:", payload.type);
      sendQueue.current.push(payload);
    }
  }, []);

  const startSession = useCallback(
    (topic: string) => {
      setMessages([
        {
          id: `usr-${Date.now()}`,
          sender: "user",
          text: `I want to learn about: ${topic}`,
          timestamp: Date.now(),
        },
      ]);
      setActiveQuiz(null);
      setActiveQuestion(null);
      setCurrentTopic(topic);
      setIsGenerating(true);
      send({ type: "init_session", topic });
    },
    [send],
  );

  const sendMessage = useCallback(
    (text: string) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `usr-${Date.now()}`,
          sender: "user",
          text,
          timestamp: Date.now(),
        },
      ]);
      setIsGenerating(true);
      send({ type: "user_message", text });
    },
    [send],
  );

  const submitQuiz = useCallback(
    (submission: { selectedValues: string[]; isDontKnow: boolean; note?: string }) => {
      send({ type: "submit_quiz", submission });
      setIsGenerating(true);
    },
    [send],
  );

  const submitQuestion = useCallback(
    (submission: { selectedValues: string[]; customText?: string }) => {
      send({ type: "submit_question", submission });
      setIsGenerating(true);
    },
    [send],
  );

  return {
    isConnected,
    isGenerating,
    currentTopic,
    messages,
    activeQuiz,
    activeQuestion,
    activeThought,
    mermaidDag,
    startSession,
    sendMessage,
    submitQuiz,
    submitQuestion,
  };
}

