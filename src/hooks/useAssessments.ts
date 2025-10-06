import { useState, useCallback } from 'react';
import { assessmentApi, Assessment, AssessmentSubmission, SubmissionAnswer, SubmissionResponse } from '../services/api';

export const useAssessments = () => {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [currentAssessment, setCurrentAssessment] = useState<Assessment | null>(null);
  const [submissions, setSubmissions] = useState<AssessmentSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 평가 생성 (선생님)
  const createAssessment = useCallback(async (courseId: number, assessment: Assessment): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // TODO: 실제 API 연결 시 주석 해제
      // const createdAssessment = await assessmentApi.createAssessment(courseId, assessment);
      // setAssessments(prev => [...prev, createdAssessment]);
      
      // 임시 응답 (API 없을 때)
      console.log('Assessment creation (API not connected):', courseId, assessment);
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '평가 생성에 실패했습니다.';
      setError(errorMessage);
      console.error('Failed to create assessment:', err);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 평가 상세 조회
  const getAssessmentDetail = useCallback(async (assessmentId: number): Promise<Assessment | null> => {
    try {
      // TODO: 실제 API 연결 시 주석 해제
      // const assessment = await assessmentApi.getAssessmentDetail(assessmentId);
      // setCurrentAssessment(assessment);
      // return assessment;
      
      // 임시 데이터 (API 없을 때)
      return null;
    } catch (err) {
      console.error('Failed to fetch assessment detail:', err);
      return null;
    }
  }, []);

  // 답안 제출 (학생)
  const submitAnswers = useCallback(async (assessmentId: number, answers: SubmissionAnswer[]): Promise<{ success: boolean; response?: SubmissionResponse; error?: string }> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // TODO: 실제 API 연결 시 주석 해제
      // const response = await assessmentApi.submitAnswers(assessmentId, answers);
      // return { success: true, response };
      
      // 임시 응답 (API 없을 때)
      const mockResponse: SubmissionResponse = {
        submissionId: Math.floor(Math.random() * 1000),
        message: "답안이 성공적으로 제출되었습니다."
      };
      return { success: true, response: mockResponse };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '답안 제출에 실패했습니다.';
      setError(errorMessage);
      console.error('Failed to submit answers:', err);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 평가 현황 조회 (선생님)
  const getAssessmentSubmissions = useCallback(async (assessmentId: number): Promise<AssessmentSubmission[]> => {
    try {
      // TODO: 실제 API 연결 시 주석 해제
      // const fetchedSubmissions = await assessmentApi.getAssessmentSubmissions(assessmentId);
      // setSubmissions(fetchedSubmissions);
      // return fetchedSubmissions;
      
      // 임시 데이터 (API 없을 때)
      const mockSubmissions: AssessmentSubmission[] = [
        {
          submissionId: 1,
          studentName: "김철수",
          status: "GRADED",
          score: 100
        },
        {
          submissionId: 2,
          studentName: "이영희",
          status: "GRADED",
          score: 50
        }
      ];
      setSubmissions(mockSubmissions);
      return mockSubmissions;
    } catch (err) {
      console.error('Failed to fetch assessment submissions:', err);
      return [];
    }
  }, []);

  // 평가 목록 조회 (추후 구현)
  const fetchAssessments = useCallback(async (courseId: number) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // TODO: 실제 API 연결 시 주석 해제
      // const fetchedAssessments = await assessmentApi.getAssessments(courseId);
      // setAssessments(fetchedAssessments);
      
      // 임시 데이터 (API 없을 때)
      setAssessments([]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '평가 목록을 불러오는데 실패했습니다.';
      setError(errorMessage);
      console.error('Failed to fetch assessments:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    assessments,
    currentAssessment,
    submissions,
    isLoading,
    error,
    createAssessment,
    getAssessmentDetail,
    submitAnswers,
    getAssessmentSubmissions,
    fetchAssessments,
  };
};
