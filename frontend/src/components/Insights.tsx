"use client";

import React, { useEffect, useState } from "react";
import {
  Heart, Lightbulb, MessageCircle, TrendingUp, ChevronDown, ChevronUp,
  ThumbsUp, ThumbsDown, Flag, Send, Sparkles,
} from "lucide-react";
import type {
  PhotoRecord, SymptomEntry, CalendarEvent, CommunityPost, PostCategory, SubscriptionStatus,
} from "@/lib/types";
import {
  getLocalPosts, saveLocalPost, voteLocalPost, reportLocalPost, remoteApi,
} from "@/lib/api";
import { getTipsForWeek } from "@/lib/pregnancy-tips";
import { moderateContent } from "@/lib/content-moderation";
import DailyCheckIn from "./DailyCheckIn";

type SubTab = "checkin" | "tips" | "community" | "trends";

interface InsightsProps {
  photos: PhotoRecord[];
  symptoms: SymptomEntry[];
  events: CalendarEvent[];
  currentWeek: number;
  displayName: string;
  subscription: SubscriptionStatus | null;
  onCheckIn: (entry: Omit<SymptomEntry, "entryId" | "userId">) => void;
}

const CATEGORY_LABELS: Record<PostCategory, string> = {
  tip: "💡 Tip",
  experience: "💬 Experience",
  "hospital-review": "🏥 Hospital Review",
  question: "❓ Question",
};

