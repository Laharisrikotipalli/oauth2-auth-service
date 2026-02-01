# OAuth2 Authentication Service

## Overview

This project is a fully containerized OAuth2 Authentication and Authorization Service built using Node.js, Express, PostgreSQL, Redis, Docker, and Docker Compose.

It supports:
- Email & password authentication
- Google OAuth 2.0 login
- GitHub OAuth 2.0 login
- JWT access and refresh tokens
- Role-Based Access Control (Admin & User)
- Rate limiting for security

---

## Architecture

The service follows a layered architecture to ensure clean separation of concerns and scalability.

### Architecture Diagram
![OAuth2 Authentication Service Architecture](docs/architecture.png)

### Component Responsibilities

#### Client
- Initiates login, registration, and OAuth flows
- Sends API requests with JWT access tokens
- Receives authentication responses and profile data

#### Express API (Node.js)
- Handles all authentication and authorization logic
- Validates credentials and OAuth callbacks
- Issues JWT access and refresh tokens
- Enforces role-based access control (RBAC)
- Applies rate limiting and security middleware

#### PostgreSQL Database
- Stores user accounts and roles
- Persists OAuth provider mappings
- Maintains relational integrity between users and providers

#### Redis Cache
- Enforces rate limiting
- Protects against brute-force attacks
- Improves performance for repeated requests

### Why This Architecture?

- **Security**: Separation of concerns reduces attack surface
- **Scalability**: Stateless API allows horizontal scaling
- **Maintainability**: Clear module boundaries and responsibilities
- **Extensibility**: Easy to add more OAuth providers or services

This architecture ensures the authentication service remains robust, secure, and production-ready.
## Database Schema

The service uses **PostgreSQL** as the primary data store to support both
email/password authentication and OAuth-based authentication.

The schema is designed to:
- Support multiple authentication providers per user
- Enforce data integrity with constraints
- Scale cleanly for large user bases

---

### users Table

Stores core user account information.

| Column         | Type           | Constraints |
|---------------|---------------|-------------|
| id            | UUID           | PRIMARY KEY, DEFAULT gen_random_uuid() |
| email         | VARCHAR(255)   | UNIQUE, NOT NULL |
| password_hash | VARCHAR(255)   | NULLABLE (used for local auth only) |
| name          | VARCHAR(255)   | NOT NULL |
| role          | VARCHAR(50)    | NOT NULL, DEFAULT 'user' |
| created_at    | TIMESTAMP      | DEFAULT NOW() |

**Notes**
- `password_hash` is NULL for OAuth-only users
- `role` is used for Role-Based Access Control (RBAC)
- Passwords are stored using bcrypt hashing

---

### auth_providers Table

Maps users to OAuth providers such as Google and GitHub.

| Column            | Type           | Constraints |
|------------------|---------------|-------------|
| id               | UUID           | PRIMARY KEY, DEFAULT gen_random_uuid() |
| user_id          | UUID           | FOREIGN KEY → users(id), NOT NULL |
| provider         | VARCHAR(50)    | NOT NULL |
| provider_user_id | VARCHAR(255)   | NOT NULL |

**Constraints**
- UNIQUE(provider, provider_user_id)
- Each OAuth identity can only be linked once
- A user can have multiple OAuth providers

---

### Relationship Overview

## Database Schema

The service uses **PostgreSQL** as the primary data store to support both
email/password authentication and OAuth-based authentication.

The schema is designed to:
- Support multiple authentication providers per user
- Enforce data integrity with constraints
- Scale cleanly for large user bases

---

### users Table

Stores core user account information.

| Column         | Type           | Constraints |
|---------------|---------------|-------------|
| id            | UUID           | PRIMARY KEY, DEFAULT gen_random_uuid() |
| email         | VARCHAR(255)   | UNIQUE, NOT NULL |
| password_hash | VARCHAR(255)   | NULLABLE (used for local auth only) |
| name          | VARCHAR(255)   | NOT NULL |
| role          | VARCHAR(50)    | NOT NULL, DEFAULT 'user' |
| created_at    | TIMESTAMP      | DEFAULT NOW() |

**Notes**
- `password_hash` is NULL for OAuth-only users
- `role` is used for Role-Based Access Control (RBAC)
- Passwords are stored using bcrypt hashing

---

### auth_providers Table

Maps users to OAuth providers such as Google and GitHub.

