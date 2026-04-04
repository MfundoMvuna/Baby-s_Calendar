using System.Net;
using System.Text.Json;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.DocumentModel;
using Amazon.Lambda.APIGatewayEvents;
using Amazon.Lambda.Core;
using BabysCalendar.Api.Helpers;
using BabysCalendar.Api.Models;

namespace BabysCalendar.Api.Functions;

/// <summary>
/// Server-backed share tokens — partner opens /share/{tokenId} to see live pregnancy data.
/// CreateShareToken requires Cognito auth (the sender).
/// GetSharedJourney is PUBLIC (no auth) — the tokenId itself acts as a secret.
/// RevokeShareToken requires Cognito auth (the sender).
/// </summary>
public class ShareFunctions
{
    private static readonly AmazonDynamoDBClient _dynamoClient = new();
    private static readonly string _shareTableName = Environment.GetEnvironmentVariable("SHARE_TOKENS_TABLE_NAME") ?? "babys-calendar-share-tokens-dev";
    private static readonly string _pregnancyTableName = Environment.GetEnvironmentVariable("TABLE_NAME") ?? "babys-calendar-pregnancy-dev";
    private static readonly string _eventsTableName = Environment.GetEnvironmentVariable("EVENTS_TABLE_NAME") ?? "babys-calendar-events-dev";
    private static readonly string _symptomsTableName = Environment.GetEnvironmentVariable("SYMPTOMS_TABLE_NAME") ?? "babys-calendar-symptoms-dev";
    private static readonly string _photosTableName = Environment.GetEnvironmentVariable("PHOTOS_TABLE_NAME") ?? "babys-calendar-photos-dev";

    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
    };

    /// <summary>
    /// POST /share — create a share token for a partner (requires auth).
    /// </summary>
    public async Task<APIGatewayProxyResponse> CreateShareToken(APIGatewayProxyRequest request, ILambdaContext context)
    {
        try
        {
            var userId = AuthHelper.GetUserId(request);
            var input = JsonSerializer.Deserialize<CreateShareTokenRequest>(request.Body, _jsonOptions);

            if (input == null || string.IsNullOrWhiteSpace(input.PartnerEmail) || string.IsNullOrWhiteSpace(input.PartnerName))
            {
                return BadRequest("partnerEmail and partnerName are required.");
            }

            var token = new ShareToken
            {
                TokenId = Guid.NewGuid().ToString("N")[..12],   // short, URL-friendly token
                UserId = userId,
                PartnerEmail = input.PartnerEmail.Trim().ToLowerInvariant(),
                PartnerName = input.PartnerName.Trim(),
                Status = "active",
                CreatedAt = DateTime.UtcNow.ToString("o"),
            };

            var table = Table.LoadTable(_dynamoClient, _shareTableName);
            await table.PutItemAsync(Document.FromJson(JsonSerializer.Serialize(token, _jsonOptions)));

            return Created(token);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized();
        }
        catch (Exception ex)
        {
            context.Logger.LogError($"CreateShareToken error: {ex.Message}");
            return ServerError();
        }
    }

    /// <summary>
    /// GET /share/{tokenId} — PUBLIC endpoint, no Cognito auth.
    /// Looks up the share token, fetches the sharer's live pregnancy data, returns SharedJourney.
    /// </summary>
    public async Task<APIGatewayProxyResponse> GetSharedJourney(APIGatewayProxyRequest request, ILambdaContext context)
    {
        try
        {
            var tokenId = request.PathParameters?["tokenId"];
            if (string.IsNullOrWhiteSpace(tokenId)) return BadRequest("tokenId is required.");

            // 1. Load share token
            var shareTable = Table.LoadTable(_dynamoClient, _shareTableName);
            var tokenDoc = await shareTable.GetItemAsync(tokenId);
            if (tokenDoc == null) return NotFound("Share link not found or has expired.");

            var shareToken = JsonSerializer.Deserialize<ShareToken>(tokenDoc.ToJson(), _jsonOptions);
            if (shareToken == null || shareToken.Status != "active")
            {
                return NotFound("Share link has been revoked.");
            }

            var userId = shareToken.UserId;

            // 2. Fetch pregnancy record
            var pregnancyTable = Table.LoadTable(_dynamoClient, _pregnancyTableName);
            var pregDoc = await pregnancyTable.GetItemAsync(userId);
            if (pregDoc == null)
            {
                return NotFound("No pregnancy record found for this share link.");
            }

            var record = JsonSerializer.Deserialize<PregnancyRecord>(pregDoc.ToJson(), _jsonOptions);
            if (record == null) return ServerError();

            // 3. Fetch events
            var eventsTable = Table.LoadTable(_dynamoClient, _eventsTableName);
            var eventsFilter = new QueryFilter("userId", QueryOperator.Equal, userId);
            var eventsSearch = eventsTable.Query(eventsFilter);
            var eventDocs = new List<Document>();
            do { eventDocs.AddRange(await eventsSearch.GetNextSetAsync()); } while (!eventsSearch.IsDone);

            var events = eventDocs
                .Select(d => JsonSerializer.Deserialize<CalendarEvent>(d.ToJson(), _jsonOptions))
                .Where(e => e != null)
                .Cast<CalendarEvent>()
                .ToList();

            // 4. Fetch symptoms (last 7 days)
            var symptomsTable = Table.LoadTable(_dynamoClient, _symptomsTableName);
            var sevenDaysAgo = DateTime.UtcNow.AddDays(-7).ToString("yyyy-MM-dd");
            var symptomsFilter = new QueryFilter("userId", QueryOperator.Equal, userId);
            symptomsFilter.AddCondition("date", QueryOperator.GreaterThanOrEqual, sevenDaysAgo);
            var symptomsSearch = symptomsTable.Query(symptomsFilter);
            var symptomDocs = new List<Document>();
            do { symptomDocs.AddRange(await symptomsSearch.GetNextSetAsync()); } while (!symptomsSearch.IsDone);

            var symptoms = symptomDocs
                .Select(d => JsonSerializer.Deserialize<SymptomEntry>(d.ToJson(), _jsonOptions))
                .Where(s => s != null)
                .Cast<SymptomEntry>()
                .ToList();

            var recentSymptoms = symptoms
                .SelectMany(s => s.Symptoms)
                .Distinct()
                .ToList();

            // 5. Count photos (metadata only, no presigned URLs for public endpoint)
            var photosTable = Table.LoadTable(_dynamoClient, _photosTableName);
            var photosFilter = new QueryFilter("userId", QueryOperator.Equal, userId);
            var photosSearch = photosTable.Query(photosFilter);
            var photoCount = 0;
            do
            {
                var batch = await photosSearch.GetNextSetAsync();
                photoCount += batch.Count;
            } while (!photosSearch.IsDone);

            // 6. Build response
            var currentWeek = (int)((DateTime.UtcNow - DateTime.Parse(record.LmpDate)).TotalDays / 7);
            currentWeek = Math.Clamp(currentWeek, 0, 42);

            var sharedEvents = events.Select(e => new SharedEventItem
            {
                Date = e.Date,
                Title = e.Title,
                Type = e.Type,
                Completed = e.Completed,
            }).ToList();

            var response = new SharedJourneyResponse
            {
                Version = 1,
                SenderName = !string.IsNullOrWhiteSpace(record.DisplayName) ? record.DisplayName : "Pregnancy Journey",
                BabyNickname = record.BabyNickname,
                LmpDate = record.LmpDate,
                EddDate = record.EddDate,
                CurrentWeek = currentWeek,
                Events = sharedEvents,
                RecentSymptoms = recentSymptoms,
                PhotoCount = photoCount,
                SharedAt = DateTime.UtcNow.ToString("o"),
                DataSource = "remote",
                SourceRecords = new SharedSourceRecords
                {
                    Events = events.Count,
                    SymptomsLast7Days = recentSymptoms.Count,
                    Photos = photoCount,
                },
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            context.Logger.LogError($"GetSharedJourney error: {ex.Message}");
            return ServerError();
        }
    }

    /// <summary>
    /// DELETE /share/{tokenId} — revoke a share token (requires auth, must be the owner).
    /// </summary>
    public async Task<APIGatewayProxyResponse> RevokeShareToken(APIGatewayProxyRequest request, ILambdaContext context)
    {
        try
        {
            var userId = AuthHelper.GetUserId(request);
            var tokenId = request.PathParameters?["tokenId"];
            if (string.IsNullOrWhiteSpace(tokenId)) return BadRequest("tokenId is required.");

            var table = Table.LoadTable(_dynamoClient, _shareTableName);
            var doc = await table.GetItemAsync(tokenId);
            if (doc == null) return NotFound("Share token not found.");

            var token = JsonSerializer.Deserialize<ShareToken>(doc.ToJson(), _jsonOptions);
            if (token == null || token.UserId != userId)
            {
                return Forbidden();
            }

            token.Status = "revoked";
            await table.PutItemAsync(Document.FromJson(JsonSerializer.Serialize(token, _jsonOptions)));

            return Ok(new { message = "Share link revoked." });
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized();
        }
        catch (Exception ex)
        {
            context.Logger.LogError($"RevokeShareToken error: {ex.Message}");
            return ServerError();
        }
    }

    // ── HTTP response helpers ──

    private static APIGatewayProxyResponse Ok(object body) =>
        new() { StatusCode = (int)HttpStatusCode.OK, Body = JsonSerializer.Serialize(body, _jsonOptions), Headers = CorsHeaders() };

    private static APIGatewayProxyResponse Created(object body) =>
        new() { StatusCode = (int)HttpStatusCode.Created, Body = JsonSerializer.Serialize(body, _jsonOptions), Headers = CorsHeaders() };

    private static APIGatewayProxyResponse BadRequest(string message) =>
        new() { StatusCode = 400, Body = JsonSerializer.Serialize(new { message }), Headers = CorsHeaders() };

    private static APIGatewayProxyResponse NotFound(string message) =>
        new() { StatusCode = 404, Body = JsonSerializer.Serialize(new { message }), Headers = CorsHeaders() };

    private static APIGatewayProxyResponse Unauthorized() =>
        new() { StatusCode = 401, Body = "{\"message\":\"Unauthorized\"}", Headers = CorsHeaders() };

    private static APIGatewayProxyResponse Forbidden() =>
        new() { StatusCode = 403, Body = "{\"message\":\"Forbidden\"}", Headers = CorsHeaders() };

    private static APIGatewayProxyResponse ServerError() =>
        new() { StatusCode = 500, Body = "{\"message\":\"Internal server error\"}", Headers = CorsHeaders() };

    private static Dictionary<string, string> CorsHeaders() => new()
    {
        { "Content-Type", "application/json" },
        { "Access-Control-Allow-Origin", "*" },
        { "Access-Control-Allow-Headers", "Content-Type,Authorization" },
        { "Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS" },
    };
}