const Insights: React.FC<InsightsProps> = ({
  photos, symptoms, events, currentWeek, displayName, subscription, onCheckIn,
}) => {
  const [subTab, setSubTab] = useState<SubTab>("checkin");

  // Community state
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostCategory, setNewPostCategory] = useState<PostCategory>("experience");
  const [posting, setPosting] = useState(false);
  const [reportedPosts, setReportedPosts] = useState<Set<string>>(new Set());

  // Load community posts
  useEffect(() => {
    if (remoteApi.available) {
      remoteApi.getPosts().then(setPosts).catch(() => setPosts(getLocalPosts()));
    } else {
      setPosts(getLocalPosts());
    }
  }, []);

  const isPremium = subscription?.limits.isPremium ?? false;

  // ── Tips for current week ──
  const tips = getTipsForWeek(currentWeek);

  // ── Trends data ──
  const photoTimeline = (() => {
    const byWeek = new Map<number, PhotoRecord>();
    photos.forEach((p) => {
      if (!byWeek.has(p.weekNumber) || new Date(p.date) > new Date(byWeek.get(p.weekNumber)!.date)) {
        byWeek.set(p.weekNumber, p);
      }
    });
    return Array.from(byWeek.values()).sort((a, b) => a.weekNumber - b.weekNumber);
  })();

  const moodTrend = (() => {
    const byDate = new Map<string, number>();
    symptoms.forEach((s) => { byDate.set(s.date, s.mood); });
    return Array.from(byDate.entries()).sort((a, b) => a[0].localeCompare(b[0])).slice(-14);
  })();

  const symptomCounts: Record<string, number> = {};
  symptoms.slice(-30).forEach((s) => {
    s.symptoms.forEach((sym) => { symptomCounts[sym] = (symptomCounts[sym] || 0) + 1; });
  });
  const topSymptoms = Object.entries(symptomCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const appointments = events.filter((e) => e.type === "appointment");
  const completed = appointments.filter((e) => e.completed).length;
  const total = appointments.length;

  const checkinDates = new Set(symptoms.map((s) => s.date));
  let streak = 0;
  const d = new Date();
  for (;;) {
    const ds = d.toISOString().slice(0, 10);
    if (checkinDates.has(ds)) { streak++; d.setDate(d.getDate() - 1); } else break;
  }

  // ── Community handlers ──
  async function handleCreatePost() {
    if (!newPostContent.trim() || posting) return;
    setPosting(true);
    const input = { content: newPostContent.trim(), category: newPostCategory, displayName };
    try {
      if (remoteApi.available) {
        const post = await remoteApi.createPost(input);
        setPosts((prev) => [post, ...prev]);
      } else {
        saveLocalPost(input);
        setPosts(getLocalPosts());
      }
    } catch {
      // Fallback to local even if remote failed
      saveLocalPost(input);
      setPosts(getLocalPosts());
    }
    // Always clear form
    setNewPostContent("");
    setNewPostCategory("experience");
    setPosting(false);
  }

  function handleVote(postId: string, vote: "up" | "down") {
    if (!isPremium) return; // voting is premium-only
    if (remoteApi.available) {
      remoteApi.votePost(postId, vote).catch(() => {});
    }
    voteLocalPost(postId, vote);
    setPosts(getLocalPosts());
  }

  function handleReport(postId: string) {
    if (reportedPosts.has(postId)) return;
    if (remoteApi.available) {
      remoteApi.reportPost(postId, "Inappropriate content").catch(() => {});
    }
    reportLocalPost(postId);
    setReportedPosts((prev) => new Set(prev).add(postId));
    setPosts(getLocalPosts());
  }

  // Only show approved posts (or all posts offline for now, with pending message)
  const visiblePosts = posts
    .filter((p) => p.status === "approved" || p.status === "pending")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-primary-700 flex items-center gap-2">
        <Sparkles className="w-5 h-5" /> Insights
      </h2>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-primary-50 rounded-xl p-1">
        {([
          { key: "checkin" as SubTab, icon: <Heart className="w-3.5 h-3.5" />, label: "Check-in" },
          { key: "tips" as SubTab, icon: <Lightbulb className="w-3.5 h-3.5" />, label: "Tips" },
          { key: "community" as SubTab, icon: <MessageCircle className="w-3.5 h-3.5" />, label: "Community" },
          { key: "trends" as SubTab, icon: <TrendingUp className="w-3.5 h-3.5" />, label: "Trends" },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={`flex-1 py-2.5 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              subTab === t.key ? "bg-white text-primary-700 shadow-sm" : "text-primary-400 hover:text-primary-600"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Check-in sub-tab ── */}
      {subTab === "checkin" && (
        <div className="space-y-4">
          {streak > 0 && (
            <div className="card p-3 bg-gradient-to-r from-purple-50 to-pink-50 flex items-center gap-3">
              <span className="text-2xl">🔥</span>
              <div>
                <p className="text-sm font-bold text-primary-700">{streak}-day streak!</p>
                <p className="text-[10px] text-primary-400">Keep showing up for yourself, mama</p>
              </div>
            </div>
          )}
          <DailyCheckIn onSave={onCheckIn} />
        </div>
      )}

      {/* ── Tips sub-tab ── */}
      {subTab === "tips" && (
        <div className="space-y-4">
          <p className="text-sm text-primary-500">
            Personalised for <strong>Week {currentWeek}</strong> of your journey
          </p>
          {tips.length === 0 ? (
            <div className="card p-6 text-center">
              <p className="text-primary-400">No tips for this week yet. Check back soon!</p>
            </div>
          ) : (
            tips.map((tip, i) => (
              <div key={i} className="card p-4 bg-gradient-to-br from-pink-50 to-purple-50">
                <div className="flex items-start gap-3">
                  <span className="text-lg">
                    {tip.category === "nutrition" ? "🥗" : tip.category === "wellness" ? "🌸" : tip.category === "exercise" ? "🧘‍♀️" : tip.category === "preparation" ? "🎒" : "💗"}
                  </span>
                  <div>
                    <h4 className="font-semibold text-primary-700 text-sm">{tip.title}</h4>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">{tip.body}</p>
                    <span className="text-[10px] text-primary-300 mt-2 inline-block capitalize">{tip.category}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Community sub-tab ── */}
      {subTab === "community" && (
        <div className="space-y-4">
          {/* Compose new post */}
          <div className="card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-primary-700 flex items-center gap-2">
              <MessageCircle className="w-4 h-4" /> Share with fellow mamas
            </h3>
            <p className="text-[10px] text-gray-400">
              IF YOU THINK IT WOULD HELP A FELLOW SISTER — PLEASE SHARE 💕<br />
              Posts are reviewed before being visible to the community.
            </p>
            <div className="flex gap-2 flex-wrap">
              {(Object.entries(CATEGORY_LABELS) as [PostCategory, string][]).map(([cat, label]) => (
                <button
                  key={cat}
                  onClick={() => setNewPostCategory(cat)}
                  className={`text-[10px] px-2.5 py-1 rounded-full border transition-all ${
                    newPostCategory === cat
                      ? "bg-primary-500 text-white border-primary-500"
                      : "border-primary-200 text-gray-500 hover:border-primary-400"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <textarea
              rows={3}
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              placeholder="Share a tip, experience, or kind words..."
              className="text-sm"
              maxLength={500}
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-400">{newPostContent.length}/500</span>
              <button
                onClick={handleCreatePost}
                disabled={!newPostContent.trim() || posting}
                className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 disabled:opacity-40"
              >
                <Send className="w-3 h-3" /> {posting ? "Sending..." : "Share"}
              </button>
            </div>
          </div>

          {/* Community guidelines notice */}
          <div className="card p-3 bg-gradient-to-r from-purple-50 to-pink-50">
            <p className="text-[10px] text-primary-600">
              <strong>Community guidelines:</strong> Be kind, be supportive, be honest. No medical advice (always see your doctor).
              Posts are moderated to keep this a safe space for all expecting mothers. ❤️
            </p>
          </div>

          {/* Posts feed */}
          {visiblePosts.length === 0 ? (
            <div className="card p-6 text-center">
              <p className="text-primary-400 text-sm">No posts yet. Be the first to share!</p>
            </div>
          ) : (
            visiblePosts.map((post) => (
              <div key={post.postId} className="card p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold text-primary-700">{post.displayName}</span>
                    <span className="text-[10px] text-gray-400 ml-2">
                      {CATEGORY_LABELS[post.category]}
                    </span>
                    {post.status === "pending" && (
                      <span className="text-[10px] text-amber-500 ml-2">⏳ Awaiting review</span>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{post.content}</p>
                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={() => handleVote(post.postId, "up")}
                    disabled={!isPremium}
                    className={`flex items-center gap-1 text-xs transition-all ${
                      post.votes?.["local-user"] === "up" ? "text-green-500" : "text-gray-400 hover:text-green-500"
                    } ${!isPremium ? "opacity-40 cursor-not-allowed" : ""}`}
                    title={isPremium ? "Upvote" : "Premium members can vote"}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" /> {post.upvotes}
                  </button>
                  <button
                    onClick={() => handleVote(post.postId, "down")}
                    disabled={!isPremium}
                    className={`flex items-center gap-1 text-xs transition-all ${
                      post.votes?.["local-user"] === "down" ? "text-red-400" : "text-gray-400 hover:text-red-400"
                    } ${!isPremium ? "opacity-40 cursor-not-allowed" : ""}`}
                    title={isPremium ? "Downvote" : "Premium members can vote"}
                  >
                    <ThumbsDown className="w-3.5 h-3.5" /> {post.downvotes}
                  </button>
                  <button
                    onClick={() => handleReport(post.postId)}
                    disabled={reportedPosts.has(post.postId)}
                    className={`flex items-center gap-1 text-xs ml-auto transition-all ${
                      reportedPosts.has(post.postId) ? "text-amber-400" : "text-gray-300 hover:text-amber-500"
                    }`}
                    title="Report this post"
                  >
                    <Flag className="w-3.5 h-3.5" /> {reportedPosts.has(post.postId) ? "Reported" : "Report"}
                  </button>
                </div>
                {!isPremium && (
                  <p className="text-[10px] text-purple-400">Upgrade to Premium to vote on posts</p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Trends sub-tab ── */}
      {subTab === "trends" && (
        <div className="space-y-4">
          {/* Photo timeline */}
          <div className="card p-4 bg-gradient-to-br from-pink-50 to-purple-50">
            <h3 className="font-semibold text-primary-700 mb-2">Photo Timeline</h3>
            {photoTimeline.length === 0 ? (
              <p className="text-primary-400 text-sm">No photos yet. Add your first bump or scan photo!</p>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {photoTimeline.map((p) => (
                  <div key={p.photoId} className="flex flex-col items-center min-w-[72px]">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-primary-100 flex items-center justify-center">
                      {p.presignedUrl ? (
                        <img src={p.presignedUrl} alt={p.caption ?? `Week ${p.weekNumber}`} className="object-cover w-full h-full" />
                      ) : (
                        <span className="text-xs text-primary-300">No image</span>
                      )}
                    </div>
                    <span className="text-[10px] text-primary-500 mt-1">Week {p.weekNumber}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mood trend */}
          <div className="card p-4 bg-gradient-to-br from-purple-50 to-pink-50">
            <h3 className="font-semibold text-primary-700 mb-2">Mood Trend (last 2 weeks)</h3>
            {moodTrend.length === 0 ? (
              <p className="text-primary-400 text-sm">No check-ins yet. Use the Check-in tab to track your mood.</p>
            ) : (
              <div className="flex gap-1 items-end h-16">
                {moodTrend.map(([date, mood]) => (
                  <div key={date} className="flex flex-col items-center justify-end h-full">
                    <div
                      className={`rounded-full w-4 ${mood === 5 ? "bg-pink-400" : mood === 4 ? "bg-purple-400" : mood === 3 ? "bg-primary-300" : mood === 2 ? "bg-amber-300" : "bg-gray-300"}`}
                      style={{ height: `${mood * 12}px` }}
                      title={date}
                    />
                    <span className="text-[9px] text-gray-400 mt-0.5">{date.slice(5)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top symptoms */}
          <div className="card p-4 bg-gradient-to-br from-pink-50 to-purple-50">
            <h3 className="font-semibold text-primary-700 mb-2">Top Symptoms (last 2 weeks)</h3>
            {topSymptoms.length === 0 ? (
              <p className="text-primary-400 text-sm">No symptoms tracked yet.</p>
            ) : (
              <ul className="flex gap-4 flex-wrap">
                {topSymptoms.map(([sym, count]) => (
                  <li key={sym} className="text-sm text-primary-600 flex flex-col items-center">
                    <span className="font-bold text-lg">{count}</span>
                    <span className="text-xs">{sym}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Appointments */}
          <div className="card p-4 bg-gradient-to-br from-purple-50 to-pink-50">
            <h3 className="font-semibold text-primary-700 mb-2">Appointments</h3>
            {total === 0 ? (
              <p className="text-primary-400 text-sm">No appointments added yet.</p>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-primary-600 font-bold text-lg">{completed}</span>
                <span className="text-primary-500">completed</span>
                <span className="text-gray-400">/</span>
                <span className="text-primary-400 font-bold text-lg">{total}</span>
                <span className="text-primary-500">total</span>
              </div>
            )}
          </div>

          {/* Check-in streak */}
          <div className="card p-4 bg-gradient-to-br from-pink-50 to-purple-50">
            <h3 className="font-semibold text-primary-700 mb-2">Check-in Streak</h3>
            <p className="text-primary-600 text-lg font-bold">{streak} day{streak === 1 ? "" : "s"}</p>
            <p className="text-xs text-primary-400">Consecutive days with a check-in</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Insights;
