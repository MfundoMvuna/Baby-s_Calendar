using System.Text.Json.Serialization;

namespace BabysCalendar.Api.Models;

public class PregnancyRecord
{
    [JsonPropertyName("userId")]
    public string UserId { get; set; } = string.Empty;

    [JsonPropertyName("lmpDate")]
    public string LmpDate { get; set; } = string.Empty;

    [JsonPropertyName("eddDate")]
    public string EddDate { get; set; } = string.Empty;

    [JsonPropertyName("currentWeek")]
    public int CurrentWeek { get; set; }

    [JsonPropertyName("parity")]
    public int Parity { get; set; }

    [JsonPropertyName("riskFactors")]
    public List<string> RiskFactors { get; set; } = new();

    [JsonPropertyName("babyNickname")]
    public string? BabyNickname { get; set; }

    [JsonPropertyName("displayName")]
    public string DisplayName { get; set; } = string.Empty;

    [JsonPropertyName("createdAt")]
    public string CreatedAt { get; set; } = string.Empty;
}

public class CalendarEvent
{
    [JsonPropertyName("eventId")]
    public string EventId { get; set; } = string.Empty;

    [JsonPropertyName("userId")]
    public string UserId { get; set; } = string.Empty;

    [JsonPropertyName("date")]
    public string Date { get; set; } = string.Empty;

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("completed")]
    public bool Completed { get; set; }

    [JsonPropertyName("notes")]
    public string? Notes { get; set; }

    [JsonPropertyName("questions")]
    public List<string>? Questions { get; set; }

    [JsonPropertyName("answers")]
    public Dictionary<string, string>? Answers { get; set; }
}

public class SymptomEntry
{
    [JsonPropertyName("entryId")]
    public string EntryId { get; set; } = string.Empty;

    [JsonPropertyName("userId")]
    public string UserId { get; set; } = string.Empty;

    [JsonPropertyName("date")]
    public string Date { get; set; } = string.Empty;

    [JsonPropertyName("mood")]
    public int Mood { get; set; }

    [JsonPropertyName("symptoms")]
    public List<string> Symptoms { get; set; } = new();

    [JsonPropertyName("weight")]
    public double? Weight { get; set; }

    [JsonPropertyName("bloodPressureSystolic")]
    public int? BloodPressureSystolic { get; set; }

    [JsonPropertyName("bloodPressureDiastolic")]
    public int? BloodPressureDiastolic { get; set; }

    [JsonPropertyName("notes")]
    public string? Notes { get; set; }
}

public class OnboardingData
{
    [JsonPropertyName("displayName")]
    public string DisplayName { get; set; } = string.Empty;

    [JsonPropertyName("lmpDate")]
    public string LmpDate { get; set; } = string.Empty;

    [JsonPropertyName("weeksPregnant")]
    public int? WeeksPregnant { get; set; }

    [JsonPropertyName("hasSeenDoctor")]
    public bool HasSeenDoctor { get; set; }

    [JsonPropertyName("riskFactors")]
    public List<string> RiskFactors { get; set; } = new();

    [JsonPropertyName("babyNickname")]
    public string? BabyNickname { get; set; }
}

public class UploadUrlRequest
{
    [JsonPropertyName("filename")]
    public string Filename { get; set; } = string.Empty;
}

public class UploadUrlResponse
{
    [JsonPropertyName("uploadUrl")]
    public string UploadUrl { get; set; } = string.Empty;

    [JsonPropertyName("s3Key")]
    public string S3Key { get; set; } = string.Empty;
}

// ── Photo Metadata ─────────────────────────────

public class PhotoMetadata
{
    [JsonPropertyName("userId")]
    public string UserId { get; set; } = string.Empty;

    [JsonPropertyName("photoId")]
    public string PhotoId { get; set; } = string.Empty;

    [JsonPropertyName("s3Key")]
    public string S3Key { get; set; } = string.Empty;

    [JsonPropertyName("date")]
    public string Date { get; set; } = string.Empty;

    [JsonPropertyName("weekNumber")]
    public int WeekNumber { get; set; }

    [JsonPropertyName("type")]
    public string Type { get; set; } = "bump";

    [JsonPropertyName("caption")]
    public string? Caption { get; set; }

    [JsonPropertyName("createdAt")]
    public string CreatedAt { get; set; } = string.Empty;
}

// ── Subscription / Payment ─────────────────────

