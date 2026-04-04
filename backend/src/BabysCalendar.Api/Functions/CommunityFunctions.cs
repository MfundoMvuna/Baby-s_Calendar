using System.Net;
using System.Text.Json;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.DocumentModel;
using Amazon.Lambda.APIGatewayEvents;
using Amazon.Lambda.Core;
using BabysCalendar.Api.Helpers;
using BabysCalendar.Api.Models;

namespace BabysCalendar.Api.Functions;

public class CommunityFunctions
{
    private static readonly AmazonDynamoDBClient _dynamoClient = new();
    private static readonly string _postsTableName = Environment.GetEnvironmentVariable("COMMUNITY_POSTS_TABLE_NAME") ?? "babys-calendar-community-posts-dev";
    private static readonly string _commentsTableName = Environment.GetEnvironmentVariable("COMMUNITY_COMMENTS_TABLE_NAME") ?? "babys-calendar-community-comments-dev";

    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
    };

    public async Task<APIGatewayProxyResponse> GetPosts(APIGatewayProxyRequest request, ILambdaContext context)
    {
        try
        {
            var includeAll = request.QueryStringParameters != null &&
                             request.QueryStringParameters.TryGetValue("all", out var allParam) &&
                             string.Equals(allParam, "true", StringComparison.OrdinalIgnoreCase);

            if (includeAll && !AuthHelper.IsAdmin(request))
            {
                return Forbidden();
            }

            var posts = await LoadAllPostsAsync();
            if (!includeAll)
            {
                posts = posts.Where(p => string.Equals(p.Status, "approved", StringComparison.OrdinalIgnoreCase)).ToList();
            }

            posts = posts.OrderByDescending(p => p.CreatedAt).ToList();
            return Ok(posts);
        }
        catch (Exception ex)
        {
            context.Logger.LogError($"GetPosts error: {ex.Message}");
            return ServerError();
        }
    }

    public async Task<APIGatewayProxyResponse> CreatePost(APIGatewayProxyRequest request, ILambdaContext context)
    {
        try
        {
            var userId = AuthHelper.GetUserId(request);
            var input = JsonSerializer.Deserialize<CreateCommunityPostRequest>(request.Body, _jsonOptions);

            if (input == null || string.IsNullOrWhiteSpace(input.Content) || string.IsNullOrWhiteSpace(input.DisplayName))
            {
                return BadRequest("displayName and content are required.");
            }

            var post = new CommunityPost
            {
                PostId = Guid.NewGuid().ToString(),
                UserId = userId,
                DisplayName = input.DisplayName.Trim(),
                Content = input.Content.Trim(),
                Category = NormalizeCategory(input.Category),
                Status = "pending",
                Upvotes = 0,
                Downvotes = 0,
                ReportCount = 0,
                CreatedAt = DateTime.UtcNow.ToString("o"),
                Votes = new Dictionary<string, string>(),
            };

            var table = Table.LoadTable(_dynamoClient, _postsTableName);
            await table.PutItemAsync(Document.FromJson(JsonSerializer.Serialize(post, _jsonOptions)));

            return Created(post);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized();
        }
        catch (Exception ex)
        {
            context.Logger.LogError($"CreatePost error: {ex.Message}");
            return ServerError();
        }
    }

    public async Task<APIGatewayProxyResponse> VotePost(APIGatewayProxyRequest request, ILambdaContext context)
    {
        try
        {
            var userId = AuthHelper.GetUserId(request);
            var postId = request.PathParameters?["postId"];
            if (string.IsNullOrWhiteSpace(postId)) return BadRequest("postId is required.");

            var input = JsonSerializer.Deserialize<VotePostRequest>(request.Body, _jsonOptions);
            var vote = input?.Vote?.Trim().ToLowerInvariant();
            if (vote is not ("up" or "down")) return BadRequest("vote must be 'up' or 'down'.");

            var table = Table.LoadTable(_dynamoClient, _postsTableName);
            var doc = await table.GetItemAsync(postId);
            if (doc == null) return NotFound("Post not found.");

            var post = JsonSerializer.Deserialize<CommunityPost>(doc.ToJson(), _jsonOptions);
            if (post == null) return ServerError();

            post.Votes ??= new Dictionary<string, string>();
            if (post.Votes.TryGetValue(userId, out var previousVote))
            {
                if (previousVote == "up") post.Upvotes = Math.Max(0, post.Upvotes - 1);
                if (previousVote == "down") post.Downvotes = Math.Max(0, post.Downvotes - 1);
            }

            if (previousVote == vote)
            {
                post.Votes.Remove(userId);
            }
            else
            {
                post.Votes[userId] = vote;
                if (vote == "up") post.Upvotes++;
                else post.Downvotes++;
            }

            await table.PutItemAsync(Document.FromJson(JsonSerializer.Serialize(post, _jsonOptions)));
            return Ok(new { message = "Vote saved." });
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized();
        }
        catch (Exception ex)
        {
            context.Logger.LogError($"VotePost error: {ex.Message}");
            return ServerError();
        }
    }

    public async Task<APIGatewayProxyResponse> ReportPost(APIGatewayProxyRequest request, ILambdaContext context)
    {
        try
        {
            AuthHelper.GetUserId(request); // ensure caller is authenticated
            var postId = request.PathParameters?["postId"];
            if (string.IsNullOrWhiteSpace(postId)) return BadRequest("postId is required.");

            var table = Table.LoadTable(_dynamoClient, _postsTableName);
            var doc = await table.GetItemAsync(postId);
            if (doc == null) return NotFound("Post not found.");

            var post = JsonSerializer.Deserialize<CommunityPost>(doc.ToJson(), _jsonOptions);
            if (post == null) return ServerError();

            post.ReportCount++;
            if (post.ReportCount >= 3)
            {
                post.Status = "rejected";
            }

            await table.PutItemAsync(Document.FromJson(JsonSerializer.Serialize(post, _jsonOptions)));
            return Ok(new { message = "Report recorded." });
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized();
        }
        catch (Exception ex)
        {
            context.Logger.LogError($"ReportPost error: {ex.Message}");
            return ServerError();
        }
    }

    public async Task<APIGatewayProxyResponse> GetComments(APIGatewayProxyRequest request, ILambdaContext context)
    {
        try
        {
            AuthHelper.GetUserId(request); // comments require auth in app flow
            var postId = request.PathParameters?["postId"];
            if (string.IsNullOrWhiteSpace(postId)) return BadRequest("postId is required.");

            var table = Table.LoadTable(_dynamoClient, _commentsTableName);
            var filter = new QueryFilter("postId", QueryOperator.Equal, postId);
            var search = table.Query(filter);

            var results = new List<Document>();
            do
            {
                results.AddRange(await search.GetNextSetAsync());
            } while (!search.IsDone);

            var comments = results
                .Select(d => JsonSerializer.Deserialize<CommunityComment>(d.ToJson(), _jsonOptions))
                .Where(c => c != null)
                .Cast<CommunityComment>()
                .OrderBy(c => c.CreatedAt)
                .ToList();

            return Ok(comments);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized();
        }
        catch (Exception ex)
        {
            context.Logger.LogError($"GetComments error: {ex.Message}");
            return ServerError();
        }
    }

    public async Task<APIGatewayProxyResponse> CreateComment(APIGatewayProxyRequest request, ILambdaContext context)
    {
        try
        {
            var userId = AuthHelper.GetUserId(request);
            var postId = request.PathParameters?["postId"];
            if (string.IsNullOrWhiteSpace(postId)) return BadRequest("postId is required.");

            var input = JsonSerializer.Deserialize<CreateCommunityCommentRequest>(request.Body, _jsonOptions);
            if (input == null || string.IsNullOrWhiteSpace(input.Content) || string.IsNullOrWhiteSpace(input.DisplayName))
            {
                return BadRequest("displayName and content are required.");
            }

            var comment = new CommunityComment
            {
                CommentId = Guid.NewGuid().ToString(),
                PostId = postId,
                UserId = userId,
                DisplayName = input.DisplayName.Trim(),
                Content = input.Content.Trim(),
                CreatedAt = DateTime.UtcNow.ToString("o"),
            };

            var table = Table.LoadTable(_dynamoClient, _commentsTableName);
            await table.PutItemAsync(Document.FromJson(JsonSerializer.Serialize(comment, _jsonOptions)));
            return Created(comment);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized();
        }
        catch (Exception ex)
        {
            context.Logger.LogError($"CreateComment error: {ex.Message}");
            return ServerError();
        }
    }

    public async Task<APIGatewayProxyResponse> GetAllPostsForAdmin(APIGatewayProxyRequest request, ILambdaContext context)
    {
        try
        {
            if (!AuthHelper.IsAdmin(request)) return Forbidden();

            var posts = await LoadAllPostsAsync();
            posts = posts.OrderByDescending(p => p.CreatedAt).ToList();
            return Ok(posts);
        }
        catch (Exception ex)
        {
            context.Logger.LogError($"GetAllPostsForAdmin error: {ex.Message}");
            return ServerError();
        }
    }

    public async Task<APIGatewayProxyResponse> UpdatePostStatus(APIGatewayProxyRequest request, ILambdaContext context)
    {
        try
        {
            if (!AuthHelper.IsAdmin(request)) return Forbidden();

            var postId = request.PathParameters?["postId"];
            if (string.IsNullOrWhiteSpace(postId)) return BadRequest("postId is required.");

            var input = JsonSerializer.Deserialize<UpdatePostStatusRequest>(request.Body, _jsonOptions);
            var status = input?.Status?.Trim().ToLowerInvariant();
            if (status is not ("pending" or "approved" or "rejected"))
            {
                return BadRequest("status must be pending, approved or rejected.");
            }

            var table = Table.LoadTable(_dynamoClient, _postsTableName);
            var doc = await table.GetItemAsync(postId);
            if (doc == null) return NotFound("Post not found.");

            var post = JsonSerializer.Deserialize<CommunityPost>(doc.ToJson(), _jsonOptions);
            if (post == null) return ServerError();

            post.Status = status;
            await table.PutItemAsync(Document.FromJson(JsonSerializer.Serialize(post, _jsonOptions)));

            return Ok(new { message = "Status updated." });
        }
        catch (Exception ex)
        {
            context.Logger.LogError($"UpdatePostStatus error: {ex.Message}");
            return ServerError();
        }
    }

    public async Task<APIGatewayProxyResponse> DeletePost(APIGatewayProxyRequest request, ILambdaContext context)
    {
        try
        {
            if (!AuthHelper.IsAdmin(request)) return Forbidden();

            var postId = request.PathParameters?["postId"];
            if (string.IsNullOrWhiteSpace(postId)) return BadRequest("postId is required.");

            var postsTable = Table.LoadTable(_dynamoClient, _postsTableName);
            await postsTable.DeleteItemAsync(postId);

            // Best-effort cascade delete comments for the post.
            var commentsTable = Table.LoadTable(_dynamoClient, _commentsTableName);
            var filter = new QueryFilter("postId", QueryOperator.Equal, postId);
            var search = commentsTable.Query(filter);
            do
            {
                var batch = await search.GetNextSetAsync();
                foreach (var commentDoc in batch)
                {
                    var commentId = commentDoc["commentId"].AsString();
                    await commentsTable.DeleteItemAsync(postId, commentId);
                }
            } while (!search.IsDone);

            return Ok(new { message = "Post deleted." });
        }
        catch (Exception ex)
        {
            context.Logger.LogError($"DeletePost error: {ex.Message}");
            return ServerError();
        }
    }

    private async Task<List<CommunityPost>> LoadAllPostsAsync()
    {
        var table = Table.LoadTable(_dynamoClient, _postsTableName);
        var search = table.Scan(new ScanOperationConfig());

        var docs = new List<Document>();
        do
        {
            docs.AddRange(await search.GetNextSetAsync());
        } while (!search.IsDone);

        return docs
            .Select(d => JsonSerializer.Deserialize<CommunityPost>(d.ToJson(), _jsonOptions))
            .Where(p => p != null)
            .Cast<CommunityPost>()
            .ToList();
    }

    private static string NormalizeCategory(string? category)
    {
        var c = category?.Trim().ToLowerInvariant() ?? "experience";
        return c is "tip" or "experience" or "hospital-review" or "question"
            ? c
            : "experience";
    }

    private static APIGatewayProxyResponse Ok(object body) =>
        new()
        {
            StatusCode = (int)HttpStatusCode.OK,
            Body = JsonSerializer.Serialize(body, _jsonOptions),
            Headers = CorsHeaders(),
        };

    private static APIGatewayProxyResponse Created(object body) =>
        new()
        {
            StatusCode = (int)HttpStatusCode.Created,
            Body = JsonSerializer.Serialize(body, _jsonOptions),
            Headers = CorsHeaders(),
        };

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
        { "Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS" },
    };
}
