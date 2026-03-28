using System.Net;
using System.Text.Json;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.DocumentModel;
using Amazon.Lambda.APIGatewayEvents;
using Amazon.Lambda.Core;
using BabysCalendar.Api.Helpers;
using BabysCalendar.Api.Models;

namespace BabysCalendar.Api.Functions;

public class EventsFunctions
{
    private static readonly AmazonDynamoDBClient _dynamoClient = new();
    private static readonly string _tableName = Environment.GetEnvironmentVariable("EVENTS_TABLE_NAME") ?? "babys-calendar-events-dev";

    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
    };

    public async Task<APIGatewayProxyResponse> GetEvents(APIGatewayProxyRequest request, ILambdaContext context)
    {
        try
        {
            var userId = AuthHelper.GetUserId(request);
            var table = Table.LoadTable(_dynamoClient, _tableName);
            var filter = new QueryFilter("userId", QueryOperator.Equal, userId);
            var search = table.Query(filter);

            var results = new List<Document>();
            do
            {
                results.AddRange(await search.GetNextSetAsync());
            } while (!search.IsDone);

            var json = "[" + string.Join(",", results.Select(d => d.ToJson())) + "]";
            return new APIGatewayProxyResponse
            {
                StatusCode = (int)HttpStatusCode.OK,
                Body = json,
                Headers = CorsHeaders(),
            };
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized();
        }
        catch (Exception ex)
        {
            context.Logger.LogError($"GetEvents error: {ex.Message}");
            return ServerError();
        }
    }

    public async Task<APIGatewayProxyResponse> CreateEvent(APIGatewayProxyRequest request, ILambdaContext context)
    {
        try
        {
            var userId = AuthHelper.GetUserId(request);
            var input = JsonSerializer.Deserialize<CalendarEvent>(request.Body, _jsonOptions);
            if (input == null || string.IsNullOrEmpty(input.Title))
            {
                return new APIGatewayProxyResponse
                {
                    StatusCode = (int)HttpStatusCode.BadRequest,
                    Body = "{\"message\":\"Title is required.\"}",
                    Headers = CorsHeaders(),
                };
            }

            input.EventId = Guid.NewGuid().ToString();
            input.UserId = userId;

            var table = Table.LoadTable(_dynamoClient, _tableName);
            var json = JsonSerializer.Serialize(input, _jsonOptions);
            await table.PutItemAsync(Document.FromJson(json));

            return new APIGatewayProxyResponse
            {
                StatusCode = (int)HttpStatusCode.Created,
                Body = json,
                Headers = CorsHeaders(),
            };
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized();
        }
        catch (Exception ex)
        {
            context.Logger.LogError($"CreateEvent error: {ex.Message}");
            return ServerError();
        }
    }

    public async Task<APIGatewayProxyResponse> UpdateEvent(APIGatewayProxyRequest request, ILambdaContext context)
    {
        try
        {
            var userId = AuthHelper.GetUserId(request);
            var eventId = request.PathParameters?["eventId"];
            if (string.IsNullOrEmpty(eventId))
            {
                return new APIGatewayProxyResponse
                {
                    StatusCode = (int)HttpStatusCode.BadRequest,
                    Body = "{\"message\":\"Event ID is required.\"}",
                    Headers = CorsHeaders(),
                };
            }

            var table = Table.LoadTable(_dynamoClient, _tableName);

            // Verify ownership
            var existing = await table.GetItemAsync(userId, eventId);
            if (existing == null)
            {
                return new APIGatewayProxyResponse
                {
                    StatusCode = (int)HttpStatusCode.NotFound,
                    Body = "{\"message\":\"Event not found.\"}",
                    Headers = CorsHeaders(),
                };
            }

            // Merge update
            var patch = JsonSerializer.Deserialize<CalendarEvent>(request.Body, _jsonOptions);
            if (patch == null) return new APIGatewayProxyResponse { StatusCode = 400, Body = "{\"message\":\"Invalid body.\"}", Headers = CorsHeaders() };

            patch.UserId = userId;
            patch.EventId = eventId;

            var json = JsonSerializer.Serialize(patch, _jsonOptions);
            await table.PutItemAsync(Document.FromJson(json));

            return new APIGatewayProxyResponse
            {
                StatusCode = (int)HttpStatusCode.OK,
                Body = json,
                Headers = CorsHeaders(),
            };
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized();
        }
        catch (Exception ex)
        {
            context.Logger.LogError($"UpdateEvent error: {ex.Message}");
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
