import React, { memo, useCallback } from 'react';
import { Hospital } from '../types';
import { MapPin, Phone, CheckCircle, XCircle, Search, Star } from 'lucide-react';

interface HospitalListProps {
  hospitals: Hospital[];
  onSelect: (hospital: Hospital) => void;
  selectedId: string | null;
}

// 개별 병원 카드 컴포넌트 (메모이제이션)
const HospitalCard = memo(({ 
  hospital, 
  isSelected, 
  onSelect 
}: { 
  hospital: Hospital; 
  isSelected: boolean; 
  onSelect: (h: Hospital) => void;
}) => {
  // Helper to determine sales priority
  const getPriority = (h: Hospital) => {
    if ((h.type.includes('내과') || h.type.includes('종합') || h.type.includes('병원')) && h.examCount >= 4) {
      return { label: '최우선 타겟', color: 'bg-rose-50 text-rose-600 border-rose-100 ring-1 ring-rose-100' };
    } else if (h.examCount >= 3) {
      return { label: '우선 타겟', color: 'bg-amber-50 text-amber-600 border-amber-100 ring-1 ring-amber-100' };
    }
    return null;
  };

  const priority = getPriority(hospital);
  const handleClick = useCallback(() => onSelect(hospital), [hospital, onSelect]);

  return (
    <div
      onClick={handleClick}
      className={`bg-white rounded-2xl p-5 md:p-6 cursor-pointer transition-all duration-200 border group active:scale-[0.99] ${
        isSelected 
          ? 'ring-2 ring-teal-500 border-teal-500 shadow-lg z-10' 
          : 'border-slate-100 hover:border-teal-300 hover:shadow-md'
      }`}
    >
      <div className="flex flex-col md:flex-row justify-between items-start mb-4 gap-2 md:gap-0">
        <div className="space-y-1 w-full md:w-auto">
          <div className="flex flex-wrap items-center gap-2 mb-2 md:mb-3">
            <span className={`px-2 py-0.5 md:px-2.5 md:py-1 rounded-lg text-[10px] md:text-[11px] font-bold uppercase tracking-wide ${
              hospital.type.includes('종합') ? 'bg-indigo-50 text-indigo-600' :
              hospital.type.includes('내과') ? 'bg-blue-50 text-blue-600' :
              'bg-slate-100 text-slate-600'
            }`}>
              {hospital.type}
            </span>
            {priority && (
              <span className={`px-2 py-0.5 md:px-2.5 md:py-1 rounded-lg text-[10px] md:text-[11px] font-bold uppercase tracking-wide flex items-center ${priority.color}`}>
                <Star className="h-3 w-3 mr-1 fill-current" />
                {priority.label}
              </span>
            )}
          </div>
          
          <h3 className="text-lg md:text-xl font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
            {hospital.name}
          </h3>
          
          <div className="flex flex-col gap-1 pt-1">
             <div className="flex items-start text-xs md:text-sm text-slate-500 font-medium">
              <MapPin className="h-3.5 w-3.5 mr-1.5 mt-0.5 text-slate-400 flex-shrink-0" />
              <span>{hospital.distance ? `${hospital.distance} km • ` : ''}{hospital.address}</span>
            </div>
            <div className="flex items-center text-xs md:text-sm text-slate-500 font-medium">
              <Phone className="h-3.5 w-3.5 mr-1.5 text-slate-400 flex-shrink-0" />
              <span>{hospital.phoneExam || hospital.phoneMain}</span>
            </div>
          </div>
        </div>

        <div className="flex md:flex-col items-center md:items-end justify-between w-full md:w-auto md:pl-4 mt-2 md:mt-0 border-t md:border-t-0 border-slate-50 pt-3 md:pt-0">
           <span className="md:hidden text-xs font-bold text-slate-400">관련 검진수</span>
           <div className="text-right">
              <div className="hidden md:block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">관련 검진수</div>
              <div className="text-2xl md:text-3xl font-extrabold text-teal-600">{hospital.examCount}</div>
           </div>
        </div>
      </div>

      <div className="pt-3 md:pt-4 border-t border-slate-50 flex flex-wrap gap-2">
        <Badge label="일반검진" active={hospital.hasGeneralExam} />
        <Badge label="위암" active={hospital.hasStomachCancer} />
        <Badge label="간암" active={hospital.hasLiverCancer} />
        <Badge label="대장암" active={hospital.hasColonCancer} />
        <Badge label="유방암" active={hospital.hasBreastCancer} />
      </div>
    </div>
  );
});

HospitalCard.displayName = 'HospitalCard';

// 메인 리스트 컴포넌트
export const HospitalList: React.FC<HospitalListProps> = memo(({ hospitals, onSelect, selectedId }) => {
  if (hospitals.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 md:p-16 text-center">
        <div className="bg-slate-50 w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
          <Search className="h-6 w-6 md:h-8 md:w-8 text-slate-400" />
        </div>
        <h3 className="text-base md:text-lg font-bold text-slate-900">검색 결과가 없습니다</h3>
        <p className="text-slate-500 mt-2 text-xs md:text-sm">필터 조건을 변경하거나 다른 지역명으로 검색해보세요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {hospitals.map((hospital) => (
        <HospitalCard 
          key={hospital.id}
          hospital={hospital}
          isSelected={selectedId === hospital.id}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
});

HospitalList.displayName = 'HospitalList';

// Badge 컴포넌트도 메모이제이션
const Badge = memo(({ label, active }: { label: string; active: boolean }) => (
  <span className={`inline-flex items-center px-2 py-1 md:px-2.5 md:py-1 rounded-lg text-[10px] md:text-xs font-semibold ${
    active ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-50 text-slate-400 border border-slate-100 opacity-60'
  }`}>
    {active ? <CheckCircle className="h-3 w-3 mr-1 md:mr-1.5" /> : <XCircle className="h-3 w-3 mr-1 md:mr-1.5 opacity-50" />}
    {label}
  </span>
));

Badge.displayName = 'Badge';