import { Hospital } from '../types';
import { localDb } from './localDatabase';

export const fetchHospitalData = async (): Promise<Hospital[]> => {
  try {
    console.log("Loading hospitals from local database...");
    const hospitals = await localDb.getAllHospitals();
    console.log(`Loaded ${hospitals.length} hospitals from local database`);
    return hospitals;
  } catch (error) {
    console.error("Error fetching hospital data:", error);
    throw error;
  }
};

// 검색 기능
export const searchHospitals = async (query: string): Promise<Hospital[]> => {
  return localDb.searchHospitals(query);
};

// 필터링 기능
export const filterHospitals = async (filters: {
  city?: string;
  district?: string;
  type?: string;
  minExamCount?: number;
  onlyGeneralExam?: boolean;
}): Promise<Hospital[]> => {
  return localDb.getHospitalsByFilters(filters);
};

// 통계 데이터
export const getHospitalStats = async () => {
  return localDb.getStats();
};

// 도시 목록
export const getCities = async (): Promise<string[]> => {
  return localDb.getCities();
};

// 지역구 목록
export const getDistricts = async (city?: string): Promise<string[]> => {
  return localDb.getDistricts(city);
};

// 병원 유형 목록
export const getHospitalTypes = async (): Promise<string[]> => {
  return localDb.getTypes();
};