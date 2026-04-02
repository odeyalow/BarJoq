"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { MessageCircleMore, SendHorizonal, Sparkles, X } from "lucide-react";
import { AssistantVisualizations } from "@/components/assistant/assistant-visualizations";
import {
  assistantGreeting,
  assistantQuickPrompts,
  type AssistantChatMessage,
  type AssistantRequestBody,
  type AssistantResponseBody,
  type AssistantSnapshot,
  type PortalAssistantRole,
} from "@/lib/assistant";
import { Button, Text, Textarea } from "@/components/ui";
import { css } from "styled-system/css";

export function AssistantDock({
  open,
  onOpenChange,
  role,
  snapshot,
  title,
  subtitle,
  renderReferences,
  layout = "mobile",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: PortalAssistantRole;
  snapshot: AssistantSnapshot;
  title: string;
  subtitle: string;
  renderReferences: (message: AssistantChatMessage) => ReactNode;
  layout?: "mobile" | "desktop";
}) {
  const isDesktopLayout = layout === "desktop";
  const [messages, setMessages] = useState<AssistantChatMessage[]>([
    {
      id: "assistant-greeting",
      role: "assistant",
      content: assistantGreeting[role],
      provider: "fallback",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, open]);

  const sendMessage = async (rawContent: string) => {
    const content = rawContent.trim();
    if (!content || isLoading) {
      return;
    }

    const nextUserMessage: AssistantChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
    };

    const nextMessages = [...messages, nextUserMessage];
    setMessages(nextMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role,
          snapshot,
          messages: nextMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        } satisfies AssistantRequestBody),
      });

      if (!response.ok) {
        throw new Error("Assistant request failed");
      }

      const data = (await response.json()) as AssistantResponseBody;

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: data.answer,
          provider: data.provider,
          relatedAbsenceIds: data.relatedAbsenceIds,
          relatedGroupIds: data.relatedGroupIds,
          relatedStudentIds: data.relatedStudentIds,
          visualizations: data.visualizations,
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          content:
            "Не удалось получить ответ от модели. Попробуйте сформулировать запрос чуть иначе или повторить попытку позже.",
          provider: "fallback",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {!open ? (
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          className={css({
            alignItems: "center",
            bg: "red.9",
            border: "none",
            borderRadius: "full",
            bottom: "6",
            boxShadow: "xl",
            color: "white",
            cursor: "pointer",
            display: "inline-flex",
            h: "14",
            justifyContent: "center",
            position: "fixed",
            right: "6",
            transitionDuration: "normal",
            transitionProperty: "transform, opacity",
            w: "14",
            zIndex: "30",
            _hover: {
              opacity: 0.92,
              transform: "translateY(-2px)",
            },
          })}
        >
          <MessageCircleMore
            aria-hidden="true"
            className={css({
              h: "6",
              w: "6",
            })}
          />
        </button>
      ) : null}

      <aside
        className={css({
          backdropFilter: isDesktopLayout ? "blur(12px)" : "blur(18px)",
          bg: isDesktopLayout ? "gray.surface.bg/98" : "gray.surface.bg/96",
          border: "1px solid",
          borderColor: "border",
          borderRadius: isDesktopLayout ? "0" : "l3",
          bottom: isDesktopLayout ? "auto" : "4",
          boxShadow: isDesktopLayout ? "none" : "2xl",
          display: "flex",
          flexDirection: "column",
          h: isDesktopLayout ? "100vh" : "auto",
          maxH: isDesktopLayout ? "100vh" : "calc(100vh - 2rem)",
          overflow: "hidden",
          position: isDesktopLayout ? "sticky" : "fixed",
          right: isDesktopLayout ? "auto" : "4",
          top: isDesktopLayout ? "0" : "4",
          transform: open
            ? "translateX(0)"
            : isDesktopLayout
              ? "translateX(100%)"
              : "translateX(calc(100% + 2rem))",
          transitionDuration: "slow",
          transitionProperty: "transform, opacity",
          w: isDesktopLayout ? "100%" : "calc(100vw - 2rem)",
          zIndex: isDesktopLayout ? "auto" : "40",
        })}
        style={{
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
        }}
      >
        <div
          className={css({
            alignItems: "start",
            borderBottom: "1px solid",
            borderColor: "border",
            display: "flex",
            gap: "3",
            justifyContent: "space-between",
            p: "4",
          })}
        >
          <div
            className={css({
              display: "grid",
              gap: "1",
            })}
          >
            <div
              className={css({
                alignItems: "center",
                color: "red.10",
                display: "inline-flex",
                gap: "2",
              })}
            >
              <Sparkles className={css({ h: "4.5", w: "4.5" })} />
              <Text
                className={css({
                  fontFamily: "var(--font-space-grotesk)",
                  fontWeight: "700",
                })}
              >
                {title}
              </Text>
            </div>
            <Text color="fg.muted">{subtitle}</Text>
          </div>

          <Button colorPalette="gray" onClick={() => onOpenChange(false)} variant="surface">
            <X />
          </Button>
        </div>

        <div
          className={css({
            borderBottom: "1px solid",
            borderColor: "border",
            display: "flex",
            flexWrap: "wrap",
            gap: "2",
            p: "4",
          })}
        >
          {assistantQuickPrompts[role].map((prompt) => (
            <Button
              key={prompt}
              colorPalette="gray"
              disabled={isLoading}
              onClick={() => sendMessage(prompt)}
              size="sm"
              variant="surface"
            >
              {prompt}
            </Button>
          ))}
        </div>

        <div
          className={css({
            display: "grid",
            flex: "1",
            gap: "3",
            overflowY: "auto",
            p: "4",
          })}
        >
          {messages.map((message) => (
            <div
              key={message.id}
              className={css({
                display: "grid",
                gap: "3",
                justifyItems: message.role === "user" ? "end" : "start",
              })}
            >
              <div
                className={css({
                  bg:
                    message.role === "user"
                      ? "teal.subtle.bg"
                      : "gray.subtle.bg",
                  border: "1px solid",
                  borderColor:
                    message.role === "user" ? "teal.6" : "border",
                  borderRadius: "l3",
                  maxW: "92%",
                  px: "3.5",
                  py: "3",
                })}
              >
                <Text
                  className={css({
                    color:
                      message.role === "user" ? "teal.plain.fg" : "fg.default",
                    lineHeight: "1.7",
                    whiteSpace: "pre-line",
                  })}
                >
                  {message.content}
                </Text>
              </div>

              {message.role === "assistant" ? (
                <>
                  <AssistantVisualizations visualizations={message.visualizations} />
                  {renderReferences(message)}
                </>
              ) : null}
            </div>
          ))}

          {isLoading ? (
            <div
              className={css({
                bg: "gray.subtle.bg",
                border: "1px solid",
                borderColor: "border",
                borderRadius: "l3",
                maxW: "92%",
                px: "3.5",
                py: "3",
              })}
            >
              <Text color="fg.muted">Формирую ответ по вашим данным...</Text>
            </div>
          ) : null}

          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void sendMessage(input);
          }}
          className={css({
            borderTop: "1px solid",
            borderColor: "border",
            display: "grid",
            gap: "3",
            p: "4",
          })}
        >
          <Textarea
            minH="84px"
            placeholder="Напишите вопрос по данным платформы..."
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                void sendMessage(input);
              }
            }}
          />
          <div
            className={css({
              display: "flex",
              justifyContent: "end",
            })}
          >
            <Button
              colorPalette="teal"
              disabled={isLoading || !input.trim()}
              type="submit"
            >
              Отправить
              <SendHorizonal />
            </Button>
          </div>
        </form>
      </aside>
    </>
  );
}
