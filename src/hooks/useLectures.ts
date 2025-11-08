import { useState, useCallback } from 'react';
import { lectureApi, Lecture, LectureMaterial, LectureDetailResponseDto, LectureResponseDto } from '../services/api';
import { courseApi } from '../services/api';

export const useLectures = () => {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [currentLecture, setCurrentLecture] = useState<Lecture | null>(null);
  const [materials, setMaterials] = useState<LectureMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 강의 목록 조회 (과목 상세에서 lectures 포함)
  const fetchLectures = useCallback(async (courseId: number) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // 과목 상세 조회로 강의 목록 가져오기
      const courseDetail = await courseApi.getCourseDetail(courseId);
      if (courseDetail.lectures) {
        setLectures(courseDetail.lectures);
      } else {
        setLectures([]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '강의 목록을 불러오는데 실패했습니다.';
      setError(errorMessage);
      console.error('Failed to fetch lectures:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 강의 상세 조회
  const getLectureDetail = useCallback(async (lectureId: number): Promise<LectureDetailResponseDto | null> => {
    try {
      const lecture = await lectureApi.getLectureDetail(lectureId);
      setCurrentLecture(lecture);
      return lecture;
    } catch (err) {
      console.error('Failed to fetch lecture detail:', err);
      return null;
    }
  }, []);

  // 강의 생성
  const createLecture = useCallback(async (courseId: number, lectureData: {
    title: string;
    weekNumber: number;
    description?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const newLecture = await lectureApi.createLecture(courseId, lectureData);
      setLectures(prev => [...prev, newLecture]);
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '강의 생성에 실패했습니다.';
      console.error('Failed to create lecture:', err);
      return { success: false, error: errorMessage };
    }
  }, []);

  // 강의 자료 목록 조회
  const fetchMaterials = useCallback(async (lectureId: number) => {
    try {
      // TODO: 실제 API 연결 시 주석 해제
      // const fetchedMaterials = await lectureApi.getLectureMaterials(lectureId);
      // setMaterials(fetchedMaterials);
      
      // 임시 데이터 (API 없을 때)
      setMaterials([]);
    } catch (err) {
      console.error('Failed to fetch materials:', err);
      setMaterials([]);
    }
  }, []);

  // 보충 자료 업로드 (파일)
  const uploadMaterial = useCallback(async (lectureId: number, file: File): Promise<{ success: boolean; error?: string }> => {
    try {
      await lectureApi.uploadMaterial(lectureId, file);
      // 자료 목록 새로고침 필요시 fetchMaterials 호출
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '자료 업로드에 실패했습니다.';
      console.error('Failed to upload material:', err);
      return { success: false, error: errorMessage };
    }
  }, []);

  // AI 강의 콘텐츠 생성
  const generateAiContent = useCallback(async (lectureId: number): Promise<{ success: boolean; error?: string }> => {
    try {
      await lectureApi.generateAiContent(lectureId);
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'AI 콘텐츠 생성에 실패했습니다.';
      console.error('Failed to generate AI content:', err);
      return { success: false, error: errorMessage };
    }
  }, []);

  // 강의 수정
  const updateLecture = useCallback(async (lectureId: number, lectureData: {
    title?: string;
    weekNumber?: number;
    description?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const updatedLecture = await lectureApi.updateLecture(lectureId, lectureData);
      setLectures(prev => prev.map(lecture => 
        lecture.lectureId === lectureId ? updatedLecture : lecture
      ));
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '강의 수정에 실패했습니다.';
      console.error('Failed to update lecture:', err);
      return { success: false, error: errorMessage };
    }
  }, []);

  // 강의 삭제
  const deleteLecture = useCallback(async (lectureId: number): Promise<{ success: boolean; error?: string }> => {
    try {
      await lectureApi.deleteLecture(lectureId);
      setLectures(prev => prev.filter(lecture => lecture.lectureId !== lectureId));
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '강의 삭제에 실패했습니다.';
      console.error('Failed to delete lecture:', err);
      return { success: false, error: errorMessage };
    }
  }, []);

  return {
    lectures,
    currentLecture,
    materials,
    isLoading,
    error,
    fetchLectures,
    getLectureDetail,
    createLecture,
    updateLecture,
    deleteLecture,
    generateAiContent,
    fetchMaterials,
    uploadMaterial,
    // deleteMaterial은 Swagger 스펙에 없어서 제외
  };
};
