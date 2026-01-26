# MedSales AI: 잠재고객 매니저

## 🎯 개요
의료기관 ECG 영업을 위한 AI 기반 잠재고객 분석 및 관리 시스템입니다.

## ✨ 주요 기능
- **9,100+ 전국 병원 데이터베이스**: 실시간 검색 및 필터링
- **GPS 기반 거리 정렬**: 현재 위치 기준 최적 영업 루트 계획
- **AI 분석 패널**: Google Gemini API를 활용한 병원별 맞춤 영업 전략
- **다양한 필터링**: 지역/유형/검진항목별 세분화된 타겟팅
- **반응형 대시보드**: 실시간 통계 및 시각화

## 🚀 기술 스택
- **Frontend**: React 19 + TypeScript + Vite
- **UI**: Tailwind CSS + Lucide Icons
- **Charts**: Recharts
- **Data**: CSV + PapaParse
- **AI**: Google Generative AI
- **Deploy**: Vercel

## 📦 로컬 개발
```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build
```

## 🌐 배포
Vercel을 통해 자동 배포됩니다.

## 🔧 환경 변수 설정
AI 분석 기능을 사용하려면 다음 환경 변수를 설정하세요:

```env
VITE_GEMINI_API_KEY=your_google_gemini_api_key
VITE_GOOGLE_SEARCH_API_KEY=your_google_search_api_key
VITE_SEARCH_ENGINE_ID=your_search_engine_id
```

## 📄 라이센스
MIT License
