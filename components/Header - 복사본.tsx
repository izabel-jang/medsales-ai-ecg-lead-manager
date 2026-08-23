import React from 'react';
import { Activity, MapPin } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 px-4 py-6 mb-6">
      <div className="container mx-auto px-6 py-4 flex justify-between items-center max-w-7xl">
        <div className="flex items-center space-x-3">
          <div className="bg-teal-50 text-teal-600 p-2 rounded-xl border border-teal-100">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">MedSales AI</h1>
            <p className="text-xs text-slate-500 font-medium">심전도 영업 솔루션 & 잠재고객 매니저</p>
          </div>
        </div>
        <div className="flex items-center space-x-4 text-sm">
          <div className="hidden md:flex items-center space-x-1.5 text-teal-600 font-medium bg-teal-50 px-3 py-1.5 rounded-lg">
            <MapPin className="h-4 w-4" />
            <span>타겟팅 활성화</span>
          </div>
          <div className="px-3 py-1 bg-slate-100 rounded-full text-xs font-mono text-slate-500 border border-slate-200">
            v1.2.0 KOR
          </div>
        </div>
      </div>
    </header>
  );
};