"use client";

import React, { useEffect, useState } from "react";
import {
  Shield, CheckCircle, XCircle, AlertTriangle, Trash2,
  Eye, ChevronDown, ChevronUp, ArrowLeft, Lock, RefreshCw,
} from "lucide-react";
import type { CommunityPost, PostCategory, PostStatus } from "@/lib/types";
import {
  getAllLocalPosts, updateLocalPostStatus, deleteLocalPost,
  getAdminPin, setAdminPin, verifyAdminPin,
} from "@/lib/api";
import { moderateContent, type ModerationResult, type ViolationType } from "@/lib/content-moderation";

interface AdminPanelProps {
  onClose: () => void;
}

const CATEGORY_LABELS: Record<PostCategory, string> = {
  tip: "💡 Tip",
  experience: "💬 Experience",
  "hospital-review": "🏥 Hospital Review",
  question: "❓ Question",
};

const STATUS_STYLES: Record<PostStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-amber-50", text: "text-amber-600", label: "⏳ Pending" },
  approved: { bg: "bg-green-50", text: "text-green-600", label: "✅ Approved" },
  rejected: { bg: "bg-red-50", text: "text-red-600", label: "❌ Rejected" },
};

const VIOLATION_LABELS: Record<ViolationType, string> = {
  hate_speech: "🚫 Hate Speech",
  violence: "⚔️ Violence / Threats",
  bullying: "😡 Bullying / Harassment",
  spam: "📧 Spam / Scam",
  medical_misinformation: "💊 Medical Misinformation",
  profanity: "🤬 Profanity",
};

const SEVERITY_STYLES: Record<string, string> = {
  none: "text-green-600 bg-green-50",
  low: "text-amber-600 bg-amber-50",
  medium: "text-orange-600 bg-orange-50",
  high: "text-red-600 bg-red-50",
};

type FilterStatus = "all" | PostStatus;

