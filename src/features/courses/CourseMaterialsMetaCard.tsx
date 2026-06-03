import React, { useEffect, useRef, useState } from "react";
import { ClipboardIcon, CheckIcon, EditIcon } from "@/components/common/Icons";

export interface CourseMaterialsMetaCardProps {
  title: string;
  description?: string;
  invitationCode?: string;
  progressMetrics?: Array<{
    label: string;
    value: string;
  }>;
  isDarkMode: boolean;
  isTeacher: boolean;
  onCopyInvitationCode: () => Promise<boolean>;
  onEditCourseMeta?: () => void;
  isEditingCourseMeta?: boolean;
  editTitle?: string;
  editDescription?: string;
  editSaving?: boolean;
  onEditTitleChange?: (value: string) => void;
  onEditDescriptionChange?: (value: string) => void;
  onCancelEditCourseMeta?: () => void;
  onSaveCourseMeta?: (event: React.FormEvent<HTMLFormElement>) => void;
  resourceActions?: React.ReactNode;
}

export const CourseMaterialsMetaCard: React.FC<CourseMaterialsMetaCardProps> = ({
  title,
  description,
  invitationCode,
  progressMetrics = [],
  isDarkMode,
  isTeacher,
  onCopyInvitationCode,
  onEditCourseMeta,
  isEditingCourseMeta = false,
  editTitle = "",
  editDescription = "",
  editSaving = false,
  onEditTitleChange,
  onEditDescriptionChange,
  onCancelEditCourseMeta,
  onSaveCourseMeta,
  resourceActions,
}) => {
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editDescriptionRows = Math.min(
    4,
    Math.max(1, editDescription.split(/\r?\n/).length),
  );

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current != null) {
        clearTimeout(copiedTimerRef.current);
      }
    };
  }, []);

  const hasDescription =
    typeof description === "string" && description.length > 0;

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
    <section
      className={`mb-3 flex shrink-0 flex-col rounded-2xl border px-5 py-5 lg:px-6 ${
        isDarkMode
          ? "border-[#2b2b2b] bg-[#202020]"
          : "border-[#dedbd5] bg-white"
      }`}
    >
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            {isEditingCourseMeta ? (
              <form
                id="course-meta-inline-edit-form"
                onSubmit={onSaveCourseMeta}
                className="min-w-0 flex-1 max-w-5xl space-y-2"
              >
                <input
                  type="text"
                  value={editTitle}
                  onChange={(event) => onEditTitleChange?.(event.target.value)}
                  disabled={editSaving}
                  maxLength={100}
                  className={`w-full rounded-[var(--app-control-radius)] border px-3 py-2 text-xl font-semibold leading-tight outline-none transition-colors ${
                    isDarkMode
                      ? "border-[#3a3a3a] bg-[#181818] text-gray-50 placeholder:text-gray-500 focus:border-[#ff824d]"
                      : "border-[#dedbd5] bg-white text-gray-950 placeholder:text-gray-400 focus:border-[#ff824d]"
                  } disabled:opacity-60`}
                  placeholder="강의실 제목"
                  autoFocus
                />
              </form>
            ) : (
              <h1
                className={`min-w-0 flex-1 whitespace-pre-wrap break-words text-2xl font-semibold leading-tight ${
                  isDarkMode ? "text-gray-50" : "text-gray-950"
                }`}
              >
                {title}
              </h1>
            )}
            {onEditCourseMeta && !isEditingCourseMeta ? (
              <button
                type="button"
                onClick={onEditCourseMeta}
                className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--app-control-radius)] border transition-colors ${
                  isDarkMode
                    ? "border-[#3a3a3a] text-[#ff824d] hover:bg-white/10"
                    : "border-[#dedbd5] text-gray-700 hover:bg-[#f7f5f1]"
                }`}
                aria-label="강의실 정보 수정"
                title="강의실 정보 수정"
              >
                <EditIcon className="h-4 w-4" />
              </button>
            ) : null}
          </div>

        {isTeacher ? (
          <div className="flex shrink-0 items-center gap-2 self-start">
            {invitationCode ? (
              <>
                <code
                  className={`max-w-[18rem] truncate rounded-[var(--app-control-radius)] border px-3 py-2 font-mono text-xs tabular-nums ${
                    isDarkMode
                      ? "border-[#3a3a3a] bg-[#181818] text-[#ffad9b]"
                      : "border-[#dedbd5] bg-[#fbfaf7] text-[#ff824d]"
                  }`}
                  title={invitationCode}
                >
                  {invitationCode}
                </code>
                <button
                  type="button"
                  onClick={() => void handleCopy()}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--app-control-radius)] border transition-colors ${
                    isDarkMode
                      ? "border-[#3a3a3a] text-[#ff824d] hover:bg-white/10"
                      : "border-[#dedbd5] text-gray-600 hover:bg-[#f7f5f1] hover:text-gray-950"
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
              </>
            ) : (
              <span
                className={`max-w-[10rem] text-right text-[11px] leading-tight sm:max-w-xs ${
                  isDarkMode ? "text-gray-500" : "text-gray-500"
                }`}
              >
                참여 코드가 없습니다.
              </span>
            )}
          </div>
        ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1 max-w-5xl">
            {isEditingCourseMeta ? (
              <textarea
                form="course-meta-inline-edit-form"
                value={editDescription}
                onChange={(event) => onEditDescriptionChange?.(event.target.value)}
                disabled={editSaving}
                maxLength={500}
                rows={editDescriptionRows}
                className={`w-full resize-none rounded-[var(--app-control-radius)] border px-3 py-2 text-sm leading-5 outline-none transition-colors ${
                  isDarkMode
                    ? "border-[#3a3a3a] bg-[#181818] text-gray-100 placeholder:text-gray-500 focus:border-[#ff824d]"
                    : "border-[#dedbd5] bg-white text-gray-900 placeholder:text-gray-400 focus:border-[#ff824d]"
                } disabled:opacity-60`}
                placeholder="강의실 설명"
              />
            ) : (
              <p
                className={`max-w-5xl whitespace-pre-wrap break-words text-sm leading-5 ${
                  isDarkMode ? "text-gray-300" : "text-gray-600"
                }`}
              >
                {hasDescription ? description : "등록된 설명이 없습니다."}
              </p>
            )}
          </div>

          {isEditingCourseMeta ? (
            <div className="flex shrink-0 items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={onCancelEditCourseMeta}
                disabled={editSaving}
                className={`rounded-[var(--app-control-radius)] border px-3 py-2 text-sm font-semibold transition-colors ${
                  isDarkMode
                    ? "border-[#3a3a3a] text-gray-200 hover:bg-white/10"
                    : "border-[#dedbd5] text-gray-700 hover:bg-[#f7f5f1]"
                } disabled:opacity-60`}
              >
                취소
              </button>
              <button
                type="submit"
                form="course-meta-inline-edit-form"
                disabled={editSaving || !editTitle.trim()}
                className="rounded-[var(--app-control-radius)] bg-[#ff824d] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#f26f37] disabled:opacity-50"
              >
                {editSaving ? "저장 중..." : "저장"}
              </button>
            </div>
          ) : resourceActions ? (
            <div className="flex shrink-0 flex-wrap items-center justify-start gap-1.5 lg:max-w-[30rem] lg:justify-end">
              {resourceActions}
            </div>
          ) : progressMetrics.length > 0 ? (
            <div className="grid shrink-0 grid-cols-3 gap-2">
              {progressMetrics.map((metric) => (
                <div
                  key={metric.label}
                  className={`flex h-[4.25rem] w-[4.25rem] flex-col items-center justify-center rounded-xl px-2 py-1.5 text-center sm:h-[4.5rem] sm:w-[4.5rem] ${
                    isDarkMode
                      ? "bg-[#181818] text-gray-100"
                      : "bg-[#f4f1eb] text-gray-950"
                  }`}
                >
                  <p
                    className={`text-sm leading-none ${
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    {metric.label}
                  </p>
                  <p className="mt-1 text-xl font-semibold leading-none">
                    {metric.value}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};
