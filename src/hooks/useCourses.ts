import { useState, useCallback } from 'react';
import { courseApi, Course, CourseDetail } from '../services/api';

export const useCourses = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 모든 과목 조회
  const fetchCourses = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const fetchedCourses = await courseApi.getAllCourses();
      setCourses(fetchedCourses);
    } catch (err) {
      // 에러 발생 시 조용히 처리 (빈 목록으로 표시)
      // 회원가입 직후나 서버 오류 시에도 에러 메시지를 표시하지 않음
      setCourses([]);
      setError(null); // 에러 상태를 null로 유지하여 에러 메시지가 표시되지 않도록 함
      console.error('Failed to fetch courses:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 과목 상세 조회
  const getCourseDetail = useCallback(async (courseId: number): Promise<CourseDetail | null> => {
    try {
      return await courseApi.getCourseDetail(courseId);
    } catch (err) {
      console.error('Failed to fetch course detail:', err);
      return null;
    }
  }, []);

  // 과목 생성 (선생님 전용)
  const createCourse = useCallback(async (courseData: {
    title: string;
    description: string;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const newCourse = await courseApi.createCourse(courseData);
      setCourses(prev => [...prev, newCourse]);
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '과목 생성에 실패했습니다.';
      console.error('Failed to create course:', err);
      return { success: false, error: errorMessage };
    }
  }, []);

  // 과목 수정 (선생님 전용)
  const updateCourse = useCallback(async (courseId: number, courseData: {
    title: string;
    description: string;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const updatedCourse = await courseApi.updateCourse(courseId, courseData);
      setCourses(prev => prev.map(course => 
        course.courseId === courseId ? updatedCourse : course
      ));
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '과목 수정에 실패했습니다.';
      console.error('Failed to update course:', err);
      return { success: false, error: errorMessage };
    }
  }, []);

  // 과목 삭제 (선생님 전용)
  const deleteCourse = useCallback(async (courseId: number): Promise<{ success: boolean; error?: string }> => {
    try {
      await courseApi.deleteCourse(courseId);
      setCourses(prev => prev.filter(course => course.courseId !== courseId));
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '과목 삭제에 실패했습니다.';
      console.error('Failed to delete course:', err);
      return { success: false, error: errorMessage };
    }
  }, []);

  // 수강 신청 (학생 전용)
  const enrollCourse = useCallback(async (courseId: number): Promise<{ success: boolean; error?: string }> => {
    try {
      await courseApi.enrollCourse(courseId);
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '수강 신청에 실패했습니다.';
      console.error('Failed to enroll course:', err);
      return { success: false, error: errorMessage };
    }
  }, []);

  return {
    courses,
    isLoading,
    error,
    fetchCourses,
    getCourseDetail,
    createCourse,
    updateCourse,
    deleteCourse,
    enrollCourse,
  };
};
