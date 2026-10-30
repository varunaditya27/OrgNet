# Files Module

## Overview

The Files module provides secure file upload, storage, and download functionality with comprehensive RBAC (Role-Based Access Control) enforcement. Files are stored in S3-compatible storage (Cloudflare R2) with metadata managed in PostgreSQL.

## Features

### Core File Operations
- **File Upload**: Secure multipart file upload with validation
- **File Download**: Pre-signed URL generation for secure downloads
- **File Management**: Update metadata, soft delete functionality
- **File Listing**: Paginated file browsing with advanced filtering

### RBAC Integration
- **Role-Based Access**: Files have `allowedRole` field to control access
- **Hierarchical Permissions**: Users can access files based on their role hierarchy
- **Owner Privileges**: File owners can manage their own files regardless of role
- **Admin Override**: Admins can access and manage all files

### S3 Integration
- **Cloudflare R2**: S3-compatible storage with global CDN
- **Pre-signed URLs**: Secure, time-limited download links
- **Metadata Tracking**: File size, MIME type, download count
- **Efficient Storage**: Unique S3 keys prevent naming conflicts

## API Endpoints

### File Upload

#### POST /files/upload
Upload a file with metadata.

**Content-Type:** `multipart/form-data`

**Form Fields:**
- `file`: The file to upload (required)
- `description`: Optional file description
- `allowedRole`: Minimum role required to access the file

**Example:**
```bash
curl -X POST \
  -H "Authorization: Bearer <jwt_token>" \
  -F "file=@document.pdf" \
  -F "description=Important company document" \
  -F "allowedRole=MANAGER" \
  http://localhost:3000/files/upload
```

**Response:**
```json
{
  "id": 1,
  "fileName": "document.pdf",
  "mimeType": "application/pdf",
  "size": 1048576,
  "description": "Important company document",
  "allowedRole": "MANAGER",
  "s3Key": "files/123/uuid-generated-key.pdf",
  "uploadedAt": "2025-01-01T10:00:00.000Z"
}
```

### File Listing

#### GET /files
Get paginated list of accessible files.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `allowedRole`: Filter by minimum role requirement
- `search`: Search in file names and descriptions. Search narrows the results you are already allowed to see; it never reveals files above your role
- `mimeType`: Filter by MIME type
- `ownerId`: Filter by file owner (requires appropriate permissions)

**Example:**
```bash
curl -H "Authorization: Bearer <jwt_token>" \
  "http://localhost:3000/files?page=1&limit=10&search=document"
```

**Response:**
```json
{
  "files": [
    {
      "id": 1,
      "fileName": "document.pdf",
      "mimeType": "application/pdf",
      "size": 1048576,
      "description": "Important company document",
      "allowedRole": "MANAGER",
      "downloadCount": 5,
      "isActive": true,
      "createdAt": "2025-01-01T10:00:00.000Z",
      "updatedAt": "2025-01-01T10:00:00.000Z",
      "owner": {
        "id": 123,
        "name": "John Doe",
        "email": "john@example.com"
      }
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 10,
  "totalPages": 3
}
```

### File Details

#### GET /files/:id
Get detailed information about a specific file.

**Response:**
```json
{
  "id": 1,
  "fileName": "document.pdf",
  "mimeType": "application/pdf",
  "size": 1048576,
  "description": "Important company document",
  "allowedRole": "MANAGER",
  "downloadCount": 5,
  "createdAt": "2025-01-01T10:00:00.000Z",
  "updatedAt": "2025-01-01T10:00:00.000Z",
  "owner": {
    "id": 123,
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

### File Download

#### GET /files/:id/download
Generate a secure download URL for the file.

**Response:**
```json
{
  "downloadUrl": "https://r2-endpoint.com/signed-url-with-expiration"
}
```

**Note:** The download URL is valid for 1 hour and automatically increments the download counter.

### File Management

#### PATCH /files/:id
Update file metadata (owner or admin only).

**Request Body:**
```json
{
  "description": "Updated description",
  "allowedRole": "EMPLOYEE"
}
```

#### DELETE /files/:id
Soft delete a file (owner or admin only).

**Response:**
```json
{
  "message": "File deleted successfully"
}
```

### Admin Endpoints

#### GET /files/admin/all
Get all files in the system (admin only).

#### DELETE /files/admin/:id/hard-delete
Permanently delete a file from storage and database (admin only).

### Utility Endpoints

#### GET /files/user/:userId
Get files owned by a specific user (requires appropriate permissions).

#### GET /files/stats/overview
Get file statistics and recent uploads.

**Response:**
```json
{
  "totalFiles": 150,
  "totalSize": 52428800,
  "filesByType": [
    { "mimeType": "application/pdf", "count": 45 },
    { "mimeType": "image/jpeg", "count": 30 }
  ],
  "recentUploads": [
    // Array of recent FileResponseDto objects
  ]
}
```

## RBAC Rules

### Role Hierarchy
Files use a hierarchical role system:

```
ADMIN (Level 4)
├── MANAGER (Level 3)
│   ├── EMPLOYEE (Level 2)
│   │   └── INTERN (Level 1)
│   └── INTERN (Level 1)
└── EMPLOYEE (Level 2)
    └── INTERN (Level 1)
