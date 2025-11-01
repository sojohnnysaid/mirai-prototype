import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Define the data directory path
const DATA_DIR = path.join(process.cwd(), 'data');
const COURSES_DIR = path.join(DATA_DIR, 'courses');
const EXPORTS_DIR = path.join(DATA_DIR, 'exports');
const LIBRARY_FILE = path.join(DATA_DIR, 'library.json');

// Course data types
export interface CourseMetadata {
  id: string;
  version: number;
  status: 'draft' | 'published';
  createdAt: string;
  modifiedAt: string;
  createdBy?: string;
}

export interface CourseSettings {
  title: string;
  desiredOutcome: string;
  destinationFolder: string;
  categoryTags: string[];
  dataSource: string;
}

export interface StoredCourse {
  id: string;
  version: number;
  status: 'draft' | 'published';
  metadata: CourseMetadata;
  settings: CourseSettings;
  personas: any[];
  learningObjectives: any[];
  assessmentSettings: any;
  content: {
    sections: any[];
    courseBlocks: any[];
  };
  exports?: any[];
}

export interface LibraryEntry {
  id: string;
  title: string;
  status: 'draft' | 'published';
  folder: string;
  tags: string[];
  createdAt: string;
  modifiedAt: string;
  createdBy?: string;
  thumbnailPath?: string;
}

export interface Library {
  version: string;
  lastUpdated: string;
  courses: LibraryEntry[];
  folders: any[];
}

// Ensure directories exist
async function ensureDirectories() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.mkdir(COURSES_DIR, { recursive: true });
    await fs.mkdir(EXPORTS_DIR, { recursive: true });

    // Create library file if it doesn't exist
    try {
      await fs.access(LIBRARY_FILE);
    } catch {
      const initialLibrary: Library = {
        version: '1.0',
        lastUpdated: new Date().toISOString(),
        courses: [],
        folders: [
          { id: 'hr', name: 'Human Resources', parent: null, children: ['compliance', 'onboarding'] },
          { id: 'compliance', name: 'Compliance', parent: 'hr', children: [] },
          { id: 'onboarding', name: 'Onboarding', parent: 'hr', children: [] },
          { id: 'sales', name: 'Sales', parent: null, children: ['product-training', 'skills'] },
          { id: 'product-training', name: 'Product Training', parent: 'sales', children: [] },
          { id: 'skills', name: 'Skills Development', parent: 'sales', children: [] },
          { id: 'it', name: 'IT', parent: null, children: ['security', 'software'] },
          { id: 'security', name: 'Security', parent: 'it', children: [] },
          { id: 'software', name: 'Software Training', parent: 'it', children: [] }
        ]
      };
      await fs.writeFile(LIBRARY_FILE, JSON.stringify(initialLibrary, null, 2));
    }
  } catch (error) {
    console.error('Error creating directories:', error);
    throw error;
  }
}

