export interface Hospital {
  id: string;
  name: string; // 기관명
  type: string; // 분류
  phoneExam: string; // 검진실 전화번호
  phoneMain: string; // 대표번호
  city: string; // 도시
  district: string; // 지역구
  address: string; // 상세주소
  examCount: number; // 관련 검진수
  hasGeneralExam: boolean; // 일반검진
  hasStomachCancer: boolean; // 위암검진
  hasLiverCancer: boolean; // 간암검진
  hasColonCancer: boolean; // 대장암검진
  hasBreastCancer: boolean; // 유방암검진
  zipCode: string; // 우편번호
  region: string; // 권역
  lng: number; // 위도(X) -> Actually Longitude in data usually
  lat: number; // 경도(Y) -> Actually Latitude in data usually
  distance?: number; // Calculated distance in km
}

export interface FilterState {
  searchQuery: string;
  city: string;
  district: string;
  type: string;
  minExamCount: number;
  onlyGeneralExam: boolean;
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface AIAnalysisResult {
  summary: string;
  operatingHours?: {
    text: string;      // 진료시간 정보 (형식: "평일: 시간 / 토요일: 시간 / 일요일: 휴진")
    source?: string;   // 출처 URL
  };
  aiAdoptionStatus: string; // 타 AI 솔루션 도입 여부 (Open-mindedness)
  equipmentInfo: string; // 심전도 기기 정보
  ecgSalesPoints: string[];
  // ★ 의료진 페이지 분리
  doctorListPageUrl?: string; // 의료진 전체 목록 페이지 URL (1개)
  doctorProfiles: Array<{ name: string; url?: string }>; // 개별 의료진 프로필 (이름 + 개별 프로필 URL)
  reviewSummary: {
    sentiment: 'Positive' | 'Neutral' | 'Negative' | 'Unknown';
    text: string;
  };
  recentNews: { title: string; url: string; date?: string }[]; // 뉴스 링크 포함 (날짜 추가)
  website?: string;
  additionalInsights?: string[]; // 추가 인사이트 (모든 모드 공통)
  // Research 모드 전용 (자유 서술형)
  researchContent?: {
    content: string;           // 마크다운 형식의 자유 서술 내용
    citations: string[];       // citation URLs 배열 [1], [2] 순서
  };
}

// Google Apps Script Global Object Definition
declare global {
  interface Window {
    google?: {
      script: {
        run: {
          withSuccessHandler: (callback: (data: any) => void) => {
            withFailureHandler: (callback: (error: any) => void) => {
              [key: string]: (params?: any) => void;
              getApiKey: () => void; // Perplexity API 키 가져오기
              getPerplexityApiKey: () => void; // 별도 Perplexity API 키 함수
            };
          };
        };
      };
    };
  }
}