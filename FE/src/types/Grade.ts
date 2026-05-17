
export type FileExtension = 
  // Documents
  | 'pdf' | 'doc' | 'docx' | 'txt' | 'rtf' | 'odt'
  // Code files
  | 'js' | 'jsx' | 'ts' | 'tsx' | 'py' | 'java' | 'cpp' | 'c' | 'h' | 'cs'
  | 'php' | 'rb' | 'go' | 'rs' | 'swift' | 'kt' | 'html' | 'css' | 'scss'
  | 'json' | 'xml' | 'yaml' | 'yml' | 'sql' | 'sh' | 'bat'
  // Images
  | 'jpg' | 'jpeg' | 'png' | 'gif' | 'svg' | 'bmp' | 'webp' | 'ico' | 'tiff'
  // Archives
  | 'zip' | 'rar' | '7z' | 'tar' | 'gz' | 'bz2'
  // Spreadsheets
  | 'xlsx' | 'xls' | 'csv' | 'ods'
  // Presentations
  | 'ppt' | 'pptx' | 'odp'
  // Media
  | 'mp3' | 'mp4' | 'avi' | 'mov' | 'wmv' | 'flv' | 'wav' | 'ogg'
  // Other
  | 'unknown';

export type FileCategory = 
  | 'document' 
  | 'code' 
  | 'image' 
  | 'archive' 
  | 'spreadsheet' 
  | 'presentation' 
  | 'media' 
  | 'other';

export interface FileInfo {
  url: string;
  name: string;
  extension: FileExtension;
  category: FileCategory;
  size?: number;
  uploadedAt?: string;
}

export type SubmissionStatus = 
  | 'not_submitted'
  | 'submitted'
  | 'late'
  | 'graded'
  | 'pending'
  | 'rejected';

export interface Submission {
  _id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentCode?: string;
  assignmentId: string;
  assignmentTitle: string;
  assignmentCreatedBy: string;
  courseId: string;
  courseName: string;
  submittedAt: string;
  status: SubmissionStatus;
  fileUrls: string[];
  files?: FileInfo[];
  score?: number;
  maxScore?: number;
  feedback?: string;
  gradedAt?: string;
  gradedBy?: string;
  comment?: string;
  note?: string;
  graded: boolean;
  canGrade?: boolean;
  assignment?: {
    maxScore?: number;
    createdBy?: string;
    dueDate?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubmissionData {
  assignmentId: string;
  courseId?: string;
  fileUrls: string[];
  note?: string;
  comment?: string;
}

export interface UpdateSubmissionData {
  fileUrls?: string[];
  note?: string;
  comment?: string;
  status?: SubmissionStatus;
}

export interface GradeSubmissionData {
  score: number;
  feedback: string;
  maxScore?: number;
}

export interface SubmissionFilters {
  status?: SubmissionStatus | 'all';
  studentId?: string;
  assignmentId?: string;
  courseId?: string;
  gradedOnly?: boolean;
  ungradedOnly?: boolean;
  search?: string;
}

export interface SubmissionStatistics {
  total: number;
  submitted: number;
  graded: number;
  ungraded: number;
  late: number;
  notSubmitted: number;
  averageScore?: number;
  highestScore?: number;
  lowestScore?: number;
  submissionRate: number;
}

export const getFileExtension = (filename: string): FileExtension => {
  if (!filename) return 'unknown';
  const ext = filename.split('.').pop()?.toLowerCase();
  if (!ext) return 'unknown';
  
  const validExtensions: FileExtension[] = [
    'pdf', 'doc', 'docx', 'txt', 'rtf', 'odt',
    'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'cs',
    'php', 'rb', 'go', 'rs', 'swift', 'kt', 'html', 'css', 'scss',
    'json', 'xml', 'yaml', 'yml', 'sql', 'sh', 'bat',
    'jpg', 'jpeg', 'png', 'gif', 'svg', 'bmp', 'webp', 'ico', 'tiff',
    'zip', 'rar', '7z', 'tar', 'gz', 'bz2',
    'xlsx', 'xls', 'csv', 'ods',
    'ppt', 'pptx', 'odp',
    'mp3', 'mp4', 'avi', 'mov', 'wmv', 'flv', 'wav', 'ogg'
  ];
  
  return validExtensions.includes(ext as FileExtension) 
    ? ext as FileExtension 
    : 'unknown';
};

export const getFileCategory = (extension: FileExtension): FileCategory => {
  const categories: Record<FileCategory, FileExtension[]> = {
    document: ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'],
    code: [
      'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'cs',
      'php', 'rb', 'go', 'rs', 'swift', 'kt', 'html', 'css', 'scss',
      'json', 'xml', 'yaml', 'yml', 'sql', 'sh', 'bat'
    ],
    image: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'bmp', 'webp', 'ico', 'tiff'],
    archive: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'],
    spreadsheet: ['xlsx', 'xls', 'csv', 'ods'],
    presentation: ['ppt', 'pptx', 'odp'],
    media: ['mp3', 'mp4', 'avi', 'mov', 'wmv', 'flv', 'wav', 'ogg'],
    other: ['unknown']
  };

  for (const [category, extensions] of Object.entries(categories)) {
    if (extensions.includes(extension)) {
      return category as FileCategory;
    }
  }

  return 'other';
};

export const parseFileUrl = (fileUrl: string): FileInfo => {
  const fileName = decodeURIComponent(fileUrl.split('/').pop() || 'unknown');
  const extension = getFileExtension(fileName);
  const category = getFileCategory(extension);

  return {
    url: fileUrl,
    name: fileName,
    extension,
    category
  };
};

export const parseFileUrls = (fileUrls: string[]): FileInfo[] => {
  return fileUrls.map(parseFileUrl);
};

export interface FileTypeDisplay {
  color: string;
  bgColor: string;
  borderColor: string;
  hoverBgColor: string;
  icon: string;
  label: string;
}

export const getFileTypeDisplay = (category: FileCategory): FileTypeDisplay => {
  const displays: Record<FileCategory, FileTypeDisplay> = {
    document: {
      color: '#1976d2',
      bgColor: '#e3f2fd',
      borderColor: '#90caf9',
      hoverBgColor: '#bbdefb',
      icon: 'FileText',
      label: 'Document'
    },
    code: {
      color: '#7b1fa2',
      bgColor: '#f3e5f5',
      borderColor: '#ce93d8',
      hoverBgColor: '#e1bee7',
      icon: 'FileCode',
      label: 'Code'
    },
    image: {
      color: '#388e3c',
      bgColor: '#e8f5e9',
      borderColor: '#a5d6a7',
      hoverBgColor: '#c8e6c9',
      icon: 'FileImage',
      label: 'Image'
    },
    archive: {
      color: '#f57c00',
      bgColor: '#fff3e0',
      borderColor: '#ffcc80',
      hoverBgColor: '#ffe0b2',
      icon: 'FileArchive',
      label: 'Archive'
    },
    spreadsheet: {
      color: '#00796b',
      bgColor: '#e0f2f1',
      borderColor: '#80cbc4',
      hoverBgColor: '#b2dfdb',
      icon: 'FileSpreadsheet',
      label: 'Spreadsheet'
    },
    presentation: {
      color: '#c2185b',
      bgColor: '#fce4ec',
      borderColor: '#f48fb1',
      hoverBgColor: '#f8bbd0',
      icon: 'FilePresentation',
      label: 'Presentation'
    },
    media: {
      color: '#5e35b1',
      bgColor: '#ede7f6',
      borderColor: '#b39ddb',
      hoverBgColor: '#d1c4e9',
      icon: 'FileVideo',
      label: 'Media'
    },
    other: {
      color: '#616161',
      bgColor: '#f5f5f5',
      borderColor: '#e0e0e0',
      hoverBgColor: '#eeeeee',
      icon: 'File',
      label: 'File'
    }
  };

  return displays[category];
};

export const getMuiIconName = (category: FileCategory): string => {
  const iconMap: Record<FileCategory, string> = {
    document: 'Description',
    code: 'Code',
    image: 'Image',
    archive: 'FolderZip',
    spreadsheet: 'TableChart',
    presentation: 'Slideshow',
    media: 'VideoLibrary',
    other: 'InsertDriveFile'
  };
  
  return iconMap[category];
};

export const validateScore = (score: number, maxScore: number = 100): boolean => {
  return score >= 0 && score <= maxScore;
};

export const validateFeedback = (feedback: string): boolean => {
  return feedback.trim().length > 0;
};

export const isSubmissionLate = (submittedAt: string, dueDate: string): boolean => {
  return new Date(submittedAt) > new Date(dueDate);
};

export const formatScore = (score: number | undefined, maxScore: number = 100): string => {
  if (score === undefined || score === null) return 'Chưa chấm';
  return `${score}/${maxScore}`;
};

export const formatSubmissionDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'Invalid date';
  }
};

