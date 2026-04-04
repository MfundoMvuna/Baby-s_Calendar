"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  MessageCircle, ThumbsUp, ThumbsDown, Flag, Send, Plus, X,
  RefreshCw, ChevronDown, ChevronUp, Filter,
} from "lucide-react";
import type {
  CommunityComment,
  CommunityPost,
  CreatePostInput,
  PostCategory,
} from "@/lib/types";
import {
  getLocalPosts,
  saveLocalPost,
  voteLocalPost,
  reportLocalPost,
  getLocalComments,
  saveLocalComment,
  remoteApi,
} from "@/lib/api";
import { useAuth } from "./AuthProvider";

interface CommunityProps {
  displayName: string;
}

const CATEGORY_OPTIONS: { value: PostCategory; label: string; emoji: string }[] = [
  { value: "tip", label: "Tip", emoji: "💡" },
  { value: "experience", label: "Experience", emoji: "💬" },
  { value: "hospital-review", label: "Hospital Review", emoji: "🏥" },
  { value: "question", label: "Question", emoji: "❓" },
];

const CATEGORY_LABELS: Record<PostCategory, string> = {
  tip: "💡 Tip",
  experience: "💬 Experience",
  "hospital-review": "🏥 Hospital Review",
  question: "❓ Question",
};

/** Pub/Sub polling interval (seconds) */
const POLL_INTERVAL = 15;