// Load library index
export async function loadLibrary(): Promise<Library> {
  await ensureDirectories();
  try {
    const data = await fs.readFile(LIBRARY_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading library:', error);
    return {
      version: '1.0',
      lastUpdated: new Date().toISOString(),
      courses: [],
      folders: []
    };
  }
}

// Save library index
async function saveLibrary(library: Library): Promise<void> {
  library.lastUpdated = new Date().toISOString();
  await fs.writeFile(LIBRARY_FILE, JSON.stringify(library, null, 2));
}

// Create a new course
export async function createCourse(courseData: Partial<StoredCourse>): Promise<StoredCourse> {
  await ensureDirectories();

  const courseId = courseData.id || `course-${uuidv4()}`;
  const now = new Date().toISOString();

  const course: StoredCourse = {
    id: courseId,
    version: 1,
    status: 'draft',
    metadata: {
      id: courseId,
      version: 1,
      status: 'draft',
      createdAt: now,
      modifiedAt: now,
      ...courseData.metadata
    },
    settings: courseData.settings || {
      title: 'Untitled Course',
      desiredOutcome: '',
      destinationFolder: '',
      categoryTags: [],
      dataSource: 'open-web'
    },
    personas: courseData.personas || [],
    learningObjectives: courseData.learningObjectives || [],
    assessmentSettings: courseData.assessmentSettings || {
      enableEmbeddedKnowledgeChecks: false,
      enableFinalExam: false
    },
    content: courseData.content || {
      sections: [],
      courseBlocks: []
    },
    exports: []
  };

  // Save course file
  const coursePath = path.join(COURSES_DIR, `${courseId}.json`);
  await fs.writeFile(coursePath, JSON.stringify(course, null, 2));

  // Update library index
  const library = await loadLibrary();

  // Convert folder name to folder ID if needed
  let folderId = course.settings.destinationFolder;
  if (folderId && !folderId.includes('/') && !folderId.includes('-')) {
    // This looks like a folder name, try to convert to ID
    const resolvedId = await getFolderIdFromPath(folderId);
    if (resolvedId) {
      folderId = resolvedId;
    }
  }

  const libraryEntry: LibraryEntry = {
    id: courseId,
    title: course.settings.title,
    status: course.status,
    folder: folderId,
    tags: course.settings.categoryTags,
    createdAt: course.metadata.createdAt,
    modifiedAt: course.metadata.modifiedAt
  };

  library.courses.push(libraryEntry);
  await saveLibrary(library);

  return course;
}

// Load a course by ID
export async function loadCourse(courseId: string): Promise<StoredCourse | null> {
  try {
    const coursePath = path.join(COURSES_DIR, `${courseId}.json`);
    const data = await fs.readFile(coursePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error loading course ${courseId}:`, error);
    return null;
  }
}

// Update an existing course
export async function updateCourse(courseId: string, updates: Partial<StoredCourse>): Promise<StoredCourse | null> {
  const course = await loadCourse(courseId);
  if (!course) {
    console.error(`Course ${courseId} not found`);
    return null;
  }

  // Merge updates
  const updatedCourse: StoredCourse = {
    ...course,
    ...updates,
    metadata: {
      ...course.metadata,
      ...updates.metadata,
      modifiedAt: new Date().toISOString(),
      version: course.version + 1
    }
  };

  // Save updated course
  const coursePath = path.join(COURSES_DIR, `${courseId}.json`);
  await fs.writeFile(coursePath, JSON.stringify(updatedCourse, null, 2));

  // Update library index
  const library = await loadLibrary();
  const courseIndex = library.courses.findIndex(c => c.id === courseId);
  if (courseIndex !== -1) {
    // Convert folder name to folder ID if needed
    let folderId = updatedCourse.settings?.destinationFolder || library.courses[courseIndex].folder;
    if (folderId && !folderId.includes('/') && !folderId.includes('-')) {
      // This looks like a folder name, try to convert to ID
      const resolvedId = await getFolderIdFromPath(folderId);
      if (resolvedId) {
        folderId = resolvedId;
      }
    }

    library.courses[courseIndex] = {
      ...library.courses[courseIndex],
      title: updatedCourse.settings?.title || library.courses[courseIndex].title,
      status: updatedCourse.status,
      folder: folderId,
      tags: updatedCourse.settings?.categoryTags || library.courses[courseIndex].tags,
      modifiedAt: updatedCourse.metadata.modifiedAt
    };
    await saveLibrary(library);
  }

  return updatedCourse;
}

// Delete a course
export async function deleteCourse(courseId: string): Promise<boolean> {
  try {
    // Delete course file
    const coursePath = path.join(COURSES_DIR, `${courseId}.json`);
    await fs.unlink(coursePath);

    // Update library index
    const library = await loadLibrary();
    library.courses = library.courses.filter(c => c.id !== courseId);
    await saveLibrary(library);

    // Delete export directory if exists
    const exportDir = path.join(EXPORTS_DIR, courseId);
    try {
      await fs.rm(exportDir, { recursive: true, force: true });
    } catch {
      // Directory might not exist, ignore error
    }

    return true;
  } catch (error) {
    console.error(`Error deleting course ${courseId}:`, error);
    return false;
  }
}

// List all courses with optional filters
export async function listCourses(filters?: {
  status?: 'draft' | 'published';
  folder?: string;
  tags?: string[];
}): Promise<LibraryEntry[]> {
  const library = await loadLibrary();
  let courses = library.courses;

  if (filters) {
    if (filters.status) {
      courses = courses.filter(c => c.status === filters.status);
    }
    if (filters.folder) {
      courses = courses.filter(c => c.folder === filters.folder);
    }
    if (filters.tags && filters.tags.length > 0) {
      courses = courses.filter(c =>
        filters.tags!.some(tag => c.tags.includes(tag))
      );
    }
  }

  // Sort by modified date (newest first)
  courses.sort((a, b) =>
    new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()
  );

  return courses;
}

// Get recent courses (last 7 days)
export async function getRecentCourses(): Promise<LibraryEntry[]> {
  const library = await loadLibrary();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  return library.courses
    .filter(c => new Date(c.modifiedAt) > sevenDaysAgo)
    .sort((a, b) =>
      new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()
    );
}

// Export course to SCORM (placeholder for now)
export async function exportCourseToSCORM(courseId: string): Promise<string> {
  const course = await loadCourse(courseId);
  if (!course) {
    throw new Error(`Course ${courseId} not found`);
  }

  // Create export directory
  const exportDir = path.join(EXPORTS_DIR, courseId);
  await fs.mkdir(exportDir, { recursive: true });

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `scorm-${timestamp}.zip`;
  const filepath = path.join(exportDir, filename);

  // TODO: Implement actual SCORM package generation
  // For now, just create a placeholder file
  await fs.writeFile(filepath, 'SCORM package placeholder');

  // Update course with export record
  const exportRecord = {
    id: `export-${uuidv4()}`,
    timestamp: new Date().toISOString(),
    format: 'scorm-1.2',
    version: course.version,
    filePath: filepath
  };

  course.exports = course.exports || [];
  course.exports.push(exportRecord);
  await updateCourse(courseId, course);

  return filepath;
}

// Get folder structure
export async function getFolders(): Promise<any[]> {
  const library = await loadLibrary();
  return library.folders;
}

// Build hierarchical folder structure from flat array
export function buildFolderHierarchy(folders: any[]): any[] {
  const folderMap = new Map();
  const roots: any[] = [];

  // First pass: create all folder objects
  folders.forEach(folder => {
    folderMap.set(folder.id, {
      ...folder,
      children: []
    });
  });

  // Second pass: build hierarchy
  folders.forEach(folder => {
    const folderObj = folderMap.get(folder.id);
    if (folder.parent) {
      const parent = folderMap.get(folder.parent);
      if (parent) {
        parent.children.push(folderObj);
      }
    } else {
      roots.push(folderObj);
    }
  });

  return roots;
}

// Get folder path from folder ID
export async function getFolderPath(folderId: string): Promise<string> {
  const library = await loadLibrary();
  const folders = library.folders;

  const folder = folders.find(f => f.id === folderId);
  if (!folder) return '';

  const path: string[] = [folder.name];
  let current = folder;

  // Traverse up the hierarchy
  while (current.parent) {
    const parent = folders.find(f => f.id === current.parent);
    if (!parent) break;
    path.unshift(parent.name);
    current = parent;
  }

  return path.join('/');
}

// Get folder ID from folder path or name
export async function getFolderIdFromPath(pathOrName: string): Promise<string | null> {
  const library = await loadLibrary();
  const folders = library.folders;

  // First try exact ID match
  const exactMatch = folders.find(f => f.id === pathOrName);
  if (exactMatch) return exactMatch.id;

  // Then try name match
  const nameMatch = folders.find(f => f.name === pathOrName);
  if (nameMatch) return nameMatch.id;

  // Finally try path match
  const pathParts = pathOrName.split('/');
  if (pathParts.length > 1) {
    // Navigate through the path
    let current = folders.find(f => f.name === pathParts[0] && !f.parent);

    for (let i = 1; i < pathParts.length && current; i++) {
      const children = folders.filter(f => f.parent === current.id);
      current = children.find(f => f.name === pathParts[i]);
    }

    return current ? current.id : null;
  }

  return null;
}

// Get all courses in a folder (including subfolders)
export async function getCoursesByFolder(folderId: string, includeSubfolders = true): Promise<LibraryEntry[]> {
  const library = await loadLibrary();
  const folders = library.folders;
  const courses = library.courses;

  // Get all folder IDs to check
  const folderIds = new Set([folderId]);

  if (includeSubfolders) {
    // Recursively add all subfolder IDs
    const addSubfolders = (parentId: string) => {
      folders.filter(f => f.parent === parentId).forEach(subfolder => {
        folderIds.add(subfolder.id);
        addSubfolders(subfolder.id);
      });
    };
    addSubfolders(folderId);
  }

  // Filter courses by folder IDs
  return courses.filter(course => folderIds.has(course.folder));
}