import { useState, useCallback } from 'react';
import { learningActivityApi, Inquiry, InquiryResponse, QuizQuestion } from '../services/api';

export const useLearningActivity = () => {
  const [inquiryResponse, setInquiryResponse] = useState<InquiryResponse | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 손들 질문 제출
  const submitInquiry = useCallback(async (lectureId: number, inquiry: Inquiry): Promise<{ success: boolean; response?: InquiryResponse; error?: string }> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // TODO: 실제 API 연결 시 주석 해제
      // const response = await learningActivityApi.submitInquiry(lectureId, inquiry);
      // setInquiryResponse(response);
      // return { success: true, response };
      
      // 임시 응답 (API 없을 때)
      const mockResponse: InquiryResponse = {
        answerText: "죄송합니다. 현재 AI 질문 응답 기능이 준비중입니다. 강의 내용을 다시 확인해보시거나 선생님께 직접 질문해주세요."
      };
      setInquiryResponse(mockResponse);
      return { success: true, response: mockResponse };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '질문 제출에 실패했습니다.';
      setError(errorMessage);
      console.error('Failed to submit inquiry:', err);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 자가 진단 퀴즈 생성
  const generateSelfDiagnosisQuiz = useCallback(async (lectureId: number): Promise<{ success: boolean; questions?: QuizQuestion[]; error?: string }> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // TODO: 실제 API 연결 시 주석 해제
      // const questions = await learningActivityApi.generateSelfDiagnosisQuiz(lectureId);
      // setQuizQuestions(questions);
      // return { success: true, questions };
      
      // 임시 데이터 (API 없을 때)
      const mockQuestions: QuizQuestion[] = [
        {
          questionText: "이 강의의 주요 개념을 이해하셨나요?",
          questionType: "ESSAY"
        },
        {
          questionText: "강의 내용을 다시 한 번 복습해야 한다.",
          questionType: "OX"
        }
      ];
      setQuizQuestions(mockQuestions);
      return { success: true, questions: mockQuestions };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '퀴즈 생성에 실패했습니다.';
      setError(errorMessage);
      console.error('Failed to generate quiz:', err);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 응답 초기화
  const clearInquiryResponse = useCallback(() => {
    setInquiryResponse(null);
  }, []);

  // 퀴즈 초기화
  const clearQuizQuestions = useCallback(() => {
    setQuizQuestions([]);
  }, []);

  return {
    inquiryResponse,
    quizQuestions,
    isLoading,
    error,
    submitInquiry,
    generateSelfDiagnosisQuiz,
    clearInquiryResponse,
    clearQuizQuestions,
  };
};
