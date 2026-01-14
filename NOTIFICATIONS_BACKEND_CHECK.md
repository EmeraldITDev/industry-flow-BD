# Notifications Backend Verification Guide

This document helps you verify that your backend API is correctly set up for the notifications system.

## Required API Endpoints

The frontend expects the following endpoints to be available:

### 1. GET `/api/notifications`
**Purpose:** Get all notifications for the authenticated user

**Expected Response:**
- Should return an array of notification objects
- OR an object with `data` property containing the array
- Should require authentication (Bearer token)

**Example Response:**
```json
[
  {
    "id": 1,
    "type": "task_assigned",
    "title": "New Task Assigned",
    "message": "You have been assigned to task: Review project proposal",
    "projectId": 123,
    "taskId": 456,
    "metadata": null,
    "read": false,
    "readAt": null,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
]
```

**OR:**
```json
{
  "data": [
    {
      "id": 1,
      "type": "task_assigned",
      ...
    }
  ]
}
```

---

### 2. GET `/api/notifications/unread-count`
**Purpose:** Get the count of unread notifications

**Expected Response:**
```json
{
  "count": 5
}
```

---

### 3. PATCH `/api/notifications/{id}/read`
**Purpose:** Mark a specific notification as read

**URL Parameter:** `id` (number) - The notification ID

**Expected Response:**
Should return the updated notification object with `read: true` and `readAt` timestamp.

---

### 4. PATCH `/api/notifications/read-all`
**Purpose:** Mark all notifications as read for the authenticated user

**Expected Response:**
Can return 200 OK or the updated notifications array.

---

### 5. DELETE `/api/notifications/{id}`
**Purpose:** Delete a specific notification

**URL Parameter:** `id` (number) - The notification ID

**Expected Response:**
200 OK or 204 No Content

---

### 6. DELETE `/api/notifications`
**Purpose:** Delete all notifications for the authenticated user

**Expected Response:**
200 OK or 204 No Content

---

## Notification Data Structure

Each notification object should have the following structure:

```typescript
{
  id: number;                    // Required: Unique notification ID
  type: string;                  // Required: One of: 'task_assigned', 'status_change', 'deadline_approaching', 'comment', 'stage_change'
  title: string;                 // Required: Notification title
  message: string;               // Required: Notification message/description
  projectId: number | null;      // Optional: Related project ID
  taskId: number | null;         // Optional: Related task ID
  metadata: object | null;       // Optional: Additional data
  read: boolean;                 // Required: Whether notification has been read
  readAt: string | null;         // Optional: ISO timestamp when read
  createdAt: string;             // Required: ISO timestamp when created
  updatedAt: string;             // Required: ISO timestamp when last updated
  project?: object;              // Optional: Related project object (optional, for frontend use)
  task?: object;                 // Optional: Related task object (optional, for frontend use)
}
```

## Notification Types

The frontend supports these notification types:
- `task_assigned` - When a task is assigned to a user
- `status_change` - When a task/project status changes
- `deadline_approaching` - When a deadline is approaching
- `comment` - When a comment is added
- `stage_change` - When a project stage changes

## Authentication

All endpoints should:
- Require authentication via Bearer token in the `Authorization` header
- Return 401 Unauthorized if token is missing or invalid
- Filter notifications to only return those for the authenticated user

## Testing Your Backend

### 1. Test Authentication
```bash
# This should return 401 if not authenticated
curl -X GET https://your-backend-url/api/notifications
```

### 2. Test with Authentication
```bash
# Replace YOUR_TOKEN with your actual auth token
curl -X GET https://your-backend-url/api/notifications \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### 3. Check Response Format
- Verify the response is an array or object with `data` array
- Verify all required fields are present
- Verify `id` is a number (not string)
- Verify dates are ISO format strings

### 4. Test Unread Count
```bash
curl -X GET https://your-backend-url/api/notifications/unread-count \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Common Issues

### Issue: Notifications not showing
**Possible causes:**
1. Backend endpoint not implemented or wrong path
2. Authentication token not being sent correctly
3. Response format doesn't match expected structure
4. CORS issues
5. Backend returning empty array when notifications exist

### Issue: 401 Unauthorized errors
**Solution:**
- Verify token is being sent in Authorization header
- Verify token format: `Bearer {token}`
- Verify token is valid and not expired
- Check backend authentication middleware

### Issue: Wrong response format
**Solution:**
- If backend returns `{ data: [...] }`, that's fine (frontend handles both)
- If backend returns just the array, that's also fine
- Ensure `id` is a number, not a string
- Ensure dates are ISO format strings

### Issue: Notifications appear but can't mark as read
**Solution:**
- Verify PATCH endpoint exists: `/api/notifications/{id}/read`
- Verify endpoint accepts the notification ID
- Verify endpoint returns updated notification

## Frontend Debugging

To debug in the browser console:

1. Open browser DevTools (F12)
2. Check Network tab for `/api/notifications` requests
3. Check Console tab for any error messages
4. Look for:
   - 404 errors (endpoint not found)
   - 401 errors (authentication issues)
   - 500 errors (server errors)
   - Response format issues

## Quick Checklist

- [ ] GET `/api/notifications` endpoint exists
- [ ] GET `/api/notifications/unread-count` endpoint exists
- [ ] PATCH `/api/notifications/{id}/read` endpoint exists
- [ ] PATCH `/api/notifications/read-all` endpoint exists
- [ ] DELETE `/api/notifications/{id}` endpoint exists
- [ ] DELETE `/api/notifications` endpoint exists
- [ ] All endpoints require authentication
- [ ] All endpoints return correct response format
- [ ] Notification `id` field is a number
- [ ] Date fields are ISO format strings
- [ ] Backend filters notifications by authenticated user
