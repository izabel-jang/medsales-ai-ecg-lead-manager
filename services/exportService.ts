import { AIAnalysisResult } from "../types";

// 내보내기 서비스 클래스
export class ExportService {
  
  // 결과를 HTML 형식으로 변환 (사이드패널 디자인 완벽 반영)
  static generateHTMLReport(hospital: any, result: AIAnalysisResult, analysisType: string = 'standard'): string {
    const currentDate = new Date().toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // 감성 분석 색상 및 라벨
    const getSentimentStyle = (sentiment: string) => {
      switch(sentiment) {
        case 'Positive': return { bg: '#dbeafe', color: '#1e40af', border: '#93c5fd', label: '😊 긍정적' };
        case 'Negative': return { bg: '#fee2e2', color: '#dc2626', border: '#fca5a5', label: '😞 부정적' };
        default: return { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', label: '😐 중립적' };
      }
    };
    const sentimentStyle = getSentimentStyle(result.reviewSummary?.sentiment || 'Unknown');

    return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${hospital.name} - AI 영업 인사이트 리포트</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      line-height: 1.6; 
      color: #334155; 
      background: #f8fafc;
      padding: 20px;
    }
    .container {
      max-width: 700px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      overflow: hidden;
    }
    .header { 
      background: white;
      padding: 24px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .icon-bg {
      padding: 10px;
      background: #f0fdfa;
      border-radius: 12px;
    }
    .icon-bg svg { width: 20px; height: 20px; color: #0d9488; }
    .header-title { font-size: 18px; font-weight: 700; color: #1e293b; }
    .header-subtitle { font-size: 12px; color: #64748b; font-weight: 500; }
    .badge {
      background: #0d9488;
      color: white;
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .content { padding: 24px; }
    
    /* Hospital Info */
    .hospital-info { margin-bottom: 32px; }
    .hospital-name { font-size: 24px; font-weight: 700; color: #1e293b; margin-bottom: 6px; }
    .hospital-address { color: #64748b; font-size: 14px; margin-bottom: 12px; }
    .hospital-links { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
    .link-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 700;
      text-decoration: none;
    }
    .link-btn.teal { background: #f0fdfa; color: #0d9488; }
    .link-btn.green { background: #f0fdf4; color: #16a34a; }
    .hospital-meta {
      background: #f8fafc;
      padding: 16px;
      border-radius: 10px;
      border-left: 4px solid #0d9488;
      font-size: 14px;
      color: #475569;
    }
    .hospital-meta strong { color: #1e293b; }

    /* Sections */
    .section { margin-bottom: 28px; }
    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 13px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .section-header svg { width: 16px; height: 16px; margin-right: 8px; }
    .section-header-left { display: flex; align-items: center; }
    .source-link {
      font-size: 10px;
      font-weight: 500;
      color: #94a3b8;
      text-decoration: none;
      padding: 4px 8px;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      text-transform: none;
    }
    .source-link:hover { color: #64748b; border-color: #cbd5e1; }

    /* Operating Hours */
    .hours-box {
      background: #f8fafc;
      padding: 14px 18px;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
      font-size: 14px;
      color: #374151;
    }

    /* Summary */
    .summary-box {
      border-left: 3px solid #bfdbfe;
      padding: 12px 18px;
      font-size: 14px;
      color: #374151;
      line-height: 1.8;
    }

    /* Tech Section */
    .tech-box {
      background: #f8fafc;
      border-radius: 12px;
      padding: 18px;
      border: 1px solid #e2e8f0;
    }
    .tech-item { margin-bottom: 14px; }
    .tech-item:last-child { margin-bottom: 0; }
    .tech-label { font-size: 11px; font-weight: 700; color: #64748b; margin-bottom: 4px; text-transform: uppercase; }
    .tech-value { font-size: 14px; color: #374151; white-space: pre-line; }

    /* Sales Points */
    .sales-grid { display: flex; flex-direction: column; gap: 12px; }
    .sales-item {
      display: flex;
      align-items: flex-start;
      padding: 16px;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
    }
    .sales-item:hover { border-color: #99f6e4; }
    .sales-num {
      min-width: 26px;
      height: 26px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #ccfbf1;
      color: #0d9488;
      border-radius: 50%;
      font-size: 12px;
      font-weight: 700;
      margin-right: 14px;
      flex-shrink: 0;
    }
    .sales-text { font-size: 14px; color: #374151; line-height: 1.6; }

    /* Doctors */
    .doctor-list { display: flex; flex-direction: column; gap: 8px; }
    .doctor-item {
      display: flex;
      align-items: center;
      padding: 12px 14px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      font-size: 14px;
      color: #374151;
    }
    .doctor-bullet {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #818cf8;
      margin-right: 12px;
      flex-shrink: 0;
    }
    .doctor-item a { color: #4f46e5; text-decoration: none; }
    .doctor-item a:hover { text-decoration: underline; }

    /* Review */
    .review-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
    .sentiment-badge {
      font-size: 11px;
      padding: 6px 12px;
      border-radius: 20px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .review-text {
      background: #f8fafc;
      padding: 16px 18px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      font-size: 14px;
      color: #475569;
      line-height: 1.7;
      font-style: italic;
    }

    /* News */
    .news-list { display: flex; flex-direction: column; gap: 12px; }
    .news-item { display: flex; align-items: flex-start; gap: 12px; }
    .news-bullet {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #cbd5e1;
      margin-top: 8px;
      flex-shrink: 0;
    }
    .news-link {
      font-size: 14px;
      color: #475569;
      text-decoration: none;
      line-height: 1.6;
    }
    .news-link:hover { color: #0d9488; text-decoration: underline; }
    .news-empty { color: #94a3b8; font-style: italic; font-size: 14px; padding-left: 8px; }

    /* Insights */
    .insight-list { display: flex; flex-direction: column; gap: 12px; }
    .insight-item { display: flex; align-items: flex-start; gap: 12px; }
    .insight-bullet {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #fbbf24;
      margin-top: 8px;
      flex-shrink: 0;
    }
    .insight-text { font-size: 14px; color: #475569; line-height: 1.6; }

    /* Footer */
    .footer {
      text-align: center;
      margin-top: 32px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      color: #94a3b8;
      font-size: 12px;
    }
    .footer em { display: block; margin-top: 8px; }

    @media print {
      body { background: white; padding: 0; }
      .container { box-shadow: none; border-radius: 0; }
    }
    @page { margin: 0.75in; }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="header-left">
        <div class="icon-bg">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path>
          </svg>
        </div>
        <div>
          <div class="header-title">AI 영업 인사이트</div>
          <div class="header-subtitle">Gemini 단일 모드 분석</div>
        </div>
      </div>
      <div class="badge">STANDARD</div>
    </div>

    <!-- Content -->
    <div class="content">
      <!-- Hospital Info -->
      <div class="hospital-info">
        <h2 class="hospital-name">${hospital.name}</h2>
        <p class="hospital-address">${hospital.address}</p>
        <div class="hospital-links">
          ${result.website ? `<a href="${result.website}" class="link-btn teal" target="_blank">🔗 홈페이지</a>` : ''}
          <a href="https://map.naver.com/v5/search/${encodeURIComponent(`${hospital.address} ${hospital.name}`)}" class="link-btn green" target="_blank">📍 네이버 지도</a>
        </div>
        <div class="hospital-meta">
          <strong>🏥 병원 기본 정보</strong><br>
          <strong>연락처:</strong> ${hospital.phoneMain || '-'} | 
          <strong>분류:</strong> ${hospital.type || '-'} | 
          <strong>검진 종류:</strong> ${hospital.examCount?.toLocaleString() || '-'}건
        </div>
      </div>

      <!-- 진료시간 -->
      ${result.operatingHours?.text ? `
      <div class="section">
        <div class="section-header">
          <div class="section-header-left">
            <svg fill="none" stroke="#2dd4bf" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            진료시간
          </div>
          ${result.operatingHours.source ? `<a href="${result.operatingHours.source}" class="source-link" target="_blank">출처 →</a>` : ''}
        </div>
        <div class="hours-box">${result.operatingHours.text}</div>
      </div>
      ` : ''}

      <!-- 병원 요약 -->
      <div class="section">
        <div class="section-header">
          <div class="section-header-left">
            <svg fill="none" stroke="#94a3b8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            병원 요약
          </div>
        </div>
        <div class="summary-box">${result.summary}</div>
      </div>

      <!-- 디지털 인프라 & AI 현황 -->
      <div class="section">
        <div class="section-header">
          <div class="section-header-left">
            <svg fill="none" stroke="#818cf8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
            디지털 인프라 & AI 현황
          </div>
        </div>
        <div class="tech-box">
          <div class="tech-item">
            <div class="tech-label">타 AI 솔루션 도입 (Openness)</div>
            <div class="tech-value">${result.aiAdoptionStatus || '확인되지 않음'}</div>
          </div>
          <div class="tech-item">
            <div class="tech-label">사용 장비/시스템</div>
            <div class="tech-value">${result.equipmentInfo || '확인되지 않음'}</div>
          </div>
        </div>
      </div>

      <!-- 영업 제안 포인트 -->
      ${result.ecgSalesPoints?.length ? `
      <div class="section">
        <div class="section-header">
          <div class="section-header-left">
            <svg fill="none" stroke="#2dd4bf" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>
            영업 제안 포인트
          </div>
        </div>
        <div class="sales-grid">
          ${result.ecgSalesPoints.map((point, idx) => `
          <div class="sales-item">
            <div class="sales-num">${idx + 1}</div>
            <div class="sales-text">${point}</div>
          </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      <!-- 주요 의료진 -->
      ${(result.doctorListPageUrl || result.doctorProfiles?.length) ? `
      <div class="section">
        <div class="section-header">
          <div class="section-header-left">
            <svg fill="none" stroke="#fb7185" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
            주요 의료진
          </div>
          ${result.doctorListPageUrl ? `<a href="${result.doctorListPageUrl}" class="source-link" target="_blank">의료진 전체보기 →</a>` : ''}
        </div>
        ${result.doctorProfiles?.length ? `
        <div class="doctor-list">
          ${result.doctorProfiles.map(doc => `
          <div class="doctor-item">
            <div class="doctor-bullet"></div>
            ${doc.url ? `<a href="${doc.url}" target="_blank">${doc.name}</a>` : `<span>${doc.name}</span>`}
          </div>
          `).join('')}
        </div>
        ` : '<p style="color: #94a3b8; font-size: 14px;">의료진 프로필이 확인되지 않았습니다.</p>'}
      </div>
      ` : ''}

      <!-- 환자 여론 -->
      ${result.reviewSummary ? `
      <div class="section">
        <div class="review-header">
          <div class="section-header" style="margin-bottom: 0;">
            <div class="section-header-left">
              <svg fill="none" stroke="#a78bfa" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path></svg>
              환자 여론 (네이버/구글 리뷰)
            </div>
          </div>
          <div class="sentiment-badge" style="background: ${sentimentStyle.bg}; color: ${sentimentStyle.color}; border: 1px solid ${sentimentStyle.border};">
            ${sentimentStyle.label}
          </div>
        </div>
        <div class="review-text">"${result.reviewSummary.text}"</div>
      </div>
      ` : ''}

      <!-- 관련 최신 뉴스 -->
      <div class="section">
        <div class="section-header">
          <div class="section-header-left">
            <svg fill="none" stroke="#fb923c" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path></svg>
            관련 최신 뉴스
          </div>
        </div>
        ${result.recentNews?.length ? `
        <div class="news-list">
          ${result.recentNews.map(news => `
          <div class="news-item">
            <div class="news-bullet"></div>
            ${news.url ? `<a href="${news.url}" class="news-link" target="_blank">${news.title}${news.date ? ` (${news.date})` : ''}</a>` : `<span class="news-link">${news.title}</span>`}
          </div>
          `).join('')}
        </div>
        ` : '<p class="news-empty">최근 18개월 내 확인 가능한 뉴스가 없습니다.</p>'}
      </div>

      <!-- 추가 인사이트 -->
      ${result.additionalInsights?.length ? `
      <div class="section">
        <div class="section-header">
          <div class="section-header-left">
            <svg fill="none" stroke="#fbbf24" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>
            추가 인사이트 & 유의사항
          </div>
        </div>
        <div class="insight-list">
          ${result.additionalInsights.map(insight => `
          <div class="insight-item">
            <div class="insight-bullet"></div>
            <span class="insight-text">${insight}</span>
          </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      <!-- Footer -->
      <div class="footer">
        <strong>리포트 생성일:</strong> ${currentDate}
        <em>본 분석은 AI 시스템(DeepCardio)에 의해 생성된 참고용 자료입니다.</em>
      </div>
    </div>
  </div>
</body>
</html>
`;
  }
// (REMOVE ALL THE ABOVE LINES!)
// The above block is a duplicate CSS/HTML block that was pasted outside of a string literal.
// It should be removed entirely. All HTML/CSS must be inside a string (template literal) in TypeScript.
// Your file should only contain valid TypeScript code and string literals for HTML/CSS.

  // 클립보드 복사용 텍스트 포맷
  static generatePlainText(hospital: any, result: AIAnalysisResult): string {
    return `
📊 ${hospital.name} - AI 영업 인사이트 리포트

🏥 병원 정보
• 주소: ${hospital.address}
• 분류: ${hospital.type}
• 검진 건수: ${hospital.examCount?.toLocaleString() || '-'}건
• 대표번호: ${hospital.phoneMain || '-'}
${result.website ? `• 홈페이지: ${result.website}` : ''}
${result.operatingHours?.text ? `• 진료시간: ${result.operatingHours.text}${result.operatingHours.source ? ` (출처: ${result.operatingHours.source})` : ''}` : ''}

📝 요약
${result.summary}

💻 디지털 인프라 & AI 현황
${result.aiAdoptionStatus ? `• AI 도입 현황: ${result.aiAdoptionStatus}` : '• AI 도입 현황: 확인되지 않음'}
${result.equipmentInfo ? `• 장비 정보: ${result.equipmentInfo}` : ''}

${result.ecgSalesPoints?.length ? `
🎯 영업 기회
${result.ecgSalesPoints.map((point, i) => `${i+1}. ${point}`).join('\n')}
` : ''}

${result.doctorProfiles?.length || result.doctorListPageUrl ? `
👨‍⚕️ 주요 의료진
${result.doctorListPageUrl ? `• 의료진 목록: ${result.doctorListPageUrl}` : ''}
${result.doctorProfiles?.length ? result.doctorProfiles.map(doc => {
  const name = typeof doc === 'string' ? doc : doc.name;
  const url = typeof doc === 'string' ? null : doc.url;
  return `• ${name}${url ? ` (${url})` : ''}`;
}).join('\n') : ''}
` : ''}

${result.reviewSummary ? `
📊 평판 분석: ${result.reviewSummary.sentiment === 'Positive' ? '긍정적' : result.reviewSummary.sentiment === 'Negative' ? '부정적' : '중립적'}
${result.reviewSummary.text}
` : ''}

${result.recentNews?.length ? `
📰 관련 뉴스
${result.recentNews.map(news => `• ${news.title}${news.date ? ` (${news.date})` : ''}${news.url ? `\n  ${news.url}` : ''}`).join('\n')}
` : ''}

${result.additionalInsights?.length ? `
💡 추가 인사이트
${result.additionalInsights.map((insight, i) => `${i+1}. ${insight}`).join('\n')}
` : ''}

---
생성일시: ${new Date().toLocaleString('ko-KR')}
AI Medical Sales Intelligence System (DeepCardio)
`;
  }

  // PDF로 다운로드
  static downloadPDFReport(hospital: any, result: AIAnalysisResult, analysisType: string = 'standard') {
    const html = this.generateHTMLReport(hospital, result, analysisType);
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      
      // document.write 후 바로 print 호출
      setTimeout(() => {
        printWindow.print();
      }, 100);
    }
  }
  // 클립보드에 복사
  static async copyToClipboard(hospital: any, result: AIAnalysisResult): Promise<boolean> {
    try {
      const text = this.generatePlainText(hospital, result);
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('클립보드 복사 실패:', error);
      return false;
    }
  }

  // 인쇄 - 패널 그대로 + 병원 기본정보만 추가
  static printReport(hospital: any, result: AIAnalysisResult, analysisType: string = 'standard') {
    const panelContent = document.getElementById('ai-insight-content');
    if (!panelContent) {
      alert('인쇄할 콘텐츠를 찾을 수 없습니다.');
      return;
    }

    // 현재 페이지 스타일 전부 복사
    const styles = Array.from(document.styleSheets).map(sheet => {
      try {
        return Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n');
      } catch (e) {
        return sheet.href ? `@import url("${sheet.href}");` : '';
      }
    }).join('\n');

    const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>${hospital.name} - AI 인사이트</title>
  <style>
    ${styles}
    @media print { 
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    body { background: white; padding: 20px; margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .hospital-basic-info {
      background: #f8fafc;
      border-left: 4px solid #0d9488;
      padding: 12px 16px;
      margin-bottom: 20px;
      border-radius: 0 8px 8px 0;
      font-size: 13px;
      color: #334155;
    }
    .hospital-basic-info strong { color: #0f172a; }
    .print-footer {
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div style="max-width: 700px; margin: 0 auto;">
    <div class="hospital-basic-info">
      <strong>${hospital.name}</strong> &nbsp;|&nbsp; 
      ${hospital.type || '-'} &nbsp;|&nbsp; 
      📞 ${hospital.phoneMain || '-'} &nbsp;|&nbsp; 
      📍 ${hospital.address || '-'}
    </div>
    ${panelContent.innerHTML}
    <div class="print-footer">
      ${new Date().toLocaleDateString('ko-KR')} 생성 · DeepCardio AI
    </div>
  </div>
</body>
</html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      
      // 문서 로드 완료 후 인쇄 대화상자 자동 실행
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
      };
    }
  }
}