import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { HospitalList } from './components/HospitalList';
import { AIInsightPanel } from './components/AIInsightPanel';
import { calculateDistance } from './utils';
import { getCoordinatesFromAddress } from './services/aiService';
import { fetchHospitalData } from './services/sheetService';
import { Hospital, FilterState } from './types';
import { Filter, Search, SortAsc, Navigation, Crosshair, Loader2, ChevronDown, MapPin, Database } from 'lucide-react';

const App: React.FC = () => {
  // State
  const [data, setData] = useState<Hospital[]>([]);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(''); // 디바운스된 검색어
  const locationUpdated = useRef(false); // 위치 업데이트 중복 방지
  const [isLoading, setIsLoading] = useState(true);
  const [referenceLocation, setReferenceLocation] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [customAddress, setCustomAddress] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [addressSearchError, setAddressSearchError] = useState('');
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    city: '',
    district: '',
    type: '',
    minExamCount: 0,
    onlyGeneralExam: false
  });

  // Load Data on Mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const hospitals = await fetchHospitalData();
        setData(hospitals);
      } catch (error) {
        console.error("Failed to load hospital data", error);
        alert("데이터를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // GPS Handler
  const handleUseGPS = () => {
    if (navigator.geolocation) {
      setIsGpsLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setReferenceLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            label: '현재 위치 (GPS)'
          });
          setIsGpsLoading(false);
        },
        (error) => {
          setIsGpsLoading(false);
          alert("위치 정보 접근이 차단되었습니다. GPS를 허용하거나 주소를 직접 입력해주세요.");
        }
      );
    }
  };

  // Custom Address Handler
  const handleCustomAddress = async () => {
    if (!customAddress) return;
    setIsGeocoding(true);
    setAddressSearchError('');
    
    const coords = await getCoordinatesFromAddress(customAddress);
    setIsGeocoding(false);
    
    if (coords) {
      setReferenceLocation({
        lat: coords.lat,
        lng: coords.lng,
        label: `주소: ${customAddress}`
      });
      setAddressSearchError('');
    } else {
      setAddressSearchError('주소를 찾을 수 없습니다');
      // 라벨은 업데이트하지 않아서 기존 위치 유지
    }
  };

  // Update distances when location changes (무한루프 방지)
  useEffect(() => {
    if (referenceLocation && data.length > 0 && !locationUpdated.current) {
      locationUpdated.current = true;
      const updatedData = data.map(hospital => {
        // 좌표 유효성 검증
        if (!hospital.lat || !hospital.lng || hospital.lat === 0 || hospital.lng === 0) {
          console.warn(`Invalid coordinates for hospital: ${hospital.name} (${hospital.lat}, ${hospital.lng})`);
        }
        return {
          ...hospital,
          distance: calculateDistance(referenceLocation.lat, referenceLocation.lng, hospital.lat, hospital.lng)
        };
      });
      setData(updatedData);
      // 다음 위치 변경을 위해 ref 리셋
      setTimeout(() => { locationUpdated.current = false; }, 100);
    }
  }, [referenceLocation]); // data.length 의존성 제거 - 무한루프 방지

  // 검색어 디바운스 (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(filters.searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [filters.searchQuery]);

  // Derived filtered data (디바운스된 검색어 사용)
  const filteredData = useMemo(() => {
    let result = [...data];

    // Search (디바운스된 검색어 사용 - 타이핑마다 재계산 방지)
    if (debouncedSearchQuery) {
      const q = debouncedSearchQuery.toLowerCase();
      result = result.filter(h => 
        h.name.toLowerCase().includes(q) || 
        h.address.toLowerCase().includes(q)
      );
    }

    // Filters
    if (filters.city) result = result.filter(h => h.city === filters.city);
    if (filters.district) result = result.filter(h => h.district === filters.district);
    if (filters.type) result = result.filter(h => h.type === filters.type);
    if (filters.minExamCount > 0) result = result.filter(h => h.examCount >= filters.minExamCount);
    if (filters.onlyGeneralExam) result = result.filter(h => h.hasGeneralExam);

    // Sort by distance if available, otherwise by Priority Score (simulated)
    if (referenceLocation) {
      result.sort((a, b) => {
        const distanceA = a.distance ?? 999999;
        const distanceB = b.distance ?? 999999;
        return distanceA - distanceB;
      });
    } else {
       // Default Sort: Priority (High Exam Count + Type)
       result.sort((a, b) => b.examCount - a.examCount);
    }

    return result;
  }, [data, debouncedSearchQuery, filters.city, filters.district, filters.type, filters.minExamCount, filters.onlyGeneralExam, referenceLocation]);

  // Extract unique options (로컬 DB에서 가져오기)
  const [cities, setCities] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);

  // Load filter options
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const { getCities, getDistricts, getHospitalTypes } = await import('./services/sheetService');
        const [citiesData, districtsData, typesData] = await Promise.all([
          getCities(),
          getDistricts(filters.city || undefined),
          getHospitalTypes()
        ]);
        setCities(citiesData);
        setDistricts(districtsData);
        setTypes(typesData);
      } catch (error) {
        console.error('Error loading filter options:', error);
        // Fallback to computed values
        setCities(Array.from(new Set(data.map(h => h.city))).sort());
        setDistricts(Array.from(new Set(data.filter(h => !filters.city || h.city === filters.city).map(h => h.district))).sort());
        setTypes(Array.from(new Set(data.map(h => h.type))).sort());
      }
    };

    if (data.length > 0) {
      loadFilterOptions();
    }
  }, [data, filters.city]);

  // Update districts when city changes
  useEffect(() => {
    const updateDistricts = async () => {
      try {
        const { getDistricts } = await import('./services/sheetService');
        const districtsData = await getDistricts(filters.city || undefined);
        setDistricts(districtsData);
      } catch (error) {
        console.error('Error updating districts:', error);
        setDistricts(Array.from(new Set(data.filter(h => !filters.city || h.city === filters.city).map(h => h.district))).sort());
      }
    };

    updateDistricts();
  }, [filters.city, data]);

  // 병원 선택 핸들러 메모이제이션
  const handleSelectHospital = useCallback((hospital: Hospital) => {
    setSelectedHospital(hospital);
  }, []);

  // 패널 닫기 핸들러 메모이제이션
  const handleClosePanel = useCallback(() => {
    setSelectedHospital(null);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 text-teal-600 animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">데이터베이스 연동 중...</p>
        <p className="text-slate-400 text-sm">초기 로딩에 10초 정도 걸릴 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 selection:bg-teal-100">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        
        {/* Location & Navigation Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center space-x-3 text-slate-600 w-full md:w-auto bg-slate-50 px-4 py-3 rounded-xl border border-slate-100">
              <Navigation className="h-5 w-5 text-teal-500" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">거리순 정렬 기준점</span>
                <span className="text-sm font-bold truncate max-w-[200px] text-slate-800">
                  {referenceLocation ? referenceLocation.label : '없음 (자동 우선순위 정렬)'}
                </span>
              </div>
            </div>

            <div className="flex w-full md:w-auto items-center gap-3">
              <button 
                onClick={handleUseGPS}
                disabled={isGpsLoading}
                className={`flex items-center justify-center px-5 py-3 border rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95 ${
                  referenceLocation && referenceLocation.label.includes('GPS')
                    ? 'bg-teal-50 text-teal-700 border-teal-200 ring-2 ring-teal-50'
                    : 'bg-white border-slate-200 hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50 text-slate-600'
                } ${
                  isGpsLoading ? 'cursor-not-allowed opacity-70' : ''
                }`}
              >
                {isGpsLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    위치 확인 중
                  </>
                ) : (
                  <>
                    <Crosshair className="h-4 w-4 mr-2" />
                    현재 위치(GPS)
                  </>
                )}
              </button>
              
              <div className="flex flex-1 md:w-96 relative group">
                <input 
                  type="text" 
                  placeholder="타겟주소 입력 (AI 기반 시설물 좌표 검색, 예: 분당구청)"
                  className={`w-full pl-4 pr-12 py-3 bg-white border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all shadow-sm group-hover:border-slate-300 ${
                    addressSearchError ? 'border-red-300 bg-red-50' : 'border-slate-200'
                  }`}
                  value={customAddress}
                  onChange={(e) => {
                    setCustomAddress(e.target.value);
                    setAddressSearchError(''); // 입력 시 에러 메시지 제거
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleCustomAddress()}
                />
                <button 
                  onClick={handleCustomAddress}
                  disabled={isGeocoding}
                  className="absolute right-2 top-2 p-1.5 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:bg-teal-300 transition-colors shadow-sm"
                >
                  {isGeocoding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </button>
                {addressSearchError && (
                  <div className="absolute top-full left-0 right-0 mt-1 px-3 py-1 bg-red-50 border border-red-200 rounded-md z-10">
                    <span className="text-xs text-red-600">😕 {addressSearchError} - 더 정확한 시설물명을 입력해주세요</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-4">
               <Dashboard data={filteredData} />
               
               {/* Filters Section */}
               <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-8">
                 <div className="flex flex-col lg:flex-row gap-4">
                   <div className="flex-1 relative group">
                     <Search className="absolute left-3.5 top-3 h-5 w-5 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
                     <input
                       type="text"
                       placeholder="병원명 검색..."
                       className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all hover:border-slate-300"
                       value={filters.searchQuery}
                       onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                     />
                   </div>
                   
                   <div className="flex gap-3 overflow-x-auto pb-2 lg:pb-0 items-center no-scrollbar">
                     {/* Styled Select Dropdowns */}
                     {[
                       { value: filters.city, onChange: (v: string) => setFilters(p => ({ ...p, city: v })), options: cities, placeholder: "전체 도시" },
                       { value: filters.district, onChange: (v: string) => setFilters(p => ({ ...p, district: v })), options: districts, placeholder: "전체 지역구" },
                       { value: filters.type, onChange: (v: string) => setFilters(p => ({ ...p, type: v })), options: types, placeholder: "전체 병원 유형" },
                     ].map((dropdown, idx) => (
                       <div key={idx} className="relative min-w-[150px]">
                         <select 
                           className="w-full appearance-none pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500 hover:border-slate-300 transition-all cursor-pointer shadow-sm"
                           value={dropdown.value}
                           onChange={(e) => dropdown.onChange(e.target.value)}
                         >
                           <option value="">{dropdown.placeholder}</option>
                           {dropdown.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                         </select>
                         <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                       </div>
                     ))}

                     <button 
                       className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center whitespace-nowrap shadow-sm ${
                         filters.onlyGeneralExam 
                           ? 'bg-teal-50 text-teal-700 border border-teal-200 ring-2 ring-teal-50' 
                           : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                       }`}
                       onClick={() => setFilters(prev => ({ ...prev, onlyGeneralExam: !prev.onlyGeneralExam }))}
                     >
                       <Filter className={`h-4 w-4 mr-2 ${filters.onlyGeneralExam ? 'fill-current' : ''}`} />
                       일반검진 기관만
                     </button>
                   </div>
                 </div>
                 <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center">
                       <SortAsc className="h-3.5 w-3.5 mr-1.5" />
                       {referenceLocation 
                       ? <span className="font-medium text-slate-600"><span className="text-teal-600 font-bold">{referenceLocation.label}</span> 기준 거리순 정렬됨</span> 
                       : <span><span className="font-bold text-rose-500">영업 중요도(Prospect Score)</span> 기준 자동 정렬됨</span>}
                    </div>
                    <div className="flex items-center space-x-2">
                       <Database className="h-3 w-3" />
                       <span>Source: {typeof window.google !== 'undefined' && window.google.script ? 'Google Sheets (Live)' : 'Local CSV (Demo)'}</span>
                       <span className="mx-1">•</span>
                       <span>총 <span className="font-bold text-slate-700">{filteredData.length}</span>개의 잠재고객 발견</span>
                    </div>
                 </div>
               </div>
               
               <HospitalList 
                  hospitals={filteredData} 
                  selectedId={selectedHospital?.id || null} 
                  onSelect={handleSelectHospital} 
               />
            </div>
        </div>
      </main>

      {/* AI Panel Modal */}
      {selectedHospital && (
        <AIInsightPanel 
          hospital={selectedHospital} 
          onClose={handleClosePanel} 
        />
      )}
    </div>
  );
};

export default App;