```

### Access Control Rules

1. **File Owner**: Can always access and manage their own files
2. **Role Hierarchy**: Users can access files where their role level >= file's `allowedRole` level
3. **Admin Override**: Admins can access and manage all files regardless of role settings

### Examples

- A file with `allowedRole: "MANAGER"` can be accessed by:
  - The file owner (any role)
  - Any MANAGER or ADMIN
  - NOT accessible to EMPLOYEE or INTERN (unless they own it)

- A file with `allowedRole: "INTERN"` can be accessed by:
  - Anyone in the organization (all roles >= INTERN)

## Configuration

### Environment Variables

Any S3-compatible storage works (the variable names say R2, but they are generic). Example for Cloudflare R2:

```bash
# Cloudflare R2 Configuration
R2_ACCESS_KEY_ID="your-r2-access-key-id"
R2_SECRET_ACCESS_KEY="your-r2-secret-access-key"
R2_BUCKET_NAME="orgnet-files"
R2_REGION="auto"
R2_ENDPOINT="https://your-account-id.r2.cloudflarestorage.com"

# Optional
R2_PUBLIC_ENDPOINT=""      # address used to sign download links when browsers reach storage differently than the server (Docker)
R2_FORCE_PATH_STYLE="true" # for local S3 servers that need path-style URLs (SeaweedFS and most others)

# File Upload Configuration
MAX_FILE_SIZE="10485760" # 10MB in bytes
ALLOWED_FILE_TYPES="image/jpeg,image/png,image/gif,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
```

### Local Storage (no cloud account)

The Docker Compose bundle at the repository root runs [SeaweedFS](https://github.com/seaweedfs/seaweedfs) as the S3 server and creates the bucket automatically. It sets `R2_ENDPOINT=http://seaweedfs:8333`, `R2_PUBLIC_ENDPOINT=http://localhost:8333` (the address the browser downloads from), and `R2_FORCE_PATH_STYLE=true`. Download links are signed for the public address because a signature is only valid for the host name it was made for.

### File Validation

- **Size Limit**: Configurable via `MAX_FILE_SIZE` (default: 10MB)
- **Type Validation**: Configurable via `ALLOWED_FILE_TYPES`
- **Supported Types**: Images, PDFs, Office documents, text files

## Database Schema

The File model includes:

```prisma
model File {
  id           Int      @id @default(autoincrement())
  ownerId      Int
  fileName     String   // Original file name
  mimeType     String   // File MIME type
  size         Int      // File size in bytes
  s3Key        String   @unique // S3 object key
  s3Url        String?  // Pre-signed URL (temporary)
  allowedRole  Role     // minimal role required to access
  description  String?  // Optional file description
  isActive     Boolean  @default(true) // Soft delete
  downloadCount Int     @default(0) // Track downloads
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  owner User @relation(fields: [ownerId], references: [id])

  @@index([ownerId])
  @@index([allowedRole])
  @@index([isActive])
}
```

## Security Features

- **JWT Authentication**: All endpoints require valid JWT tokens
- **RBAC Enforcement**: Role-based access control at every operation
- **Pre-signed URLs**: Secure, time-limited download links
- **Input Validation**: Comprehensive validation for all inputs
- **File Type Validation**: Configurable allowed MIME types
- **Soft Delete**: Files are deactivated rather than permanently deleted
- **S3 Security**: Files stored in private bucket, accessed only via pre-signed URLs

## Error Handling

Common error responses:

- **400 Bad Request**: Invalid file data, unsupported type, or size limit exceeded
- **401 Unauthorized**: Authentication required
- **403 Forbidden**: Insufficient permissions for the requested operation
- **404 Not Found**: File not found or not accessible
- **413 Payload Too Large**: File exceeds maximum size limit

## Usage Examples

### Upload with Role Restriction

```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('description', 'Confidential document');
formData.append('allowedRole', 'MANAGER');

const response = await fetch('/files/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwtToken}`
  },
  body: formData
});
```

### Download File

```javascript
const response = await fetch(`/files/${fileId}/download`, {
  headers: {
    'Authorization': `Bearer ${jwtToken}`
  }
});

const { downloadUrl } = await response.json();

// Use the pre-signed URL to download the file
window.open(downloadUrl, '_blank');
```

### Filter Files by Role

```javascript
const response = await fetch('/files?allowedRole=EMPLOYEE&page=1&limit=20', {
  headers: {
    'Authorization': `Bearer ${jwtToken}`
  }
});

const { files, total, totalPages } = await response.json();
```

## Integration with Other Modules

- **Auth Module**: JWT authentication and user context
- **Users Module**: File ownership and role hierarchy
- **Common Guards**: RBAC enforcement using existing guard system
- **Prisma**: Database integration with existing models

## Future Enhancements

- **File Versioning**: Track file versions and changes
- **Thumbnail Generation**: Automatic thumbnail creation for images
- **Virus Scanning**: Integration with malware detection services
- **Batch Operations**: Upload and manage multiple files at once
- **File Sharing**: Share files with specific users or groups
- **Audit Logging**: Track all file operations for compliance
- **CDN Integration**: Optimize delivery through global CDN
- **Advanced Search**: Full-text search within document contents