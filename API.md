# API Documentation

This document provides comprehensive API documentation for the Optimizely AI Content Generation Platform.

## Base URL

- **Development**: `http://localhost:3000`
- **Production**: (configure as needed)

## Authentication

Most endpoints require authentication using JWT tokens. Include the access token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

### Token Types

- **Access Token**: Short-lived token used for API requests (stored in localStorage)
- **Refresh Token**: Long-lived token used to obtain new access tokens (stored in localStorage)

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error message",
  "message": "Detailed error message (optional)"
}
```

Common HTTP status codes:
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required or invalid token)
- `403` - Forbidden (authorization failed)
- `404` - Not Found (resource not found)
- `500` - Internal Server Error

---

## Utility Endpoints

### Health Check

Check the health status of the API.

**Endpoint**: `GET /api/health`

**Authentication**: Not required (public endpoint)

**Request**: No request body required

**Response**:

**Success (200)**:
```json
{
  "status": "ok",
  "timestamp": "2024-01-14T12:34:56.789Z"
}
```

**Error (500)**:
```json
{
  "status": "error",
  "timestamp": "2024-01-14T12:34:56.789Z"
}
```

**Description**: This endpoint is used for health monitoring and can be used by external services (e.g., Railway, monitoring tools) to verify the API is running and responsive. The endpoint returns the current status and timestamp. A successful response (200) indicates the API is healthy, while a 500 response indicates an error occurred.

---

## Authentication Endpoints

### Register User

Create a new user account.

**Endpoint**: `POST /api/auth/register`

**Authentication**: Not required

**Request Body**:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "emailOrPhone": "john.doe@example.com",
  "password": "securepassword123"
}
```

**Field Descriptions**:
- `firstName` (string, required): User's first name
- `lastName` (string, required): User's last name
- `emailOrPhone` (string, required): User's email address or phone number (must contain exactly one `@` for email)
- `password` (string, required): User's password

**Success Response** (201):
```json
{
  "message": "User registered successfully",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phone": null
  }
}
```

**Error Responses**:
- `400` - Validation error or user already exists
- `500` - Internal server error

---

### Login

Authenticate a user and receive access and refresh tokens.

**Endpoint**: `POST /api/auth/login`

**Authentication**: Not required

**Request Body**:
```json
{
  "emailOrPhone": "john.doe@example.com",
  "password": "securepassword123"
}
```

**Field Descriptions**:
- `emailOrPhone` (string, required): User's email address or phone number
- `password` (string, required): User's password

**Success Response** (200):
```json
{
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phone": null
  }
}
```

**Error Responses**:
- `400` - Validation error
- `401` - Invalid credentials
- `500` - Internal server error

---

### Logout

Logout a user by invalidating the refresh token.

**Endpoint**: `POST /api/auth/logout`

**Authentication**: Not required (but refresh token must be valid)

**Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Field Descriptions**:
- `refreshToken` (string, required): The refresh token to invalidate

**Success Response** (200):
```json
{
  "message": "Logged out successfully"
}
```

**Error Responses**:
- `400` - Refresh token is required
- `500` - Internal server error

---

### Refresh Access Token

Obtain a new access token using a refresh token.

**Endpoint**: `POST /api/auth/refresh`

**Authentication**: Not required (but refresh token must be valid)

**Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Field Descriptions**:
- `refreshToken` (string, required): Valid refresh token

**Success Response** (200):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses**:
- `400` - Validation error
- `401` - Invalid or expired refresh token
- `500` - Internal server error

---

### Verify Token

Verify if an access token is valid.

**Endpoint**: `GET /api/auth/verify`

**Authentication**: Required (access token in Authorization header)

**Success Response** (200):
```json
{
  "valid": true,
  "userId": "507f1f77bcf86cd799439011"
}
```

**Error Responses**:
- `401` - Invalid or expired token
- `500` - Internal server error

---

## Content Types Endpoints

### Get All Content Types

Retrieve all available content types.

**Endpoint**: `GET /api/content-types`

**Authentication**: Not required

