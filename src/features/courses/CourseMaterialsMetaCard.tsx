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
      className={`mb-4 shrink-0 rounded-xl border px-5 py-4 sm:px-6 ${
        isDarkMode ? "border-[#1b4d44] bg-[#0b241f]" : "border-[#d9d9dd] bg-[#eeece7]"
      }`}
    >
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-start gap-3">
              <h1
                className={`min-w-0 flex-1 truncate text-2xl font-semibold leading-tight tracking-tight ${
                  isDarkMode ? "text-gray-50" : "text-gray-900"
                }`}
              >
                {title}
              </h1>
              {onEditCourseMeta ? (
                <button
                  type="button"
                  onClick={onEditCourseMeta}
                  className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                    isDarkMode
                      ? "border-[#2c5a50] text-gray-200 hover:bg-white/10"
                      : "border-[#d9d9dd] text-gray-700 hover:bg-white"
                  }`}
                  aria-label="강의실 정보 수정"
                  title="강의실 정보 수정"
                >
                  <EditIcon className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>

          {isTeacher ? (
            <div className="flex shrink-0 flex-col items-end gap-1 self-start text-right">
              {invitationCode ? (
                <div className="flex max-w-[min(100vw-10rem,18rem)] items-center gap-2 sm:max-w-none">
                  <code
                    className={`truncate rounded-lg border px-2.5 py-1.5 font-mono text-xs tabular-nums ${
                      isDarkMode
                        ? "border-[#2c5a50] bg-black/20 text-[#ffad9b]"
                        : "border-[#d9d9dd] bg-white text-[#003c33]"
                    }`}
                    title={invitationCode}
                  >
                    {invitationCode}
                  </code>
                  <button
                    type="button"
                    onClick={() => void handleCopy()}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                    isDarkMode
                        ? "border-[#2c5a50] text-gray-300 hover:bg-white/10 hover:text-white"
                        : "border-[#d9d9dd] text-gray-600 hover:bg-white hover:text-gray-900"
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

        <div className="space-y-2">
          <p
            className={`text-sm leading-5 ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            {desc ? desc : "등록된 설명이 없습니다."}
          </p>
          <p
            className={`text-xs leading-snug xl:text-sm ${
              isDarkMode ? "text-gray-500" : "text-gray-500"
            }`}
          >
            {dateMent}
          </p>
        </div>
      </div>
    </div>
  );
};
