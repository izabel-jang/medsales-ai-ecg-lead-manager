import { GoogleGenAI } from "@google/genai";
import { AIAnalysisResult } from "../types";

// ============================================
// Rate Limiting (429 방지)
// ============================================
const rateLimitState = {
  lastRequestTime: 0,
  requestCount: 0,
  windowStart: Date.now(),
};

const RATE_LIMIT_CONFIG = {
  minInterval: 1000, // 1초로 복원
  maxRequestsPerMinute: 15, // 적정한 수준으로
  retryDelay: 30000, // 30초로 복원
  maxRetries: 1, // 1회 재시도
};

async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  
  if (now - rateLimitState.windowStart > 60000) {
    rateLimitState.windowStart = now;
    rateLimitState.requestCount = 0;
  }
  
  if (rateLimitState.requestCount >= RATE_LIMIT_CONFIG.maxRequestsPerMinute) {
    const waitTime = 60000 - (now - rateLimitState.windowStart);
    if (waitTime > 0) {
      console.log(`[Rate Limit] ${Math.ceil(waitTime/1000)}초 대기...`);
      await sleep(waitTime);
      rateLimitState.windowStart = Date.now();
      rateLimitState.requestCount = 0;
    }
  }
  
  const timeSinceLastRequest = now - rateLimitState.lastRequestTime;
  if (timeSinceLastRequest < RATE_LIMIT_CONFIG.minInterval) {
    await sleep(RATE_LIMIT_CONFIG.minInterval - timeSinceLastRequest);
  }
  
  rateLimitState.lastRequestTime = Date.now();
  rateLimitState.requestCount++;
}

async function withRetry<T>(fn: () => Promise<T>, context: string): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= RATE_LIMIT_CONFIG.maxRetries; attempt++) {
    try {
      await waitForRateLimit();
      return await fn();
    } catch (error: any) {
      lastError = error;
      const msg = error?.message || String(error);
      
      if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
        if (attempt < RATE_LIMIT_CONFIG.maxRetries) {
          const waitTime = RATE_LIMIT_CONFIG.retryDelay * (attempt + 1);
          console.warn(`[${context}] 429 에러, ${waitTime/1000}초 후 재시도...`);
          await sleep(waitTime);
          continue;
        }
        throw new Error(`API 요청 한도 초과. 1-2분 후 재시도하세요.`);
      }
      throw error;
    }
  }
  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// 캐시 시스템
// ============================================
const CACHE_PREFIX = 'ai_analysis_';
const CACHE_EXPIRY_MS = 30 * 60 * 1000;
const storage = typeof window !== 'undefined' ? window.localStorage : null;

// 진행 중인 요청 추적 (중복 호출 방지)
const inFlightRequests = new Map<string, Promise<AIAnalysisResult>>();

// Custom Search 에러 상태 추적
const customSearchErrorState = {
  consecutiveErrors: 0,
  lastErrorTime: 0,
  isDisabled: false,
  disabledUntil: 0,
  isGloballyDisabled: true // Custom Search 비활성화 - Gemini Google Search grounding만 사용
};

const CUSTOM_SEARCH_ERROR_CONFIG = {
  maxConsecutiveErrors: 3, // 3번 연속 에러 시 비활성화
  disableDuration: 5 * 60 * 1000, // 5분간 비활성화
  errorCooldown: 30 * 1000 // 30초간 에러 발생 시 카운터 리셋
};

