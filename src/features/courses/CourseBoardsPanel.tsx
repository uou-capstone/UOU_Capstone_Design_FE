import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { RefreshIcon } from "@/components/common/Icons";
import {
  discussionApi,
  noticeApi,
  type DiscussionCategory,
  type DiscussionComment,
  type DiscussionDetail,
  type DiscussionListItem,
  type NoticeCategory,
  type NoticeComment,
  type NoticeDetail,
  type NoticeListItem,
  type NoticePriority,
} from "@/services/api";

type BoardTab = "notices" | "discussions";

interface CourseBoardsPanelProps {
  courseId: number;
  isTeacher: boolean;
  isDarkMode: boolean;
  initialTab?: BoardTab;
  selectedLectureId?: number | null;
  selectedWeekNumber?: number | null;
  scopedToLecture?: boolean;
  onClose?: () => void;
}

type BoardForm = {
  title: string;
  contentMarkdown: string;
  noticeCategory: NoticeCategory;
  priority: NoticePriority;
  discussionCategory: DiscussionCategory;
  pinned: boolean;
  allowComments: boolean;
  scheduledDate: string;
  scheduledTime: string;
  immediateSend: boolean;
};

type ScheduledBoardJob = {
  id: string;
  tab: BoardTab;
  title: string;
  scheduledAt: string;
};

type BoardWeekScope = {
  lectureId: number;
  weekNumber: number | null;
};

const NOTICE_CATEGORY_LABEL: Record<NoticeCategory, string> = {
  GENERAL: "일반",
  EXAM: "시험",
  MATERIAL: "자료",
  ASSIGNMENT: "과제",
};

const DISCUSSION_CATEGORY_LABEL: Record<DiscussionCategory, string> = {
  QUESTION: "질문",
  FREE: "자유",
  RESOURCE: "자료",
};

function dateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function timeInputValue(date: Date): string {
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${hour}:${minute}`;
}

function emptyForm(): BoardForm {
  const now = new Date();
  return {
    title: "",
    contentMarkdown: "",
    noticeCategory: "GENERAL",
    priority: "NORMAL",
    discussionCategory: "FREE",
    pinned: false,
    allowComments: true,
    scheduledDate: dateInputValue(now),
    scheduledTime: timeInputValue(now),
    immediateSend: true,
  };
}

const BOARD_WEEK_SCOPE_PATTERN =
  /<!--\s*ai-tutor-week-resource:({[\s\S]*?})\s*-->\s*/;

function buildBoardWeekScopeMarker(scope: BoardWeekScope): string {
  return `<!-- ai-tutor-week-resource:${JSON.stringify(scope)} -->\n`;
}

function extractBoardWeekScope(value: string | undefined): BoardWeekScope | null {
  if (!value) return null;
  const match = value.match(BOARD_WEEK_SCOPE_PATTERN);
  if (!match?.[1]) return null;
  try {
    const parsed = JSON.parse(match[1]) as Partial<BoardWeekScope>;
    if (typeof parsed.lectureId !== "number") return null;
    return {
      lectureId: parsed.lectureId,
      weekNumber:
        typeof parsed.weekNumber === "number" || parsed.weekNumber === null
          ? parsed.weekNumber
          : null,
    };
  } catch {
    return null;
  }
}

function stripBoardWeekScopeMarker(value: string): string {
  return value.replace(BOARD_WEEK_SCOPE_PATTERN, "");
}

function withBoardWeekScopeMarker(value: string, scope: BoardWeekScope | null): string {
  const content = stripBoardWeekScopeMarker(value).trim();
  return scope ? `${buildBoardWeekScopeMarker(scope)}${content}` : content;
}

function formatInstant(value: string | undefined): string {
  if (!value) return "-";
  const time = Date.parse(value);
  if (Number.isNaN(time)) return value;
  return new Date(time).toLocaleString("ko-KR");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

function plainTextToEditorHtml(value: string): string {
  return escapeHtml(value).replace(/\n/g, "<br>");
}

function editorHtmlFromStored(value: string): string {
  return looksLikeHtml(value) ? value : plainTextToEditorHtml(value);
}

function sanitizeRichContent(value: string): string {
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<\/?(iframe|object|embed|link|meta)[^>]*>/gi, "")
    .replace(/\son\w+=(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(href|src)=(["'])\s*javascript:[\s\S]*?\2/gi, "");
}

function isRichContentEmpty(value: string): boolean {
  const text = value
    .replace(/<br\s*\/?>/gi, "")
    .replace(/<\/?(p|div|h[1-6]|ul|ol|li|strong|b|em|i|u|span)[^>]*>/gi, "")
    .replace(/&nbsp;/gi, "")
    .trim();
  return text.length === 0;
}

export const CourseBoardsPanel: React.FC<CourseBoardsPanelProps> = ({
  courseId,
  isTeacher,
  isDarkMode,
  initialTab = "notices",
  selectedLectureId = null,
  selectedWeekNumber = null,
  scopedToLecture = false,
  onClose,
}) => {
  const { user } = useAuth();
  const [tab, setTab] = React.useState<BoardTab>(initialTab);
  const [page, setPage] = React.useState(0);
  const [notices, setNotices] = React.useState<NoticeListItem[]>([]);
  const [discussions, setDiscussions] = React.useState<DiscussionListItem[]>([]);
  const [totalPages, setTotalPages] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<BoardForm>(() => emptyForm());
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [selectedNotice, setSelectedNotice] = React.useState<NoticeDetail | null>(null);
  const [selectedDiscussion, setSelectedDiscussion] =
    React.useState<DiscussionDetail | null>(null);
  const [comments, setComments] = React.useState<Array<NoticeComment | DiscussionComment>>([]);
  const [commentText, setCommentText] = React.useState("");
  const [editingCommentId, setEditingCommentId] = React.useState<number | null>(null);
  const [assistantTopic, setAssistantTopic] = React.useState("");
  const [assistantLoading, setAssistantLoading] = React.useState(false);
  const [scheduledJobs, setScheduledJobs] = React.useState<ScheduledBoardJob[]>([]);
  const scheduledTimersRef = React.useRef<Map<string, number>>(new Map());
  const contentEditorRef = React.useRef<HTMLDivElement | null>(null);
  const editorHtmlRef = React.useRef("");

  const canCreate = tab === "notices" ? isTeacher : true;
  const selectedId =
    tab === "notices" ? selectedNotice?.noticeId : selectedDiscussion?.discussionId;
  const scopedWeekTarget = React.useMemo<BoardWeekScope | null>(() => {
    if (!scopedToLecture || selectedLectureId == null) return null;
    return { lectureId: selectedLectureId, weekNumber: selectedWeekNumber };
  }, [scopedToLecture, selectedLectureId, selectedWeekNumber]);
  const scopedWeekLabel =
    scopedWeekTarget == null
      ? null
      : scopedWeekTarget.weekNumber === 0
        ? "OT"
        : scopedWeekTarget.weekNumber != null
          ? `${scopedWeekTarget.weekNumber}주차`
          : "선택 주차";

  React.useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const loadList = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === "notices") {
        const res = await noticeApi.listNotices(courseId, {
          page: scopedWeekTarget ? 0 : page,
          size: scopedWeekTarget ? 100 : 12,
          sort: "pinned,desc",
        });
        let content = res.content ?? [];
        if (scopedWeekTarget) {
          const details = await Promise.all(
            content.map((item) =>
              noticeApi.getNotice(courseId, item.noticeId).catch(() => null),
            ),
          );
          content = content.filter((_, index) => {
            const scope = extractBoardWeekScope(details[index]?.contentMarkdown);
            return scope?.lectureId === scopedWeekTarget.lectureId;
          });
        }
        setNotices(content);
        setTotalPages(scopedWeekTarget ? 1 : Math.max(res.totalPages ?? 1, 1));
      } else {
        const res = await discussionApi.listDiscussions(courseId, {
          page: scopedWeekTarget ? 0 : page,
          size: scopedWeekTarget ? 100 : 12,
          sort: "pinned,desc",
        });
        let content = res.content ?? [];
        if (scopedWeekTarget) {
          const details = await Promise.all(
            content.map((item) =>
              discussionApi
                .getDiscussion(courseId, item.discussionId)
                .catch(() => null),
            ),
          );
          content = content.filter((_, index) => {
            const scope = extractBoardWeekScope(details[index]?.contentMarkdown);
            return scope?.lectureId === scopedWeekTarget.lectureId;
          });
        }
        setDiscussions(content);
        setTotalPages(scopedWeekTarget ? 1 : Math.max(res.totalPages ?? 1, 1));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "목록을 불러오지 못했습니다.");
      setNotices([]);
      setDiscussions([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [courseId, page, scopedWeekTarget, tab]);

  const loadComments = React.useCallback(
    async (id: number) => {
      try {
        if (tab === "notices") {
          const res = await noticeApi.listComments(courseId, id, {
            page: 0,
            size: 100,
            sort: "createdAt,asc",
          });
          setComments(res.content ?? []);
        } else {
          const res = await discussionApi.listComments(courseId, id, {
            page: 0,
            size: 100,
            sort: "createdAt,asc",
          });
          setComments(res.content ?? []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "댓글을 불러오지 못했습니다.");
        setComments([]);
      }
    },
    [courseId, tab],
  );

  React.useEffect(() => {
    void loadList();
  }, [loadList]);

  React.useEffect(() => {
    setPage(0);
    setForm(emptyForm());
    editorHtmlRef.current = "";
    if (contentEditorRef.current) {
      contentEditorRef.current.innerHTML = "";
    }
    setEditingId(null);
    setSelectedNotice(null);
    setSelectedDiscussion(null);
    setComments([]);
  }, [courseId, scopedToLecture, selectedLectureId, tab]);

  const selectNotice = React.useCallback(
    async (noticeId: number) => {
      setError(null);
      try {
        const detail = await noticeApi.getNotice(courseId, noticeId);
        setSelectedNotice({
          ...detail,
          contentMarkdown: stripBoardWeekScopeMarker(detail.contentMarkdown),
        });
        setSelectedDiscussion(null);
        await loadComments(noticeId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "공지 상세를 불러오지 못했습니다.");
      }
    },
    [courseId, loadComments],
  );

  const selectDiscussion = React.useCallback(
    async (discussionId: number) => {
      setError(null);
      try {
        const detail = await discussionApi.getDiscussion(courseId, discussionId);
        setSelectedDiscussion({
          ...detail,
          contentMarkdown: stripBoardWeekScopeMarker(detail.contentMarkdown),
        });
        setSelectedNotice(null);
        await loadComments(discussionId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "토론 상세를 불러오지 못했습니다.");
      }
    },
    [courseId, loadComments],
  );

  const resetForm = () => {
    setForm(emptyForm());
    editorHtmlRef.current = "";
    if (contentEditorRef.current) {
      contentEditorRef.current.innerHTML = "";
    }
    setEditingId(null);
  };

  React.useEffect(() => {
    const editor = contentEditorRef.current;
    if (!editor) return;
    if (document.activeElement === editor) return;
    const nextHtml = editorHtmlFromStored(form.contentMarkdown);
    if (editor.innerHTML !== nextHtml) {
      editor.innerHTML = nextHtml;
    }
    editorHtmlRef.current = nextHtml;
  }, [form.contentMarkdown, editingId, tab]);

  const readEditorHtml = React.useCallback(() => {
    const html = contentEditorRef.current?.innerHTML ?? editorHtmlRef.current;
    editorHtmlRef.current = html;
    return html;
  }, []);

  React.useEffect(() => {
    return () => {
      for (const timerId of scheduledTimersRef.current.values()) {
        window.clearTimeout(timerId);
      }
      scheduledTimersRef.current.clear();
    };
  }, []);

  const publishPost = React.useCallback(
	    async (
      targetTab: BoardTab,
      snapshot: BoardForm,
      targetEditingId: number | null,
    ) => {
      const contentMarkdown = withBoardWeekScopeMarker(
        snapshot.contentMarkdown,
        scopedWeekTarget,
      );
      if (targetTab === "notices") {
        const payload = {
          title: snapshot.title.trim(),
          contentMarkdown,
          category: snapshot.noticeCategory,
          priority: snapshot.priority,
          pinned: snapshot.pinned,
        };
        const saved =
          targetEditingId == null
            ? await noticeApi.createNotice(courseId, payload)
            : await noticeApi.updateNotice(courseId, targetEditingId, payload);
        setSelectedNotice({
          ...saved,
          contentMarkdown: stripBoardWeekScopeMarker(saved.contentMarkdown),
        });
        setSelectedDiscussion(null);
        await loadComments(saved.noticeId);
      } else {
        const payload = {
          title: snapshot.title.trim(),
          contentMarkdown,
          category: snapshot.discussionCategory,
          pinned: snapshot.pinned,
          allowComments: snapshot.allowComments,
        };
        const saved =
          targetEditingId == null
            ? await discussionApi.createDiscussion(courseId, payload)
            : await discussionApi.updateDiscussion(courseId, targetEditingId, payload);
        setSelectedDiscussion({
          ...saved,
          contentMarkdown: stripBoardWeekScopeMarker(saved.contentMarkdown),
        });
        setSelectedNotice(null);
        await loadComments(saved.discussionId);
      }
    },
    [courseId, loadComments, scopedWeekTarget],
  );

  const cancelScheduledJob = React.useCallback((jobId: string) => {
    const timerId = scheduledTimersRef.current.get(jobId);
    if (timerId != null) {
      window.clearTimeout(timerId);
      scheduledTimersRef.current.delete(jobId);
    }
    setScheduledJobs((prev) => prev.filter((job) => job.id !== jobId));
  }, []);

  const applyEditorCommand = React.useCallback(
    (
      kind:
        | "bold"
        | "italic"
        | "underline"
        | "bullet"
        | "heading"
        | "paragraph"
        | "undo",
    ) => {
      const editor = contentEditorRef.current;
      if (!editor) return;
      editor.focus();
      try {
        if (kind === "bold") {
          document.execCommand("bold");
        } else if (kind === "italic") {
          document.execCommand("italic");
        } else if (kind === "underline") {
          document.execCommand("underline");
        } else if (kind === "bullet") {
          document.execCommand("insertUnorderedList");
        } else if (kind === "heading") {
          document.execCommand("formatBlock", false, "h3");
        } else if (kind === "paragraph") {
          document.execCommand("formatBlock", false, "p");
        } else if (kind === "undo") {
          document.execCommand("undo");
        }
        editorHtmlRef.current = editor.innerHTML;
      } catch (err) {
        setError(err instanceof Error ? err.message : "편집 명령을 적용하지 못했습니다.");
      }
    },
    [],
  );

  const beginEdit = () => {
    if (tab === "notices" && selectedNotice) {
      setEditingId(selectedNotice.noticeId);
      setForm({
        ...emptyForm(),
        title: selectedNotice.title,
        contentMarkdown: selectedNotice.contentMarkdown,
        noticeCategory: selectedNotice.category,
        priority: selectedNotice.priority,
        pinned: selectedNotice.pinned,
      });
    }
    if (tab === "discussions" && selectedDiscussion) {
      setEditingId(selectedDiscussion.discussionId);
      setForm({
        ...emptyForm(),
        title: selectedDiscussion.title,
        contentMarkdown: selectedDiscussion.contentMarkdown,
        discussionCategory: selectedDiscussion.category,
        pinned: selectedDiscussion.pinned,
        allowComments: selectedDiscussion.allowComments,
      });
    }
  };

  const submitPost = React.useCallback(async () => {
    if (!canCreate && editingId == null) return;
    const contentMarkdown = readEditorHtml();
    const snapshot = {
      ...form,
      contentMarkdown,
    };
    if (!snapshot.title.trim() || isRichContentEmpty(snapshot.contentMarkdown)) {
      window.alert("제목과 내용을 입력해주세요.");
      return;
    }

    if (!snapshot.immediateSend && editingId == null) {
      const scheduledAt = new Date(
        `${snapshot.scheduledDate}T${snapshot.scheduledTime || "00:00"}`,
      );
      const delay = scheduledAt.getTime() - Date.now();
      if (!snapshot.scheduledDate || Number.isNaN(scheduledAt.getTime()) || delay <= 0) {
        window.alert("현재보다 이후의 예약 발송 시간을 선택해주세요.");
        return;
      }
      const targetTab = tab;
      const jobId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `scheduled-${Date.now()}`;
      const timerId = window.setTimeout(() => {
        void (async () => {
          try {
            await publishPost(targetTab, snapshot, null);
            await loadList();
          } catch (err) {
            setError(
              err instanceof Error
                ? `예약 발송 실패: ${err.message}`
                : "예약 발송에 실패했습니다.",
            );
          } finally {
            scheduledTimersRef.current.delete(jobId);
            setScheduledJobs((prev) => prev.filter((job) => job.id !== jobId));
          }
        })();
      }, delay);
      scheduledTimersRef.current.set(jobId, timerId);
      setScheduledJobs((prev) => [
        ...prev,
        {
          id: jobId,
          tab: targetTab,
          title: snapshot.title.trim(),
          scheduledAt: scheduledAt.toISOString(),
        },
      ]);
      resetForm();
      window.alert("예약 발송이 등록되었습니다. 이 브라우저 세션이 유지되는 동안 예약 시각에 발송됩니다.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await publishPost(tab, snapshot, editingId);
      resetForm();
      await loadList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }, [canCreate, editingId, form, loadList, publishPost, readEditorHtml, tab]);

  const deleteSelected = React.useCallback(async () => {
    if (selectedId == null) return;
    const ok = window.confirm("선택한 글을 삭제할까요?");
    if (!ok) return;
    setSaving(true);
    setError(null);
    try {
      if (tab === "notices") {
        await noticeApi.deleteNotice(courseId, selectedId);
        setSelectedNotice(null);
      } else {
        await discussionApi.deleteDiscussion(courseId, selectedId);
        setSelectedDiscussion(null);
      }
      setComments([]);
      await loadList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "삭제에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }, [courseId, loadList, selectedId, tab]);

  const submitComment = React.useCallback(async () => {
    if (selectedId == null || !commentText.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (tab === "notices") {
        if (editingCommentId == null) {
          await noticeApi.createComment(courseId, selectedId, {
            contentMarkdown: commentText.trim(),
          });
        } else {
          await noticeApi.updateComment(courseId, selectedId, editingCommentId, commentText.trim());
        }
      } else {
        if (editingCommentId == null) {
          await discussionApi.createComment(courseId, selectedId, {
            contentMarkdown: commentText.trim(),
          });
        } else {
          await discussionApi.updateComment(
            courseId,
            selectedId,
            editingCommentId,
            commentText.trim(),
          );
        }
      }
      setCommentText("");
      setEditingCommentId(null);
      await loadComments(selectedId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "댓글 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }, [commentText, courseId, editingCommentId, loadComments, selectedId, tab]);

  const deleteComment = React.useCallback(
    async (commentId: number) => {
      if (selectedId == null) return;
      const ok = window.confirm("댓글을 삭제할까요?");
      if (!ok) return;
      setSaving(true);
      try {
        if (tab === "notices") {
          await noticeApi.deleteComment(courseId, selectedId, commentId);
        } else {
          await discussionApi.deleteComment(courseId, selectedId, commentId);
        }
        await loadComments(selectedId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "댓글 삭제에 실패했습니다.");
      } finally {
        setSaving(false);
      }
    },
    [courseId, loadComments, selectedId, tab],
  );

  const runDiscussionAssistant = React.useCallback(async () => {
    if (tab !== "discussions" || !assistantTopic.trim()) return;
    setAssistantLoading(true);
    setError(null);
    setForm((prev) => ({
      ...prev,
      title: prev.title || assistantTopic.trim(),
      contentMarkdown: "",
    }));
    try {
      await discussionApi.streamAssistant(
        courseId,
        {
          topic: assistantTopic.trim(),
          category: form.discussionCategory,
          previousDraft: form.contentMarkdown || undefined,
        },
        {
          onDelta: (chunk) =>
            setForm((prev) => ({
              ...prev,
              contentMarkdown: `${prev.contentMarkdown}${chunk}`,
            })),
        },
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI 초안 생성에 실패했습니다.");
    } finally {
      setAssistantLoading(false);
    }
  }, [assistantTopic, courseId, form.contentMarkdown, form.discussionCategory, tab]);

  const activeList = tab === "notices" ? notices : discussions;
  const activeDetail = tab === "notices" ? selectedNotice : selectedDiscussion;
  const canEditSelected =
    activeDetail != null &&
    (isTeacher || activeDetail.authorUserId === user?.userId);

  const surfaceClass = isDarkMode
    ? "border-[#1b4d44] bg-[#0b241f] text-gray-100"
    : "border-[#d9d9dd] bg-white text-gray-900";
  const mutedClass = isDarkMode ? "text-gray-400" : "text-gray-500";
  const inputClass = `rounded-lg border px-3 py-2 text-sm outline-none focus:ring-1 ${
    isDarkMode
      ? "border-[#1b3443] bg-[#102a35] text-gray-100 placeholder:text-gray-500 focus:border-[#ffad9b] focus:ring-[#ffad9b]/20"
      : "border-[#d9d9dd] bg-white text-gray-900 placeholder:text-gray-400 focus:border-[#1863dc] focus:ring-[#1863dc]/20"
  }`;
  const toggleOptionClass = `flex h-4 items-center gap-1.5 text-xs font-semibold leading-none ${
    isDarkMode ? "text-gray-100" : "text-gray-900"
  }`;
  const toolbarButtonClass = `inline-flex h-8 min-w-8 items-center justify-center border-r px-2 text-xs font-semibold transition-colors ${
    isDarkMode
      ? "border-[#343434] text-gray-100 hover:bg-[#252525]"
      : "border-[#dedbd5] text-[#212121] hover:bg-[#f7f5f1]"
  }`;
  const editorSurfaceClass = isDarkMode
    ? "border-[#343434] bg-[#202020] text-gray-100"
    : "border-[#dedbd5] bg-white text-[#212121]";

  return (
    <div className="flex min-h-full flex-col gap-4 pb-6">
      <section className={`rounded-xl border px-4 py-4 ${surfaceClass}`}>
        <div className="mb-4 flex min-h-10 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold">
              {scopedWeekLabel ? `${scopedWeekLabel} ` : ""}
              {tab === "notices" ? "공지사항" : "토론게시판"}
            </h2>
            {scopedWeekLabel ? (
              <p className={`mt-1 text-sm ${mutedClass}`}>
                선택한 주차에 연결되는 글로 저장됩니다.
              </p>
            ) : null}
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className={`inline-flex h-9 items-center justify-center rounded-lg border px-3 text-sm font-semibold ${
                isDarkMode
                  ? "border-[#343434] text-gray-100 hover:bg-white/[0.06]"
                  : "border-[#dedbd5] text-[#212121] hover:bg-[#f7f5f1]"
              }`}
            >
              자료 목록으로
            </button>
          ) : null}
        </div>

        {canCreate || editingId != null ? (
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void submitPost();
            }}
          >
            <div
              className={`grid gap-3 ${
                tab === "notices"
                  ? "lg:grid-cols-[9rem_minmax(0,1fr)_8.5rem]"
                  : "lg:grid-cols-[9rem_minmax(0,1fr)_8.5rem]"
              }`}
            >
              {tab === "notices" ? (
                <>
                  <select
                    className={inputClass}
                    value={form.noticeCategory}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        noticeCategory: event.target.value as NoticeCategory,
                      }))
                    }
                  >
                    {Object.entries(NOTICE_CATEGORY_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <input
                    className={inputClass}
                    value={form.title}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, title: event.target.value }))
                    }
                    placeholder="공지 제목"
                  />
                  <div className="flex h-10 flex-col justify-center gap-1">
                    <label className={toggleOptionClass}>
                      <input
                        type="radio"
                        checked={form.pinned}
                        onClick={() =>
                          setForm((prev) => ({ ...prev, pinned: !prev.pinned }))
                        }
                        onChange={() => undefined}
                      />
                      상단 고정
                    </label>
                    <label className={toggleOptionClass}>
                      <input
                        type="radio"
                        checked={form.priority === "IMPORTANT"}
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            priority:
                              prev.priority === "IMPORTANT" ? "NORMAL" : "IMPORTANT",
                          }))
                        }
                        onChange={() => undefined}
                      />
                      중요
                    </label>
                  </div>
                </>
              ) : (
                <>
                  <select
                    className={inputClass}
                    value={form.discussionCategory}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        discussionCategory: event.target.value as DiscussionCategory,
                      }))
                    }
                  >
                    {Object.entries(DISCUSSION_CATEGORY_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <input
                    className={inputClass}
                    value={form.title}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, title: event.target.value }))
                    }
                    placeholder="토론 제목"
                  />
                  <div className="flex h-10 flex-col justify-center gap-1">
                    <label className={toggleOptionClass}>
                      <input
                        type="radio"
                        checked={form.pinned}
                        onClick={() =>
                          setForm((prev) => ({ ...prev, pinned: !prev.pinned }))
                        }
                        onChange={() => undefined}
                      />
                      상단 고정
                    </label>
                    <label className={toggleOptionClass}>
                      <input
                        type="radio"
                        checked={form.allowComments}
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            allowComments: !prev.allowComments,
                          }))
                        }
                        onChange={() => undefined}
                      />
                      댓글 허용
                    </label>
                  </div>
                </>
              )}
            </div>
            {tab === "discussions" ? (
              <div className="grid gap-2 lg:grid-cols-[1fr_auto]">
                <input
                  className={inputClass}
                  value={assistantTopic}
                  onChange={(event) => setAssistantTopic(event.target.value)}
                  placeholder="AI 초안 주제"
                />
                <button
                  type="button"
                  onClick={() => void runDiscussionAssistant()}
                  disabled={assistantLoading || !assistantTopic.trim()}
                  className={`rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-50 ${
                    isDarkMode ? "border-zinc-600 text-gray-100" : "border-gray-300 text-gray-900"
                  }`}
                >
                  {assistantLoading ? "생성 중" : "AI 초안"}
                </button>
              </div>
            ) : null}
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_8.5rem]">
              <label className="flex min-w-0 flex-col gap-1.5">
                <span className={`text-xs font-semibold ${mutedClass}`}>예약 발송</span>
                <input
                  type="date"
                  className={inputClass}
                  value={form.scheduledDate}
                  disabled={form.immediateSend}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      scheduledDate: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="flex min-w-0 flex-col gap-1.5">
                <span className={`text-xs font-semibold ${mutedClass}`}>시간</span>
                <input
                  type="time"
                  className={inputClass}
                  value={form.scheduledTime}
                  disabled={form.immediateSend}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      scheduledTime: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="flex h-10 items-end gap-2 text-xs font-semibold leading-none">
                <input
                  type="radio"
                  checked={form.immediateSend}
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      immediateSend: !prev.immediateSend,
                    }))
                  }
                  onChange={() => undefined}
                />
                즉시 발송
              </label>
            </div>
            {scheduledJobs.length > 0 ? (
              <div
                className={`rounded-lg border px-3 py-2 text-xs ${
                  isDarkMode
                    ? "border-[#1b3443] bg-white/[0.03] text-gray-200"
                    : "border-[#d9d9dd] bg-[#f7f5f1] text-gray-700"
                }`}
              >
                <p className="font-semibold">예약 대기</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {scheduledJobs.map((job) => (
                    <span
                      key={job.id}
                      className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 ${
                        isDarkMode ? "bg-white/[0.06]" : "bg-white"
                      }`}
                    >
                      {job.tab === "notices" ? "공지" : "토론"} · {job.title} ·{" "}
                      {formatInstant(job.scheduledAt)}
                      <button
                        type="button"
                        onClick={() => cancelScheduledJob(job.id)}
                        className="font-semibold text-[#ff824d]"
                      >
                        취소
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            <div className={`overflow-hidden rounded-lg border ${editorSurfaceClass}`}>
              <div
                className={`flex h-10 items-center border-b ${
                  isDarkMode
                    ? "border-[#343434] bg-[#181818]"
                    : "border-[#dedbd5] bg-white"
                }`}
              >
                {[
                  ["paragraph", "본문"],
                  ["bold", "B"],
                  ["italic", "/"],
                  ["underline", "U"],
                  ["bullet", "•"],
                  ["heading", "#"],
                  ["undo", "↶"],
                ].map(([kind, label]) => (
                  <button
                    key={kind}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() =>
                      applyEditorCommand(
                        kind as
                          | "bold"
                          | "italic"
                          | "underline"
                          | "bullet"
                          | "heading"
                          | "paragraph"
                          | "undo",
                      )
                    }
                    className={toolbarButtonClass}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div
                ref={contentEditorRef}
                contentEditable
                suppressContentEditableWarning
                data-placeholder="내용을 입력하세요."
                className={`min-h-56 w-full overflow-y-auto px-3 py-3 text-sm leading-7 outline-none empty:before:pointer-events-none empty:before:text-gray-400 empty:before:content-[attr(data-placeholder)] [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc ${
                  isDarkMode
                    ? "bg-[#202020] text-gray-100"
                    : "bg-white text-[#212121]"
                }`}
                onInput={(event) => {
                  editorHtmlRef.current = event.currentTarget.innerHTML;
                }}
                onBlur={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    contentMarkdown: event.currentTarget.innerHTML,
                  }))
                }
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={saving}
                className={`rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 ${
                  isDarkMode ? "bg-white text-[#141414]" : "bg-[#141414] text-white"
                }`}
              >
                {editingId == null ? "등록" : "수정 저장"}
              </button>
              {editingId != null ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className={`rounded-xl border px-4 py-2 text-sm font-semibold ${
                    isDarkMode ? "border-zinc-600" : "border-gray-300"
                  }`}
                >
                  취소
                </button>
              ) : null}
            </div>
          </form>
        ) : (
          <p className={`mt-4 text-sm ${mutedClass}`}>
            공지 작성은 선생님 계정에서 사용할 수 있습니다.
          </p>
        )}
      </section>

      {error ? (
        <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid min-h-0 gap-4 xl:grid-cols-[0.37fr_1.63fr]">
        <section className={`rounded-xl border ${surfaceClass}`}>
          <div className="flex items-center justify-between border-b border-inherit px-4 py-3">
            <div>
              <h3 className="text-base font-semibold">목록</h3>
              {scopedWeekLabel ? (
                <p className={`mt-0.5 text-xs ${mutedClass}`}>
                  {scopedWeekLabel}에 연결된 글만 표시합니다.
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => void loadList()}
              disabled={loading}
              aria-label="새로고침"
              title="새로고침"
              className={`inline-flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold ${
                isDarkMode ? "border-zinc-600" : "border-gray-300"
              }`}
            >
              <RefreshIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
          {loading ? (
            <div className={`px-5 py-16 text-center text-sm ${mutedClass}`}>
              목록을 불러오는 중입니다.
            </div>
          ) : activeList.length === 0 ? (
            <div className={`px-5 py-16 text-center text-sm ${mutedClass}`}>
              {scopedWeekLabel
                ? `${scopedWeekLabel}에 등록된 글이 없습니다.`
                : "등록된 글이 없습니다."}
            </div>
          ) : (
            <ul className="divide-y divide-inherit">
              {activeList.map((item) => {
                const id =
                  tab === "notices"
                    ? (item as NoticeListItem).noticeId
                    : (item as DiscussionListItem).discussionId;
                const selected = selectedId === id;
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() =>
                        tab === "notices"
                          ? void selectNotice(id)
                          : void selectDiscussion(id)
                      }
                      className={`w-full px-5 py-4 text-left transition-colors ${
                        selected
                          ? isDarkMode
                            ? "bg-white/[0.06]"
                            : "bg-gray-100"
                          : ""
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {item.pinned ? (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              isDarkMode ? "bg-white/10 text-gray-100" : "bg-gray-100 text-gray-900"
                            }`}
                          >
                            고정
                          </span>
                        ) : null}
                        <h4 className="truncate text-sm font-semibold">{item.title}</h4>
                      </div>
                      <p className={`mt-2 text-xs ${mutedClass}`}>
                        {item.authorName || "작성자"} · {formatInstant(item.createdAt)}
                        {tab === "discussions"
                          ? ` · 조회 ${(item as DiscussionListItem).viewCount}`
                          : ""}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {totalPages > 1 ? (
            <div className="flex items-center justify-between border-t border-inherit px-5 py-4">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                disabled={page <= 0 || loading}
                className="text-xs font-semibold disabled:opacity-40"
              >
                이전
              </button>
              <span className={`text-xs ${mutedClass}`}>
                {page + 1} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))}
                disabled={page + 1 >= totalPages || loading}
                className="text-xs font-semibold disabled:opacity-40"
              >
                다음
              </button>
            </div>
          ) : null}
        </section>

        <section className={`rounded-xl border ${surfaceClass}`}>
          {activeDetail == null ? (
            <div className={`px-5 py-20 text-center text-sm ${mutedClass}`}>
              목록에서 글을 선택하세요.
            </div>
          ) : (
            <div className="flex min-h-full flex-col">
              <div className="border-b border-inherit px-5 py-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{activeDetail.title}</h3>
                    <p className={`mt-2 text-xs ${mutedClass}`}>
                      {activeDetail.authorName || "작성자"} ·{" "}
                      {formatInstant(activeDetail.createdAt)}
                    </p>
                  </div>
                  {canEditSelected ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={beginEdit}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                          isDarkMode ? "border-zinc-600" : "border-gray-300"
                        }`}
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteSelected()}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600"
                      >
                        삭제
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="border-b border-inherit px-5 py-5">
                {(() => {
                  const content = stripBoardWeekScopeMarker(
                    tab === "notices"
                      ? selectedNotice?.contentMarkdown ?? ""
                      : selectedDiscussion?.contentMarkdown ?? "",
                  );
                  return looksLikeHtml(content) ? (
                    <div
                      className="text-sm leading-7 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeRichContent(content),
                      }}
                    />
                  ) : (
                    <div className="whitespace-pre-wrap text-sm leading-7">
                      {content}
                    </div>
                  );
                })()}
              </div>
              <div className="px-5 py-5">
                <h4 className="text-sm font-semibold">댓글</h4>
                <div className="mt-3 space-y-2">
                  {comments.length === 0 ? (
                    <p className={`py-4 text-sm ${mutedClass}`}>댓글이 없습니다.</p>
                  ) : (
                    comments.map((comment) => {
                      const commentId = comment.commentId;
                      const canEditComment =
                        isTeacher || comment.authorUserId === user?.userId;
                      return (
                        <div
                          key={commentId}
                          className={`rounded-xl border px-4 py-3 ${
                            isDarkMode
                              ? "border-zinc-700 bg-white/[0.03]"
                              : "border-gray-200 bg-gray-50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold">{comment.authorName}</p>
                              <p className={`mt-1 text-[11px] ${mutedClass}`}>
                                {formatInstant(comment.createdAt)}
                              </p>
                            </div>
                            {canEditComment ? (
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCommentId(commentId);
                                    setCommentText(comment.contentMarkdown);
                                  }}
                                  className="text-xs font-semibold text-[#ff824d]"
                                >
                                  수정
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void deleteComment(commentId)}
                                  className="text-xs font-semibold text-red-500"
                                >
                                  삭제
                                </button>
                              </div>
                            ) : null}
                          </div>
                          <p className="mt-3 whitespace-pre-wrap text-sm leading-6">
                            {comment.contentMarkdown}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
                {tab === "discussions" && selectedDiscussion?.allowComments === false ? (
                  <p className={`mt-4 text-sm ${mutedClass}`}>
                    이 토론은 댓글 작성이 비활성화되어 있습니다.
                  </p>
                ) : (
                  <div className="mt-4 flex gap-2">
                    <input
                      className={`${inputClass} flex-1`}
                      value={commentText}
                      onChange={(event) => setCommentText(event.target.value)}
                      placeholder="댓글을 입력하세요"
                    />
                    <button
                      type="button"
                      onClick={() => void submitComment()}
                      disabled={saving || !commentText.trim()}
                      className="rounded-xl bg-[#141414] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {editingCommentId == null ? "등록" : "저장"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
