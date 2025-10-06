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
      
      // TODO: 실제 API 연결 시 주석 해제
      // const fetchedCourses = await courseApi.getAllCourses();
      // setCourses(fetchedCourses);
      
      // 임시 데이터 (API 없을 때)
      setCourses([]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '과목을 불러오는데 실패했습니다.';
      setError(errorMessage);
      console.error('Failed to fetch courses:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 과목 상세 조회
  const getCourseDetail = useCallback(async (courseId: number): Promise<CourseDetail | null> => {
    try {
      // TODO: 실제 API 연결 시 주석 해제
      // return await courseApi.getCourseDetail(courseId);
      
      // 임시 데이터 (API 없을 때)
      return null;
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
      // TODO: 실제 API 연결 시 주석 해제
      // const newCourse = await courseApi.createCourse(courseData);
      // setCourses(prev => [...prev, newCourse]);
      
      // 임시 응답 (API 없을 때)
      console.log('Course creation (API not connected):', courseData);
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
      // TODO: 실제 API 연결 시 주석 해제
      // const updatedCourse = await courseApi.updateCourse(courseId, courseData);
      // setCourses(prev => prev.map(course => 
      //   course.courseId === courseId ? updatedCourse : course
      // ));
      
      // 임시 응답 (API 없을 때)
      console.log('Course update (API not connected):', courseId, courseData);
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
      // TODO: 실제 API 연결 시 주석 해제
      // await courseApi.deleteCourse(courseId);
      // setCourses(prev => prev.filter(course => course.courseId !== courseId));
      
      // 임시 응답 (API 없을 때)
      console.log('Course deletion (API not connected):', courseId);
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
      // TODO: 실제 API 연결 시 주석 해제
      // await courseApi.enrollCourse(courseId);
      
      // 임시 응답 (API 없을 때)
      console.log('Course enrollment (API not connected):', courseId);
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