// Custom Search API 상태 진단 및 설정 안내
async function diagnoseCustomSearchAPI(): Promise<{ isWorking: boolean; error?: string }> {
  try {
    const keys = await getApiKeys();
    const searchApiKey = keys.VITE_GOOGLE_SEARCH_API_KEY || import.meta.env.VITE_GOOGLE_SEARCH_API_KEY;
    const engineId = keys.VITE_SEARCH_ENGINE_ID || import.meta.env.VITE_SEARCH_ENGINE_ID;
    
    console.group('[Custom Search API 진단]');
    console.log('🔑 API Key 상태:', searchApiKey ? `설정됨 (${searchApiKey.substring(0, 10)}...)` : '❌ 미설정');
    console.log('🔍 Search Engine ID:', engineId ? `설정됨 (${engineId})` : '❌ 미설정');
    
    if (!searchApiKey) {
      console.error('❌ VITE_GOOGLE_SEARCH_API_KEY가 설정되지 않음');
      console.log('📋 해결 방법:');
      console.log('1. Google Cloud Console → APIs & Services → Credentials');
      console.log('2. API Key 생성 후 Custom Search API 활성화');
      console.log('3. .env 파일에 VITE_GOOGLE_SEARCH_API_KEY=your_key 추가');
      console.groupEnd();
      return { isWorking: false, error: 'API 키 미설정' };
    }
    
    if (!engineId) {
      console.error('❌ VITE_SEARCH_ENGINE_ID가 설정되지 않음');
      console.log('📋 해결 방법:');
      console.log('1. Google Custom Search Engine 생성: https://cse.google.com/');
      console.log('2. .env 파일에 VITE_SEARCH_ENGINE_ID=your_engine_id 추가');
      console.groupEnd();
      return { isWorking: false, error: 'Search Engine ID 미설정' };
    }
    
    // 간단한 테스트 쿼리
    console.log('🧪 API 연결 테스트 중...');
    const testUrl = `https://www.googleapis.com/customsearch/v1?key=${searchApiKey}&cx=${engineId}&q=test&num=1`;
    const response = await fetch(testUrl);
    
    if (response.status === 403) {
      console.error('❌ 403 Forbidden - API 키 또는 권한 문제');
      console.log('📋 Google Cloud Console 체크리스트:');
      console.log('1. Custom Search API가 활성화되어 있는지 확인');
      console.log('2. API 키에 Custom Search API 권한이 있는지 확인');
      console.log('3. 프로젝트의 결제 계정이 활성화되어 있는지 확인');
      console.log('4. API 키 제한 설정 확인 (IP, HTTP referrer 등)');
      console.log('5. 일일 할당량이 남아있는지 확인');
      console.groupEnd();
      return { isWorking: false, error: 'API 키 문제 또는 사용 권한 없음' };
    }
    
    if (response.status === 429) {
      console.error('❌ 429 Too Many Requests - 할당량 초과');
      console.log('📋 해결 방법:');
      console.log('1. Google Cloud Console → APIs & Services → Custom Search API');
      console.log('2. Quotas 탭에서 일일 할당량 확인');
      console.log('3. 필요시 할당량 증가 요청');
      console.groupEnd();
      return { isWorking: false, error: '할당량 초과' };
    }
    
    if (!response.ok) {
      console.error(`❌ HTTP ${response.status}: ${response.statusText}`);
      console.groupEnd();
      return { isWorking: false, error: `HTTP ${response.status}` };
    }
    
    const data = await response.json();
    if (data.error) {
      console.error('❌ API 응답 에러:', data.error);
      console.groupEnd();
      return { isWorking: false, error: data.error.message };
    }
    
    console.log('✅ Custom Search API 연결 성공!');
    console.log(`📊 검색 결과: ${data.items?.length || 0}개 항목 반환`);
    console.groupEnd();
    return { isWorking: true };
    
  } catch (error: any) {
    console.error('❌ 네트워크 또는 연결 오류:', error);
    console.groupEnd();
    return { isWorking: false, error: error?.message || '네트워크 오류' };
  }
}

function getCacheKey(hospitalName: string, mode: string): string {
  return `${CACHE_PREFIX}${mode}_${hospitalName.replace(/\s+/g, '_').toLowerCase()}`;
}

// Custom Search 에러 상태 체크
function checkCustomSearchAvailability(): boolean {
  // 전역 비활성화 체크
  if (customSearchErrorState.isGloballyDisabled) {
    return false;
  }
  
  const now = Date.now();
  
  // 비활성화 시간이 지났으면 재활성화
  if (customSearchErrorState.isDisabled && now > customSearchErrorState.disabledUntil) {
    customSearchErrorState.isDisabled = false;
    customSearchErrorState.consecutiveErrors = 0;
    console.log('[Custom Search] 재활성화됨');
  }
  
  return !customSearchErrorState.isDisabled;
}

// Custom Search 에러 기록
function recordCustomSearchError(errorType: 'API_ERROR' | 'QUOTA_EXCEEDED'): void {
  const now = Date.now();
  customSearchErrorState.consecutiveErrors++;
  customSearchErrorState.lastErrorTime = now;
  
  console.warn(`[Custom Search] 에러 발생 (${customSearchErrorState.consecutiveErrors}/${CUSTOM_SEARCH_ERROR_CONFIG.maxConsecutiveErrors}): ${errorType}`);
  
  // 연속 에러 한계 도달 시 비활성화
  if (customSearchErrorState.consecutiveErrors >= CUSTOM_SEARCH_ERROR_CONFIG.maxConsecutiveErrors) {
    customSearchErrorState.isDisabled = true;
    customSearchErrorState.disabledUntil = now + CUSTOM_SEARCH_ERROR_CONFIG.disableDuration;
    console.warn(`[Custom Search] ${CUSTOM_SEARCH_ERROR_CONFIG.disableDuration/60000}분간 비활성화됨`);
  }
}