const Community: React.FC<CommunityProps> = ({ displayName }) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [comments, setComments] = useState<Map<string, CommunityComment[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<PostCategory | "all">("all");

  // New post form
  const [showCompose, setShowCompose] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState<PostCategory>("experience");
  const [posting, setPosting] = useState(false);

  // Comment state per post
  const [expandedComments, setExpandedComments] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<string | null>(null);

  // Polling ref
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Load posts (pub/sub — poll for updates) ──

  const fetchPosts = useCallback(async () => {
    let fetched: CommunityPost[] = [];
    if (remoteApi.available) {
      try {
        fetched = await remoteApi.getPosts();
      } catch {
        fetched = getLocalPosts();
      }
    } else {
      fetched = getLocalPosts();
    }
    // Show only approved posts to regular users
    fetched = fetched.filter((p) => p.status === "approved");
    fetched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setPosts(fetched);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPosts();
    // Pub/Sub polling — check for new posts periodically
    pollRef.current = setInterval(fetchPosts, POLL_INTERVAL * 1000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchPosts]);

  // ── Load comments for expanded post ──
  useEffect(() => {
    if (!expandedComments) return;
    if (remoteApi.available) {
      remoteApi.getComments(expandedComments)
        .then((postComments) => {
          setComments((prev) => new Map(prev).set(expandedComments, postComments));
        })
        .catch(() => {
          const postComments = getLocalComments(expandedComments);
          setComments((prev) => new Map(prev).set(expandedComments, postComments));
        });
      return;
    }

    const postComments = getLocalComments(expandedComments);
    setComments((prev) => new Map(prev).set(expandedComments, postComments));
  }, [expandedComments]);

  // ── Handlers ──

  async function handleCreatePost() {
    if (!newContent.trim()) return;
    setPosting(true);
    const input: CreatePostInput = {
      content: newContent.trim(),
      category: newCategory,
      displayName,
    };
    if (remoteApi.available) {
      try {
        await remoteApi.createPost(input);
      } catch {
        saveLocalPost(input);
      }
    } else {
      saveLocalPost(input);
    }
    setNewContent("");
    setShowCompose(false);
    setPosting(false);
    await fetchPosts();
  }

  function handleVote(postId: string, vote: "up" | "down") {
    if (remoteApi.available) {
      remoteApi.votePost(postId, vote).catch(() => {
        voteLocalPost(postId, vote);
      });
    } else {
      voteLocalPost(postId, vote);
    }
    // Optimistic update
    setPosts((prev) =>
      prev.map((p) => {
        if (p.postId !== postId) return p;
        const prevVote = p.votes?.[user?.userId ?? "local-user"];
        let { upvotes, downvotes } = p;
        if (prevVote === "up") upvotes = Math.max(0, upvotes - 1);
        if (prevVote === "down") downvotes = Math.max(0, downvotes - 1);
        if (prevVote === vote) {
          const votes = { ...(p.votes ?? {}) };
          delete votes[user?.userId ?? "local-user"];
          return { ...p, upvotes, downvotes, votes };
        }
        if (vote === "up") upvotes++;
        else downvotes++;
        return {
          ...p,
          upvotes,
          downvotes,
          votes: { ...(p.votes ?? {}), [user?.userId ?? "local-user"]: vote },
        };
      }),
    );
  }

  function handleReport(postId: string) {
    if (remoteApi.available) {
      remoteApi.reportPost(postId, "Reported by user").catch(() => {
        reportLocalPost(postId);
      });
    } else {
      reportLocalPost(postId);
    }
    setPosts((prev) =>
      prev.map((p) => (p.postId === postId ? { ...p, reportCount: p.reportCount + 1 } : p)),
    );
  }

  async function handleSubmitComment(postId: string) {
    const content = commentInputs[postId]?.trim();
    if (!content) return;
    setSubmittingComment(postId);

    let comment: CommunityComment;
    if (remoteApi.available) {
      try {
        comment = await remoteApi.createComment(postId, content, displayName);
      } catch {
        comment = saveLocalComment(postId, content, displayName);
      }
    } else {
      comment = saveLocalComment(postId, content, displayName);
    }

    setComments((prev) => {
      const existing = prev.get(postId) ?? [];
      return new Map(prev).set(postId, [...existing, comment]);
    });
    setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
    setSubmittingComment(null);
  }

  // ── Filter ──
  const filtered = filterCategory === "all" ? posts : posts.filter((p) => p.category === filterCategory);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-primary-700 flex items-center gap-2">
          <MessageCircle className="w-5 h-5" /> Community
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchPosts}
            className="p-2 rounded-lg hover:bg-primary-50 text-gray-400 hover:text-primary-500"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowCompose(!showCompose)}
            className="btn-primary text-xs px-3 py-2 flex items-center gap-1.5"
          >
            {showCompose ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showCompose ? "Cancel" : "New Post"}
          </button>
        </div>
      </div>

      {/* Compose form */}
      {showCompose && (
        <div className="card p-4 space-y-3 ring-2 ring-primary-200">
          <h3 className="text-sm font-semibold text-primary-700">Share with the community</h3>
          <div className="flex gap-2 flex-wrap">
            {CATEGORY_OPTIONS.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setNewCategory(cat.value)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                  newCategory === cat.value
                    ? "bg-primary-500 text-white border-primary-500"
                    : "border-primary-200 text-gray-500 hover:border-primary-400"
                }`}
              >
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>
          <textarea
            rows={3}
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="What would you like to share? Tips, experiences, questions..."
            className="text-sm"
          />
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-gray-400">
              Posts are reviewed before they appear to the community.
            </p>
            <button
              onClick={handleCreatePost}
              disabled={!newContent.trim() || posting}
              className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" /> {posting ? "Posting..." : "Post"}
            </button>
          </div>
        </div>
      )}

      {/* Category filter */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        <button
          onClick={() => setFilterCategory("all")}
          className={`px-3 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
            filterCategory === "all" ? "bg-white text-primary-700 shadow-sm" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          All
        </button>
        {CATEGORY_OPTIONS.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setFilterCategory(cat.value)}
            className={`px-3 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
              filterCategory === cat.value ? "bg-white text-primary-700 shadow-sm" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {cat.emoji} {cat.label}
          </button>
        ))}
      </div>

      {/* Live indicator */}
      <div className="flex items-center gap-2 text-[10px] text-gray-400">
        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        Live — updates every {POLL_INTERVAL}s
      </div>

      {/* Posts list */}
      {loading ? (
        <div className="card p-8 text-center">
          <RefreshCw className="w-8 h-8 text-gray-200 mx-auto mb-2 animate-spin" />
          <p className="text-sm text-gray-400">Loading community posts...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center">
          <MessageCircle className="w-10 h-10 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">
            {filterCategory === "all"
              ? "No posts yet. Be the first to share!"
              : "No posts in this category yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((post) => {
            const isExpanded = expandedComments === post.postId;
            const postComments = comments.get(post.postId) ?? [];
            const currentVote = post.votes?.[user?.userId ?? "local-user"];

            return (
              <div key={post.postId} className="card overflow-hidden">
                <div className="p-4">
                  {/* Post header */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                      {post.displayName.charAt(0).toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">{post.displayName}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400">
                          {new Date(post.createdAt).toLocaleDateString()}
                        </span>
                        <span className="text-[10px] text-primary-400">
                          {CATEGORY_LABELS[post.category]}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Post content */}
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {post.content}
                  </p>

                  {/* Action bar */}
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50">
                    <button
                      onClick={() => handleVote(post.postId, "up")}
                      className={`flex items-center gap-1 text-xs transition-colors ${
                        currentVote === "up" ? "text-primary-600 font-medium" : "text-gray-400 hover:text-primary-500"
                      }`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" /> {post.upvotes}
                    </button>
                    <button
                      onClick={() => handleVote(post.postId, "down")}
                      className={`flex items-center gap-1 text-xs transition-colors ${
                        currentVote === "down" ? "text-red-500 font-medium" : "text-gray-400 hover:text-gray-500"
                      }`}
                    >
                      <ThumbsDown className="w-3.5 h-3.5" /> {post.downvotes}
                    </button>
                    <button
                      onClick={() => setExpandedComments(isExpanded ? null : post.postId)}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary-500 transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      {postComments.length > 0 ? `${postComments.length} comment${postComments.length > 1 ? "s" : ""}` : "Comment"}
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                    <button
                      onClick={() => handleReport(post.postId)}
                      className="flex items-center gap-1 text-xs text-gray-300 hover:text-red-400 transition-colors ml-auto"
                    >
                      <Flag className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Comments section */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-3">
                    {postComments.length === 0 && (
                      <p className="text-xs text-gray-400 text-center">No comments yet. Be the first!</p>
                    )}
                    {postComments.map((comment) => (
                      <div key={comment.commentId} className="flex gap-2">
                        <span className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-300 to-pink-300 flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5">
                          {comment.displayName.charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-700">{comment.displayName}</span>
                            <span className="text-[10px] text-gray-400">
                              {new Date(comment.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 leading-relaxed">{comment.content}</p>
                        </div>
                      </div>
                    ))}

                    {/* Comment input */}
                    <div className="flex gap-2 mt-2">
                      <input
                        type="text"
                        placeholder="Write a comment..."
                        value={commentInputs[post.postId] ?? ""}
                        onChange={(e) => setCommentInputs((prev) => ({ ...prev, [post.postId]: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && handleSubmitComment(post.postId)}
                        className="flex-1 text-xs !py-2"
                      />
                      <button
                        onClick={() => handleSubmitComment(post.postId)}
                        disabled={!commentInputs[post.postId]?.trim() || submittingComment === post.postId}
                        className="btn-primary text-xs !py-2 !px-3 disabled:opacity-40"
                      >
                        <Send className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Community;
