import React, { memo, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { Hospital } from '../types';

interface DashboardProps {
  data: Hospital[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
const PRIORITY_COLORS = ['#ef4444', '#f59e0b', '#94a3b8']; // Red, Amber, Slate

export const Dashboard: React.FC<DashboardProps> = memo(({ data }) => {
  // 모든 계산을 useMemo로 메모이제이션
  const { typeChartData, priorityCount, priorityChartData, examChartData, generalExamRatio } = useMemo(() => {
    // Aggregate data for Type Chart
    const typeCount = data.reduce((acc, curr) => {
      acc[curr.type] = (acc[curr.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const typeChartData = Object.entries(typeCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Aggregate data for Priority Chart (Simple Logic Simulation)
    const priorityCount = data.reduce((acc, curr) => {
      let priority = 'Low';
      if ((curr.type.includes('내과') || curr.type.includes('종합') || curr.type.includes('병원')) && curr.examCount >= 4) {
        priority = 'High';
      } else if (curr.examCount >= 3) {
        priority = 'Medium';
      }
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, { High: 0, Medium: 0, Low: 0 } as Record<string, number>);

    const priorityChartData = [
      { name: 'High Priority', value: priorityCount.High },
      { name: 'Medium Priority', value: priorityCount.Medium },
      { name: 'Low Priority', value: priorityCount.Low },
    ];

    // Aggregate Exam Capabilities
    const exams = [
      { name: 'General', key: 'hasGeneralExam' },
      { name: 'Stomach', key: 'hasStomachCancer' },
      { name: 'Liver', key: 'hasLiverCancer' },
      { name: 'Colon', key: 'hasColonCancer' },
      { name: 'Breast', key: 'hasBreastCancer' },
    ];
    
    const examChartData = exams.map(e => ({
      name: e.name,
      value: data.filter(h => h[e.key as keyof Hospital]).length
    }));

    const generalExamRatio = data.length > 0 
      ? ((data.filter(h => h.hasGeneralExam).length / data.length) * 100).toFixed(0) 
      : '0';

    return { typeChartData, priorityCount, priorityChartData, examChartData, generalExamRatio };
  }, [data]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      {/* Stat Cards - Stacked on Mobile */}
      <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-center">
        <span className="text-slate-500 text-xs md:text-sm font-medium uppercase tracking-wide">Total Prospects</span>
        <span className="text-3xl md:text-4xl font-bold text-slate-800 mt-2">{data.length}</span>
        <span className="text-[10px] md:text-xs text-slate-400 mt-1">Medical Institutions</span>
      </div>
      
      <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-center">
        <span className="text-slate-500 text-xs md:text-sm font-medium uppercase tracking-wide">High Value Targets</span>
        <span className="text-3xl md:text-4xl font-bold text-rose-600 mt-2">{priorityCount.High}</span>
        <span className="text-[10px] md:text-xs text-slate-400 mt-1">Priority 1 Accounts</span>
      </div>

      <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-center">
        <span className="text-slate-500 text-xs md:text-sm font-medium uppercase tracking-wide">ECG Opportunity</span>
        <span className="text-3xl md:text-4xl font-bold text-indigo-600 mt-2">
          {generalExamRatio}%
        </span>
        <span className="text-[10px] md:text-xs text-slate-400 mt-1">Coverage Ratio (General Exam)</span>
      </div>

      {/* Priority Distribution Chart */}
      <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-slate-100">
        <h3 className="text-xs md:text-sm font-semibold text-slate-800 mb-4 uppercase tracking-wider">Prospect Priority</h3>
        <div className="h-48 md:h-56 w-full">
          <ResponsiveContainer width="100%" height="100%" minHeight={180}>
            <PieChart>
              <Pie
                data={priorityChartData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={65}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
              >
                {priorityChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[index % PRIORITY_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Legend verticalAlign="bottom" height={36} iconSize={8} wrapperStyle={{ fontSize: '10px' }}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Type Chart */}
      <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-slate-100">
        <h3 className="text-xs md:text-sm font-semibold text-slate-800 mb-4 uppercase tracking-wider">Institution Type</h3>
        <div className="h-48 md:h-56 w-full">
          <ResponsiveContainer width="100%" height="100%" minHeight={180}>
            <BarChart data={typeChartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{fontSize: 10}} interval={0} height={40} angle={-30} textAnchor="end" />
              <YAxis tick={{fontSize: 10}} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {typeChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Exam Capability Chart */}
      <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-slate-100">
        <h3 className="text-xs md:text-sm font-semibold text-slate-800 mb-4 uppercase tracking-wider">Screening Capabilities</h3>
        <div className="h-48 md:h-56 w-full">
          <ResponsiveContainer width="100%" height="100%" minHeight={180}>
            <BarChart data={examChartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={50} tick={{fontSize: 10}} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
});

Dashboard.displayName = 'Dashboard';