// Custom Search 성공 기록 (에러 카운터 리셋)
function recordCustomSearchSuccess(): void {
  const now = Date.now();
  // 마지막 에러로부터 충분한 시간이 지났으면 카운터 리셋
  if (now - customSearchErrorState.lastErrorTime > CUSTOM_SEARCH_ERROR_CONFIG.errorCooldown) {
    customSearchErrorState.consecutiveErrors = 0;
  }
}

export function getCachedAnalysis(hospitalName: string, mode: string = 'standard'): AIAnalysisResult | null {
  try {
    if (!storage) return null;
    const cached = storage.getItem(getCacheKey(hospitalName, mode));
    if (!cached) return null;
    
    const parsed = JSON.parse(cached);
    if (Date.now() - parsed.timestamp > CACHE_EXPIRY_MS) {
      storage.removeItem(getCacheKey(hospitalName, mode));
      return null;
    }
    
    console.log(`[Cache Hit] ${hospitalName}`);
    return parsed.data;
  } catch {
    return null;
  }
}

function setCachedAnalysis(hospitalName: string, mode: string, data: AIAnalysisResult): void {
  try {
    if (!storage) return;
    storage.setItem(getCacheKey(hospitalName, mode), JSON.stringify({ data, timestamp: Date.now(), mode }));
  } catch (e) {
    console.warn('캐시 저장 실패:', e);
  }
}

export function clearHospitalCache(hospitalName: string): void {
  if (!storage) return;
  ['standard', 'deep', 'research'].forEach(mode => storage.removeItem(getCacheKey(hospitalName, mode)));
}

export function clearAllCache(): void {
  if (!storage) return;
  const keysToRemove: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) keysToRemove.push(key);
  }
  keysToRemove.forEach(key => storage.removeItem(key));
}

// ============================================
// API 키 관리
// ============================================
interface APIKeysResponse {
  GEMINI_API_KEY?: string;
  error?: string;
  message?: string;
}

let cachedApiKeys: APIKeysResponse | null = null;

async function getApiKeys(): Promise<APIKeysResponse> {
  if (cachedApiKeys) return cachedApiKeys;

  try {
    if (typeof window !== 'undefined' && window.google?.script) {
      const result = await new Promise<APIKeysResponse>((resolve) => {
        window.google!.script.run
          .withSuccessHandler((res: any) => {
            if (typeof res === 'string') {
              try { resolve(JSON.parse(res)); } catch { resolve({ error: 'PARSE_ERROR' }); }
            } else {
              resolve(res || { error: 'INVALID_RESPONSE' });
            }
          })
          .withFailureHandler((err) => resolve({ error: 'GAS_ERROR', message: err?.message }))
          .getApiKey();
      });
      cachedApiKeys = result;
      return result;
    } else {
      cachedApiKeys = { GEMINI_API_KEY: import.meta.env.VITE_GEMINI_API_KEY };
      return cachedApiKeys;
    }
  } catch {
    return { error: 'LOAD_ERROR' };
  }
}

let aiInstance: GoogleGenAI | null = null;