| Column            | Type           | Constraints |
|------------------|---------------|-------------|
| id               | UUID           | PRIMARY KEY, DEFAULT gen_random_uuid() |
| user_id          | UUID           | FOREIGN KEY → users(id), NOT NULL |
| provider         | VARCHAR(50)    | NOT NULL |
| provider_user_id | VARCHAR(255)   | NOT NULL |

**Constraints**
- UNIQUE(provider, provider_user_id)
- Each OAuth identity can only be linked once
- A user can have multiple OAuth providers

---

### Relationship Overview

- One user can authenticate using multiple providers
- OAuth logins are linked without duplicating users

---

### Why This Schema?

- **Flexibility**: Supports local and OAuth authentication together
- **Security**: No passwords stored for OAuth-only users
- **Scalability**: Efficient lookups using indexed unique constraints
- **Extensibility**: Easy to add new OAuth providers in the future
## Authentication & Authorization Flow

This service supports **three authentication methods**:
1. Email & Password (Local Authentication)
2. Google OAuth 2.0
3. GitHub OAuth 2.0

All authentication methods ultimately issue **JWT-based access and refresh tokens**.

---

### 1. Email & Password Authentication Flow

This flow is used for locally registered users.

Client
│
│ POST /api/auth/register
▼
API Server
│
│ bcrypt.hash(password)
│ store user in PostgreSQL
▼
Database


**Login Flow**



Client
│
│ POST /api/auth/login
▼
API Server
│
│ fetch user by email
│ bcrypt.compare(password, hash)
│ generate JWT tokens
▼
Client receives:

accessToken

refreshToken


**Key Points**
- Passwords are never stored in plain text
- bcrypt is used with salt rounds for hashing
- Invalid credentials return `401 Unauthorized`

---

### 2. Google OAuth Authentication Flow

Used for passwordless authentication via Google.



Client
│
│ GET /api/auth/google
▼
Google Authorization Server
│
│ User consents
│ Redirect with authorization code
▼
API Server (/oauth-callback/google)
│
│ Exchange code for access token
│ Fetch user profile
│ Sync user with database
│ Generate JWT tokens
▼
Client receives:

accessToken

refreshToken


**Behavior**
- First login creates a new user
- Subsequent logins reuse the same user
- OAuth users have `password_hash = NULL`

---

### 3. GitHub OAuth Authentication Flow

Similar to Google OAuth but using GitHub as the provider.



Client
│
│ GET /api/auth/github
▼
GitHub Authorization Server
│
│ User authorizes app
│ Redirect with authorization code
▼
API Server (/oauth-callback/github)
│
│ Exchange code for token
│ Fetch GitHub profile
│ Sync user with database
│ Generate JWT tokens
▼
Client receives:

accessToken

refreshToken


---

### 4. Token-Based Authorization (JWT)

After authentication, all protected routes require a valid access token.



Client
│
│ Authorization: Bearer <accessToken>
▼
API Server
│
│ jwt.verify()
│ attach user to request
▼
Protected Route Access


**Token Types**
- **Access Token**
  - Short-lived (15 minutes)
  - Used for API access
- **Refresh Token**
  - Long-lived (7 days)
  - Used to obtain new access tokens

---

### 5. Role-Based Access Control (RBAC)

Roles are enforced using JWT claims.



User Role in JWT → Middleware → Route Access


**Roles**
- `user`: Default role
- `admin`: Can access admin-only endpoints

Example:
- `GET /api/users` → Admin only
- `GET /api/users/me` → Any authenticated user

---

### Why This Approach?

- **Security**: Short-lived access tokens reduce risk
- **Scalability**: Stateless JWT authentication
- **Flexibility**: Multiple auth providers supported
- **User Experience**: OAuth + refresh tokens minimize re-logins
## OAuth Configuration (Google & GitHub)

This project uses **OAuth 2.0 Authorization Code Flow** for Google and GitHub authentication.

Both providers redirect the user back to this application after successful authorization.

---

## Google OAuth Configuration

### Step 1: Create Google OAuth Credentials

1. Go to **Google Cloud Console**
2. Create or select a project
3. Enable **Google Identity Services**
4. Go to **Credentials → Create Credentials → OAuth Client ID**
5. Select **Web Application**

---

### Step 2: Configure Authorized Redirect URI

Add the following redirect URI **exactly** as shown:

http://localhost:4000/oauth-callback/google