**Success Response** (200):
```json
{
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "title": "Blog Post Outline",
      "average_token_weight": null,
      "created_at": "2024-01-14T10:00:00.000Z",
      "updated_at": "2024-01-14T10:00:00.000Z"
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "title": "Product Description",
      "average_token_weight": 150,
      "created_at": "2024-01-14T10:00:00.000Z",
      "updated_at": "2024-01-14T10:00:00.000Z"
    }
  ],
  "count": 2
}
```

**Error Responses**:
- `500` - Internal server error

---

### Create Content Type

Create a new content type.

**Endpoint**: `POST /api/content-types`

**Authentication**: Not required

**Request Body**:
```json
{
  "title": "Social Media Caption",
  "average_token_weight": 100
}
```

**Field Descriptions**:
- `title` (string, required): Content type title
- `average_token_weight` (number, optional): Average token weight for this content type

**Success Response** (201):
```json
{
  "message": "Content type created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439013",
    "title": "Social Media Caption",
    "average_token_weight": 100,
    "created_at": "2024-01-14T10:00:00.000Z",
    "updated_at": "2024-01-14T10:00:00.000Z"
  }
}
```

**Error Responses**:
- `400` - Validation error
- `500` - Internal server error

---

### Get Content Type by ID

Retrieve a specific content type by ID.

**Endpoint**: `GET /api/content-types/[id]`

**Authentication**: Not required

**Path Parameters**:
- `id` (string, required): Content type MongoDB ObjectId

**Success Response** (200):
```json
{
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "Blog Post Outline",
    "average_token_weight": null,
    "created_at": "2024-01-14T10:00:00.000Z",
    "updated_at": "2024-01-14T10:00:00.000Z"
  }
}
```

**Error Responses**:
- `400` - Invalid content type ID
- `404` - Content type not found
- `500` - Internal server error

---

### Update Content Type

Update a content type by ID.

**Endpoint**: `PUT /api/content-types/[id]`

**Authentication**: Not required

**Path Parameters**:
- `id` (string, required): Content type MongoDB ObjectId

**Request Body**:
```json
{
  "title": "Updated Blog Post Outline",
  "average_token_weight": 200
}
```

**Field Descriptions**:
- `title` (string, optional): New title
- `average_token_weight` (number | null, optional): New average token weight

**Success Response** (200):
```json
{
  "message": "Content type updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "Updated Blog Post Outline",
    "average_token_weight": 200,
    "created_at": "2024-01-14T10:00:00.000Z",
    "updated_at": "2024-01-14T11:00:00.000Z"
  }
}
```

**Error Responses**:
- `400` - Invalid content type ID or validation error
- `404` - Content type not found
- `500` - Internal server error

---

### Delete Content Type

Delete a content type by ID.

**Endpoint**: `DELETE /api/content-types/[id]`

**Authentication**: Not required

**Path Parameters**:
- `id` (string, required): Content type MongoDB ObjectId

**Success Response** (200):
```json
{
  "message": "Content type deleted successfully"
}
```

**Error Responses**:
- `400` - Invalid content type ID
- `404` - Content type not found
- `500` - Internal server error

---

## AI Generation Endpoints

### Create AI Generation Job

Create a new AI content generation job.

**Endpoint**: `POST /api/ai/generate`

**Authentication**: Required

**Request Body**:
```json
{
  "content_type": "Blog Post Outline",
  "prompt": "Explain how AI works in simple terms"
}
```

**Field Descriptions**:
- `content_type` (string, required): Type of content to generate (must match an existing content type title)
- `prompt` (string, required): User's prompt for content generation

**Success Response** (201):
```json
{
  "message": "AI generation job created successfully",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "job_id": "bullmq-job-id-123",
    "status": "pending",
    "created_at": "2024-01-14T10:00:00.000Z"
  }
}
```

**Error Responses**:
- `400` - Validation error (missing or invalid fields)
- `401` - Unauthorized
- `500` - Internal server error

---

### List Saved Jobs

Retrieve a paginated list of saved (successful) jobs for the authenticated user.

**Endpoint**: `GET /api/ai/generate`

**Authentication**: Required

