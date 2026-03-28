using System.Net;
using System.Text.Json;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.DocumentModel;
using Amazon.Lambda.APIGatewayEvents;
using Amazon.Lambda.Core;
using BabysCalendar.Api.Helpers;
using BabysCalendar.Api.Models;

[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace BabysCalendar.Api.Functions;

public class PregnancyFunctions
{
    private static readonly AmazonDynamoDBClient _dynamoClient = new();
    private static readonly string _tableName = Environment.GetEnvironmentVariable("TABLE_NAME") ?? "babys-calendar-pregnancy-dev";

    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
    };

    public async Task<APIGatewayProxyResponse> GetRecord(APIGatewayProxyRequest request, ILambdaContext context)
    {
        try
        {
            var userId = AuthHelper.GetUserId(request);
            var table = Table.LoadTable(_dynamoClient, _tableName);
            var doc = await table.GetItemAsync(userId);

            if (doc == null)
            {
                return new APIGatewayProxyResponse
                {
                    StatusCode = (int)HttpStatusCode.NotFound,
                    Body = JsonSerializer.Serialize(new { message = "No pregnancy record found." }),
                    Headers = CorsHeaders(),
                };
            }

            return new APIGatewayProxyResponse
            {
                StatusCode = (int)HttpStatusCode.OK,
                Body = doc.ToJson(),
                Headers = CorsHeaders(),
            };
        }
        catch (UnauthorizedAccessException)
        {
            return new APIGatewayProxyResponse { StatusCode = 401, Body = "{\"message\":\"Unauthorized\"}", Headers = CorsHeaders() };
        }
        catch (Exception ex)
        {
            context.Logger.LogError($"GetRecord error: {ex.Message}");
            return new APIGatewayProxyResponse { StatusCode = 500, Body = "{\"message\":\"Internal server error\"}", Headers = CorsHeaders() };
        }
    }

    public async Task<APIGatewayProxyResponse> CreateRecord(APIGatewayProxyRequest request, ILambdaContext context)
    {
        try
        {
            var userId = AuthHelper.GetUserId(request);
            var input = JsonSerializer.Deserialize<OnboardingData>(request.Body, _jsonOptions);
            if (input == null || string.IsNullOrEmpty(input.LmpDate))
            {
                return new APIGatewayProxyResponse
                {
                    StatusCode = (int)HttpStatusCode.BadRequest,
                    Body = JsonSerializer.Serialize(new { message = "LMP date is required." }),
                    Headers = CorsHeaders(),
                };
            }

            // Calculate EDD (LMP + 280 days)
            var lmp = DateTime.Parse(input.LmpDate);
            var edd = lmp.AddDays(280);
            var currentWeek = (int)((DateTime.UtcNow - lmp).TotalDays / 7);
            currentWeek = Math.Clamp(currentWeek, 0, 42);

            var record = new PregnancyRecord
            {
                UserId = userId,
                LmpDate = input.LmpDate,
                EddDate = edd.ToString("yyyy-MM-dd"),
                CurrentWeek = input.WeeksPregnant ?? currentWeek,
                Parity = 0,
                RiskFactors = input.RiskFactors,
                BabyNickname = input.BabyNickname,
                DisplayName = input.DisplayName,
                CreatedAt = DateTime.UtcNow.ToString("o"),
            };

            var table = Table.LoadTable(_dynamoClient, _tableName);
            var json = JsonSerializer.Serialize(record, _jsonOptions);
            var doc = Document.FromJson(json);
            await table.PutItemAsync(doc);

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
            context.Logger.LogError($"CreateRecord error: {ex.Message}");
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
