using System.Net;
using System.Text.Json;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.DocumentModel;
using Amazon.Lambda.APIGatewayEvents;
using Amazon.Lambda.Core;
using BabysCalendar.Api.Helpers;
using BabysCalendar.Api.Models;

namespace BabysCalendar.Api.Functions;

public class SymptomsFunctions
{
    private static readonly AmazonDynamoDBClient _dynamoClient = new();
    private static readonly string _tableName = Environment.GetEnvironmentVariable("SYMPTOMS_TABLE_NAME") ?? "babys-calendar-symptoms-dev";

    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
    };

    public async Task<APIGatewayProxyResponse> GetEntries(APIGatewayProxyRequest request, ILambdaContext context)
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
            return new APIGatewayProxyResponse { StatusCode = 401, Body = "{\"message\":\"Unauthorized\"}", Headers = CorsHeaders() };
        }
        catch (Exception ex)
        {
            context.Logger.LogError($"GetEntries error: {ex.Message}");
            return new APIGatewayProxyResponse { StatusCode = 500, Body = "{\"message\":\"Internal server error\"}", Headers = CorsHeaders() };
        }
    }

    public async Task<APIGatewayProxyResponse> CreateEntry(APIGatewayProxyRequest request, ILambdaContext context)
    {
        try
        {
            var userId = AuthHelper.GetUserId(request);
            var input = JsonSerializer.Deserialize<SymptomEntry>(request.Body, _jsonOptions);
            if (input == null || string.IsNullOrEmpty(input.Date))
            {
                return new APIGatewayProxyResponse
                {
                    StatusCode = (int)HttpStatusCode.BadRequest,
                    Body = "{\"message\":\"Date is required.\"}",
                    Headers = CorsHeaders(),
                };
            }

            input.EntryId = Guid.NewGuid().ToString();
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
            return new APIGatewayProxyResponse { StatusCode = 401, Body = "{\"message\":\"Unauthorized\"}", Headers = CorsHeaders() };
        }
        catch (Exception ex)
        {
            context.Logger.LogError($"CreateEntry error: {ex.Message}");
            return new APIGatewayProxyResponse { StatusCode = 500, Body = "{\"message\":\"Internal server error\"}", Headers = CorsHeaders() };
        }
    }

    private static Dictionary<string, string> CorsHeaders() => new()
    {
        { "Content-Type", "application/json" },
        { "Access-Control-Allow-Origin", "*" },
        { "Access-Control-Allow-Headers", "Content-Type,Authorization" },
        { "Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS" },
    };
}
