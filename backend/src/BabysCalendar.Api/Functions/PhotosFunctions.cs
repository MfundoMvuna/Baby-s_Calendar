using System.Net;
using System.Text.Json;
using Amazon.Lambda.APIGatewayEvents;
using Amazon.Lambda.Core;
using Amazon.S3;
using Amazon.S3.Model;
using BabysCalendar.Api.Helpers;
using BabysCalendar.Api.Models;

namespace BabysCalendar.Api.Functions;

public class PhotosFunctions
{
    private static readonly AmazonS3Client _s3Client = new();
    private static readonly string _bucketName = Environment.GetEnvironmentVariable("PHOTOS_BUCKET") ?? "babys-calendar-photos-dev";

    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    /// <summary>
    /// Generates a presigned PUT URL for secure direct-to-S3 photo upload.
    /// The client uploads the file directly to S3 using this URL.
    /// </summary>
    public async Task<APIGatewayProxyResponse> GetUploadUrl(APIGatewayProxyRequest request, ILambdaContext context)
    {
        try
        {
            var userId = AuthHelper.GetUserId(request);
            var input = JsonSerializer.Deserialize<UploadUrlRequest>(request.Body, _jsonOptions);
            if (input == null || string.IsNullOrEmpty(input.Filename))
            {
                return new APIGatewayProxyResponse
                {
                    StatusCode = (int)HttpStatusCode.BadRequest,
                    Body = "{\"message\":\"Filename is required.\"}",
                    Headers = CorsHeaders(),
                };
            }

            // Sanitize filename — keep only safe characters
            var safeFilename = SanitizeFilename(input.Filename);
            var s3Key = $"{userId}/{DateTime.UtcNow:yyyy-MM-dd}/{Guid.NewGuid()}/{safeFilename}";

            var presignRequest = new GetPreSignedUrlRequest
            {
                BucketName = _bucketName,
                Key = s3Key,
                Verb = HttpVerb.PUT,
                Expires = DateTime.UtcNow.AddMinutes(15),
                ContentType = "image/*",
                ServerSideEncryptionMethod = ServerSideEncryptionMethod.AWSKMS,
            };

            var url = await _s3Client.GetPreSignedURLAsync(presignRequest);

            var response = new UploadUrlResponse
            {
                UploadUrl = url,
                S3Key = s3Key,
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
            return new APIGatewayProxyResponse { StatusCode = 401, Body = "{\"message\":\"Unauthorized\"}", Headers = CorsHeaders() };
        }
        catch (Exception ex)
        {
            context.Logger.LogError($"GetUploadUrl error: {ex.Message}");
            return new APIGatewayProxyResponse { StatusCode = 500, Body = "{\"message\":\"Internal server error\"}", Headers = CorsHeaders() };
        }
    }

    /// <summary>Remove path traversal and unsafe characters from filenames.</summary>
    private static string SanitizeFilename(string filename)
    {
        var name = Path.GetFileName(filename); // Strip directory components
        // Keep only alphanumeric, dots, hyphens, underscores
        return new string(name.Where(c => char.IsLetterOrDigit(c) || c == '.' || c == '-' || c == '_').ToArray());
    }

    private static Dictionary<string, string> CorsHeaders() => new()
    {
        { "Content-Type", "application/json" },
        { "Access-Control-Allow-Origin", "*" },
        { "Access-Control-Allow-Headers", "Content-Type,Authorization" },
        { "Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS" },
    };
}
