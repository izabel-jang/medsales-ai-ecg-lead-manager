import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, LineChart, Line } from 'recharts';
import { getHospitalStats } from '../services/sheetService';
import { Loader2, TrendingUp, Users, Building, MapPin } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

interface StatsData {
  totalHospitals: number;
  cityCounts: Record<string, number>;
  typeCounts: Record<string, number>;
  regionCounts: Record<string, number>;
}

export const StatsDashboard: React.FC = () => {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await getHospitalStats();
        setStats(data);
      } catch (error) {
        console.error('Error loading stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center text-gray-500 p-8">
        통계 데이터를 불러올 수 없습니다.
      </div>
    );
  }

  // 차트 데이터 준비
  const topCitiesData = Object.entries(stats.cityCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([city, count]) => ({ name: city, value: count }));

  const typeData = Object.entries(stats.typeCounts)
    .sort(([,a], [,b]) => b - a)
    .map(([type, count]) => ({ name: type, value: count }));

  const regionData = Object.entries(stats.regionCounts)
    .map(([region, count]) => ({ name: region, value: count }));

  return (
    <div className="p-6 space-y-6">
      {/* 요약 카드들 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">총 병원 수</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalHospitals.toLocaleString()}</p>
            </div>
            <Building className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">지역 수</p>
              <p className="text-2xl font-bold text-gray-900">{Object.keys(stats.cityCounts).length}</p>
            </div>
            <MapPin className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">병원 유형</p>
              <p className="text-2xl font-bold text-gray-900">{Object.keys(stats.typeCounts).length}</p>
            </div>
            <Users className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">권역 수</p>
              <p className="text-2xl font-bold text-gray-900">{Object.keys(stats.regionCounts).length}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* 차트들 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 상위 10개 지역 */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">상위 10개 지역</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topCitiesData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {topCitiesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 권역별 분포 */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">권역별 분포</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={regionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {regionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 병원 유형별 분포 */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">병원 유형별 분포</h3>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={typeData} margin={{ top: 5, right: 30, left: 20, bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={100}
                interval={0}
                fontSize={10}
              />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {typeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 상세 통계 테이블 */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">상세 통계</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 지역별 상세 */}
          <div>
            <h4 className="font-medium text-gray-700 mb-3">지역별 병원 수</h4>
            <div className="max-h-64 overflow-y-auto border rounded">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">지역</th>
                    <th className="px-3 py-2 text-right">병원 수</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(stats.cityCounts)
                    .sort(([,a], [,b]) => b - a)
                    .map(([city, count]) => (
                      <tr key={city} className="border-t">
                        <td className="px-3 py-2">{city}</td>
                        <td className="px-3 py-2 text-right">{count}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 유형별 상세 */}
          <div>
            <h4 className="font-medium text-gray-700 mb-3">유형별 병원 수</h4>
            <div className="max-h-64 overflow-y-auto border rounded">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">유형</th>
                    <th className="px-3 py-2 text-right">병원 수</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(stats.typeCounts)
                    .sort(([,a], [,b]) => b - a)
                    .map(([type, count]) => (
                      <tr key={type} className="border-t">
                        <td className="px-3 py-2">{type}</td>
                        <td className="px-3 py-2 text-right">{count}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};