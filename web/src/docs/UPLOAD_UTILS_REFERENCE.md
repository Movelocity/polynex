# File Upload Utilities - Quick Reference

This document provides a quick reference for all file upload utilities available in the frontend codebase.

## Core File Upload Components

### 1. FileUpload Component
**Location:** `web/src/components/common/file/FileUpload.tsx`

**Purpose:** Full-featured file upload component with drag & drop, preview, and progress tracking

**Key Features:**
- Drag & drop file upload
- File type validation
- File size validation (configurable, default 50MB)
- Upload progress indicator
- File preview with thumbnails
- File deletion
- Multiple file support

**Props:**
```typescript
interface FileUploadProps {
  onUploadComplete?: (fileInfo: FileInfo) => void;
  accept?: string; // Default: 'image/*,.pdf,.doc,.docx,.txt,.md,.rtf'
  maxSizeMB?: number; // Default: 50
  showPreview?: boolean; // Default: true
}
```

**Usage Example:**
```tsx
<FileUpload
  onUploadComplete={(fileInfo) => console.log('Uploaded:', fileInfo)}
  maxSizeMB={10}
  accept="image/*"
/>
```

### 2. FileUploadArea Component
**Location:** `web/src/components/common/file/FileUploadArea.tsx`

**Purpose:** Lightweight drag & drop upload area with minimal UI

**Key Features:**
- Simple drag & drop interface
- File type filtering
- Size validation (configurable, default 50MB)
- Upload progress display
- Multiple file support

**Props:**
```typescript
interface FileUploadAreaProps {
  onFileUpload: (files: FileList | File[]) => Promise<void>;
  uploading?: boolean;
  uploadProgress?: number;
  maxFileSizeMB?: number; // Default: 50
  supportedTypes?: string[]; // Default: images, docs
  multiple?: boolean; // Default: true
}
```

**Usage Example:**
```tsx
<FileUploadArea
  onFileUpload={handleFileUpload}
  uploading={isUploading}
  uploadProgress={progress}
  maxFileSizeMB={25}
  multiple={false}
/>
```

## Avatar Upload Components

### 3. AvatarUpload Component
**Location:** `web/src/components/common/user/AvatarUpload.tsx`

**Purpose:** Specialized component for user avatar upload with cropping

**Key Features:**
- Image-only upload (2MB limit)
- Integrated image cropping (1:1 aspect ratio)
- Preview with UserAvatar component
- File type validation (images only)
- Size validation (2MB max)

**Props:**
```typescript
interface AvatarUploadProps {
  user: User;
  onAvatarUpload: (croppedBlob: Blob) => Promise<void>;
  uploading?: boolean;
  onError: (error: string) => void;
}
```

**Usage Example:**
```tsx
<AvatarUpload
  user={currentUser}
  onAvatarUpload={handleAvatarUpload}
  uploading={isUploading}
  onError={setError}
/>
```

## Image Processing Components

### 4. ImageCropperDialog Component
**Location:** `web/src/components/ImageCropV1/ImageCropperDialog.tsx`

**Purpose:** Modal dialog for image cropping with customizable aspect ratios

**Key Features:**
- Configurable aspect ratios
- Max width/height constraints
- File size limits
- Blob output for upload

**Props:**
```typescript
interface ImageCropperDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  aspectRatio?: number; // Default: 1 (square)
  maxWidth?: number; // Default: 512
  maxHeight?: number; // Default: 512
  maxFileSize?: number; // Default: 2MB
  onCrop: (croppedBlob: Blob) => void;
  title?: string;
}
```

### 5. useImagePreview Hook
**Location:** `web/src/hooks/useImagePreview.ts`

**Purpose:** Hook for image preview functionality with zoom and pan

**Key Features:**
- Image zoom (0.1x to 5x)
- Pan/drag functionality
- Touch gesture support
- Position management

**Usage Example:**
```typescript
const {
  filePreview,
  showFilePreview,
  zoomLevel,
  position,
  previewImage,
  handleZoom,
  resetPreview
} = useImagePreview();
```

## API Service

### 6. FileApiService
**Location:** `web/src/services/api/FileApiService.ts`

**Purpose:** Backend API service for file operations

**Key Methods:**
- `uploadFile(file: File): Promise<UploadResponse>`
- `uploadAvatar(file: File): Promise<AvatarUploadResponse>`
- `uploadAgentAvatar(file: File | Blob): Promise<{success, message, avatarUrl}>`
- `getUserFiles(page: number, pageSize: number): Promise<FileListResponse>`
- `deleteFile(uniqueId: string, extension: string): Promise<boolean>`
- `getFileUrl(uniqueId: string, extension: string): string`
- `resolveFileUrl(url: string): string`

**Utility Methods:**
- `isSupportedFileType(file: File): boolean`
- `isValidFileSize(file: File, maxSizeMB: number): boolean`
- `isImageFile(fileName: string): boolean`
- `getFileTypeInfo(fileName: string): {isImage, isDocument, icon}`
- `formatFileSize(bytes: number): string`

**Supported File Types:**
- **Images:** .jpg, .jpeg, .png, .gif, .bmp, .webp
- **Documents:** .pdf, .doc, .docx, .txt, .md, .rtf

## File Display Components

### Additional Related Components:
- **FileGrid:** `web/src/components/common/FileGrid.tsx` - Grid view for files
- **FileList:** `web/src/components/common/FileList.tsx` - List view for files
- **UserAvatar:** `web/src/components/common/user/UserAvatar.tsx` - Avatar display component

## Usage Patterns

### Basic File Upload
```tsx
import { FileUpload } from '@/components/common/file/FileUpload';

<FileUpload
  onUploadComplete={(fileInfo) => {
    // Handle successful upload
  }}
  maxSizeMB={10}
  accept="image/*"
/>
```

### Avatar Upload with Cropping
```tsx
import { AvatarUpload } from '@/components/common/user/AvatarUpload';

<AvatarUpload
  user={user}
  onAvatarUpload={async (croppedBlob) => {
    const response = await fileService.uploadAvatar(croppedBlob);
    // Update user avatar
  }}
  onError={setErrorMessage}
/>
```

### Custom Upload Area
```tsx
import { FileUploadArea } from '@/components/common/file/FileUploadArea';

<FileUploadArea
  onFileUpload={async (files) => {
    for (const file of files) {
      await fileService.uploadFile(file);
    }
  }}
  supportedTypes={['.pdf', '.doc', '.docx']}
  maxFileSizeMB={25}
  multiple={true}
/>
```

## Configuration

### Default File Size Limits:
- **General uploads:** 50MB
- **Avatar uploads:** 2MB
- **Agent avatars:** 2MB

### Default Accepted Types:
- **FileUpload:** `'image/*,.pdf,.doc,.docx,.txt,.md,.rtf'`
- **AvatarUpload:** `'image/*'`
- **FileUploadArea:** Images and documents

### API Endpoints:
- **File upload:** `POST /api/resources/upload`
- **Avatar upload:** `POST /api/resources/user-avatar`
- **File list:** `GET /api/resources/list?page={page}&page_size={size}`
- **File delete:** `DELETE /api/resources/{uniqueId}.{extension}`
- **File access:** `GET /api/resources/{uniqueId}.{extension}`