using Amazon.Lambda.APIGatewayEvents;
using System.Security.Claims;

namespace BabysCalendar.Api.Helpers;

/// <summary>
/// Extracts the authenticated user ID from the Cognito JWT claims
/// attached by API Gateway's Cognito authorizer.
/// </summary>
public static class AuthHelper
{
    public static string? GetEmail(APIGatewayProxyRequest request) =>
        GetClaim(request, "email");

    public static bool IsAdmin(APIGatewayProxyRequest request)
    {
        var email = GetEmail(request)?.Trim().ToLowerInvariant();
        if (string.IsNullOrEmpty(email)) return false;

        var adminsRaw = Environment.GetEnvironmentVariable("ADMIN_EMAILS") ?? string.Empty;
        var admins = adminsRaw
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(e => e.ToLowerInvariant())
            .ToHashSet();

        return admins.Contains(email);
    }

    public static string GetUserId(APIGatewayProxyRequest request)
    {
        var sub = GetClaim(request, "sub");
        if (!string.IsNullOrEmpty(sub)) return sub;

        throw new UnauthorizedAccessException("User identity not found in request.");
    }

    private static string? GetClaim(APIGatewayProxyRequest request, string claimName)
    {
        if (request.RequestContext?.Authorizer == null) return null;

        if (request.RequestContext.Authorizer.TryGetValue("claims", out var claimsObj))
        {
            if (claimsObj is Dictionary<string, string> sClaims &&
                sClaims.TryGetValue(claimName, out var claimValue) &&
                !string.IsNullOrEmpty(claimValue))
            {
                return claimValue;
            }

            if (claimsObj is Dictionary<string, object> oClaims &&
                oClaims.TryGetValue(claimName, out var oValue) &&
                oValue != null)
            {
                var objectClaimValue = oValue.ToString();
                if (!string.IsNullOrEmpty(objectClaimValue)) return objectClaimValue;
            }
        }

        if (request.RequestContext.Authorizer.TryGetValue(claimName, out var directValue) &&
            directValue != null)
        {
            var directClaimValue = directValue.ToString();
            if (!string.IsNullOrEmpty(directClaimValue)) return directClaimValue;
        }

        return null;
    }
}
