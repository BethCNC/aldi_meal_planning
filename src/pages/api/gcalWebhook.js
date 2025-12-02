/**
 * Google Calendar Webhook Handler
 * 
 * Handles Google Calendar push notifications and syncs events to Notion Tasks database.
 * 
 * Features:
 * - Staging date detection: Events on Sundays become undated tasks (Status: Inbox, no Due Date)
 * - Normal events: Events on other days become dated tasks (Status: To Do, with Due Date)
 * - Hashtag parsing: Extracts #bucket, #urgency, #importance from event descriptions
 * - Automatic task owner detection based on calendar ID
 */

import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const TASKS_DB_ID = process.env.NOTION_TASKS_DB_ID;

/**
 * Parse hashtags from event description
 * Supports: #bucket, #urgency, #importance
 * 
 * @param {string} description - Event description text
 * @returns {object} - { tags: { bucket, urgency, importance }, cleanDescription: string }
 */
function parseHashtags(description) {
  if (!description) {
    return { tags: {}, cleanDescription: '' };
  }

  const tags = {};
  let cleanDescription = description;

  // Extract #bucket (e.g., #home, #personal, #work)
  const bucketMatch = description.match(/#(bucket|home|personal|work|health|finance|family)\b/i);
  if (bucketMatch) {
    const bucketValue = bucketMatch[1].toLowerCase();
    // Map common bucket names
    const bucketMap = {
      'bucket': 'Personal', // Default if just #bucket
      'home': 'Home',
      'personal': 'Personal',
      'work': 'Work',
      'health': 'Health',
      'finance': 'Finance',
      'family': 'Family'
    };
    tags.bucket = bucketMap[bucketValue] || 'Personal';
    cleanDescription = cleanDescription.replace(bucketMatch[0], '').trim();
  }

  // Extract #urgency (e.g., #urgent, #not-urgent)
  const urgencyMatch = description.match(/#(urgent|not-urgent|habit)\b/i);
  if (urgencyMatch) {
    const urgencyValue = urgencyMatch[1].toLowerCase();
    const urgencyMap = {
      'urgent': 'Urgent',
      'not-urgent': 'Not Urgent',
      'habit': 'Habit'
    };
    tags.urgency = urgencyMap[urgencyValue] || 'Not Urgent';
    cleanDescription = cleanDescription.replace(urgencyMatch[0], '').trim();
  }

  // Extract #importance (e.g., #important, #not-important)
  const importanceMatch = description.match(/#(important|not-important|⚠️)\b/i);
  if (importanceMatch) {
    const importanceValue = importanceMatch[1].toLowerCase();
    const importanceMap = {
      'important': '⚠️ Important',
      'not-important': 'Not Important',
      '⚠️': '⚠️ Important'
    };
    tags.importance = importanceMap[importanceValue] || 'Not Important';
    cleanDescription = cleanDescription.replace(importanceMatch[0], '').trim();
  }

  // Clean up extra whitespace
  cleanDescription = cleanDescription.replace(/\s+/g, ' ').trim();

  return { tags, cleanDescription };
}

/**
 * Detect if an event is on a staging date (Sunday)
 * 
 * @param {object} event - Google Calendar event object
 * @returns {boolean} - true if event is on Sunday (staging date)
 */
function isStagingDate(event) {
  try {
    // Handle both all-day events (date) and timed events (dateTime)
    const dateString = event.start?.dateTime || event.start?.date;
    
    if (!dateString) {
      console.warn('⚠️ Event has no start date:', event.id);
      return false;
    }

    const eventDate = new Date(dateString);
    const dayOfWeek = eventDate.getDay(); // 0 = Sunday, 6 = Saturday
    
    return dayOfWeek === 0; // Sunday = staging date
  } catch (error) {
    console.error('❌ Error parsing event date:', error);
    return false;
  }
}

/**
 * Build Notion properties object from Google Calendar event
 * 
 * @param {object} event - Google Calendar event object
 * @param {string} calendarId - Calendar ID (e.g., 'bryan@bethcnc.com')
 * @returns {object} - Notion API properties object
 */
function buildNotionProperties(event, calendarId) {
  // Parse hashtags from description
  const { tags, cleanDescription } = parseHashtags(event.description || '');

  // Determine task owner based on calendar
  const taskOwner = calendarId === 'bryan@bethcnc.com' ? 'Bryan' : 'Beth';

  // ============================================
  // STAGING DATE DETECTION
  // ============================================
  const isStaging = isStagingDate(event);

  if (isStaging) {
    console.log('📌 Staging date detected (Sunday):', event.summary);
    console.log('   Creating undated task in Inbox');
  } else {
    console.log('📅 Dated event:', event.summary);
    console.log('   Due Date:', event.start?.dateTime || event.start?.date);
  }
  // ============================================

  // Build base properties
  const properties = {
    'Task': {
      title: [{ text: { content: event.summary || 'Untitled Event' } }]
    },
    'gcal_event_id': {
      rich_text: [{ text: { content: event.id } }]
    },
    'Task Owner': {
      select: { name: taskOwner }
    }
  };

  // Conditional Due Date and Status based on staging date
  if (isStaging) {
    // Undated task - no Due Date, Status = Inbox
    properties['Status'] = {
      status: { name: 'Inbox' }
    };
    // Note: Due Date is intentionally omitted (not set to null)
  } else {
    // Normal dated task
    if (event.start?.dateTime || event.start?.date) {
      properties['Due Date'] = {
        date: {
          start: event.start.dateTime || event.start.date,
          end: event.end?.dateTime || event.end?.date || null
        }
      };
    }
    properties['Status'] = {
      status: { name: 'To Do' }
    };
  }

  // Add other properties (bucket, urgency, importance)
  const bucketPropertyName = 'Related Life Bucket';
  
  properties[bucketPropertyName] = {
    select: { 
      name: tags.bucket || (taskOwner === 'Bryan' ? 'Home' : 'Personal')
    }
  };

  properties['Urgency'] = {
    select: { name: tags.urgency || 'Not Urgent' }
  };

  properties['Importance'] = {
    select: { name: tags.importance || 'Not Important' }
  };

  return properties;
}

/**
 * Find existing Notion task by Google Calendar event ID
 * 
 * @param {string} gcalEventId - Google Calendar event ID
 * @returns {Promise<string|null>} - Notion page ID or null if not found
 */
async function findExistingTask(gcalEventId) {
  try {
    const response = await notion.databases.query({
      database_id: TASKS_DB_ID,
      filter: {
        property: 'gcal_event_id',
        rich_text: {
          equals: gcalEventId
        }
      }
    });

    return response.results.length > 0 ? response.results[0].id : null;
  } catch (error) {
    console.error('❌ Error finding existing task:', error);
    return null;
  }
}

/**
 * Create or update Notion task from Google Calendar event
 * 
 * @param {object} event - Google Calendar event object
 * @param {string} calendarId - Calendar ID
 * @returns {Promise<object>} - Created/updated Notion page
 */
async function syncEventToNotion(event, calendarId) {
  try {
    const properties = buildNotionProperties(event, calendarId);
    
    // Check if task already exists
    const existingTaskId = await findExistingTask(event.id);

    if (existingTaskId) {
      // Update existing task
      console.log('🔄 Updating existing task:', event.summary);
      return await notion.pages.update({
        page_id: existingTaskId,
        properties
      });
    } else {
      // Create new task
      console.log('✨ Creating new task:', event.summary);
      return await notion.pages.create({
        parent: { database_id: TASKS_DB_ID },
        properties
      });
    }
  } catch (error) {
    console.error('❌ Error syncing event to Notion:', error);
    throw error;
  }
}

/**
 * Handle Google Calendar webhook notification
 * Processes push notifications from Google Calendar API
 */
export default async function handler(req, res) {
  // Verify webhook secret (if configured)
  const webhookSecret = process.env.GCAL_WEBHOOK_SECRET;
  if (webhookSecret && req.headers['x-goog-channel-token'] !== webhookSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Handle webhook verification (Google sends GET request initially)
  if (req.method === 'GET') {
    const syncToken = req.query['x-goog-resource-state'];
    if (syncToken === 'sync') {
      console.log('✅ Webhook verified');
      return res.status(200).send('Webhook verified');
    }
    return res.status(200).send('OK');
  }

  // Handle POST (actual notifications)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const resourceState = req.headers['x-goog-resource-state'];
    const channelId = req.headers['x-goog-channel-id'];
    const resourceId = req.headers['x-goog-resource-id'];

    console.log('📬 Webhook received:', {
      resourceState,
      channelId,
      resourceId
    });

    // Handle different notification types
    if (resourceState === 'exists') {
      // Event was created or updated
      // Note: In a real implementation, you'd fetch the event from Google Calendar API
      // For now, we'll log and return success
      console.log('📅 Event exists - would sync to Notion');
      
      // TODO: Fetch event from Google Calendar API using the resourceId
      // const event = await fetchEventFromGoogleCalendar(resourceId);
      // await syncEventToNotion(event, calendarId);
      
      return res.status(200).json({ 
        success: true, 
        message: 'Webhook received (event exists)' 
      });
    } else if (resourceState === 'not_exists') {
      // Event was deleted
      console.log('🗑️ Event deleted - would remove from Notion');
      
      // TODO: Delete task from Notion
      // await deleteTaskFromNotion(resourceId);
      
      return res.status(200).json({ 
        success: true, 
        message: 'Webhook received (event deleted)' 
      });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

// Export helper functions for testing
export { buildNotionProperties, isStagingDate, parseHashtags };

