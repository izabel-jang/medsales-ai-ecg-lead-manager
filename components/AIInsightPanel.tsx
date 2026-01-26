import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Hospital, AnalysisStatus, AIAnalysisResult } from '../types';
import { analyzeHospital, getCachedAnalysis } from '../services/aiService';
import { ExportService } from '../services/exportService';
import { Bot, ExternalLink, Loader2, RefreshCw, X, Sparkles, Newspaper, Info, Stethoscope, Cpu, MessageSquare, ThumbsUp, ThumbsDown, Minus, Download, Copy, Printer, Clock, MapPin } from 'lucide-react';

// 진행 중인 분석 추적 (중복 호출 방지) - 전역으로 관리
const pendingAnalysis: Record<string, Promise<AIAnalysisResult>> = {};

interface Props {
  hospital: Hospital;
  onClose: () => void;
}

interface AnalysisState {
  status: AnalysisStatus;
  result: AIAnalysisResult | null;
  error: string | null;
}

export const AIInsightPanel: React.FC<Props> = ({ hospital, onClose }) => {
  const [state, setState] = useState<AnalysisState>({
    status: AnalysisStatus.IDLE,
    result: null,
    error: null,
  });
  const [showExportMenu, setShowExportMenu] = useState(false);
  const isMounted = useRef(true);

  const { status, result, error } = state;
  const statusRef = useRef(status);
  const resultRef = useRef(result);

  useEffect(() => {
    statusRef.current = status;
    resultRef.current = result;
  }, [status, result]);

  // 컴포넌트 마운트/언마운트 추적
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const runAnalysis = useCallback(async (forceRefresh = false) => {
    const cacheKey = hospital.name;

    if (pendingAnalysis[cacheKey]) {
      return pendingAnalysis[cacheKey];
    }

    if (statusRef.current === AnalysisStatus.LOADING) {
      return resultRef.current;
    }

    if (!forceRefresh) {
      const cached = getCachedAnalysis(hospital.name);
      if (cached) {
        setState({ status: AnalysisStatus.SUCCESS, result: cached, error: null });
        return cached;
      }
    }

    setState({ status: AnalysisStatus.LOADING, result: null, error: null });

    const analysisPromise = (async () => {
      const data = await analyzeHospital(
        hospital.name,
        hospital.address,
        hospital.type,
        hospital.hasGeneralExam,
        forceRefresh
      );
      return data;
    })();

    pendingAnalysis[cacheKey] = analysisPromise;

    try {
      const data = await analysisPromise;
      if (isMounted.current) {
        setState({ status: AnalysisStatus.SUCCESS, result: data, error: null });
      }
      return data;
    } catch (e) {
      if (isMounted.current) {
        setState({
          status: AnalysisStatus.ERROR,
          error: e instanceof Error ? e.message : '분석에 실패했습니다.',
          result: null,
        });
      }
      throw e;
    } finally {
      delete pendingAnalysis[cacheKey];
    }
  }, [hospital.address, hospital.hasGeneralExam, hospital.name, hospital.type]);

  // 패널 열릴 때 캐시 확인 후 단일 모드 분석 실행
  useEffect(() => {
    const cached = getCachedAnalysis(hospital.name);
    if (cached) {
      setState({ status: AnalysisStatus.SUCCESS, result: cached, error: null });
      return;
    }
    runAnalysis(false);
  }, [hospital.name, hospital.address, hospital.type, hospital.hasGeneralExam, runAnalysis]);

  const handleRefresh = useCallback(() => {
    if (status === AnalysisStatus.LOADING) return;
    runAnalysis(true);
  }, [runAnalysis, status]);

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'Positive': return <ThumbsUp className="h-4 w-4 text-blue-500" />;
      case 'Negative': return <ThumbsDown className="h-4 w-4 text-rose-500" />;
      default: return <Minus className="h-4 w-4 text-slate-400" />;
    }
  };

  const getSentimentLabel = (sentiment: string) => {
    switch (sentiment) {
      case 'Positive': return '긍정적 여론';
      case 'Negative': return '부정적 여론';
      default: return '복합/중립';
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'Positive': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'Negative': return 'bg-rose-50 text-rose-700 border-rose-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  const sanitizeHomepageUrl = (url?: string | null) => {
    if (!url) return null;
    const trimmed = url.trim();
    if (!/^https?:\/\//i.test(trimmed)) return null;
    const lower = trimmed.toLowerCase();
    const banned = ['map.naver.com', 'search.naver.com', 'google.com/search', 'naver.com/v5/search'];
    if (banned.some((needle) => lower.includes(needle))) return null;
    return trimmed;
  };

  const homepageUrl = sanitizeHomepageUrl(result?.website);

  return (
    <div 
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex justify-end transition-opacity duration-300" 
      onClick={(e) => {
        onClose();
        setShowExportMenu(false);
      }}
    >
      <div 
        id="ai-insight-panel"
        className="w-full md:max-w-lg lg:max-w-xl bg-white h-full shadow-2xl overflow-y-auto animate-slide-in flex flex-col border-l border-slate-100"
        onClick={(e) => {
          e.stopPropagation();
          // 드롭다운 외부 클릭 시에만 메뉴 닫기
          const target = e.target as HTMLElement;
          if (!target.closest('[data-dropdown]')) {
            setShowExportMenu(false);
          }
        }}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 md:p-6 border-b border-slate-100 bg-white/95 sticky top-0 z-10 backdrop-blur-sm print:hidden">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-teal-50">
              <Sparkles className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">
                AI 영업 인사이트
              </h2>
              <p className="text-xs text-slate-500 font-medium">Gemini 단일 모드 분석</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {/* 새로고침 아이콘 - 결과가 있을 때만 */}
            {status === AnalysisStatus.SUCCESS && result && (
              <button
                onClick={handleRefresh}
                className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-colors"
                title="새 데이터로 다시 분석"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
            )}

            <button 
              onClick={onClose} 
              className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-5 md:p-6 flex-1 overflow-y-auto bg-white" id="ai-insight-content">
          <div className="mb-6 md:mb-8">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">{hospital.name}</h3>
                <p className="text-slate-500 text-sm mt-1.5">{hospital.address}</p>
              </div>
              {/* 우측 상단: 내보내기 메뉴 */}
              {status === AnalysisStatus.SUCCESS && result && (
                <div className="relative" data-dropdown>
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    title="내보내기"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  {showExportMenu && (
                    <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-lg border border-slate-200 z-50 overflow-hidden">
                      <button
                        onClick={() => {
                          ExportService.downloadPDFReport(hospital, result, 'standard');
                          setShowExportMenu(false);
                        }}
                        className="w-full px-3 py-2 text-left text-xs hover:bg-slate-50 flex items-center space-x-2"
                      >
                        <Printer className="h-3 w-3 text-slate-500" />
                        <span>인쇄 / PDF 저장</span>
                      </button>
                      <button
                        onClick={async () => {
                          const success = await ExportService.copyToClipboard(hospital, result);
                          if (success) alert('클립보드에 복사되었습니다!');
                          setShowExportMenu(false);
                        }}
                        className="w-full px-3 py-2 text-left text-xs hover:bg-slate-50 flex items-center space-x-2"
                      >
                        <Copy className="h-3 w-3 text-green-500" />
                        <span>텍스트 복사</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            {status === AnalysisStatus.SUCCESS && result && (
              <div className="flex flex-wrap items-stretch gap-2 mt-3 mb-3">
                {homepageUrl && (
                  <a
                    href={homepageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8 items-center text-[11px] font-bold text-teal-600 bg-teal-50 px-2.5 rounded-md hover:bg-teal-100 transition-colors"
                  >
                    홈페이지 <ExternalLink className="ml-1.5 h-3 w-3" />
                  </a>
                )}
                <a
                  href={`https://map.naver.com/v5/search/${encodeURIComponent(`${hospital.address} ${hospital.name}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-8 items-center text-[11px] font-bold text-green-600 bg-green-50 px-2.5 rounded-md hover:bg-green-100 transition-colors"
                >
                  <MapPin className="h-3 w-3 mr-1" />
                  네이버 지도 <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </div>
            )}

            {/* 오류 토스트 */}
            {status === AnalysisStatus.ERROR && error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center space-x-2 flex-1">
                  <div className="p-1 bg-red-100 rounded">
                    <Info className="h-3 w-3 text-red-500" />
                  </div>
                  <span className="text-sm text-red-700">{error}</span>
                </div>
                <button 
                  onClick={() => setState({ status: AnalysisStatus.IDLE, result: null, error: null })}
                  className="text-red-400 hover:text-red-600 ml-2"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {status === AnalysisStatus.IDLE && !result && (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="w-full max-w-md border border-slate-200 rounded-xl p-6 bg-white text-center space-y-3">
                  <Sparkles className="mx-auto h-8 w-8 text-teal-500" />
                  <h3 className="text-base font-bold text-slate-800">AI 분석을 시작합니다</h3>
                  <p className="text-xs text-slate-500">Gemini 단일 모드로 병원 정보를 수집합니다.</p>
                  <button
                    onClick={() => runAnalysis(false)}
                    className="mt-2 inline-flex items-center justify-center px-4 py-2 text-xs font-bold rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors"
                  >
                    분석 실행
                  </button>
                </div>
              </div>
            )}

            {status === AnalysisStatus.LOADING && (
              <div className="flex flex-col items-center justify-center py-24 space-y-6 opacity-80">
                <div className="relative">
                   <div className="absolute inset-0 rounded-full animate-ping opacity-75 bg-teal-100"></div>
                   <div className="relative bg-white p-3 rounded-full shadow-sm border border-teal-50">
                     <Loader2 className="h-8 w-8 text-teal-500 animate-spin" />
                   </div>
                </div>
                <div className="text-center space-y-2">
                  <p className="text-slate-800 font-bold text-lg">데이터 분석 중...</p>
                  <p className="text-sm text-slate-500 font-medium">
                    공식 홈페이지, 의료진 페이지, 뉴스/리뷰를 확인하고 있습니다.<br/>
                    정확한 정보를 위해서는 교차 검증을 권장드립니다.  
                  </p>
                </div>
              </div>
            )}

            {status === AnalysisStatus.SUCCESS && result && (
              <div className="space-y-6 md:space-y-8 animate-fade-in pb-10">
                {/* 진료시간 섹션 - 출처 포함 */}
                {result.operatingHours && (
                  <section>
                    <h4 className="flex items-center text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">
                      <Clock className="h-4 w-4 mr-2 text-teal-400" />
                      진료시간
                      {result.operatingHours.source && (
                        <a 
                          href={result.operatingHours.source} 
                          target="_blank" 
                          rel="noreferrer"
                          className="ml-auto text-[10px] font-medium text-slate-400 hover:text-slate-600 flex items-center gap-1 px-1.5 py-0.5 rounded border border-slate-200 hover:border-slate-300 transition-colors normal-case"
                        >
                          출처 <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </h4>
                    <div className="text-sm text-slate-700 leading-7 bg-slate-50 px-4 py-3 rounded-lg border border-slate-100">
                      {result.operatingHours.text}
                    </div>
                  </section>
                )}

                {/* Summary Section */}
                <section>
                  <h4 className="flex items-center text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">
                    <Info className="h-4 w-4 mr-2 text-slate-400" />
                    병원 요약
                  </h4>
                  <div className="text-sm text-slate-700 leading-7 border-l-2 border-blue-200 pl-4 py-1">
                    {result.summary}
                  </div>
                </section>

                {/* Tech & Equipment Section */}
                <section>
                  <h4 className="flex items-center text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">
                    <Cpu className="h-4 w-4 mr-2 text-indigo-400" />
                    디지털 인프라 & AI 현황
                  </h4>
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 space-y-4">
                    <div>
                      <span className="text-xs font-bold text-slate-500 block mb-1">타 AI 솔루션 도입 (Openness)</span>
                      <p className="text-sm text-slate-700 font-medium whitespace-pre-line">{result.aiAdoptionStatus}</p>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-500 block mb-1">사용 장비/시스템</span>
                      <p className="text-sm text-slate-700">{result.equipmentInfo}</p>
                    </div>
                  </div>
                </section>

                {/* Sales Points Section */}
                <section>
                  <h4 className="flex items-center text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">
                    <Bot className="h-4 w-4 mr-2 text-teal-400" />
                    영업 제안 포인트
                  </h4>
                  <div className="grid gap-3">
                    {result.ecgSalesPoints.map((point, idx) => (
                      <div key={idx} className="flex items-start p-4 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-teal-200 transition-colors">
                        <div className="min-w-[24px] h-6 flex items-center justify-center rounded-full bg-teal-100 text-teal-600 text-xs font-bold mr-3">{idx + 1}</div>
                        <span className="text-sm text-slate-700 font-medium leading-relaxed">{point}</span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Doctors & Staff - New Section */}
                {(result.doctorListPageUrl || (result.doctorProfiles && result.doctorProfiles.length > 0)) && (
                  <section>
                    <h4 className="flex items-center text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">
                      <Stethoscope className="h-4 w-4 mr-2 text-rose-400" />
                      주요 의료진
                      {result.doctorListPageUrl && (
                        <a 
                          href={result.doctorListPageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-auto text-[10px] font-medium text-slate-400 hover:text-slate-600 flex items-center gap-1 px-1.5 py-0.5 rounded border border-slate-200 hover:border-slate-300 transition-colors normal-case"
                        >
                          의료진 전체보기 <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </h4>
                    {result.doctorProfiles && result.doctorProfiles.length > 0 ? (
                      <ul className="space-y-2">
                        {result.doctorProfiles.map((doc, idx) => (
                          <li key={idx} className="flex items-center text-sm text-slate-700 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mr-2.5 flex-shrink-0"></div>
                            {doc.url ? (
                              <a 
                                href={doc.url} 
                                target="_blank" 
                                rel="noreferrer"
                                className="hover:text-indigo-600 hover:underline decoration-indigo-300 underline-offset-2 transition-colors"
                              >
                                {doc.name}
                                <ExternalLink className="inline-block ml-1 h-3 w-3 text-indigo-400" />
                              </a>
                            ) : (
                              <span>{doc.name}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                        의료진 프로필이 확인되지 않았습니다. 전체 페이지 링크를 우선 확인하세요.
                      </p>
                    )}
                  </section>
                )}

                {/* Review & Sentiment */}
                <section>
                  <h4 className="flex items-center text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">
                    <MessageSquare className="h-4 w-4 mr-2 text-violet-400" />
                    환자 여론 (네이버/구글 리뷰)
                    <span className={`ml-auto text-xs px-2.5 py-1 rounded-full font-bold border flex items-center gap-1.5 normal-case ${getSentimentColor(result.reviewSummary.sentiment)}`}>
                      {getSentimentIcon(result.reviewSummary.sentiment)}
                      {getSentimentLabel(result.reviewSummary.sentiment)}
                    </span>
                  </h4>
                  <div className="text-sm text-slate-700 leading-7 bg-slate-50 px-4 py-3 rounded-lg border border-slate-100">
                    "{result.reviewSummary.text}"
                  </div>
                </section>

                {/* News Section */}
                <section>
                  <h4 className="flex items-center text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">
                    <Newspaper className="h-4 w-4 mr-2 text-orange-400" />
                    관련 최신 뉴스
                  </h4>
                  <ul className="space-y-3">
                    {result.recentNews.length > 0 ? (
                      result.recentNews.map((news, idx) => (
                        <li key={idx} className="flex items-start gap-3 group">
                           <span className="mt-2 min-w-[6px] h-[6px] rounded-full bg-slate-300 group-hover:bg-teal-400 transition-colors flex-shrink-0"></span>
                           {news.url ? (
                             <a 
                               href={news.url} 
                               target="_blank" 
                               rel="noreferrer"
                               className="text-sm text-slate-600 hover:text-teal-600 hover:underline decoration-teal-300 underline-offset-4 leading-relaxed transition-all break-keep"
                             >
                               {news.title}
                             </a>
                           ) : (
                             <span className="text-sm text-slate-600 leading-relaxed break-keep">{news.title}</span>
                           )}
                        </li>
                      ))
                    ) : (
                      <li className="text-slate-400 italic text-sm pl-2">최근 18개월 내 확인 가능한 뉴스가 없습니다. 새로고침하거나 공식 홈페이지/포털 기사를 직접 확인하세요.</li>
                    )}
                  </ul>
                </section>

                {/* Additional Insights Section - 모든 모드 공통 */}
                {result.additionalInsights && result.additionalInsights.length > 0 ? (
                  <section>
                    <h4 className="flex items-center text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">
                      <Sparkles className="h-4 w-4 mr-2 text-amber-400" />
                      추가 인사이트 & 유의사항
                    </h4>
                    <ul className="space-y-3">
                      {result.additionalInsights.map((insight, idx) => (
                        <li key={idx} className="flex items-start gap-3 group">
                          <span className="mt-2 min-w-[6px] h-[6px] rounded-full bg-amber-400 flex-shrink-0"></span>
                          <span className="text-sm text-slate-600 leading-relaxed">{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};