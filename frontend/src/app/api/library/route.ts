import { NextRequest, NextResponse } from 'next/server';
import {
  loadLibrary,
  getRecentCourses,
  getFolders
} from '@/lib/storage/courseStorage';

// GET /api/library - Get library index with courses and folders
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const view = searchParams.get('view'); // 'recent', 'folders', or 'all'

    if (view === 'recent') {
      const courses = await getRecentCourses();
      return NextResponse.json({
        success: true,
        data: courses
      });
    }

    if (view === 'folders') {
      const folders = await getFolders();
      return NextResponse.json({
        success: true,
        data: folders
      });
    }

    // Return full library
    const library = await loadLibrary();
    return NextResponse.json({
      success: true,
      data: library
    });
  } catch (error) {
    console.error('Error loading library:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load library'
      },
      { status: 500 }
    );
  }
}