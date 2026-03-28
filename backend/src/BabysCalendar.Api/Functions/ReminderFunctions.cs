using System.Text.Json;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.DocumentModel;
using Amazon.Lambda.CloudWatchEvents.ScheduledEvents;
using Amazon.Lambda.Core;
using Amazon.SimpleNotificationService;
using Amazon.SimpleNotificationService.Model;

namespace BabysCalendar.Api.Functions;

/// <summary>
/// Scheduled Lambda that runs daily (via CloudWatch Events cron).
/// Queries tomorrow's events across all users and publishes SNS
/// notifications as appointment reminders.
/// </summary>
public class ReminderFunctions
{
    private static readonly AmazonDynamoDBClient _dynamoClient = new();
    private static readonly AmazonSimpleNotificationServiceClient _snsClient = new();
    private static readonly string _eventsTable = Environment.GetEnvironmentVariable("EVENTS_TABLE_NAME") ?? "babys-calendar-events-dev";
    private static readonly string _snsTopicArn = Environment.GetEnvironmentVariable("SNS_TOPIC_ARN") ?? "";

    public async Task SendReminders(ScheduledEvent scheduledEvent, ILambdaContext context)
    {
        var tomorrow = DateTime.UtcNow.AddDays(1).ToString("yyyy-MM-dd");
        context.Logger.LogInformation($"Checking reminders for date: {tomorrow}");

        try
        {
            var table = Table.LoadTable(_dynamoClient, _eventsTable);

            // Scan for events matching tomorrow's date (GSI DateIndex)
            var scanFilter = new ScanFilter();
            scanFilter.AddCondition("date", ScanOperator.Equal, tomorrow);
            scanFilter.AddCondition("completed", ScanOperator.Equal, false);

            var search = table.Scan(scanFilter);
            var results = new List<Document>();
            do
            {
                results.AddRange(await search.GetNextSetAsync());
            } while (!search.IsDone);

            context.Logger.LogInformation($"Found {results.Count} upcoming events for {tomorrow}");

            foreach (var doc in results)
            {
                var title = doc.ContainsKey("title") ? doc["title"].AsString() : "Upcoming appointment";
                var userId = doc.ContainsKey("userId") ? doc["userId"].AsString() : "unknown";

                var message = $"Reminder: \"{title}\" is scheduled for tomorrow ({tomorrow}). " +
                              "Don't forget to prepare and bring any required documents.";

                await _snsClient.PublishAsync(new PublishRequest
                {
                    TopicArn = _snsTopicArn,
                    Subject = $"Baby's Calendar Reminder: {title}",
                    Message = message,
                    MessageAttributes = new Dictionary<string, MessageAttributeValue>
                    {
                        ["userId"] = new() { DataType = "String", StringValue = userId },
                    },
                });

                context.Logger.LogInformation($"Sent reminder for userId={userId}, event={title}");
            }
        }
        catch (Exception ex)
        {
            context.Logger.LogError($"SendReminders error: {ex.Message}");
            throw; // Let Lambda retry
        }
    }
}
