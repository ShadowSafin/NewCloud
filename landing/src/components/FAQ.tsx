"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

export default function FAQ() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: "Is NexxCloud completely self-hosted?",
      answer: "Yes. The one-command Docker deployment runs the frontend, API, PostgreSQL, Redis, and workers on your infrastructure. The Windows server application uses an embedded SQLite runtime and local workers.",
    },
    {
      question: "Does it support local area network (LAN) access?",
      answer: "Yes. The deployment binds the web interface and API for LAN access, and the backend publishes local discovery details for companion devices.",
    },
    {
      question: "Is Docker required to run NexxCloud?",
      answer: "No. Docker Compose is the full multi-service deployment path, while the Windows native server host packages a local SQLite-based runtime.",
    },
    {
      question: "Is there a Windows server app available?",
      answer: "The repository includes the Electron native server host and the separate secured Windows desktop client, with Electron Builder packaging and release workflows.",
    },
    {
      question: "How does the Android mobile app work?",
      answer: "The Capacitor wrapper loads the existing NexxCloud interface from a local or LAN server and implements network reconnect handling, camera upload, sharing, and splash behavior.",
    },
    {
      question: "Where can I verify source and licensing?",
      answer: "Use the linked GitHub repository as the source of truth for available code, licensing, releases, contribution guidance, and security documentation.",
    },
  ];

  const toggleAccordion = (index: number) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-24 md:py-32 px-6 md:px-12 bg-zinc-950/20 relative z-10">
      <div className="max-w-3xl mx-auto">
        
        {/* Header Block */}
        <div className="text-center mb-16">
          <div className="text-xs font-semibold uppercase tracking-widest text-brand-cyan mb-3">
            Have questions?
          </div>
          <h2 className="text-3xl md:text-5xl font-medium tracking-tight text-foreground">
            Frequently Asked Questions
          </h2>
          <p className="text-zinc-400 text-sm md:text-base mt-3 leading-relaxed">
            Get clear, engineering-first details about the NexxCloud storage system.
          </p>
        </div>

        {/* Custom Accordion Grid */}
        <div className="flex flex-col gap-4">
          {faqs.map((faq, idx) => {
            const isOpen = activeIndex === idx;
            return (
              <div
                key={faq.question}
                className="rounded-2xl border border-white/5 bg-zinc-900/10 hover:bg-zinc-900/20 transition-all duration-300 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleAccordion(idx)}
                  className="w-full flex items-center justify-between p-6 text-left text-[14px] md:text-[15px] font-semibold text-zinc-200 hover:text-foreground transition-colors group cursor-pointer"
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${idx}`}
                  id={`btn-faq-toggle-${idx}`}
                >
                  <div className="flex items-center gap-3 pr-4">
                    <HelpCircle className="w-4 h-4 text-zinc-500 shrink-0 group-hover:text-brand-cyan transition-colors" />
                    <span className="tracking-tight leading-tight">{faq.question}</span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-zinc-500 shrink-0 transition-transform duration-500 ${
                      isOpen ? "rotate-180 text-brand-cyan" : ""
                    }`}
                  />
                </button>

                {/* Collapsible Content */}
                <div
                  id={`faq-panel-${idx}`}
                  role="region"
                  aria-labelledby={`btn-faq-toggle-${idx}`}
                  hidden={!isOpen}
                  className="border-t border-white/5"
                >
                  <p className="p-6 text-[13px] leading-relaxed text-zinc-400 font-medium tracking-tight">
                    {faq.answer}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
