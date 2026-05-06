import React, { useEffect, useRef, useState } from "react";
import { ClipboardIcon, CheckIcon, EditIcon } from "@/components/common/Icons";

function formatCourseCreatedDate(iso?: string): string | null {
  if (!iso?.trim()) return null;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString("ko-KR", { dateStyle: "long" });
  } catch {
    return null;
  }
}

export interface CourseMaterialsMetaCardProps {
  title: string;
  description?: string;
  createdAt?: string;
  invitationCode?: string;
  isDarkMode: boolean;
  isTeacher: boolean;
  onCopyInvitationCode: () => Promise<boolean>;
  onEditCourseMeta?: () => void;
}

export const CourseMaterialsMetaCard: React.FC<CourseMaterialsMetaCardProps> = ({
  title,
  description,
  createdAt,
  invitationCode,
  isDarkMode,
  isTeacher,
  onCopyInvitationCode,
  onEditCourseMeta,
}) => {
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current != null) {
        clearTimeout(copiedTimerRef.current);
      }
    };
  }, []);

  const desc = description?.trim();
  const dateLine = formatCourseCreatedDate(createdAt);
  const dateMent =
    dateLine ?? "강의실 개설 일자를 불러오지 못했습니다.";

  const handleCopy = async () => {
    const ok = await onCopyInvitationCode();
    if (!ok) return;
    setCopied(true);
    if (copiedTimerRef.current != null) {
      clearTimeout(copiedTimerRef.current);
    }
    copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`mb-3 shrink-0 rounded-xl border px-3 py-2.5 ${
        isDarkMode ? "border-zinc-600 bg-zinc-900/40" : "border-gray-200 bg-gray-50"
      }`}
    >
      <div className="flex min-w-0 flex-row gap-3 items-start justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <h1
            className={`text-xl font-semibold leading-tight tracking-tight sm:text-2xl truncate text-balance ${
              isDarkMode ? "text-gray-50" : "text-gray-900"
            }`}
          >
            {title}
          </h1>
          <p
            className={`text-xs leading-snug ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            {desc ? desc : "등록된 설명이 없습니다."}
          </p>
          <p
            className={`text-xs leading-snug ${
              isDarkMode ? "text-gray-500" : "text-gray-500"
            }`}
          >
            {dateMent}
          </p>
        </div>

        {isTeacher ? (
          <div className="flex shrink-0 flex-col items-end gap-1 self-start pt-0.5 text-right">
            {invitationCode ? (
              <>
                <div className="flex max-w-[min(100vw-8rem,12rem)] items-center gap-1.5 sm:max-w-none">
                  <code
                    className={`truncate rounded-md px-2 py-1 font-mono text-xs tabular-nums ${
                      isDarkMode ? "bg-black/35 text-emerald-200" : "bg-white text-gray-900"
                    }`}
                    title={invitationCode}
                  >
                    {invitationCode}
                  </code>
                  <button
                    type="button"
                    onClick={() => void handleCopy()}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                      isDarkMode
                        ? "text-gray-300 hover:bg-white/10 hover:text-white"
                        : "text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                    }`}
                    aria-label={copied ? "복사됨" : "초대 코드 복사"}
                    title={copied ? "복사됨" : "코드 복사"}
                  >
                    {copied ? (
                      <CheckIcon className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <ClipboardIcon className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {onEditCourseMeta ? (
                  <button
                    type="button"
                    onClick={onEditCourseMeta}
                    className={`mt-1 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                      isDarkMode
                        ? "border border-zinc-700 text-gray-200 hover:bg-white/10"
                        : "border border-gray-200 text-gray-700 hover:bg-gray-100"
                    }`}
                    aria-label="강의실 정보 수정"
                    title="강의실 정보 수정"
                  >
                    <EditIcon className="h-3.5 w-3.5" />
                    수정
                  </button>
                ) : null}
              </>
            ) : (
              <span
                className={`max-w-[10rem] text-right text-[10px] leading-tight sm:max-w-xs ${
                  isDarkMode ? "text-gray-500" : "text-gray-500"
                }`}
              >
                참여 코드가 없습니다.
              </span>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};
