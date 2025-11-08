import { useState, useCallback } from 'react';
import { assessmentApi, AssessmentDetailDto, AssessmentSimpleDto, SubmissionStatusDto, SubmissionRequestDto, SubmissionResponseDto, StudentAnswerRequestDto } from '../services/api';

export const useAssessments = () => {
  const [assessments, setAssessments] = useState<AssessmentSimpleDto[]>([]);
  const [currentAssessment, setCurrentAssessment] = useState<AssessmentDetailDto | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionStatusDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 평가 생성 (선생님)
  const createAssessment = useCallback(async (courseId: number, assessment: {
    title: string;
    type: 'QUIZ' | 'ASSIGNMENT';
    dueDate: string;
    questions: Array<{
      text: string;
      type: 'FLASHCARD' | 'OX' | 'MULTICHOICE' | 'ESSAY';
      createdBy?: 'TEACHER' | 'AI';
      choiceOptions?: Array<{
        text: string;
        correct: boolean;
      }>;
    }>;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      setError(null);
      
      await assessmentApi.createAssessment(courseId, assessment);
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
  const getAssessmentDetail = useCallback(async (assessmentId: number): Promise<AssessmentDetailDto | null> => {
    try {
      const assessment = await assessmentApi.getAssessmentDetail(assessmentId);
      setCurrentAssessment(assessment);
      return assessment;
    } catch (err) {
      console.error('Failed to fetch assessment detail:', err);
      return null;
    }
  }, []);

  // 답안 제출 (학생)
  const submitAnswers = useCallback(async (assessmentId: number, answers: StudentAnswerRequestDto[]): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const submission: SubmissionRequestDto = { answers };
      await assessmentApi.createSubmission(assessmentId, submission);
      return { success: true };
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
  const getAssessmentSubmissions = useCallback(async (assessmentId: number): Promise<SubmissionStatusDto[]> => {
    try {
      const fetchedSubmissions = await assessmentApi.getSubmissionsForAssessment(assessmentId);
      setSubmissions(fetchedSubmissions);
      return fetchedSubmissions;
    } catch (err) {
      console.error('Failed to fetch assessment submissions:', err);
      return [];
    }
  }, []);

  // 제출 결과 조회 (학생)
  const getSubmissionResult = useCallback(async (submissionId: number): Promise<SubmissionResponseDto | null> => {
    try {
      return await assessmentApi.getSubmissionResult(submissionId);
    } catch (err) {
      console.error('Failed to fetch submission result:', err);
      return null;
    }
  }, []);

  // 평가 목록 조회
  const fetchAssessments = useCallback(async (courseId: number) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const fetchedAssessments = await assessmentApi.getAssessmentsForCourse(courseId);
      setAssessments(fetchedAssessments);
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
    getSubmissionResult,
    fetchAssessments,
  };
};
