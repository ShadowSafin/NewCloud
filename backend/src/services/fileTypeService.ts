export type FileCategory =
  | "images"
  | "videos"
  | "audio"
  | "documents"
  | "archives"
  | "code"
  | "executables"
  | "fonts"
  | "3d-models"
  | "cad"
  | "datasets"
  | "ebooks"
  | "spreadsheets"
  | "presentations"
  | "databases"
  | "unknown";

export interface FileTypeInfo {
  category: FileCategory;
  mimeType: string;
  extension: string;
  icon: string;
  canPreview: boolean;
  canThumbnail: boolean;
}

interface MimeEntry {
  category: FileCategory;
  mimeTypes: string[];
  extensions: string[];
  icon: string;
  canPreview: boolean;
  canThumbnail: boolean;
}

const FILE_TYPES: MimeEntry[] = [
  {
    category: "images",
    mimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml", "image/bmp", "image/tiff", "image/x-icon"],
    extensions: [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".tiff", ".tif", ".ico", ".heic", ".heif", ".avif", ".raw", ".cr2", ".nef", ".arw", ".dng", ".orf", ".rw2"],
    icon: "Image",
    canPreview: true,
    canThumbnail: true,
  },
  {
    category: "videos",
    mimeTypes: ["video/mp4", "video/webm", "video/x-msvideo", "video/x-matroska", "video/quicktime", "video/x-ms-wmv", "video/mpeg"],
    extensions: [".mp4", ".webm", ".avi", ".mkv", ".mov", ".wmv", ".flv", ".mpg", ".m4v", ".3gp", ".ogv"],
    icon: "Video",
    canPreview: true,
    canThumbnail: true,
  },
  {
    category: "audio",
    mimeTypes: ["audio/mpeg", "audio/wav", "audio/ogg", "audio/mp3", "audio/x-m4a", "audio/x-wav", "audio/webm", "audio/flac"],
    extensions: [".mp3", ".wav", ".ogg", ".m4a", ".flac", ".aac", ".wma", ".opus", ".aiff", ".mid", ".midi"],
    icon: "Music",
    canPreview: true,
    canThumbnail: false,
  },
  {
    category: "documents",
    mimeTypes: ["application/pdf", "text/plain", "text/html", "text/css", "text/csv", "text/xml", "application/rtf", "application/json", "text/markdown"],
    extensions: [".pdf", ".txt", ".html", ".htm", ".css", ".csv", ".xml", ".rtf", ".json", ".md", ".markdown", ".tex", ".log"],
    icon: "FileText",
    canPreview: true,
    canThumbnail: true,
  },
  {
    category: "archives",
    mimeTypes: ["application/zip", "application/x-rar-compressed", "application/x-7z-compressed", "application/x-tar", "application/gzip", "application/x-bzip2", "application/x-xz"],
    extensions: [".zip", ".rar", ".7z", ".tar", ".gz", ".bz2", ".xz", ".iso", ".dmg", ".pkg", ".deb", ".rpm", ".apk"],
    icon: "Archive",
    canPreview: false,
    canThumbnail: false,
  },
  {
    category: "code",
    mimeTypes: ["text/javascript", "text/typescript", "text/x-python", "text/x-java", "text/x-c", "text/x-cpp", "text/x-go", "text/x-rust", "text/x-ruby", "text/php", "text/x-perl", "text/x-swift", "text/x-kotlin"],
    extensions: [".js", ".jsx", ".ts", ".tsx", ".py", ".java", ".c", ".h", ".cpp", ".hpp", ".go", ".rs", ".rb", ".php", ".pl", ".swift", ".kt", ".scala", ".sh", ".bash", ".zsh", ".ps1", ".sql", ".html", ".css", ".scss", ".sass", ".less", ".vue", ".jsx", ".tsx", ".yaml", ".yml", ".toml", ".xml", ".json"],
    icon: "Code",
    canPreview: true,
    canThumbnail: false,
  },
  {
    category: "executables",
    mimeTypes: ["application/x-msdownload", "application/x-msdos-program", "application/x-dosexec", "application/x-executable", "application/x-mach-binary"],
    extensions: [".exe", ".dll", ".bat", ".cmd", ".sh", ".msi", ".app", ".dmg", ".bin", ".run", ".app"],
    icon: "Binary",
    canPreview: false,
    canThumbnail: false,
  },
  {
    category: "fonts",
    mimeTypes: ["font/ttf", "font/otf", "font/woff", "font/woff2", "font/vnd.font", "application/font-woff", "application/font-woff2"],
    extensions: [".ttf", ".otf", ".woff", ".woff2", ".eot", ".svg"],
    icon: "Type",
    canPreview: false,
    canThumbnail: false,
  },
  {
    category: "3d-models",
    mimeTypes: ["model/gltf-binary", "model/gltf+json", "model/obj", "model/stl", "model/3ds", "model/fbx"],
    extensions: [".gltf", ".glb", ".obj", ".stl", ".3ds", ".fbx", ".blend", ".dae", ".3dm", ".iges", ".igs", ".step", ".stp"],
    icon: "Box",
    canPreview: true,
    canThumbnail: false,
  },
  {
    category: "cad",
    mimeTypes: ["application/autocad", "application/dxf", "application/vnd.ms-project"],
    extensions: [".dwg", ".dxf", ".dwf", ".skp", ".sketch", ".f3d", ".f3z", ".iam", ".ipt", ".catpart"],
    icon: "PenTool",
    canPreview: false,
    canThumbnail: false,
  },
  {
    category: "datasets",
    mimeTypes: ["application/x-parquet", "application/x-hdf", "application/x-netcdf", "text/csv"],
    extensions: [".csv", ".parquet", ".h5", ".hdf5", ".nc", ".xlsx", ".xls", ".ods"],
    icon: "Database",
    canPreview: true,
    canThumbnail: false,
  },
  {
    category: "ebooks",
    mimeTypes: ["application/epub+zip", "application/mobi", "application/x-mobipocket-ebook", "application/vnd.amazon.mobi8-ebook"],
    extensions: [".epub", ".mobi", ".azw", ".azw3", ".kf8", ".fb2", ".lrf", ".pdb"],
    icon: "BookOpen",
    canPreview: true,
    canThumbnail: false,
  },
  {
    category: "spreadsheets",
    mimeTypes: ["application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.oasis.opendocument.spreadsheet"],
    extensions: [".xlsx", ".xls", ".xlsm", ".ods", ".csv", ".tsv"],
    icon: "Table",
    canPreview: true,
    canThumbnail: false,
  },
  {
    category: "presentations",
    mimeTypes: ["application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "application/vnd.oasis.opendocument.presentation"],
    extensions: [".ppt", ".pptx", ".odp", ".key"],
    icon: "Presentation",
    canPreview: true,
    canThumbnail: false,
  },
  {
    category: "databases",
    mimeTypes: ["application/x-sql", "application/x-sqlite3", "application/x-mysql", "application/postgresql"],
    extensions: [".sql", ".sqlite", ".db", ".mdb", ".accdb", ".dbf", ".sqlite3"],
    icon: "HardDrive",
    canPreview: false,
    canThumbnail: false,
  },
];

const DANGEROUS_MIME_TYPES = [
  "application/x-msdownload",
  "application/x-msdos-program",
  "application/x-dosexec",
  "application/javascript",
  "application/x-javascript",
  "text/javascript",
  "application/x-php",
  "application/x-sh",
  "application/x-shellscript",
  "text/x-shellscript",
];

const DANGEROUS_EXTENSIONS = [
  ".exe", ".dll", ".bat", ".cmd", ".sh", ".msi", ".com", ".scr", ".vbs", ".js", ".wsf", ".hta", ".pif", ".msc", ".cmd", ".ps1", ".reg",
];

class FileTypeService {
  private mimeMap: Map<string, MimeEntry> = new Map();
  private extMap: Map<string, MimeEntry> = new Map();

  constructor() {
    this.buildMaps();
  }

  private buildMaps(): void {
    for (const entry of FILE_TYPES) {
      for (const mime of entry.mimeTypes) {
        this.mimeMap.set(mime.toLowerCase(), entry);
      }
      for (const ext of entry.extensions) {
        this.extMap.set(ext.toLowerCase(), entry);
      }
    }
  }

  getFileInfo(filename: string, mimeType: string): FileTypeInfo {
    const ext = this.getExtension(filename);
    let entry: MimeEntry | undefined;

    if (mimeType && mimeType !== "application/octet-stream") {
      entry = this.mimeMap.get(mimeType.toLowerCase());
    }

    if (!entry && ext) {
      entry = this.extMap.get(ext.toLowerCase());
    }

    if (entry) {
      return {
        category: entry.category,
        mimeType: mimeType || entry.mimeTypes[0] || "application/octet-stream",
        extension: ext || entry.extensions[0] || "",
        icon: entry.icon,
        canPreview: entry.canPreview,
        canThumbnail: entry.canThumbnail,
      };
    }

    return {
      category: "unknown",
      mimeType: mimeType || "application/octet-stream",
      extension: ext || "",
      icon: "File",
      canPreview: false,
      canThumbnail: false,
    };
  }

  getCategory(mimeType: string, extension: string): FileCategory {
    const info = this.getFileInfo(`file${extension}`, mimeType);
    return info.category;
  }

  getIcon(mimeType: string, extension: string): string {
    const info = this.getFileInfo(`file${extension}`, mimeType);
    return info.icon;
  }

  canPreview(mimeType: string, extension: string): boolean {
    const info = this.getFileInfo(`file${extension}`, mimeType);
    return info.canPreview;
  }

  canThumbnail(mimeType: string, extension: string): boolean {
    const info = this.getFileInfo(`file${extension}`, mimeType);
    return info.canThumbnail;
  }

  isDangerous(mimeType: string, extension: string): boolean {
    const lowerMime = mimeType.toLowerCase();
    const lowerExt = (extension || "").toLowerCase();

    if (DANGEROUS_MIME_TYPES.includes(lowerMime)) {
      return true;
    }

    if (DANGEROUS_EXTENSIONS.includes(lowerExt)) {
      return true;
    }

    return false;
  }

  private getExtension(filename: string): string {
    const parts = filename.split(".");
    if (parts.length > 1) {
      return "." + parts[parts.length - 1].toLowerCase();
    }
    return "";
  }

  getAllCategories(): FileCategory[] {
    return [
      "images", "videos", "audio", "documents", "archives",
      "code", "executables", "fonts", "3d-models", "cad",
      "datasets", "ebooks", "spreadsheets", "presentations", "databases"
    ];
  }

  getCategoryInfo(category: FileCategory): { name: string; icon: string; color: string } {
    const categoryMap: Record<FileCategory, { name: string; icon: string; color: string }> = {
      "images": { name: "Images", icon: "Image", color: "text-green-500" },
      "videos": { name: "Videos", icon: "Video", color: "text-purple-500" },
      "audio": { name: "Audio", icon: "Music", color: "text-pink-500" },
      "documents": { name: "Documents", icon: "FileText", color: "text-blue-500" },
      "archives": { name: "Archives", icon: "Archive", color: "text-yellow-500" },
      "code": { name: "Code", icon: "Code", color: "text-gray-500" },
      "executables": { name: "Executables", icon: "Binary", color: "text-red-500" },
      "fonts": { name: "Fonts", icon: "Type", color: "text-indigo-500" },
      "3d-models": { name: "3D Models", icon: "Box", color: "text-teal-500" },
      "cad": { name: "CAD Files", icon: "PenTool", color: "text-orange-500" },
      "datasets": { name: "Datasets", icon: "Database", color: "text-cyan-500" },
      "ebooks": { name: "Ebooks", icon: "BookOpen", color: "text-amber-500" },
      "spreadsheets": { name: "Spreadsheets", icon: "Table", color: "text-emerald-500" },
      "presentations": { name: "Presentations", icon: "Presentation", color: "text-rose-500" },
      "databases": { name: "Databases", icon: "HardDrive", color: "text-violet-500" },
      "unknown": { name: "Unknown", icon: "File", color: "text-gray-400" },
    };
    return categoryMap[category] || categoryMap.unknown;
  }
}

export const fileTypeService = new FileTypeService();