const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const [authenticated, setAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [isSetup, setIsSetup] = useState(false);
  const [confirmPin, setConfirmPin] = useState("");

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [moderationCache, setModerationCache] = useState<Map<string, ModerationResult>>(new Map());
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("pending");
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Check if admin PIN exists
  useEffect(() => {
    const pin = getAdminPin();
    setIsSetup(!!pin);
  }, []);

  // Load posts and run moderation
  useEffect(() => {
    if (!authenticated) return;
    refreshPosts();
  }, [authenticated]);

  function refreshPosts() {
    const allPosts = getAllLocalPosts();
    setPosts(allPosts);
    // Run moderation on all posts and cache results
    const cache = new Map<string, ModerationResult>();
    allPosts.forEach((p) => {
      cache.set(p.postId, moderateContent(p.content));
    });
    setModerationCache(cache);
  }

  // ── Auth flow ──
  function handlePinSubmit() {
    if (isSetup) {
      // Verify existing PIN
      if (verifyAdminPin(pinInput)) {
        setAuthenticated(true);
        setPinError("");
      } else {
        setPinError("Incorrect PIN. Try again.");
      }
    } else {
      // Setting up new PIN
      if (pinInput.length < 4) {
        setPinError("PIN must be at least 4 digits.");
        return;
      }
      if (!confirmPin) {
        setConfirmPin(pinInput);
        setPinInput("");
        setPinError("");
        return;
      }
      if (pinInput === confirmPin) {
        setAdminPin(pinInput);
        setIsSetup(true);
        setAuthenticated(true);
        setPinError("");
      } else {
        setPinError("PINs don't match. Start over.");
        setConfirmPin("");
        setPinInput("");
      }
    }
    setPinInput("");
  }

  // ── Actions ──
  function handleApprove(postId: string) {
    updateLocalPostStatus(postId, "approved");
    refreshPosts();
  }

  function handleReject(postId: string) {
    updateLocalPostStatus(postId, "rejected");
    refreshPosts();
  }

  function handleDelete(postId: string) {
    deleteLocalPost(postId);
    setConfirmDelete(null);
    refreshPosts();
  }

  /** Auto-moderate all pending posts based on the content engine */
  function handleBulkAutoModerate() {
    setBulkProcessing(true);
    const allPosts = getAllLocalPosts();
    let changed = 0;
    allPosts.forEach((p) => {
      if (p.status !== "pending") return;
      const result = moderateContent(p.content);
      if (result.autoAction === "approve") {
        updateLocalPostStatus(p.postId, "approved");
        changed++;
      } else if (result.autoAction === "reject") {
        updateLocalPostStatus(p.postId, "rejected");
        changed++;
      }
      // "flag" stays pending for manual review
    });
    refreshPosts();
    setBulkProcessing(false);
  }

  // ── Filtered posts ──
  const filtered = posts
    .filter((p) => filterStatus === "all" || p.status === filterStatus)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const stats = {
    total: posts.length,
    pending: posts.filter((p) => p.status === "pending").length,
    approved: posts.filter((p) => p.status === "approved").length,
    rejected: posts.filter((p) => p.status === "rejected").length,
    flagged: posts.filter((p) => {
      const r = moderationCache.get(p.postId);
      return r && !r.passed && p.status === "pending";
    }).length,
  };

  // ── PIN screen ──
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="card max-w-sm w-full p-6 space-y-5">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary-500" />
              <h1 className="text-lg font-bold text-primary-700">Admin Panel</h1>
            </div>
          </div>

          <div className="text-center space-y-2">
            <Lock className="w-10 h-10 text-primary-300 mx-auto" />
            <p className="text-sm text-gray-600">
              {!isSetup
                ? confirmPin
                  ? "Confirm your new admin PIN"
                  : "Set up your admin PIN (minimum 4 digits)"
                : "Enter your admin PIN"}
            </p>
          </div>

          <div className="space-y-3">
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={8}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && handlePinSubmit()}
              placeholder="● ● ● ●"
              className="text-center text-2xl tracking-[0.5em] font-mono"
              autoFocus
            />
            {pinError && <p className="text-xs text-red-500 text-center">{pinError}</p>}
            <button
              onClick={handlePinSubmit}
              disabled={pinInput.length < 4}
              className="btn-primary w-full disabled:opacity-40"
            >
              {!isSetup ? (confirmPin ? "Confirm PIN" : "Set PIN") : "Unlock"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main admin dashboard ──
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Shield className="w-5 h-5 text-primary-500" />
            <h1 className="text-lg font-bold text-primary-700">Community Moderation</h1>
          </div>
          <button
            onClick={refreshPosts}
            className="text-gray-400 hover:text-primary-500 p-2 rounded-lg hover:bg-primary-50"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card p-3 text-center">
            <p className="text-2xl font-bold text-primary-600">{stats.total}</p>
            <p className="text-[10px] text-gray-500">Total Posts</p>
          </div>
          <div className="card p-3 text-center bg-amber-50">
            <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
            <p className="text-[10px] text-gray-500">Pending Review</p>
          </div>
          <div className="card p-3 text-center bg-green-50">
            <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
            <p className="text-[10px] text-gray-500">Approved</p>
          </div>
          <div className="card p-3 text-center bg-red-50">
            <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
            <p className="text-[10px] text-gray-500">Rejected</p>
          </div>
        </div>

        {/* Auto-flagged alert */}
        {stats.flagged > 0 && (
          <div className="card p-3 bg-orange-50 border-l-4 border-orange-400 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-orange-700">
                {stats.flagged} post{stats.flagged > 1 ? "s" : ""} flagged by auto-screening
              </p>
              <p className="text-[10px] text-orange-500">These need manual review before approving</p>
            </div>
          </div>
        )}

        {/* Bulk actions */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleBulkAutoModerate}
            disabled={bulkProcessing || stats.pending === 0}
            className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 disabled:opacity-40"
          >
            <Shield className="w-3.5 h-3.5" />
            {bulkProcessing ? "Processing..." : "Auto-screen all pending"}
          </button>
          <p className="text-[10px] text-gray-400">
            Auto-approves clean posts, auto-rejects severe violations, flags medium posts for your review
          </p>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(["all", "pending", "approved", "rejected"] as FilterStatus[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilterStatus(f)}
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all capitalize ${
                filterStatus === f ? "bg-white text-primary-700 shadow-sm" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {f} {f !== "all" ? `(${posts.filter((p) => p.status === f).length})` : ""}
            </button>
          ))}
        </div>

        {/* Posts list */}
        {filtered.length === 0 ? (
          <div className="card p-8 text-center">
            <Shield className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">
              {filterStatus === "pending" ? "No posts awaiting review" : "No posts in this category"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((post) => {
              const modResult = moderationCache.get(post.postId);
              const isExpanded = expandedPost === post.postId;
              const statusStyle = STATUS_STYLES[post.status];

              return (
                <div
                  key={post.postId}
                  className={`card overflow-hidden ${
                    modResult && !modResult.passed && post.status === "pending"
                      ? "ring-2 ring-orange-300"
                      : ""
                  }`}
                >
                  {/* Post header */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-primary-700">{post.displayName}</span>
                        <span className="text-[10px] text-gray-400">{CATEGORY_LABELS[post.category]}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
                          {statusStyle.label}
                        </span>
                        {modResult && !modResult.passed && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${SEVERITY_STYLES[modResult.severity]}`}>
                            ⚠ {modResult.severity.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="text-sm text-gray-700 leading-relaxed">{post.content}</p>

                    {/* Report count */}
                    {post.reportCount > 0 && (
                      <p className="text-[10px] text-red-400 mt-1">🚩 {post.reportCount} report{post.reportCount > 1 ? "s" : ""}</p>
                    )}

                    {/* Moderation detail toggle */}
                    <button
                      onClick={() => setExpandedPost(isExpanded ? null : post.postId)}
                      className="text-[10px] text-gray-400 hover:text-primary-500 mt-2 flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" /> Moderation details
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>

                    {/* Expanded moderation details */}
                    {isExpanded && modResult && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${SEVERITY_STYLES[modResult.severity]}`}>
                            Severity: {modResult.severity}
                          </span>
                          <span className="text-xs text-gray-500">
                            Auto-action: <strong>{modResult.autoAction}</strong>
                          </span>
                        </div>
                        {modResult.violations.length === 0 ? (
                          <p className="text-xs text-green-600">✅ No violations detected — content appears clean</p>
                        ) : (
                          <ul className="space-y-1">
                            {modResult.violations.map((v, i) => (
                              <li key={i} className="text-xs text-red-600 flex items-start gap-1.5">
                                <span>{VIOLATION_LABELS[v.type]}</span>
                                <span className="text-gray-500">— {v.reason}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="text-[10px] text-gray-400 mt-1">
                          <p>Post ID: {post.postId}</p>
                          <p>Votes: 👍 {post.upvotes} / 👎 {post.downvotes}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex border-t border-gray-100">
                    {post.status !== "approved" && (
                      <button
                        onClick={() => handleApprove(post.postId)}
                        className="flex-1 py-2.5 text-xs font-medium text-green-600 hover:bg-green-50 flex items-center justify-center gap-1.5 transition-all"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </button>
                    )}
                    {post.status !== "rejected" && (
                      <button
                        onClick={() => handleReject(post.postId)}
                        className="flex-1 py-2.5 text-xs font-medium text-red-500 hover:bg-red-50 flex items-center justify-center gap-1.5 transition-all"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    )}
                    {confirmDelete === post.postId ? (
                      <button
                        onClick={() => handleDelete(post.postId)}
                        className="flex-1 py-2.5 text-xs font-medium text-red-700 bg-red-100 flex items-center justify-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Confirm Delete
                      </button>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(post.postId)}
                        className="flex-1 py-2.5 text-xs font-medium text-gray-400 hover:bg-gray-50 flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Moderation guidelines */}
        <div className="card p-4 bg-gradient-to-br from-purple-50 to-pink-50">
          <h3 className="text-sm font-semibold text-primary-700 mb-2">Screening Guide</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] text-gray-600">
            <div>
              <p className="font-medium text-primary-600 mb-1">Auto-rejected (high severity):</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Hate speech, slurs, discriminatory language</li>
                <li>Violence, threats, self-harm</li>
                <li>Bullying, harassment, personal attacks</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-primary-600 mb-1">Flagged for review (medium):</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Spam, scam links, solicitation</li>
                <li>Medical misinformation</li>
                <li>Profanity (context matters)</li>
              </ul>
            </div>
          </div>
          <p className="text-[10px] text-gray-400 mt-2">
            The auto-screener catches common violations. Clean posts are auto-approved.
            Posts with medium-severity issues are flagged for your manual decision.
          </p>
        </div>
      </main>
    </div>
  );
};

export default AdminPanel;
