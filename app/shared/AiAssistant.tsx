"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { trackConversion } from "@/lib/client-conversion";

type Message = {
  role: "user" | "assistant";
  text: string;
};

const WELCOME: Message = {
  role: "assistant",
  text:
    "أهلًا بيك 👋 أنا مساعد Ventic Pro. قولي عندك حمام، مطبخ ولا هود/خط طرد وإيه المشكلة، وأنا أوضح لك أنسب خطوة من غير ما تحتاج تكتب أي بيانات شخصية.",
};

const quickQuestions = [
  "أنسب حل لتهوية حمام؟",
  "عندي مشكلة روائح في المطبخ",
  "عاوز أركب هود وخط طرد",
  "السعر بيتحسب إزاي؟",
];

const whatsappNumber =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ||
  process.env.NEXT_PUBLIC_SUPPORT_PHONE ||
  "";

function whatsappDigits(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.startsWith("01")) {
    return `2${digits}`;
  }

  return digits;
}

export default function AiAssistant() {
  const pathname = usePathname();

  const [open, setOpen] =
    useState(false);

  const [messages, setMessages] =
    useState<Message[]>([WELCOME]);

  const [input, setInput] =
    useState("");

  const [sending, setSending] =
    useState(false);

  const endRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const hidden =
    pathname.startsWith("/admin") ||
    pathname.startsWith(
      "/technician",
    ) ||
    pathname.startsWith("/login") ||
    pathname.startsWith(
      "/customer/account",
    );

  useEffect(() => {
    if (!open) return;

    endRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [messages, open, sending]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const history =
    useMemo(
      () =>
        messages
          .slice(1)
          .slice(-6),
      [messages],
    );

  if (hidden) {
    return null;
  }

  async function send(
    value = input,
  ) {
    const message =
      value.trim().slice(0, 700);

    if (
      !message ||
      sending
    ) {
      return;
    }

    const userMessage: Message = {
      role: "user",
      text: message,
    };

    setMessages((items) => [
      ...items,
      userMessage,
    ]);

    setInput("");
    setSending(true);

    try {
      const response =
        await fetch(
          "/api/ai/assistant",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            cache: "no-store",
            body: JSON.stringify({
              message,
              path: pathname,
              history,
            }),
          },
        );

      const data =
        await response
          .json()
          .catch(() => ({}));

      const reply =
        String(
          data?.reply ||
            data?.error ||
            "",
        ).trim();

      setMessages((items) => [
        ...items,
        {
          role: "assistant",
          text:
            reply ||
            "تعذر الرد دلوقتي. تقدر تبدأ طلب أو تستخدم طلب الاتصال.",
        },
      ]);
    } catch {
      setMessages((items) => [
        ...items,
        {
          role: "assistant",
          text:
            "حصل عطل مؤقت في المساعد. تقدر تبدأ طلبك أو تستخدم طلب الاتصال وهنكمل معاك.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function submit(
    event: FormEvent,
  ) {
    event.preventDefault();
    void send();
  }

  function openWhatsapp() {
    const digits =
      whatsappDigits(
        whatsappNumber,
      );

    if (!digits) return;

    trackConversion(
      "whatsapp_click",
      {
        source:
          "ai_assistant",
      },
    );

    const text =
      encodeURIComponent(
        "مرحبًا Ventic Pro، استخدمت المساعد الذكي على الموقع وعاوز أكمل استفساري مع الفريق.",
      );

    window.open(
      `https://wa.me/${digits}?text=${text}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <>
      <button
        type="button"
        className="vpAiLauncher noPrint"
        onClick={() =>
          setOpen(
            (value) =>
              !value,
          )
        }
        aria-expanded={open}
        aria-controls="vp-ai-assistant"
        aria-label="فتح مساعد Ventic Pro"
      >
        <span
          aria-hidden="true"
        >
          ✦
        </span>
        <strong>
          اسأل Ventic
        </strong>
      </button>

      {open ? (
        <section
          id="vp-ai-assistant"
          dir="rtl"
          className="vpAiPanel noPrint"
          aria-label="مساعد Ventic Pro"
        >
          <header className="vpAiHead">
            <div>
              <strong>
                مساعد Ventic Pro
              </strong>
              <small>
                استفسارات الخدمات والطلب
              </small>
            </div>

            <button
              type="button"
              onClick={() =>
                setOpen(false)
              }
              aria-label="إغلاق المساعد"
            >
              ×
            </button>
          </header>

          <div className="vpAiPrivacy">
            ما تبعتش رقم موبايل، عنوان، OTP أو بيانات دفع هنا.
          </div>

          <div
            className="vpAiMessages"
            aria-live="polite"
          >
            {messages.map(
              (
                message,
                index,
              ) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`vpAiBubble ${message.role}`}
                >
                  {
                    message.text
                  }
                </div>
              ),
            )}

            {sending ? (
              <div className="vpAiBubble assistant vpAiTyping">
                جاري التفكير…
              </div>
            ) : null}

            <div
              ref={endRef}
            />
          </div>

          {messages.length <= 2 ? (
            <div className="vpAiQuick">
              {quickQuestions.map(
                (question) => (
                  <button
                    type="button"
                    key={question}
                    onClick={() =>
                      void send(
                        question,
                      )
                    }
                    disabled={
                      sending
                    }
                  >
                    {question}
                  </button>
                ),
              )}
            </div>
          ) : null}

          <form
            onSubmit={submit}
            className="vpAiForm"
          >
            <input
              value={input}
              onChange={(
                event,
              ) =>
                setInput(
                  event.target
                    .value,
                )
              }
              maxLength={700}
              placeholder="اكتب سؤالك بدون بيانات شخصية…"
              autoComplete="off"
              aria-label="سؤالك للمساعد"
            />

            <button
              type="submit"
              disabled={
                sending ||
                !input.trim()
              }
            >
              إرسال
            </button>
          </form>

          <div className="vpAiActions">
            <Link
              href="/order?utm_source=ai_assistant&utm_medium=onsite&utm_campaign=assistant_cta"
            >
              ابدأ طلب
            </Link>

            <Link
              href="/calculator?utm_source=ai_assistant&utm_medium=onsite&utm_campaign=assistant_cta"
            >
              حاسبة السعر
            </Link>

            <Link
              href="/callback?utm_source=ai_assistant&utm_medium=onsite&utm_campaign=assistant_cta"
            >
              كلّمني
            </Link>

            {whatsappDigits(
              whatsappNumber,
            ) ? (
              <button
                type="button"
                onClick={
                  openWhatsapp
                }
              >
                واتساب
              </button>
            ) : null}
          </div>

          <footer>
            المساعد للإرشاد فقط؛ التأكيد النهائي للخدمة والسعر من فريق Ventic Pro.
          </footer>
        </section>
      ) : null}

      <style>{`
        .vpAiLauncher{
          position:fixed;
          right:18px;
          bottom:22px;
          z-index:2940;
          display:flex;
          align-items:center;
          gap:8px;
          min-height:46px;
          border:1px solid rgba(14,116,144,.18);
          border-radius:999px;
          padding:9px 14px;
          background:linear-gradient(135deg,#0b2f49,#075985);
          color:#fff;
          box-shadow:0 14px 34px rgba(7,26,43,.22);
          cursor:pointer;
          font:inherit;
        }
        .vpAiLauncher span{
          display:grid;
          place-items:center;
          width:26px;
          height:26px;
          border-radius:50%;
          background:rgba(255,255,255,.14);
          font-size:16px;
        }
        .vpAiLauncher strong{
          font-size:13px;
          font-weight:900;
        }
        .vpAiPanel{
          position:fixed;
          right:18px;
          bottom:82px;
          z-index:6200;
          width:min(390px,calc(100vw - 24px));
          max-height:min(680px,78dvh);
          display:flex;
          flex-direction:column;
          overflow:hidden;
          border:1px solid #dbe7ef;
          border-radius:22px;
          background:#fff;
          box-shadow:0 28px 80px rgba(7,26,43,.28);
        }
        .vpAiHead{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          padding:14px 15px;
          background:linear-gradient(135deg,#0b2f49,#075985);
          color:#fff;
        }
        .vpAiHead strong{
          display:block;
          font-size:15px;
        }
        .vpAiHead small{
          display:block;
          margin-top:2px;
          color:#dbeafe;
          font-size:11px;
        }
        .vpAiHead button{
          width:34px;
          height:34px;
          border:1px solid rgba(255,255,255,.2);
          border-radius:50%;
          background:rgba(255,255,255,.08);
          color:#fff;
          font:700 22px/1 inherit;
          cursor:pointer;
        }
        .vpAiPrivacy{
          padding:8px 12px;
          border-bottom:1px solid #e2e8f0;
          background:#fff7ed;
          color:#9a3412;
          font-size:10px;
          font-weight:800;
          line-height:1.6;
        }
        .vpAiMessages{
          flex:1;
          min-height:210px;
          overflow-y:auto;
          padding:14px;
          display:flex;
          flex-direction:column;
          gap:9px;
          background:#f8fafc;
        }
        .vpAiBubble{
          width:fit-content;
          max-width:88%;
          padding:10px 12px;
          border-radius:15px;
          white-space:pre-wrap;
          line-height:1.75;
          font-size:13px;
          overflow-wrap:anywhere;
        }
        .vpAiBubble.assistant{
          align-self:flex-start;
          border:1px solid #dbeafe;
          border-bottom-right-radius:5px;
          background:#fff;
          color:#1e3a5f;
        }
        .vpAiBubble.user{
          align-self:flex-end;
          border-bottom-left-radius:5px;
          background:#0b6ea8;
          color:#fff;
        }
        .vpAiTyping{
          color:#64748b!important;
        }
        .vpAiQuick{
          display:flex;
          gap:6px;
          overflow-x:auto;
          padding:8px 11px;
          border-top:1px solid #e2e8f0;
          background:#fff;
        }
        .vpAiQuick button{
          flex:0 0 auto;
          border:1px solid #bae6fd;
          border-radius:999px;
          background:#f0f9ff;
          color:#075985;
          padding:7px 9px;
          font:800 10px/1.2 inherit;
          cursor:pointer;
        }
        .vpAiForm{
          display:grid;
          grid-template-columns:1fr auto;
          gap:7px;
          padding:10px;
          border-top:1px solid #e2e8f0;
          background:#fff;
        }
        .vpAiForm input{
          min-width:0;
          min-height:42px;
          border:1px solid #cbd5e1;
          border-radius:12px;
          padding:9px 11px;
          font:inherit;
          outline:none;
        }
        .vpAiForm input:focus{
          border-color:#38bdf8;
          box-shadow:0 0 0 3px rgba(56,189,248,.14);
        }
        .vpAiForm button{
          min-height:42px;
          border:0;
          border-radius:11px;
          background:#0b2f49;
          color:#fff;
          padding:8px 13px;
          font:900 12px/1 inherit;
          cursor:pointer;
        }
        .vpAiForm button:disabled,
        .vpAiQuick button:disabled{
          opacity:.55;
          cursor:not-allowed;
        }
        .vpAiActions{
          display:grid;
          grid-template-columns:repeat(4,1fr);
          gap:5px;
          padding:0 10px 9px;
          background:#fff;
        }
        .vpAiActions a,
        .vpAiActions button{
          border:1px solid #e2e8f0;
          border-radius:9px;
          background:#fff;
          color:#0b2f49;
          padding:7px 4px;
          text-align:center;
          text-decoration:none;
          font:900 9px/1.2 inherit;
          cursor:pointer;
        }
        .vpAiPanel footer{
          padding:7px 11px 9px;
          color:#94a3b8;
          text-align:center;
          font-size:9px;
          line-height:1.5;
          background:#fff;
        }
        @media(max-width:760px){
          .vpAiLauncher{
            right:14px;
            bottom:82px;
          }
          .vpAiPanel{
            right:12px;
            bottom:150px;
            width:calc(100vw - 24px);
            max-height:calc(100dvh - 170px);
          }
        }
      `}</style>
    </>
  );
}
