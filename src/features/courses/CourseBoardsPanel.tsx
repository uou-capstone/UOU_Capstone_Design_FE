import React from "react";
import { useAuth } from "@/contexts/AuthContext";
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
}

type BoardForm = {
  title: string;
  contentMarkdown: string;
  noticeCategory: NoticeCategory;
  priority: NoticePriority;
  discussionCategory: DiscussionCategory;
  pinned: boolean;
  allowComments: boolean;
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

function emptyForm(): BoardForm {
  return {
    title: "",
    contentMarkdown: "",
    noticeCategory: "GENERAL",
    priority: "NORMAL",
    discussionCategory: "FREE",
    pinned: false,
    allowComments: true,
  };
}

function formatInstant(value: string | undefined): string {
  if (!value) return "-";
  const time = Date.parse(value);
  if (Number.isNaN(time)) return value;
  return new Date(time).toLocaleString("ko-KR");
}

export const CourseBoardsPanel: React.FC<CourseBoardsPanelProps> = ({
  courseId,
  isTeacher,
  isDarkMode,
  initialTab = "notices",
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

  const canCreate = tab === "notices" ? isTeacher : true;
  const selectedId =
    tab === "notices" ? selectedNotice?.noticeId : selectedDiscussion?.discussionId;

  const loadList = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === "notices") {
        const res = await noticeApi.listNotices(courseId, {
          page,
          size: 12,
          sort: "pinned,desc",
        });
        setNotices(res.content ?? []);
        setTotalPages(Math.max(res.totalPages ?? 1, 1));
      } else {
        const res = await discussionApi.listDiscussions(courseId, {
          page,
          size: 12,
          sort: "pinned,desc",
        });
        setDiscussions(res.content ?? []);
        setTotalPages(Math.max(res.totalPages ?? 1, 1));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "목록을 불러오지 못했습니다.");
      setNotices([]);
      setDiscussions([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [courseId, page, tab]);

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
    setEditingId(null);
    setSelectedNotice(null);
    setSelectedDiscussion(null);
    setComments([]);
  }, [courseId, tab]);

  const selectNotice = React.useCallback(
    async (noticeId: number) => {
      setError(null);
      try {
        const detail = await noticeApi.getNotice(courseId, noticeId);
        setSelectedNotice(detail);
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
        setSelectedDiscussion(detail);
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
    setEditingId(null);
  };

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
    if (!form.title.trim() || !form.contentMarkdown.trim()) {
      window.alert("제목과 내용을 입력해주세요.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (tab === "notices") {
        const payload = {
          title: form.title.trim(),
          contentMarkdown: form.contentMarkdown.trim(),
          category: form.noticeCategory,
          priority: form.priority,
          pinned: form.pinned,
        };
        const saved =
          editingId == null
            ? await noticeApi.createNotice(courseId, payload)
            : await noticeApi.updateNotice(courseId, editingId, payload);
        setSelectedNotice(saved);
        await loadComments(saved.noticeId);
      } else {
        const payload = {
          title: form.title.trim(),
          contentMarkdown: form.contentMarkdown.trim(),
          category: form.discussionCategory,
          pinned: form.pinned,
          allowComments: form.allowComments,
        };
        const saved =
          editingId == null
            ? await discussionApi.createDiscussion(courseId, payload)
            : await discussionApi.updateDiscussion(courseId, editingId, payload);
        setSelectedDiscussion(saved);
        await loadComments(saved.discussionId);
      }
      resetForm();
      await loadList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }, [canCreate, courseId, editingId, form, loadComments, loadList, tab]);

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

  return (
    <div className="flex min-h-full flex-col gap-4 pb-6">
      <section className={`rounded-xl border px-4 py-4 ${surfaceClass}`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wide ${mutedClass}`}>
              Classroom Board
            </p>
            <h2 className="mt-1 text-xl font-semibold">
              {tab === "notices" ? "공지사항" : "토론게시판"}
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <TabButton
              active={tab === "notices"}
              isDarkMode={isDarkMode}
              onClick={() => setTab("notices")}
            >
              공지사항
            </TabButton>
            <TabButton
              active={tab === "discussions"}
              isDarkMode={isDarkMode}
              onClick={() => setTab("discussions")}
            >
              토론
            </TabButton>
          </div>
        </div>

        {canCreate || editingId != null ? (
          <form
            className="mt-4 grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void submitPost();
            }}
          >
            <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
              <input
                className={inputClass}
                value={form.title}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, title: event.target.value }))
                }
                placeholder={tab === "notices" ? "공지 제목" : "토론 제목"}
              />
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
                  <select
                    className={inputClass}
                    value={form.priority}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        priority: event.target.value as NoticePriority,
                      }))
                    }
                  >
                    <option value="NORMAL">일반</option>
                    <option value="IMPORTANT">중요</option>
                  </select>
                </>
              ) : (
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
              )}
              <label className="flex h-10 items-center gap-2 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={form.pinned}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, pinned: event.target.checked }))
                  }
                />
                상단 고정
              </label>
            </div>
            {tab === "discussions" ? (
              <div className="grid gap-2 lg:grid-cols-[1fr_auto_auto]">
                <input
                  className={inputClass}
                  value={assistantTopic}
                  onChange={(event) => setAssistantTopic(event.target.value)}
                  placeholder="AI 초안 주제"
                />
                <label className="flex h-10 items-center gap-2 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={form.allowComments}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        allowComments: event.target.checked,
                      }))
                    }
                  />
                  댓글 허용
                </label>
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
            <textarea
              className={`${inputClass} min-h-32 resize-y`}
              value={form.contentMarkdown}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, contentMarkdown: event.target.value }))
              }
              placeholder="마크다운 내용을 입력하세요"
            />
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

      <div className="grid min-h-0 gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <section className={`rounded-xl border ${surfaceClass}`}>
          <div className="flex items-center justify-between border-b border-inherit px-4 py-3">
            <h3 className="text-base font-semibold">목록</h3>
            <button
              type="button"
              onClick={() => void loadList()}
              disabled={loading}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                isDarkMode ? "border-zinc-600" : "border-gray-300"
              }`}
            >
              새로고침
            </button>
          </div>
          {loading ? (
            <div className={`px-5 py-16 text-center text-sm ${mutedClass}`}>
              목록을 불러오는 중입니다.
            </div>
          ) : activeList.length === 0 ? (
            <div className={`px-5 py-16 text-center text-sm ${mutedClass}`}>
              등록된 글이 없습니다.
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
                <div className="whitespace-pre-wrap text-sm leading-7">
                  {tab === "notices"
                    ? selectedNotice?.contentMarkdown
                    : selectedDiscussion?.contentMarkdown}
                </div>
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

function TabButton({
  active,
  isDarkMode,
  onClick,
  children,
}: {
  active: boolean;
  isDarkMode: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
        active
          ? isDarkMode
            ? "bg-white text-[#141414]"
            : "bg-[#141414] text-white"
          : isDarkMode
            ? "bg-white/10 text-gray-300 hover:bg-white/15"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      }`}
    >
      {children}
    </button>
  );
}
