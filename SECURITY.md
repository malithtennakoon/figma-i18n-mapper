# Security Documentation

## Authentication Flow

- All API endpoints verify user email against database
- Server-side verification using `verifyUserEmail()` from `lib/auth.ts`
- Returns 401 if user not found in database

## Access Control

### User Roles
- **Admin**: Main admin (malith.tennakoon@rhino-partners.com), auto-created on first login
- **Regular Users**: Added by admin through `/admin/users` panel

### Protected Endpoints
- `/api/figma` - Requires authenticated user
- `/api/generate-keys` - Requires authenticated user
- `/api/localazy` - Requires authenticated user
- `/api/usage` - Users see own data, admins see all data
- `/api/users` - Admin only

## Security Features

- Server-side email validation on every request
- Database-driven authorization (no hardcoded lists)
- API tokens stored server-side only
- SQL injection prevention (parameterized queries)
- Role-based access control (RBAC)

## Reporting Security Issues

Email: malith.tennakoon@rhino-partners.com
