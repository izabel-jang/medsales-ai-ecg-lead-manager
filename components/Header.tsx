import React from 'react';
import { Activity, MapPin } from 'lucide-react';

interface HeaderProps {
  language: 'ko' | 'en';
  setLanguage: (language: 'ko' | 'en') => void;
}

export const Header: React.FC<HeaderProps> = ({
  language,
  setLanguage,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 px-4 py-6 mb-6">
      <div className="container mx-auto px-6 py-4 flex justify-between items-center max-w-7xl">
        
        {/* Logo & Title */}
        <div className="flex items-center space-x-3">
          <div className="bg-teal-50 text-teal-600 p-2 rounded-xl border border-teal-100">
            <Activity className="h-6 w-6" />
          </div>

          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              MedSales AI
            </h1>

            <p className="text-xs text-slate-500 font-medium">
              {language === 'ko'
                ? '심전도 영업 솔루션 & 잠재고객 매니저'
                : 'ECG Sales Intelligence & Prospect Manager'}
            </p>
          </div>
        </div>

        {/* Right Menu */}
        <div className="flex items-center space-x-4 text-sm">
          
          <div className="hidden md:flex items-center space-x-1.5 text-teal-600 font-medium bg-teal-50 px-3 py-1.5 rounded-lg">
            <MapPin className="h-4 w-4" />

            <span>
              {language === 'ko'
                ? '타겟팅 활성화'
                : 'Targeting Active'}
            </span>
          </div>

          {/* Language Switch */}
          <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
            <button
              onClick={() => setLanguage('ko')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                language === 'ko'
                  ? 'bg-white text-teal-600 shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              KR
            </button>

            <button
              onClick={() => setLanguage('en')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                language === 'en'
                  ? 'bg-white text-teal-600 shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              EN
            </button>
          </div>

          <div className="px-3 py-1 bg-slate-100 rounded-full text-xs font-mono text-slate-500 border border-slate-200">
            v1.2.0 {language === 'ko' ? 'KOR' : 'ENG'}
          </div>

        </div>
      </div>
    </header>
  );
};