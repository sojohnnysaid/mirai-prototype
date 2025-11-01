import { NextRequest, NextResponse } from 'next/server';
import {
  getFolders,
  buildFolderHierarchy,
  getCoursesByFolder,
  getFolderPath
} from '@/lib/storage/courseStorage';

// GET /api/folders - Get hierarchical folder structure
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'hierarchy';
    const includeCourseCount = searchParams.get('includeCourseCount') === 'true';

    const folders = await getFolders();

    let result: any;

    if (format === 'flat') {
      // Return flat array as stored
      result = folders;
    } else {
      // Return hierarchical structure (default)
      result = buildFolderHierarchy(folders);
    }

    // Optionally add course counts
    if (includeCourseCount) {
      const addCourseCount = async (folder: any) => {
        const courses = await getCoursesByFolder(folder.id, false);
        folder.courseCount = courses.length;

        // Process children recursively
        if (folder.children && Array.isArray(folder.children)) {
          for (const child of folder.children) {
            await addCourseCount(child);
          }
        }
      };

      if (Array.isArray(result)) {
        for (const folder of result) {
          await addCourseCount(folder);
        }
      } else {
        await addCourseCount(result);
      }
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching folders:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch folders',
      },
      { status: 500 }
    );
  }
}

// GET /api/folders/[id] - Get specific folder details
export async function GET_FOLDER(request: NextRequest) {
  try {
    const folderId = request.nextUrl.pathname.split('/').pop();
    if (!folderId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Folder ID is required',
        },
        { status: 400 }
      );
    }

    const folders = await getFolders();
    const folder = folders.find(f => f.id === folderId);

    if (!folder) {
      return NextResponse.json(
        {
          success: false,
          error: 'Folder not found',
        },
        { status: 404 }
      );
    }

    const folderPath = await getFolderPath(folderId);
    const courses = await getCoursesByFolder(folderId, false);
    const subfolderCourses = await getCoursesByFolder(folderId, true);

    return NextResponse.json({
      success: true,
      data: {
        ...folder,
        path: folderPath,
        courseCount: courses.length,
        totalCourseCount: subfolderCourses.length,
      },
    });
  } catch (error) {
    console.error('Error fetching folder details:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch folder details',
      },
      { status: 500 }
    );
  }
}