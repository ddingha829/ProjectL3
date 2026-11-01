-- Migration 9 keeps the existing five-minute retry schedule (including :00).
-- The due timestamp on each like job limits delivery to one digest per hour.
select cron.schedule('l2u-push-activity-cleanup','17 3 * * *',
 $job$select l2u_private.prune_activity_notifications();$job$);
