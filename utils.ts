import { Hospital } from './types';

// Calculate distance between two points using Haversine formula
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  if (!lat1 || !lon1 || !lat2 || !lon2 || lat1 === 0 || lon1 === 0 || lat2 === 0 || lon2 === 0) {
    return 999999; // 좌표가 없거나 잘못된 경우 매우 먼 거리로 처리
  }
  
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return Number(d.toFixed(2));
};

const deg2rad = (deg: number): number => {
  return deg * (Math.PI / 180);
};

// Parser for Google Sheet Data (2D Array)
export const parseSheetData = (rows: any[][]): Hospital[] => {
  // Assume Row 0 is header, so slice from 1
  if (!rows || rows.length < 2) return [];

  return rows.slice(1).map((row, index) => {
    // Helper to safely handle boolean cells (which might be boolean type or "TRUE"/"FALSE" strings)
    const getBool = (val: any) => {
      if (typeof val === 'boolean') return val;
      return String(val).toUpperCase() === 'TRUE';
    };

    // Helper to safely parse numbers
    const getNum = (val: any) => {
       const num = parseFloat(String(val));
       return isNaN(num) ? 0 : num;
    };

    // Mapping based on the CSV structure provided in constants.ts
    // 0: 기관명, 1: 분류, 2: 검진실 전화번호, 3: 대표번호, 4: 도시, 5: 지역구, 6: 상세주소, 
    // 7: 관련 검진수, 8: 일반검진, 9: 위암, 10: 간암, 11: 대장암, 12: 유방암, 
    // 13: 우편번호, 14: 권역, 15: 위도(X)->Lng, 16: 경도(Y)->Lat
    
    return {
      id: `sheet_${index}`,
      name: String(row[0] || ''),
      type: String(row[1] || ''),
      phoneExam: String(row[2] || ''),
      phoneMain: String(row[3] || ''),
      city: String(row[4] || ''),
      district: String(row[5] || ''),
      address: String(row[6] || ''),
      examCount: getNum(row[7]),
      hasGeneralExam: getBool(row[8]),
      hasStomachCancer: getBool(row[9]),
      hasLiverCancer: getBool(row[10]),
      hasColonCancer: getBool(row[11]),
      hasBreastCancer: getBool(row[12]),
      zipCode: String(row[13] || ''),
      region: String(row[14] || ''),
      lng: getNum(row[15]), // CSV X is Longitude
      lat: getNum(row[16]), // CSV Y is Latitude
    };
  });
};