export const getSubmissionStatusLabel = (status: SubmissionStatus): string => {
  const labels: Record<SubmissionStatus, string> = {
    not_submitted: 'Chưa nộp',
    submitted: 'Đã nộp',
    late: 'Nộp trễ',
    graded: 'Đã chấm',
    pending: 'Đang chờ',
    rejected: 'Bị từ chối'
  };
  
  return labels[status] || status;
};

export const getSubmissionStatusColor = (status: SubmissionStatus): {
  color: string;
  bgColor: string;
} => {
  const colors: Record<SubmissionStatus, { color: string; bgColor: string }> = {
    not_submitted: { color: '#d32f2f', bgColor: '#ffebee' },
    submitted: { color: '#388e3c', bgColor: '#e8f5e9' },
    late: { color: '#f57c00', bgColor: '#fff3e0' },
    graded: { color: '#1976d2', bgColor: '#e3f2fd' },
    pending: { color: '#fbc02d', bgColor: '#fffde7' },
    rejected: { color: '#c62828', bgColor: '#ffcdd2' }
  };
  
  return colors[status] || { color: '#757575', bgColor: '#f5f5f5' };
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

// ============= FILE TYPE BADGE STYLES (MUI SX) =============
export const getFileTypeBadgeSx = (category: FileCategory) => {
  const display = getFileTypeDisplay(category);
  
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 0.5,
    px: 1.5,
    py: 0.5,
    borderRadius: 1,
    fontSize: '0.75rem',
    fontWeight: 600,
    color: display.color,
    bgcolor: display.bgColor,
    border: `1px solid ${display.borderColor}`,
    transition: 'all 0.2s',
    '&:hover': {
      bgcolor: display.hoverBgColor,
      cursor: 'pointer'
    }
  };
};

export const enhanceSubmissionWithFileInfo = (submission: Submission): Submission => {
  return {
    ...submission,
    files: parseFileUrls(submission.fileUrls)
  };
};

// ============= TYPE EXPORTS =============
export type {
  Submission as default
};