**Query Parameters**:
- `limit` (number, optional): Number of jobs to return (default: 20, max: 100)
- `offset` (number, optional): Number of jobs to skip (default: 0)

**Example Request**:
```
GET /api/ai/generate?limit=20&offset=0
```

**Success Response** (200):
```json
{
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "job_id": "bullmq-job-id-123",
      "content_type": "Blog Post Outline",
      "prompt": "Explain how AI works in simple terms",
      "title": "Understanding AI Basics",
      "created_at": "2024-01-14T10:00:00.000Z",
      "updated_at": "2024-01-14T10:05:00.000Z"
    }
  ],
  "count": 1,
  "total": 1,
  "limit": 20,
  "offset": 0,
  "hasMore": false
}
```

**Error Responses**:
- `401` - Unauthorized
- `500` - Internal server error

---

### Get Job Status

Retrieve the status of a specific job.

**Endpoint**: `GET /api/ai/job/[id]`

**Authentication**: Required

**Path Parameters**:
- `id` (string, required): Job MongoDB ObjectId

**Success Response** (200):
```json
{
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "user": "507f1f77bcf86cd799439012",
    "content_type": "Blog Post Outline",
    "prompt": "Explain how AI works in simple terms",
    "job_id": "bullmq-job-id-123",
    "status": "success",
    "retry_count": 0,
    "created_at": "2024-01-14T10:00:00.000Z",
    "updated_at": "2024-01-14T10:05:00.000Z"
  }
}
```

**Status Values**:
- `pending` - Job is queued and waiting to be processed
- `success` - Job completed successfully
- `failed` - Job failed after retries

**Error Responses**:
- `400` - Invalid job ID
- `401` - Unauthorized
- `403` - Job does not belong to user
- `404` - Job not found
- `500` - Internal server error

---

### Get Generated Content

Retrieve the generated content for a specific job.

**Endpoint**: `GET /api/ai/job/[id]/content`

**Authentication**: Required

**Path Parameters**:
- `id` (string, required): Job MongoDB ObjectId

**Success Response** (200):
```json
{
  "data": {
    "id": "507f1f77bcf86cd799439013",
    "job_id": "507f1f77bcf86cd799439011",
    "user": "507f1f77bcf86cd799439012",
    "content_type": "Blog Post Outline",
    "prompt": "Explain how AI works in simple terms",
    "response": "# Understanding AI Basics\n\n## Introduction\n...",
    "created_at": "2024-01-14T10:05:00.000Z",
    "updated_at": "2024-01-14T10:05:00.000Z"
  }
}
```

**Error Responses**:
- `400` - Invalid job ID
- `401` - Unauthorized
- `403` - Job does not belong to user
- `404` - Job or generated content not found
- `500` - Internal server error

---

### Save Job

Mark a successful job as saved (makes it appear in the saved jobs list).

**Endpoint**: `POST /api/ai/job/[id]/save`

**Authentication**: Required

**Path Parameters**:
- `id` (string, required): Job MongoDB ObjectId

**Success Response** (200):
```json
{
  "message": "Job saved successfully",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "saved": true
  }
}
```

**Error Responses**:
- `400` - Invalid job ID or job status is not "success"
- `401` - Unauthorized
- `403` - Job does not belong to user
- `404` - Job not found
- `500` - Internal server error

---

### Submit Feedback

Submit feedback (rating and optional comment) for generated content.

**Endpoint**: `POST /api/ai/job/[id]/feedback`

**Authentication**: Required

**Path Parameters**:
- `id` (string, required): Job MongoDB ObjectId

**Request Body**:
```json
{
  "rating": 5,
  "comment": "Great content! Very helpful and well-structured."
}
```

**Field Descriptions**:
- `rating` (number, required): Rating from 1 to 5 stars
- `comment` (string, optional): Optional feedback comment (sentiment will be analyzed if provided)

**Success Response** (200):
```json
{
  "message": "Feedback submitted successfully",
  "data": {
    "id": "507f1f77bcf86cd799439014",
    "rating": 5,
    "comment": "Great content! Very helpful and well-structured.",
    "sentiment": "positive",
    "created_at": "2024-01-14T10:10:00.000Z",
    "updated_at": "2024-01-14T10:10:00.000Z"
  }
}
```

