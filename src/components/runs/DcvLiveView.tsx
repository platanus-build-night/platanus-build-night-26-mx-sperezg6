"use client";

import { useEffect, useId, useRef, useState } from "react";
import Script from "next/script";
import { Loader2, MonitorPlay } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    dcv?: any;
  }
}

type Phase = "loading" | "connecting" | "connected" | "error";

/**
 * Embeds the Amazon DCV web client to render a live AgentCore browser session,
 * fed a presigned liveViewStream URL (from BrowserClient.generate_live_view_url).
 * The DCV SDK is served from /public/dcvjs (UMD build → window.dcv).
 * Ported from awslabs amazon-bedrock-agentcore-samples BedrockAgentCoreLiveViewer.
 */
export function DcvLiveView({ url, className }: { url: string; className?: string }) {
  const containerId = "dcv-" + useId().replace(/:/g, "");
  const [phase, setPhase] = useState<Phase>("loading");
  const connRef = useRef<any>(null);
  const startedRef = useRef(false);

  function authParams() {
    try {
      return new URL(url).searchParams;
    } catch {
      return new URLSearchParams();
    }
  }

  function start() {
    const dcv = window.dcv;
    if (!dcv || startedRef.current) return;
    startedRef.current = true;
    setPhase("connecting");

    try {
      dcv.setLogLevel?.(dcv.LogLevel?.ERROR ?? 0);
    } catch {
      /* noop */
    }

    dcv.authenticate(url, {
      promptCredentials: () => {},
      error: (_auth: any, err: any) => {
        console.error("[dcv] auth error", err);
        setPhase("error");
      },
      success: (_auth: any, result: any) => {
        const { sessionId, authToken } = result[0];
        dcv
          .connect({
            url,
            sessionId,
            authToken,
            divId: containerId,
            baseUrl: "/dcvjs/dcv",
            callbacks: {
              httpExtraSearchParams: () => authParams(),
              displayLayout: (_w: number, _h: number) => {},
            },
          })
          .then((conn: any) => {
            connRef.current = conn;
            setPhase("connected");
          })
          .catch((e: any) => {
            console.error("[dcv] connect error", e);
            setPhase("error");
          });
      },
      httpExtraSearchParams: () => authParams(),
    });
  }

  useEffect(() => {
    if (window.dcv) start();
    return () => {
      try {
        connRef.current?.disconnect?.();
      } catch {
        /* noop */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return (
    <div className={className}>
      <Script src="/dcvjs/dcv.js" strategy="afterInteractive" onLoad={start} />
      <div className="relative size-full overflow-hidden bg-surface-2">
        <div id={containerId} className="size-full" />
        {phase !== "connected" && (
          <div className="absolute inset-0 grid place-items-center text-faint">
            {phase === "error" ? (
              <div className="flex flex-col items-center gap-1 text-center">
                <MonitorPlay className="size-6" strokeWidth={1.5} />
                <span className="text-mono text-[11px]">vista no disponible</span>
              </div>
            ) : (
              <Loader2 className="size-6 animate-spin" strokeWidth={1.5} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