async function getAI(): Promise<GoogleGenAI> {
  if (aiInstance) return aiInstance;
  const keys = await getApiKeys();
  if (!keys.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY가 설정되지 않았습니다.');
  aiInstance = new GoogleGenAI({ apiKey: keys.GEMINI_API_KEY });
  return aiInstance;
}

// ============================================
// Google Custom Search 함수 (추가 검색용)  
// ============================================
async function customSearch(query: string, hospitalName: string): Promise<string> {
  try {
    const keys = await getApiKeys();
    const searchApiKey = keys.VITE_GOOGLE_SEARCH_API_KEY || import.meta.env.VITE_GOOGLE_SEARCH_API_KEY;
    const engineId = keys.VITE_SEARCH_ENGINE_ID || import.meta.env.VITE_SEARCH_ENGINE_ID;
    
    if (!searchApiKey || !engineId) {
      console.log(`[Custom Search] API 키 미설정 (${hospitalName})`);
      return "Custom Search API 키가 설정되지 않음";
    }

    const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${searchApiKey}&cx=${engineId}&q=${encodeURIComponent(query)}&num=5`;
    
    const response = await fetch(searchUrl);
    
    if (!response.ok) {
      if (response.status === 403) {
        recordCustomSearchError('QUOTA_EXCEEDED');
        return "Custom Search API 접근 제한 (403)";
      } else if (response.status === 429) {
        recordCustomSearchError('QUOTA_EXCEEDED');
        return "Custom Search API 할당량 초과 (429)";
      }
      recordCustomSearchError('API_ERROR');
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      console.error(`[Custom Search] API 오류 (${hospitalName}):`, data.error);
      recordCustomSearchError('API_ERROR');
      return `Custom Search API 오류: ${data.error.message || data.error.code || '알 수 없는 오류'}`;
    }
    
    if (data.items && data.items.length > 0) {
      recordCustomSearchSuccess(); // 성공 기록
      console.log(`[Custom Search] 성공 (${hospitalName}): ${data.items.length}개 결과`);
      return data.items.map((item: any) => 
        `제목: ${item.title}\nURL: ${item.link}\n요약: ${item.snippet}\n`
      ).join('\n---\n');
    }
    
    console.log(`[Custom Search] 검색 결과 없음 (${hospitalName})`);
    return "검색 결과 없음";
  } catch (error: any) {
    console.error(`[Custom Search] 오류 (${hospitalName}):`, error?.message || error);
    recordCustomSearchError('API_ERROR');
    return "검색 오류 발생";
  }
}

// ============================================
// 유틸리티
// ============================================

// 병원명에서 핵심 부분만 추출 (검색 효율성 향상)
function extractCoreHospitalName(fullName: string): string {
  let core = fullName
    .replace(/의료법인\s*[^\s]*\s*/g, '') // "의료법인 성세의료재단" 제거
    .replace(/재단법인\s*[^\s]*\s*/g, '') // "재단법인 xxx" 제거
    .replace(/학교법인\s*[^\s]*\s*/g, '') // "학교법인 xxx" 제거
    .replace(/사회복지법인\s*[^\s]*\s*/g, '') // "사회복지법인 xxx" 제거
    .replace(/\(.*?\)/g, '') // 괄호 내용 제거
    .trim();
  
  console.log(`[ExtractCore] "${fullName}" → "${core}"`);
  return core || fullName; // 추출 실패 시 원본 반환
}

const cleanText = (text: string): string => {
  if (!text) return '';
  return text.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').replace(/\[\d+\]/g, '').replace(/\s+/g, ' ').trim();
};

const isValidUrl = (url: string | undefined | null, hospitalName?: string, isNewsUrl: boolean = false): boolean => {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed === '#') return false;
  if (!(trimmed.startsWith('http://') || trimmed.startsWith('https://'))) return false;
  
  // 모든 URL 허용 - Gemini Google Search grounding 결과 신뢰
  return true;
};

// ============================================
// 메인 분석 함수
// ============================================
// ...existing code (rate limit, cache, api key 부분 동일)...

// ============================================
// 시스템 프롬프트 (출력 형식 고정)
// ============================================
const SYSTEM_PROMPT = `당신은 딥카디오(DeepCardio)라는 심전도 AI 솔루션(조기예측/검진)의 영업 리서처입니다.
심전도 AI 소프트웨어를 병원에 판매하기 위한 정보를 수집합니다.

⚠️ 핵심 규칙
1. Google 검색으로 실제 정보를 찾을 것. "확인 불가"로 대충 채우지 말 것. 공식 홈페이지, 뉴스, 모두닥, 의료진 프로필 등 신뢰할 수 있는 출처에서 반드시 확인.
2. ★★★ 해당 병원 정보만 작성. 다른 병원 정보 절대 혼동 금지 ★★★
3. 의료진: 반드시 해당 병원 공식 홈페이지에서 확인 (추측/생성 금지)
4. JSON 한 번만 출력 (중복 금지)
5. ★★★ 편향 방지: 폐업/폐쇄 관련 정보가 검색되더라도 현재 운영 상태를 우선 확인하고 균형잡힌 정보 제공 ★★★
6. ★★★ 최신성: 2024-2026년 정보를 우선하고, 과거 정보는 명확히 구분 ★★★

■ 출력: 순수 JSON만 (마크다운 없이)
{
  "summary": "기본 정보 제외 (이름, 주소 등), 실제 주력 진료과 (예: 관절/정형 전문일수도 있음), 대표 정체성, 가치, 병상수, 검진센터 및 심장/순환기 관련 특징",
  "operatingHours": {
    "text": "★ 형식 엄수: '월-금 09:00~18:00 | 토 09:00~13:00 | 점심 12:30~2:00 | 일/공휴일 휴진' (요일별 시간표 한 줄 요약, 모호한 표현 금지, 방문을 위해 필요한 정보이니 정확해야함)",
    "source": "출처URL (반드시 실제 병원 공식 홈페이지 URL만 기입. Google 리다이렉트 링크나 검색 결과 페이지 금지. 예: hospital.co.kr, clinic.or.kr 등)"
  },
  "website": "★ 최우선 과제: 실제 병원 공식 홈페이지 URL 반드시 검색하여 찾기. ★★★ 정확히 해당 병원만의 공식 홈페이지만 기입 ★★★ site:*.co.kr OR site:*.or.kr OR site:*.ac.kr 검색 필수. Google 리다이렉트 링크 절대 금지. 실제 접속 가능한 병원 홈페이지만 기입. 찾지 못했으면 null",
  "aiAdoptionStatus": "해당 병원의 AI 협력 또는 도입 현황 (타병원 정보 X)",
  "equipmentInfo": "심전도기, CT, MRI 등 보유 장비 (모델 및 제조사 명시 권장)",
  "doctorListPageUrl": "★ 의료진 전체 목록 페이지 URL 1개 (예: hospital.com/doctors)",
  "doctorProfiles": [
    ★ 영업 핵심 타겟만 (병원장, 순환기내과/심장내과/내과 과장급 이상)
    {"name": "이름 (진료과) - 직책", "url": "개별 프로필 페이지 URL"}
  ],
  "reviewSummary": {"sentiment": "Positive|Neutral|Negative|Unknown", "text": "리뷰요약"},
  "ecgSalesPoints": ["[기회] 심전도AI 도입 필요성", "[전략] 접근방법", "[타이밍] 제안시점", "[리스크] 주의사항"],
  "recentNews": [{"title": "제목", "url": "기사URL (반드시 일치해야함)", "date": "YYYY-MM-DD"}], // ★ 해당 병원 이름이 제목에 포함된 직접적 관련 뉴스만
  "additionalInsights": ["해당 병원만의 인사이트 (타병원 정보 절대 금지)"]
}

**AI/디지털 도입 현황 (Fact-based)**:
- 타사 AI(DeepCardio, MedicalAI, AiTiA, ECGBuddy, ARPI, Vuno, Lunit 등) 도입 관련 기사가 검색되는가? (없으면 "정보 없음")
- PACS나 EMR 시스템, 심전도 기기 제조사의 정보가 공개되어 있는가?

★★ 진료시간 포맷 강제 ★★
operatingHours.text는 반드시 "월-금 09:00~18:00 | 토 09:00~13:00 | 일/공휴일 휴진" 형식으로 작성.
"상시 운영", "홈페이지 참고", "확인 필요" 등 모호한 표현 절대 금지.

★★ 의료진 필드 구분 ★★
- doctorListPageUrl: 의료진 전체 목록 페이지 URL (1개만)
- doctorProfiles: 개별 의료진 프로필 배열 (name: 이름/진료과/직책, url: 옵션 - 개별 프로필 페이지 URL)`;

// ============================================
// 티어별 유저 프롬프트 빌더
// ============================================
type Tier = 'clinic' | 'hospital' | 'tertiary' | 'public';

function inferTier(hospitalName: string, hospitalType?: string): Tier {
  const type = (hospitalType || '').replace(/\s+/g, '');
  
  // hospitalType 기준으로만 분류
  switch (type) {
    case '의원':
    case '내과의원':
      return 'clinic';
    case '병원':
      return 'hospital';
    case '종합병원':
      return 'tertiary';
    case '보건기관':
      return 'public';
    default:
      console.log(`[inferTier] 알 수 없는 타입: "${type}", clinic으로 분류`);
      return 'clinic';
  }
}

function buildUserPrompt(
  tier: Tier,
  hospitalName: string,
  address: string,
  hospitalType?: string,
  hasGeneralExam?: boolean
): string {
  const base = `■ 조사 대상: ${hospitalName}
■ 주소: ${address}
■ 유형: ${hospitalType || '미상'} | 일반검진: ${hasGeneralExam ? 'O' : 'X'}

`;

  const tierPrompts: Record<Tier, string> = {
    clinic: `${base}【의원 - ECG AI 영업 조사】
★ 최우선: "${hospitalName}" site:*.co.kr 검색으로 공식 홈페이지 URL 반드시 찾기
★ 내과/순환기 전문이면 ECG AI 수요 높음 → ecgSalesPoints에 반영
★ 건강검진 운영 여부 확인 → 검진센터 있으면 영업 기회
★ 뉴스: 해당 병원 이름이 제목에 정확히 포함된 뉴스만 (의료사고, 개원, 이전, 확장, 장비도입 등만 해당)
⚠️ website 필드는 절대 비워두지 말고 반드시 검색해서 찾기`,

    hospital: `${base}【병원급 - ECG AI 영업 조사】
★ "${hospitalName}" 공식 홈페이지에서 병원장 + 내과/순환기내과 의료진 확인
★ 검진센터/심장센터 운영 여부 → 핵심 영업 포인트
★ 병상수, 연간 검진 건수 등 규모 파악
★ ecgSalesPoints: 이 병원에 ECG AI를 왜, 어떻게 팔 수 있는지 구체적으로
★ AI 솔루션: "${hospitalName} AI" 검색 → 해당 병원 도입 기사만 기재 (타병원 X)
★ 뉴스: "${hospitalName}" 이름이 제목에 포함된 해당 병원 관련 뉴스만 2~4개 (확장, 장비도입, 의료진 영입, 개원행사 등)
⚠️ additionalInsights에 다른 병원 정보 절대 넣지 말 것`,

    tertiary: `${base}【종합병원 - ECG AI 영업 조사】
★ "${hospitalName}" 공식 홈페이지 → 순환기내과/심장내과 교수진 4~5명
★ 심장센터/심혈관센터 운영 여부, 심전도 검사 규모 파악
★ 스마트병원/AI 도입 현황: "${hospitalName} AI" "${hospitalName} 스마트병원" 검색
   → 해당 병원 기사만 aiAdoptionStatus에 (타병원 정보 혼동 금지)
★ ecgSalesPoints: 대형병원 대상 ECG AI 영업 전략 구체적으로
★ 뉴스: "${hospitalName}" 이름이 제목에 포함된 해당 병원 관련 뉴스만 4~6개 (증축, 센터개소, 장비도입, 의료진영입, 정책변화 등)
⚠️ 이 병원 정보만 작성. 비슷한 이름의 다른 병원 정보 절대 금지`,

    public: `${base}【보건기관 - ECG AI 영업 조사】
★ "${hospitalName}" 관할 지자체, 소장/센터장 확인
★ 조달청 입찰/지자체 예산이 구매 결정 포인트
★ 디지털헬스케어 시범사업 참여 여부 → aiAdoptionStatus
★ 뉴스: "${hospitalName}" 이름이 제목에 포함된 해당 보건기관 관련 뉴스만 (사업확대, 예산편성, 장비도입, 인사변동 등)
⚠️ 해당 보건기관 정보만 (타 기관 정보 금지)`
  };

  return tierPrompts[tier];
}

// ============================================
// 메인 분석 함수
// ============================================
export const analyzeHospital = async (
  hospitalName: string, 
  address: string,
  hospitalType?: string,
  hasGeneralExam?: boolean,
  forceRefresh: boolean = false
): Promise<AIAnalysisResult> => {
  
  // 1. 캐시 확인 (website 누락 시 강제 재분석)
  if (!forceRefresh) {
    const cached = getCachedAnalysis(hospitalName, 'standard');
    if (cached) {
      // website 필드가 없거나 undefined면 강제 재분석
      if (!cached.website) {
        console.log(`[Analyze] ${hospitalName} - 캐시에 website 없음, 강제 재분석 실행`);
        clearHospitalCache(hospitalName); // 캐시 삭제
      } else {
        return cached;
      }
    }
  }

  // 2. 진행 중인 요청 확인 (중복 호출 방지)
  const requestKey = `${hospitalName}_${address}`;
  if (inFlightRequests.has(requestKey)) {
    console.log(`[Analyze] ${hospitalName} 이미 진행 중, 기존 요청 대기...`);
    return inFlightRequests.get(requestKey)!;
  }

  // 3. 새 요청 실행
  const requestPromise = (async (): Promise<AIAnalysisResult> => {
    try {
      const ai = await getAI();
      const tier = inferTier(hospitalName, hospitalType);
      
      // 병원명에서 핵심 부분 추출 (검색 효율성 향상)
      const coreHospitalName = extractCoreHospitalName(hospitalName);
      const searchLocation = address.split(' ')[0]; // 지역명 (예: "인천")
      
      const userPrompt = `${buildUserPrompt(tier, hospitalName, address, hospitalType, hasGeneralExam)}

⚠️ **Google 검색 필수 키워드 (실제 병원 공식홈페이지 최우선, Google 리다이렉트 링크 금지):**
- "${coreHospitalName}" site:*.co.kr (사립병원 홈페이지 1순위)
- "${coreHospitalName}" site:*.or.kr (의료법인/공익법인 병원)
- "${coreHospitalName}" site:*.ac.kr (대학병원)
- "${coreHospitalName}" site:*.go.kr (공공병원/보건기관)
- "${coreHospitalName}" site:*.kr (기타 한국 도메인)
- "${coreHospitalName}" "홈페이지" OR "공식사이트" OR "병원소개"
- "${coreHospitalName}" "의료진" OR "직원소개" OR "병원장" OR "원장"
- "${coreHospitalName}" "검진센터" OR "건강검진" OR "종합검진"
- "${coreHospitalName}" "진료시간" OR "외래진료" OR "진료안내"
- "${searchLocation} ${coreHospitalName}" (지역+병원명 조합)
- "${coreHospitalName} ${searchLocation}" (병원명+지역 조합)
- "${coreHospitalName}" "채용" OR "공지사항" OR "뉴스"
- "${coreHospitalName}" "시설" OR "장비" OR "센터"
- "${coreHospitalName}" -"폐업" -"폐쇄" -"폐원" (부정적 정보 제외)
- "${coreHospitalName}" filetype:pdf (병원 안내서 등)

★★★ 반드시 현재 운영 중인 병원의 실제 공식 홈페이지 URL(예: hospital.co.kr)을 찾아서 website 필드에 기입하세요. ★★★
⚠️ vertexaisearch.cloud.google.com, grounding-api-redirect 같은 Google 리다이렉트 링크는 절대 기입하지 마세요.
⚠️ 폐업/폐쇄 관련 정보가 나와도 현재 운영 상태를 우선적으로 확인하고 정확한 정보를 제공하세요.`;
      
      console.log(`[Analyze] ${hospitalName} (${tier}) 분석 시작...`);
      
      const enhancedPrompt = userPrompt;
      const response = await withRetry(async () => {
        return await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: enhancedPrompt,
        config: {
      	systemInstruction: SYSTEM_PROMPT,
      	maxOutputTokens: 4000,
      	tools: [
             {
          	 googleSearch: {}
             }
          ],
        temperature: 0.1
       }
      });
      }, 'analyzeHospital');

    // 응답 텍스트 추출
    let text = '';
    try {
      text = response.text || '';
      if (!text && response.candidates?.[0]?.content?.parts?.[0]?.text) {
        text = response.candidates[0].content.parts[0].text;
      }
    } catch (e) {
      console.error("응답 텍스트 추출 실패:", e);
      // candidates에서 직접 추출 시도
      if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
        text = response.candidates[0].content.parts[0].text;
      }
    }

    console.log(`[Analyze] ${hospitalName} 응답 길이:`, text.length);
    console.log(`[Analyze] 응답 미리보기:`, text.substring(0, 500));

    if (!text) throw new Error("No response from AI");

    // 첫 번째 완전한 JSON 객체만 추출 (중복 응답 방지)
    function extractFirstJsonObject(str: string): string | null {
      let depth = 0;
      let start = -1;
      for (let i = 0; i < str.length; i++) {
        if (str[i] === '{') {
          if (depth === 0) start = i;
          depth++;
        } else if (str[i] === '}') {
          depth--;
          if (depth === 0 && start !== -1) {
            return str.substring(start, i + 1);
          }
        }
      }
      return null;
    }

    // JSON 파싱 (첫 번째 객체만)
    let parsed: any;
    const trimmed = text.trim();
    
    // 1차: 직접 파싱
    try {
      parsed = JSON.parse(trimmed);
    } catch (e1) {
      console.log("[Parse] 직접 파싱 실패, 첫 번째 JSON 추출 시도...");
      
      // 2차: 코드블록에서 추출
      const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        const firstJson = extractFirstJsonObject(codeBlockMatch[1]);
        if (firstJson) {
          try {
            parsed = JSON.parse(firstJson);
            console.log("[Parse] 코드블록에서 첫 번째 JSON 추출 성공");
          } catch (e2) {
            console.log("[Parse] 코드블록 파싱 실패");
          }
        }
      }
      
      // 3차: 첫 번째 JSON 객체 추출
      if (!parsed) {
        const firstJson = extractFirstJsonObject(trimmed);
        if (firstJson) {
          try {
            // trailing comma 등 수정
            const cleanJson = firstJson
              .replace(/,\s*}/g, '}')
              .replace(/,\s*]/g, ']')
              .replace(/[\x00-\x1F\x7F]/g, ' ');
            parsed = JSON.parse(cleanJson);
            console.log("[Parse] 첫 번째 JSON 객체 추출 성공");
          } catch (e3) {
            console.error("[Parse] 모든 파싱 시도 실패");
            console.error("추출된 JSON:", firstJson?.substring(0, 500));
            throw new Error("JSON 파싱 실패: " + (e3 as Error).message);
          }
        } else {
          throw new Error("JSON 형식을 찾을 수 없음");
        }
      }
    }

    if (!parsed) {
      throw new Error("파싱된 결과가 없음");
    }

    console.log("[Parse] 파싱 성공:", Object.keys(parsed));

    // 결과 정규화
    const result: AIAnalysisResult = {
      summary: cleanText(parsed.summary || `${hospitalName} 정보`),
      operatingHours: typeof parsed.operatingHours === 'object'
        ? {
            text: parsed.operatingHours.text || '확인 불가',
            source: isValidUrl(parsed.operatingHours.source, hospitalName) ? parsed.operatingHours.source : ''
          }
        : { text: cleanText(parsed.operatingHours || '확인 불가'), source: '' },
      website: isValidUrl(parsed.website, hospitalName) ? parsed.website : undefined,
      aiAdoptionStatus: cleanText(parsed.aiAdoptionStatus || '정보 없음'),
      equipmentInfo: cleanText(parsed.equipmentInfo || '정보 없음'),
      doctorProfiles: Array.isArray(parsed.doctorProfiles)
        ? parsed.doctorProfiles.map((d: any) => ({
            name: typeof d === 'string' ? cleanText(d) : cleanText(d.name || ''),
            url: typeof d === 'object' && isValidUrl(d.url, hospitalName) ? d.url : undefined
          }))
        : [],
      doctorListPageUrl: isValidUrl(parsed.doctorListPageUrl, hospitalName) ? parsed.doctorListPageUrl : undefined,
      reviewSummary: {
        sentiment: (['Positive', 'Negative', 'Neutral', 'Unknown'].includes(parsed.reviewSummary?.sentiment) 
          ? parsed.reviewSummary.sentiment 
          : 'Unknown') as 'Positive' | 'Negative' | 'Neutral' | 'Unknown',
        text: cleanText(parsed.reviewSummary?.text || '리뷰 없음')
      },
      ecgSalesPoints: Array.isArray(parsed.ecgSalesPoints) 
        ? parsed.ecgSalesPoints.map(cleanText) 
        : [],
      recentNews: Array.isArray(parsed.recentNews)
        ? parsed.recentNews
            .filter((n: any) => n && n.title)
            .map((n: any) => ({ 
              title: cleanText(n.title), 
              url: isValidUrl(n.url, hospitalName, true) ? n.url : '', // 뉴스 URL로 표시
              date: n.date || '' 
            }))
        : [],
      additionalInsights: Array.isArray(parsed.additionalInsights)
        ? parsed.additionalInsights.map(cleanText)
        : []
    };

    // 🔧 후처리: operatingHours.source에 공식 웹사이트가 있고 website가 비어있으면 복사
    if (!result.website && result.operatingHours.source && isValidUrl(result.operatingHours.source, hospitalName)) {
      const sourceUrl = result.operatingHours.source.toLowerCase();
      // 병원 공식 웹사이트로 판단되는 URL인지 확인
      const isHospitalWebsite = (
        sourceUrl.includes('.co.kr') || 
        sourceUrl.includes('.or.kr') || 
        sourceUrl.includes('.ac.kr') || 
        sourceUrl.includes('.go.kr') || 
        (sourceUrl.includes('.kr') && !sourceUrl.includes('naver.com') && !sourceUrl.includes('google.com'))
      ) && !sourceUrl.includes('blog') && !sourceUrl.includes('cafe') && !sourceUrl.includes('search');
      
      if (isHospitalWebsite) {
        result.website = result.operatingHours.source;
        console.log(`[PostProcess] ${hospitalName} - operatingHours.source를 website로 복사: ${result.website}`);
      }
    }

    setCachedAnalysis(hospitalName, 'standard', result);
    console.log(`[Analyze] ${hospitalName} 완료 (${tier})`);
    
    return result;

    } catch (error) {
      console.error("AI Analysis failed:", error);
      throw new Error("병원 분석 중 오류가 발생했습니다.");
    }
  })();

  // 진행 중 요청 등록
  inFlightRequests.set(requestKey, requestPromise);

  try {
    const result = await requestPromise;
    return result;
  } finally {
    // 완료/실패 시 진행 중 요청에서 제거
    inFlightRequests.delete(requestKey);
  }
};

// ============================================
// 좌표 조회
// ============================================
export const getCoordinatesFromAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
  try {
    const ai = await getAI();
    const response = await withRetry(async () => {
      return await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Return JSON only: {"lat": number, "lng": number} for Korean address: "${address}"`,
        config: { responseMimeType: "application/json" }
      });
    }, 'getCoordinatesFromAddress');

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (e) {
    console.error("Geocoding failed", e);
    return null;
  }
};