public class SubscriptionRecord
{
    [JsonPropertyName("userId")]
    public string UserId { get; set; } = string.Empty;

    [JsonPropertyName("plan")]
    public string Plan { get; set; } = "free";

    [JsonPropertyName("status")]
    public string Status { get; set; } = "active";

    [JsonPropertyName("expiresAt")]
    public string? ExpiresAt { get; set; }

    [JsonPropertyName("yocoChargeId")]
    public string? YocoChargeId { get; set; }

    [JsonPropertyName("amountCents")]
    public int AmountCents { get; set; }

    [JsonPropertyName("createdAt")]
    public string CreatedAt { get; set; } = string.Empty;

    [JsonPropertyName("updatedAt")]
    public string UpdatedAt { get; set; } = string.Empty;
}

public class YocoChargeRequest
{
    [JsonPropertyName("token")]
    public string Token { get; set; } = string.Empty;
}

public class SubscriptionStatusResponse
{
    [JsonPropertyName("plan")]
    public string Plan { get; set; } = "free";

    [JsonPropertyName("status")]
    public string Status { get; set; } = "active";

    [JsonPropertyName("expiresAt")]
    public string? ExpiresAt { get; set; }

    [JsonPropertyName("photoCount")]
    public int PhotoCount { get; set; }

    [JsonPropertyName("customEventCount")]
    public int CustomEventCount { get; set; }

    [JsonPropertyName("limits")]
    public SubscriptionLimits Limits { get; set; } = new();
}

public class SubscriptionLimits
{
    [JsonPropertyName("maxPhotos")]
    public int MaxPhotos { get; set; } = 5;

    [JsonPropertyName("maxCustomEvents")]
    public int MaxCustomEvents { get; set; } = 3;

    [JsonPropertyName("isPremium")]
    public bool IsPremium { get; set; }
}

// ── Community Posts / Comments ─────────────────

public class CommunityPost
{
    [JsonPropertyName("postId")]
    public string PostId { get; set; } = string.Empty;

    [JsonPropertyName("userId")]
    public string UserId { get; set; } = string.Empty;

    [JsonPropertyName("displayName")]
    public string DisplayName { get; set; } = string.Empty;

    [JsonPropertyName("content")]
    public string Content { get; set; } = string.Empty;

    [JsonPropertyName("category")]
    public string Category { get; set; } = "experience";

    [JsonPropertyName("status")]
    public string Status { get; set; } = "pending";

    [JsonPropertyName("upvotes")]
    public int Upvotes { get; set; }

    [JsonPropertyName("downvotes")]
    public int Downvotes { get; set; }

    [JsonPropertyName("reportCount")]
    public int ReportCount { get; set; }

    [JsonPropertyName("createdAt")]
    public string CreatedAt { get; set; } = string.Empty;

    [JsonPropertyName("votes")]
    public Dictionary<string, string> Votes { get; set; } = new();
}

public class CreateCommunityPostRequest
{
    [JsonPropertyName("content")]
    public string Content { get; set; } = string.Empty;

    [JsonPropertyName("category")]
    public string Category { get; set; } = "experience";

    [JsonPropertyName("displayName")]
    public string DisplayName { get; set; } = string.Empty;
}

public class VotePostRequest
{
    [JsonPropertyName("vote")]
    public string Vote { get; set; } = string.Empty;
}

public class ReportPostRequest
{
    [JsonPropertyName("reason")]
    public string Reason { get; set; } = string.Empty;
}

public class UpdatePostStatusRequest
{
    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;
}

public class CommunityComment
{
    [JsonPropertyName("commentId")]
    public string CommentId { get; set; } = string.Empty;

    [JsonPropertyName("postId")]
    public string PostId { get; set; } = string.Empty;

    [JsonPropertyName("userId")]
    public string UserId { get; set; } = string.Empty;

    [JsonPropertyName("displayName")]
    public string DisplayName { get; set; } = string.Empty;

    [JsonPropertyName("content")]
    public string Content { get; set; } = string.Empty;

    [JsonPropertyName("createdAt")]
    public string CreatedAt { get; set; } = string.Empty;
}

public class CreateCommunityCommentRequest
{
    [JsonPropertyName("content")]
    public string Content { get; set; } = string.Empty;

    [JsonPropertyName("displayName")]
    public string DisplayName { get; set; } = string.Empty;
}
