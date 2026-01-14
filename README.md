# Optimizely AI Content Generation Platform

An AI-powered content generation application that allows users to create various types of content (blog posts, product descriptions, social media captions) using Google Gemini AI. The platform features real-time job status updates, user authentication, feedback systems with sentiment analysis, and a modern, responsive user interface.

## Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Setup Instructions](#setup-instructions)
- [API Documentation](#api-documentation)
- [Architectural Decisions](#architectural-decisions)
- [AI Usage](#ai-usage)
- [Docker Deployment](#docker-deployment)
- [Critical Challenges](#critical-challenges)
- [Related Works](#related-works)

## Project Overview

This application enables users to generate AI-powered content through an intuitive web interface. Users can select a content type, provide a prompt, and receive generated content in real-time. The system handles job queuing, processing, and status updates seamlessly, providing a smooth user experience with immediate feedback.

### Key Features

- **AI Content Generation**: Generate various types of content using Google Gemini AI
- **Real-time Status Updates**: WebSocket-based real-time job status notifications
- **User Authentication**: Secure JWT-based authentication with refresh tokens
- **Feedback System**: Rate and comment on generated content with AI-powered sentiment analysis
- **Job Management**: Save, view, and manage generated content
- **Responsive Design**: Modern, responsive UI with dark mode support

## Tech Stack

### Frontend

- **Framework**: Next.js 16.1.1 (App Router)
- **Language**: TypeScript
- **UI Library**: React 19
- **Styling**: Tailwind CSS 4
- **Components**: Shadcn/ui (Radix UI primitives)
- **Markdown Rendering**: react-markdown
- **Real-time Communication**: Socket.io Client
- **Form Handling**: React Hook Form with Zod validation
- **Theme Management**: next-themes

### Backend

- **Runtime**: Node.js 22
- **Framework**: Next.js API Routes
- **Database**: MongoDB (via Mongoose ODM)
- **Queue System**: BullMQ (Redis-based)
- **Real-time Communication**: Socket.io Server
- **Authentication**: JWT (jose library), bcrypt for password hashing
- **AI Integration**: Google Gemini AI (@google/genai, gemini-3-flash-preview model)

### Infrastructure

- **Package Manager**: pnpm
- **Containerization**: Docker, Docker Compose
- **Cache/Message Broker**: Redis

## Setup Instructions

### Prerequisites

- Node.js 22 or higher
- pnpm (package manager)
- MongoDB instance (local or remote)
- Redis instance (local or remote)
- Google Gemini API key

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/optimizely

# Redis Connection
REDIS_URL=redis://localhost:6379

# JWT Secrets
JWT_SECRET=your-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-secret-refresh-token-key-change-this-in-production

# Google Gemini API
GEMINI_API_KEY=your-gemini-api-key-here

# Queue Configuration
QUEUE_EXECUTION_DELAY=60
NEXT_PUBLIC_QUEUE_EXECUTION_DELAY=60
MAX_JOB_RETRIES=3

# Socket.io Configuration
SOCKET_IO_PORT=3001
SOCKET_IO_URL=http://localhost:3001
NEXT_PUBLIC_SOCKET_IO_URL=http://localhost:3001

# Application URL (optional)
NEXTAUTH_URL=http://localhost:3000
```

### Local Development Setup

1. **Clone the repository** (if applicable) and navigate to the project directory:

```bash
cd optimizely-take-home-remote
```

2. **Install dependencies**:

```bash
pnpm install
```

3. **Initialize the database** (create default content types):

```bash
pnpm tsx scripts/init-content-types.ts
```

This will create the following default content types:

- Blog Post Outline
- Product Description
- Social Media Caption

**Note**: You can also create additional content types using the `POST /api/content-types` API endpoint. The content types API is publicly accessible (no authentication required) due to the lack of a comprehensive admin dashboard. This may change in future versions as admin features are added.

4. **Run the services**:

You need to run three services simultaneously:

**Terminal 1 - Next.js Development Server**:

```bash
pnpm dev
```

Runs on `http://localhost:3000`

**Terminal 2 - Worker Service**:

```bash
pnpm worker
```

Processes AI generation jobs from the queue

**Terminal 3 - Socket.io Server**:

```bash
pnpm socket-server
```

Runs on `http://localhost:3001` for real-time job status updates

5. **Open your browser** and navigate to `http://localhost:3000`

### Production Build

1. **Build the application**:

```bash
pnpm build
```

2. **Start the production server**:

```bash
pnpm start
```

## API Documentation

For detailed API documentation including request/response examples, authentication requirements, and endpoint specifications, please see [API.md](./API.md).

### Quick API Overview

- **Authentication**: `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/refresh`, `/api/auth/verify`
- **Content Types**: `/api/content-types` (GET, POST), `/api/content-types/[id]` (GET, PUT, DELETE)
- **AI Generation**:
  - `/api/ai/generate` (POST - create job, GET - list saved jobs)
  - `/api/ai/job/[id]` (GET - get job status)
  - `/api/ai/job/[id]/content` (GET - get generated content)
  - `/api/ai/job/[id]/save` (POST - save a job)
  - `/api/ai/job/[id]/feedback` (GET, POST - get/submit feedback)

## Architectural Decisions

### Why Gemini AI?

We chose Google Gemini AI for several reasons:

- **Fast Response Times**: The `gemini-3-flash-preview` model provides quick responses suitable for real-time content generation
- **Modern API**: The `@google/genai` SDK offers a clean, modern interface with excellent TypeScript support
- **Cost-Effective**: The Flash model provides good quality at a lower cost compared to other models
- **Reliability**: Google's infrastructure ensures high availability and reliability

### Why BullMQ?

BullMQ was chosen for job queue management:

- **Redis-based**: Built on Redis, providing fast, reliable job queuing
- **Features**: Supports job prioritization, retries, delayed execution, and job scheduling
- **Integration**: Seamlessly integrates with Redis pub/sub for real-time updates
- **TypeScript Support**: Excellent TypeScript support with strong typing
- **Scalability**: Designed to handle high-throughput job processing

### Why WebSocket (Socket.io)?

We use WebSockets for real-time communication:

- **Real-time Updates**: Provides instant job status updates without polling
- **Bidirectional Communication**: Allows both client and server to initiate communication
- **Better UX**: Eliminates the need for constant polling, reducing server load and improving user experience
- **Reliability**: Socket.io handles reconnection and fallback mechanisms automatically
- **Efficiency**: More efficient than HTTP polling for frequent updates

### Why MongoDB?

MongoDB was chosen for data storage:

- **Flexible Schema**: Accommodates varying content types and structures
- **Unstructured Content**: Well-suited for storing AI-generated content with varying formats
- **Mongoose ODM**: Provides excellent TypeScript support and type safety
- **Scalability**: Handles growing data volumes efficiently
- **Document Model**: Natural fit for storing content and user data

### Why Next.js App Router?

Next.js App Router was selected for the application framework:

- **Modern React Patterns**: Uses the latest React features and patterns
- **Server-Side Rendering**: Provides SSR capabilities for better performance
- **API Routes**: Integrated API routes eliminate the need for a separate backend server
- **TypeScript Support**: First-class TypeScript support throughout
- **Developer Experience**: Excellent developer experience with hot reloading and error handling

### Why Database Polling + BullMQ?

We use a hybrid approach combining BullMQ and database polling:

- **Reliability**: Database polling ensures jobs are processed even if BullMQ jobs are lost
- **Delayed Execution**: Supports delayed job execution (QUEUE_EXECUTION_DELAY)
- **Idempotency**: Database records ensure job state is always consistent
- **Recovery**: Database polling allows job recovery after service restarts
- **Dual System**: BullMQ handles job queuing and distribution, while database polling provides reliability

## AI Usage

This project was developed with assistance from various AI tools at different stages:

### Planning

- **ChatGPT & Gemini**: Used for planning architecture, tech stack selection, and deployment strategies
  - Helped design the overall system architecture
  - Assisted in selecting appropriate technologies (BullMQ, Socket.io, MongoDB)
  - Provided guidance on deployment strategies and Docker setup

### Code Review and Comments

- **Antigravity**: Used for code review and generating code comments
  - Reviewed code for best practices
  - Generated inline comments and documentation

### Code Generation

- **Antigravity & Gemini**: Used for critical rewrites and feature enhancements
  - Generated boilerplate code for API routes
  - Implemented complex features like WebSocket integration
  - Containerized the application (Docker and Docker Compose configuration)
  - Developed error handling and validation logic

### Documentation

- **AI-Assisted**: Current README and API documentation created with AI assistance
  - Structured documentation
  - Generated API documentation with examples
  - Created architectural decision explanations

## Docker Deployment

The application can be deployed using Docker Compose for easier setup and deployment.

### Prerequisites

- Docker and Docker Compose installed
- MongoDB and Redis instances (or use external services)

### Setup

1. **Create a `.env` file** in the root directory with all required environment variables (see [Environment Variables](#environment-variables))

2. **Build and run all services**:

```bash
docker-compose up --build
```

This will start:

- **init-db**: Initializes the database with default content types (runs once)
- **app**: Next.js application (port 3000)
- **worker**: BullMQ worker service
- **socket-server**: Socket.io server (port 3001)

3. **Access the application** at `http://localhost:3000`

### Docker Configuration

The `Dockerfile` uses a multi-stage build process optimized for production. The `docker-compose.yml` file orchestrates all services and ensures proper initialization order.

For more details on Docker configuration, see `Dockerfile` and `docker-compose.yml` in the repository.

---

## Critical Challenges

### Infrastructure

While I had experience developing applications using Next.js and Express.js, I did not have extensive experience integrating background workers with Next.js applications. This required learning and implementing a hybrid approach combining BullMQ for job queuing with database polling to ensure reliable job execution and status management.

### Code Architecture

While I had previous experience using fixed JSON schemas to populate UI components, I encountered challenges when implementing dynamic sidebar population with user-specific personalized data. This required careful state management, proper data fetching strategies, and handling real-time updates to ensure a seamless user experience.

### Time Constraints

While the allocated time was sufficient, completing the task alongside full-time work commitments made it challenging to execute all aspects manually. As a result, AI tools were leveraged to effectively debug issues and implement critical components, allowing for more efficient development within the available timeframe.

## Related Works

Certain components of the application, such as the authentication system (login/register flow) and WebSocket implementation for real-time communication, were adapted and refined from previous related projects. These implementations were customized to fit the specific requirements and architecture of this application.
