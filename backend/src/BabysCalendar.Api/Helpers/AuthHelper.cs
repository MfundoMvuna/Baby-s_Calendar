using Amazon.Lambda.APIGatewayEvents;
using System.Security.Claims;

namespace BabysCalendar.Api.Helpers;

/// <summary>
/// Extracts the authenticated user ID from the Cognito JWT claims
/// attached by API Gateway's Cognito authorizer.
/// </summary>
public static class AuthHelper
{
    public static string GetUserId(APIGatewayProxyRequest request)
    {
        // API Gateway Cognito authorizer puts claims in requestContext
        if (request.RequestContext?.Authorizer != null &&
            request.RequestContext.Authorizer.TryGetValue("claims", out var claimsObj) &&
            claimsObj is Dictionary<string, string> claims &&
            claims.TryGetValue("sub", out var sub))
        {
            return sub;
        }

        // Fallback: check for "sub" directly in authorizer map
        if (request.RequestContext?.Authorizer != null &&
            request.RequestContext.Authorizer.TryGetValue("sub", out var directSub) &&
            directSub is string subStr)
        {
            return subStr;
        }

        throw new UnauthorizedAccessException("User identity not found in request.");
    }
}
