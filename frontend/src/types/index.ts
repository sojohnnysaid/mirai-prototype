export interface Persona {
  id: string;
  name: string;
  role: string;
  kpis: string;
  responsibilities: string;
  challenges?: string;
  concerns?: string;
  knowledge?: string;
}

export interface LearningObjective {
  id: string;
  text: string;
}

export interface CourseSection {
  id: string;
  name: string;
  lessons: Lesson[];
}

export interface Lesson {
  id: string;
  title: string;
  content?: string;
}

export interface Course {
  id: string;
  title: string;
  desiredOutcome: string;
  destinationFolder: string;
  categoryTags: string[];
  dataSource: string;
  personas: Persona[];
  learningObjectives: LearningObjective[];
  sections: CourseSection[];
  createdAt: string;
  modifiedAt: string;
}

export interface Folder {
  id: string;
  name: string;
  children?: Folder[];
  courses?: Course[];
}

export interface DashboardStats {
  totalCourses: number;
  recentCourses: Course[];
  folders: Folder[];
}
