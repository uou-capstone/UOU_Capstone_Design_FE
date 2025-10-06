import { useState, useCallback } from 'react';
import { lectureApi, Lecture, LectureMaterial } from '../services/api';

export const useLectures = () => {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [currentLecture, setCurrentLecture] = useState<Lecture | null>(null);
  const [materials, setMaterials] = useState<LectureMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 강의 목록 조회
  const fetchLectures = useCallback(async (courseId: number) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // TODO: 실제 API 연결 시 주석 해제
      // const fetchedLectures = await lectureApi.getLectures(courseId);
      // setLectures(fetchedLectures);
      
      // 임시 데이터 (API 없을 때)
      setLectures([]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '강의 목록을 불러오는데 실패했습니다.';
      setError(errorMessage);
      console.error('Failed to fetch lectures:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 강의 상세 조회
  const getLectureDetail = useCallback(async (lectureId: number): Promise<Lecture | null> => {
    try {
      // TODO: 실제 API 연결 시 주석 해제
      // const lecture = await lectureApi.getLectureDetail(lectureId);
      // setCurrentLecture(lecture);
      // return lecture;
      
      // 임시 데이터 (API 없을 때)
      return null;
    } catch (err) {
      console.error('Failed to fetch lecture detail:', err);
      return null;
    }
  }, []);

  // 강의 생성
  const createLecture = useCallback(async (courseId: number, formData: FormData): Promise<{ success: boolean; error?: string }> => {
    try {
      // TODO: 실제 API 연결 시 주석 해제
      // await lectureApi.createLecture(courseId, formData);
      
      // 임시 응답 (API 없을 때)
      console.log('Lecture creation (API not connected):', courseId, formData);
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
  const uploadMaterial = useCallback(async (lectureId: number, formData: FormData): Promise<{ success: boolean; error?: string }> => {
    try {
      // TODO: 실제 API 연결 시 주석 해제
      // const material = await lectureApi.uploadMaterial(lectureId, formData);
      // setMaterials(prev => [...prev, material]);
      
      // 임시 응답 (API 없을 때)
      console.log('Material upload (API not connected):', lectureId, formData);
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '자료 업로드에 실패했습니다.';
      console.error('Failed to upload material:', err);
      return { success: false, error: errorMessage };
    }
  }, []);

  // 외부 링크 자료 추가
  const addLinkMaterial = useCallback(async (lectureId: number, materialData: {
    displayName: string;
    url: string;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      // TODO: 실제 API 연결 시 주석 해제
      // const material = await lectureApi.addLinkMaterial(lectureId, {
      //   materialType: 'LINK',
      //   ...materialData
      // });
      // setMaterials(prev => [...prev, material]);
      
      // 임시 응답 (API 없을 때)
      console.log('Link material addition (API not connected):', lectureId, materialData);
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '링크 자료 추가에 실패했습니다.';
      console.error('Failed to add link material:', err);
      return { success: false, error: errorMessage };
    }
  }, []);

  // 강의 자료 삭제
  const deleteMaterial = useCallback(async (materialId: number): Promise<{ success: boolean; error?: string }> => {
    try {
      // TODO: 실제 API 연결 시 주석 해제
      // await lectureApi.deleteMaterial(materialId);
      // setMaterials(prev => prev.filter(material => material.materialId !== materialId));
      
      // 임시 응답 (API 없을 때)
      console.log('Material deletion (API not connected):', materialId);
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '자료 삭제에 실패했습니다.';
      console.error('Failed to delete material:', err);
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
    fetchMaterials,
    uploadMaterial,
    addLinkMaterial,
    deleteMaterial,
  };
};
