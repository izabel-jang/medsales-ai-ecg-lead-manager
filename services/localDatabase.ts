import Papa from 'papaparse';
import { Hospital } from '../types';

interface CSVRow {
  '기관명': string;
  '분류': string;
  '검진실 전화번호': string;
  '대표번호': string;
  '도시': string;
  '지역구': string;
  '상세주소': string;
  '관련 검진수': string;
  '일반검진': string;
  '위암검진': string;
  '간암검진': string;
  '대장암검진': string;
  '유방암검진': string;
  '우편번호': string;
  '권역': string;
  '위도(X)': string;
  '경도(Y)': string;
  '정렬용_지역키': string;
}

class LocalDatabase {
  private hospitals: Hospital[] = [];
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      console.log('Loading hospitals from CSV...');
      const response = await fetch('/hospitals.csv');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
      }
      
      const csvText = await response.text();
      console.log(`CSV loaded, size: ${csvText.length} characters`);
      
      const parseResult = Papa.parse<CSVRow>(csvText, {
        header: true,
        skipEmptyLines: true,
        encoding: 'UTF-8',
        transform: (value: string) => value?.trim() || ''
      });

      if (parseResult.errors && parseResult.errors.length > 0) {
        console.warn('CSV parsing warnings:', parseResult.errors);
      }

      this.hospitals = parseResult.data
        .map((row, index) => {
          // 데이터 검증
          if (!row['기관명']?.trim()) {
            return null; // 빈 기관명은 스킵
          }

          return {
            id: `hospital-${index}`,
            name: row['기관명']?.trim() || '',
            type: row['분류']?.trim() || '기타',
            phoneExam: row['검진실 전화번호']?.trim() || '',
            phoneMain: row['대표번호']?.trim() || '',
            city: row['도시']?.trim() || '',
            district: row['지역구']?.trim() || '',
            address: row['상세주소']?.trim() || '',
            examCount: Math.max(0, parseInt(row['관련 검진수']) || 0),
            hasGeneralExam: row['일반검진']?.toUpperCase() === 'TRUE',
            hasStomachCancer: row['위암검진']?.toUpperCase() === 'TRUE',
            hasLiverCancer: row['간암검진']?.toUpperCase() === 'TRUE',
            hasColonCancer: row['대장암검진']?.toUpperCase() === 'TRUE',
            hasBreastCancer: row['유방암검진']?.toUpperCase() === 'TRUE',
            zipCode: row['우편번호']?.trim() || '',
            region: row['권역']?.trim() || '',
            lng: parseFloat(row['위도(X)']) || 0,
            lat: parseFloat(row['경도(Y)']) || 0
          };
        })
        .filter(hospital => hospital !== null) as Hospital[]; // null 제거

      this.initialized = true;
      console.log(`Successfully loaded ${this.hospitals.length} hospitals from CSV`);
      
      // 데이터 샘플링 로그
      if (this.hospitals.length > 0) {
        const sampleHospital = this.hospitals[0];
        console.log('Sample hospital:', sampleHospital);
      }
    } catch (error) {
      console.error('Error loading hospital data:', error);
      throw error;
    }
  }

  async getAllHospitals(): Promise<Hospital[]> {
    await this.initialize();
    return [...this.hospitals];
  }

  async getHospitalById(id: string): Promise<Hospital | undefined> {
    await this.initialize();
    return this.hospitals.find(h => h.id === id);
  }

  async searchHospitals(query: string): Promise<Hospital[]> {
    await this.initialize();
    const searchTerm = query.toLowerCase();
    return this.hospitals.filter(h => 
      h.name.toLowerCase().includes(searchTerm) ||
      h.address.toLowerCase().includes(searchTerm) ||
      h.city.toLowerCase().includes(searchTerm) ||
      h.district.toLowerCase().includes(searchTerm)
    );
  }

  async getHospitalsByFilters(filters: {
    city?: string;
    district?: string;
    type?: string;
    minExamCount?: number;
    onlyGeneralExam?: boolean;
  }): Promise<Hospital[]> {
    await this.initialize();
    
    return this.hospitals.filter(hospital => {
      if (filters.city && hospital.city !== filters.city) return false;
      if (filters.district && hospital.district !== filters.district) return false;
      if (filters.type && hospital.type !== filters.type) return false;
      if (filters.minExamCount && hospital.examCount < filters.minExamCount) return false;
      if (filters.onlyGeneralExam && !hospital.hasGeneralExam) return false;
      return true;
    });
  }

  async getStats(): Promise<{
    totalHospitals: number;
    cityCounts: Record<string, number>;
    typeCounts: Record<string, number>;
    regionCounts: Record<string, number>;
  }> {
    await this.initialize();
    
    const stats = {
      totalHospitals: this.hospitals.length,
      cityCounts: {} as Record<string, number>,
      typeCounts: {} as Record<string, number>,
      regionCounts: {} as Record<string, number>
    };

    this.hospitals.forEach(hospital => {
      // 도시별 통계
      stats.cityCounts[hospital.city] = (stats.cityCounts[hospital.city] || 0) + 1;
      
      // 유형별 통계
      stats.typeCounts[hospital.type] = (stats.typeCounts[hospital.type] || 0) + 1;
      
      // 권역별 통계
      stats.regionCounts[hospital.region] = (stats.regionCounts[hospital.region] || 0) + 1;
    });

    return stats;
  }

  async getCities(): Promise<string[]> {
    await this.initialize();
    return [...new Set(this.hospitals.map(h => h.city))].sort();
  }

  async getDistricts(city?: string): Promise<string[]> {
    await this.initialize();
    const filteredHospitals = city 
      ? this.hospitals.filter(h => h.city === city)
      : this.hospitals;
    return [...new Set(filteredHospitals.map(h => h.district))].sort();
  }

  async getTypes(): Promise<string[]> {
    await this.initialize();
    return [...new Set(this.hospitals.map(h => h.type))].sort();
  }
}

export const localDb = new LocalDatabase();