**Sentiment Values**:
- `positive` - Positive sentiment detected
- `neutral` - Neutral sentiment detected
- `negative` - Negative sentiment detected

**Note**: If a comment is provided, the system automatically analyzes sentiment using AI and stores it in the `sentiment` field.

**Error Responses**:
- `400` - Invalid job ID or validation error (rating must be 1-5)
- `401` - Unauthorized
- `403` - Content does not belong to user
- `404` - Generated content not found
- `500` - Internal server error

---

### Get Feedback

Retrieve feedback for a specific job's generated content.

**Endpoint**: `GET /api/ai/job/[id]/feedback`

**Authentication**: Required

**Path Parameters**:
- `id` (string, required): Job MongoDB ObjectId

**Success Response** (200):
```json
{
  "data": {
    "id": "507f1f77bcf86cd799439014",
    "rating": 5,
    "comment": "Great content! Very helpful and well-structured.",
    "sentiment": "positive",
    "created_at": "2024-01-14T10:10:00.000Z",
    "updated_at": "2024-01-14T10:10:00.000Z"
  }
}
```

**If No Feedback Exists** (200):
```json
{
  "message": "No feedback found",
  "data": null
}
```

**Error Responses**:
- `400` - Invalid job ID
- `401` - Unauthorized
- `403` - Content does not belong to user
- `404` - Generated content not found
- `500` - Internal server error

---

## WebSocket Events

### Connection

Connect to the Socket.io server at `http://localhost:3001` (or the configured `NEXT_PUBLIC_SOCKET_IO_URL`).

**Authentication**: Include the access token in the connection query parameter or auth object.

### Subscribe to Job Updates

**Event**: `subscribe:job`

**Payload**:
```json
{
  "jobId": "507f1f77bcf86cd799439011"
}
```

Subscribe to real-time updates for a specific job.

### Unsubscribe from Job Updates

**Event**: `unsubscribe:job`

**Payload**:
```json
{
  "jobId": "507f1f77bcf86cd799439011"
}
```

Unsubscribe from real-time updates for a specific job.

### Job Update Event

**Event**: `job:update`

**Payload**:
```json
{
  "jobId": "507f1f77bcf86cd799439011",
  "userId": "507f1f77bcf86cd799439012",
  "status": "success",
  "content": {
    "id": "507f1f77bcf86cd799439013",
    "response": "# Understanding AI Basics\n\n## Introduction\n...",
    "content_type": "Blog Post Outline",
    "prompt": "Explain how AI works in simple terms",
    "created_at": "2024-01-14T10:05:00.000Z",
    "updated_at": "2024-01-14T10:05:00.000Z"
  }
}
```

**Status Values**:
- `pending` - Job is queued and waiting to be processed
- `success` - Job completed successfully (includes `content` object)
- `failed` - Job failed (no `content` object)

This event is emitted whenever a job status changes. The `content` object is only included when `status` is `"success"`.

---

## Notes

1. **Job Status Flow**:
   - Jobs start with status `"pending"`
   - After processing, jobs transition to `"success"` or `"failed"`
   - Jobs remain `"pending"` for a delay period (`QUEUE_EXECUTION_DELAY` seconds) before processing begins
   - Failed jobs are retried up to `MAX_JOB_RETRIES` times (default: 3)

2. **Real-time Updates**:
   - Job status updates are sent via WebSocket in real-time
   - Subscribe to job updates using the Socket.io client
   - Updates are only sent to the user who owns the job

3. **Job Saving**:
   - Only successful jobs (`status: "success"`) can be saved
   - Saved jobs appear in the `/api/ai/generate` GET endpoint
   - Jobs are saved with a generated title (created automatically from the prompt)

4. **Feedback**:
   - One feedback per user per generated content
   - If feedback already exists, updating it replaces the existing feedback
   - Sentiment analysis is performed automatically on comments using AI
   - Sentiment values: `"positive"`, `"neutral"`, or `"negative"`
