# Team Member Management Improvements

## Overview
This document outlines the improvements made to the Team Member management system to ensure consistency, proper project access, and flexible user deletion.

## Changes Implemented

### 1. Team Members Table Sync ✅

**Issue**: Settings page and main Team Members page should display identical data.

**Solution**: 
- Both pages should use the same endpoint: `GET /api/team`
- For consistent plain array responses (no pagination), use: `GET /api/team?all=true` or `GET /api/team?plain=true`
- The endpoint supports filtering, sorting, and search parameters that work consistently across both pages

**Endpoint**: `GET /api/team`
- **Query Parameters**:
  - `all=true` or `plain=true`: Returns plain array (no pagination)
  - `role`: Filter by role
  - `department`: Filter by department
  - `isActive`: Filter by active status
  - `search`: Search by name, email, department, or position
  - `sortBy`: Sort field (default: 'name')
  - `sortOrder`: Sort direction (default: 'asc')
  - `perPage`: Items per page (default: 15, only used when not using `all=true`)

**Response Format**: 
- With `all=true`: Plain array of `UserResource` objects
- Without `all=true`: Paginated response with `data`, `meta`, and `links`

### 2. Project Access for Team Members ✅

**Issue**: When viewing a team member's associated projects, should only show projects they're assigned to. Sometimes triggers "route not found" error.

**Solution**: Added new endpoint to get projects for a specific team member.

**New Endpoint**: `GET /api/team/{id}/projects`

**Description**: Returns all projects where the user is assigned (either as project lead or assignee).

**Response**: Plain array of `ProjectResource` objects

**Example Request**:
```bash
GET /api/team/1/projects
Authorization: Bearer {token}
```

**Example Response**:
```json
[
  {
    "id": 1,
    "name": "Project Name",
    "description": "Project description",
    "projectLeadId": 1,
    "assigneeId": 1,
    ...
  }
]
```

**Note**: This endpoint combines both `ledProjects` and `assignedProjects` into a single list, showing all projects the user is associated with.

### 3. User Deletion with Warnings ✅

**Issue**: Users with no assigned tasks couldn't be deleted. Need to allow deletion of any user with proper warnings and cascade handling.

**Solution**: 
- Updated deletion logic to allow deletion of any user
- Added warning endpoint to check assignments before deletion
- Implemented proper cascade handling (removes user from projects/tasks, preserves system integrity)

#### New Endpoint: `GET /api/team/{id}/deletion-warning`

**Description**: Returns information about user's assignments before deletion. Use this to show warnings in the frontend.

**Response**:
```json
{
  "hasAssignments": true,
  "ledProjects": [
    {"id": 1, "name": "Project 1"},
    {"id": 2, "name": "Project 2"}
  ],
  "assignedProjects": [
    {"id": 3, "name": "Project 3"}
  ],
  "tasks": [
    {
      "id": 1,
      "title": "Task 1",
      "projectId": 1,
      "projectName": "Project 1"
    }
  ],
  "warningMessage": "This user is a team lead or is assigned to the following project(s)/task(s). Deleting this user will remove them from these assignments."
}
```

#### Updated Endpoint: `DELETE /api/team/{id}`

**Description**: Deletes a user and removes them from all associated projects and tasks.

**Behavior**:
1. Removes user from all projects (sets `project_lead_id` and `assignee_id` to `null`)
2. Removes user from all tasks (sets `assignee_id` to `null`)
3. Deletes user's notification associations
4. Deletes user's personal access tokens
5. Deletes the user record

**Response**:
```json
{
  "success": true,
  "message": "Team member deleted successfully",
  "removedFromProjects": 3,
  "removedFromTasks": 5
}
```

**Frontend Implementation Guide**:

1. **Before Deletion**:
   ```javascript
   // Check for assignments
   const warningResponse = await axios.get(`/api/team/${userId}/deletion-warning`);
   
   if (warningResponse.data.hasAssignments) {
     // Show warning modal with:
     // - warningResponse.data.warningMessage
     // - List of projects: warningResponse.data.ledProjects + warningResponse.data.assignedProjects
     // - List of tasks: warningResponse.data.tasks
     // - Confirm button to proceed
   }
   ```

2. **Proceed with Deletion**:
   ```javascript
   // Delete user
   const deleteResponse = await axios.delete(`/api/team/${userId}`);
   
   // Show success message:
   // "User deleted. Removed from {removedFromProjects} projects and {removedFromTasks} tasks."
   ```

## API Routes Summary

### Team Management Routes

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/team` | List all team members | Yes |
| GET | `/api/team/{id}` | Get single team member | Yes |
| GET | `/api/team/{id}/projects` | Get projects for team member | Yes |
| GET | `/api/team/{id}/deletion-warning` | Get deletion warning info | Yes |
| GET | `/api/team/stats` | Get team statistics | Yes |
| POST | `/api/team` | Create team member | Yes (Admin/BD Director) |
| PUT | `/api/team/{id}` | Update team member | Yes (Admin/BD Director) |
| PATCH | `/api/team/{id}/role` | Update team member role | Yes (Admin/BD Director) |
| PATCH | `/api/team/{id}/status` | Update team member status | Yes (Admin/BD Director) |
| DELETE | `/api/team/{id}` | Delete team member | Yes (Admin/BD Director) |

## Database Integrity

When a user is deleted:
- ✅ Projects: `project_lead_id` and `assignee_id` are set to `null` (not deleted)
- ✅ Tasks: `assignee_id` is set to `null` (not deleted)
- ✅ Notifications: User's notification associations are removed
- ✅ Tokens: User's Sanctum tokens are deleted
- ✅ User record: Deleted from database

**System Integrity**: All projects and tasks remain intact, just with the user reference removed.

## Testing

### Test Team Members Sync
```bash
# Get all team members (plain array)
curl -H "Authorization: Bearer {token}" \
  "https://industry-flow-backend.onrender.com/api/team?all=true"
```

### Test Project Access
```bash
# Get projects for team member
curl -H "Authorization: Bearer {token}" \
  "https://industry-flow-backend.onrender.com/api/team/1/projects"
```

### Test Deletion Warning
```bash
# Get deletion warning
curl -H "Authorization: Bearer {token}" \
  "https://industry-flow-backend.onrender.com/api/team/1/deletion-warning"
```

### Test User Deletion
```bash
# Delete user (after checking warning)
curl -X DELETE \
  -H "Authorization: Bearer {token}" \
  "https://industry-flow-backend.onrender.com/api/team/1"
```

## Frontend Integration Notes

1. **Settings Page**: Use `GET /api/team?all=true` to get all team members as a plain array
2. **Main Team Members Page**: Use `GET /api/team?all=true` for consistency, or use pagination with `GET /api/team?perPage=15`
3. **Team Member Projects**: Use `GET /api/team/{id}/projects` to show only assigned projects
4. **Delete User Flow**:
   - Call `GET /api/team/{id}/deletion-warning` first
   - Show warning if `hasAssignments === true`
   - On confirm, call `DELETE /api/team/{id}`
   - Show success message with removal counts

## Migration Notes

No database migrations required. All changes are in the application layer.
