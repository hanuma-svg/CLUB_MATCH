import React from "react";
import { BrainCircuit, Check, Users } from "lucide-react";

export function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-lg">
      <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#11131c]">
        {/* Top header bar */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 dark:border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <BrainCircuit className="h-3.5 w-3.5" />
            </span>
            <div>
              <p className="text-xs font-semibold text-slate-900 dark:text-white">
                pgvector Recommendation Engine
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                PostgreSQL HNSW Index · 768 dimensions
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Active
          </span>
        </div>

        {/* Student Profile Input Vector */}
        <div className="mt-4">
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Student Interest Vector (Query Input)
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {[
              "Artificial Intelligence",
              "Cybersecurity",
              "Web Development",
              "Competitive Programming",
            ].map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Ranked Match Results */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Ranked Campus Matches (1 - &lt;=&gt;)
            </p>
            <span className="text-[11px] text-slate-400">Top 3</span>
          </div>

          <div className="space-y-2">
            {[
              {
                name: "NeuralHive",
                category: "Technical",
                desc: "AI, Machine Learning and intelligent systems labs",
                matchScore: "94%",
                members: "92 members",
              },
              {
                name: "Layer8",
                category: "Technical",
                desc: "Cybersecurity, CTFs and network defense",
                matchScore: "89%",
                members: "76 members",
              },
              {
                name: "C3I Research Center",
                category: "Research Center",
                desc: "Applied cryptography and cyber-physical security",
                matchScore: "85%",
                members: "48 members",
              },
            ].map((item, idx) => (
              <div
                key={item.name}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-2.5 dark:border-slate-800/60 dark:bg-slate-900/40"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-white text-xs font-semibold text-slate-600 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 truncate">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {item.name}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {item.desc}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="inline-block font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    {item.matchScore}
                  </span>
                  <p className="text-[10px] text-slate-400">{item.members}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Verification Footer pill */}
        <div className="mt-3.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 pt-3 dark:border-slate-800/80">
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <Check className="h-3 w-3" />
            Cosine distance ranking
          </span>
          <span className="font-mono text-[10px]">PES University EC Campus</span>
        </div>
      </div>
    </div>
  );
}
