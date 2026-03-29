using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.DocumentModel;
using Amazon.Lambda.APIGatewayEvents;
using Amazon.Lambda.Core;
using BabysCalendar.Api.Helpers;
using BabysCalendar.Api.Models;

namespace BabysCalendar.Api.Functions;

public class SubscriptionFunctions
{
    private static readonly AmazonDynamoDBClient _dynamoClient = new();
    private static readonly HttpClient _httpClient = new();

    private static readonly string _subscriptionsTable =
        Environment.GetEnvironmentVariable("SUBSCRIPTIONS_TABLE_NAME") ?? "babys-calendar-subscriptions-dev";
    private static readonly string _photosTable =
        Environment.GetEnvironmentVariable("PHOTOS_TABLE_NAME") ?? "babys-calendar-photos-dev";
    private static readonly string _eventsTable =
        Environment.GetEnvironmentVariable("EVENTS_TABLE_NAME") ?? "babys-calendar-events-dev";
    private static readonly string _yocoSecretKey =
        Environment.GetEnvironmentVariable("YOCO_SECRET_KEY") ?? "";

    private const int PremiumAmountCents = 9900; // R99.00 VAT inclusive
    private const int FreeMaxPhotos = 5;
    private const int FreeMaxCustomEvents = 3;

    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
    };

    /// <summary>
    /// GET /subscription — returns the user's current subscription status + usage counts.
    /// </summary>
    public async Task<APIGatewayProxyResponse> GetSubscription(APIGatewayProxyRequest request, ILambdaContext context)
    {
        try
        {
            var userId = AuthHelper.GetUserId(request);

            // Fetch subscription record
            var subTable = Table.LoadTable(_dynamoClient, _subscriptionsTable);
            var subDoc = await subTable.GetItemAsync(userId);
            var isPremium = false;
            string plan = "free";
            string status = "active";
            string? expiresAt = null;

            if (subDoc != null)
            {
                plan = subDoc.ContainsKey("plan") ? subDoc["plan"].AsString() : "free";
                status = subDoc.ContainsKey("status") ? subDoc["status"].AsString() : "active";
                expiresAt = subDoc.ContainsKey("expiresAt") ? subDoc["expiresAt"].AsString() : null;

                // Check if premium is still valid
                if (plan == "premium" && status == "active")
                {
                    if (!string.IsNullOrEmpty(expiresAt) && DateTime.Parse(expiresAt) > DateTime.UtcNow)
                    {
                        isPremium = true;
                    }
                    else if (!string.IsNullOrEmpty(expiresAt))
                    {
                        // Expired — downgrade
                        plan = "free";
                        status = "expired";
                    }
                }
            }

            // Count photos
            var photosTableObj = Table.LoadTable(_dynamoClient, _photosTable);
            var photoFilter = new QueryFilter("userId", QueryOperator.Equal, userId);
            var photoSearch = photosTableObj.Query(photoFilter);
            int photoCount = 0;
            do
            {
                var batch = await photoSearch.GetNextSetAsync();
                photoCount += batch.Count;
            } while (!photoSearch.IsDone);

            // Count custom events (exclude seeded milestones by checking type != milestone)
            var eventsTableObj = Table.LoadTable(_dynamoClient, _eventsTable);
            var eventFilter = new QueryFilter("userId", QueryOperator.Equal, userId);
            var eventSearch = eventsTableObj.Query(eventFilter);
            int customEventCount = 0;
            do
            {
                var batch = await eventSearch.GetNextSetAsync();
                customEventCount += batch.Count(d =>
                {
                    var type = d.ContainsKey("type") ? d["type"].AsString() : "";
                    // Seeded milestones have specific types; custom events added by user
                    // Count events with type "appointment", "reminder", "journal" added after onboarding
                    return type != "milestone" && type != "scan" && type != "test" && type != "vaccine";
                });
            } while (!eventSearch.IsDone);

            var response = new SubscriptionStatusResponse
            {
                Plan = plan,
                Status = status,
                ExpiresAt = expiresAt,
                PhotoCount = photoCount,
                CustomEventCount = customEventCount,
                Limits = new SubscriptionLimits
                {
                    MaxPhotos = isPremium ? int.MaxValue : FreeMaxPhotos,
                    MaxCustomEvents = isPremium ? int.MaxValue : FreeMaxCustomEvents,
                    IsPremium = isPremium,
                },
            };

            return new APIGatewayProxyResponse
            {
                StatusCode = (int)HttpStatusCode.OK,
                Body = JsonSerializer.Serialize(response, _jsonOptions),
                Headers = CorsHeaders(),
            };
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized();
        }
        catch (Exception ex)
        {
            context.Logger.LogError($"GetSubscription error: {ex.Message}");
            return ServerError();
        }
    }

    /// <summary>
    /// POST /subscription/pay — accepts a Yoco token, charges R99, activates premium for 30 days.
    /// </summary>
    public async Task<APIGatewayProxyResponse> ProcessPayment(APIGatewayProxyRequest request, ILambdaContext context)
    {
        try
        {
            var userId = AuthHelper.GetUserId(request);
            var input = JsonSerializer.Deserialize<YocoChargeRequest>(request.Body, _jsonOptions);
            if (input == null || string.IsNullOrEmpty(input.Token))
            {
                return new APIGatewayProxyResponse
                {
                    StatusCode = (int)HttpStatusCode.BadRequest,
                    Body = "{\"message\":\"Payment token is required.\"}",
                    Headers = CorsHeaders(),
                };
            }

            if (string.IsNullOrEmpty(_yocoSecretKey))
            {
                context.Logger.LogError("YOCO_SECRET_KEY not configured");
                return ServerError();
            }

            // Charge via Yoco API
            var chargePayload = JsonSerializer.Serialize(new
            {
                token = input.Token,
                amountInCents = PremiumAmountCents,
                currency = "ZAR",
            });

            var httpRequest = new HttpRequestMessage(HttpMethod.Post, "https://online.yoco.com/v1/charges/")
            {
                Content = new StringContent(chargePayload, Encoding.UTF8, "application/json"),
            };
            httpRequest.Headers.Add("X-Auth-Secret-Key", _yocoSecretKey);

            var httpResponse = await _httpClient.SendAsync(httpRequest);
            var responseBody = await httpResponse.Content.ReadAsStringAsync();

            if (!httpResponse.IsSuccessStatusCode)
            {
                context.Logger.LogError($"Yoco charge failed: {httpResponse.StatusCode} — {responseBody}");
                return new APIGatewayProxyResponse
                {
                    StatusCode = (int)HttpStatusCode.PaymentRequired,
                    Body = "{\"message\":\"Payment failed. Please try again.\"}",
                    Headers = CorsHeaders(),
                };
            }

            // Extract charge ID from Yoco response
            var chargeResult = JsonSerializer.Deserialize<JsonElement>(responseBody);
            var chargeId = chargeResult.TryGetProperty("id", out var idProp) ? idProp.GetString() : "unknown";

            // Save subscription record
            var now = DateTime.UtcNow;
            var expiresAt = now.AddDays(30);

            var subscription = new SubscriptionRecord
            {
                UserId = userId,
                Plan = "premium",
                Status = "active",
                ExpiresAt = expiresAt.ToString("o"),
                YocoChargeId = chargeId,
                AmountCents = PremiumAmountCents,
                CreatedAt = now.ToString("o"),
                UpdatedAt = now.ToString("o"),
            };

            var table = Table.LoadTable(_dynamoClient, _subscriptionsTable);
            var json = JsonSerializer.Serialize(subscription, _jsonOptions);
            await table.PutItemAsync(Document.FromJson(json));

            return new APIGatewayProxyResponse
            {
                StatusCode = (int)HttpStatusCode.OK,
                Body = JsonSerializer.Serialize(new
                {
                    message = "Payment successful! Premium activated.",
                    plan = "premium",
                    expiresAt = expiresAt.ToString("o"),
                }, _jsonOptions),
                Headers = CorsHeaders(),
            };
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized();
        }
        catch (Exception ex)
        {
            context.Logger.LogError($"ProcessPayment error: {ex.Message}");
            return ServerError();
        }
    }

    private static APIGatewayProxyResponse Unauthorized() =>
        new() { StatusCode = 401, Body = "{\"message\":\"Unauthorized\"}", Headers = CorsHeaders() };

    private static APIGatewayProxyResponse ServerError() =>
        new() { StatusCode = 500, Body = "{\"message\":\"Internal server error\"}", Headers = CorsHeaders() };

    private static Dictionary<string, string> CorsHeaders() => new()
    {
        { "Content-Type", "application/json" },
        { "Access-Control-Allow-Origin", "*" },
        { "Access-Control-Allow-Headers", "Content-Type,Authorization" },
        { "Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS" },
    };
}