⚠️ **Important**
- The URL must match exactly
- No trailing slashes
- HTTP vs HTTPS must match

---

### Step 3: Environment Variables

Add the following values to your `.env` file:

GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here


---

### Google OAuth Flow Summary

/api/auth/google
↓
Google Consent Screen
↓
/oauth-callback/google
↓
JWT Tokens Issued


---

## GitHub OAuth Configuration

### Step 1: Create GitHub OAuth App

1. Go to **GitHub → Settings → Developer Settings**
2. Open **OAuth Apps**
3. Click **New OAuth App**

---

### Step 2: Configure Application Settings

**Homepage URL**
http://localhost:4000


**Authorization Callback URL**
http://localhost:4000/oauth-callback/github


---

### Step 3: Environment Variables

Add the following values to your `.env` file:

GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here


---

### GitHub OAuth Flow Summary

/api/auth/github
↓
GitHub Authorization
↓
/oauth-callback/github
↓
JWT Tokens Issued


---

## Common OAuth Errors & Fixes

### Error: redirect_uri_mismatch
**Cause**
- Redirect URI in code does not match provider console

**Fix**
- Ensure callback URL matches exactly in:
  - Google Console
  - GitHub OAuth App
  - Application routes

---

### Error: invalid_request
**Cause**
- Missing `code` parameter
- Callback URL opened manually

**Fix**
- Always start OAuth flow from:
  - `/api/auth/google`
  - `/api/auth/github`

---

### Error: Access blocked / App not verified
**Cause**
- App is in testing mode

**Fix**
- Add test email in Google OAuth consent screen
- Or keep app in testing mode for development

---

## Security Notes

- OAuth secrets must **never** be committed to GitHub
- `.env` must be listed in `.gitignore`
- OAuth users do not store passwords
- OAuth identity is linked via `auth_providers` table
## OAuth Configuration (Google & GitHub)

This project uses **OAuth 2.0 Authorization Code Flow** for Google and GitHub authentication.

Both providers redirect the user back to this application after successful authorization.

---

## Google OAuth Configuration

### Step 1: Create Google OAuth Credentials

1. Go to **Google Cloud Console**
2. Create or select a project
3. Enable **Google Identity Services**
4. Go to **Credentials → Create Credentials → OAuth Client ID**
5. Select **Web Application**

---

### Step 2: Configure Authorized Redirect URI

Add the following redirect URI **exactly** as shown:

http://localhost:4000/oauth-callback/google


⚠️ **Important**
- The URL must match exactly
- No trailing slashes
- HTTP vs HTTPS must match

---

### Step 3: Environment Variables

Add the following values to your `.env` file:

GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here


---

### Google OAuth Flow Summary

/api/auth/google
↓
Google Consent Screen
↓
/oauth-callback/google
↓
JWT Tokens Issued


---

## GitHub OAuth Configuration

### Step 1: Create GitHub OAuth App

1. Go to **GitHub → Settings → Developer Settings**
2. Open **OAuth Apps**
3. Click **New OAuth App**

---

### Step 2: Configure Application Settings

**Homepage URL**
http://localhost:4000


**Authorization Callback URL**
http://localhost:4000/oauth-callback/github


---

### Step 3: Environment Variables

Add the following values to your `.env` file:

GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here


---

### GitHub OAuth Flow Summary

/api/auth/github
↓
GitHub Authorization
↓
/oauth-callback/github
↓
JWT Tokens Issued


---

## Common OAuth Errors & Fixes

### Error: redirect_uri_mismatch
**Cause**
- Redirect URI in code does not match provider console

**Fix**
- Ensure callback URL matches exactly in:
  - Google Console
  - GitHub OAuth App
  - Application routes

---

### Error: invalid_request
**Cause**
- Missing `code` parameter
- Callback URL opened manually

**Fix**
- Always start OAuth flow from:
  - `/api/auth/google`
  - `/api/auth/github`

---

### Error: Access blocked / App not verified
**Cause**
- App is in testing mode

**Fix**
- Add test email in Google OAuth consent screen
- Or keep app in testing mode for development

---

## Security Notes

- OAuth secrets must **never** be committed to GitHub
- `.env` must be listed in `.gitignore`
- OAuth users do not store passwords
- OAuth identity is linked via `auth_providers` table
GET /health


Response:


{ "status": "ok" }


---

## Author

Built for **secure authentication & OAuth learning project**  
Fully containerized and production-ready 🚀