import MSIcon from '../MSIcon';
import type { PlanNavigationProps } from '../../types/ui';

interface PlanInsightsProps extends PlanNavigationProps {
  planId?: number | null;
}

export default function PlanInsights({ onNavigate }: PlanInsightsProps) {
  return (
    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-right-8 duration-500">
      <button onClick={() => onNavigate('dashboard')} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 mb-6 transition-colors">
        <MSIcon name="arrow_back" className="text-[18px]" /> Back to Dashboard
      </button>

      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
            Q3 2024 Projections
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Preplanning Simulation</h1>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 font-bold text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm">
            <MSIcon name="tune" className="text-[18px]" /> Adjust Parameters
          </button>
          <button className="px-5 py-2.5 rounded-xl bg-[#007A64] hover:bg-[#00604f] text-white font-bold text-sm transition-colors flex items-center gap-2 shadow-md">
            <MSIcon name="save" className="text-[18px]" /> Save Scenario
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Column */}
        <div className="flex-1 space-y-6">
          {/* Expenditure Trajectory Chart */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Expenditure Trajectory</h3>
                <p className="text-sm font-medium text-gray-500 mt-1">Current Pre-plan vs Historical Baseline</p>
              </div>
              <div className="flex bg-gray-100 p-1 rounded-xl">
                <button className="px-3 py-1 rounded-lg text-[11px] font-bold bg-white text-gray-900 shadow-sm">6M</button>
                <button className="px-3 py-1 rounded-lg text-[11px] font-bold text-gray-500 hover:text-gray-900">1Y</button>
                <button className="px-3 py-1 rounded-lg text-[11px] font-bold text-gray-500 hover:text-gray-900">YTD</button>
              </div>
            </div>

            {/* Placeholder Chart Area */}
            <div className="h-64 relative border-b border-gray-100 mb-6 flex items-end">
              {/* Y Axis */}
              <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-[10px] font-bold text-gray-400">
                <span>$12k</span>
                <span>$8k</span>
                <span>$4k</span>
                <span>$0</span>
              </div>
              
              {/* Chart Lines (Mock) */}
              <div className="absolute inset-0 ml-8 border-l border-gray-100 flex items-end justify-between pb-6">
                <div className="w-full h-full relative">
                  <div className="absolute bottom-0 left-0 w-full h-[60%] border-t-2 border-dashed border-gray-300" />
                  <div className="absolute bottom-0 left-[80%] w-[20%] h-[75%] border-t-4 border-[#007A64]" />
                  <div className="absolute top-4 right-4 text-[10px] font-bold text-[#007A64] uppercase tracking-widest bg-green-50 px-2 py-0.5 rounded">Projected</div>
                </div>
              </div>
              
              {/* X Axis */}
              <div className="absolute -bottom-6 left-8 right-0 flex justify-between text-[10px] font-bold text-gray-400">
                <span>Jan</span>
                <span>Feb</span>
                <span>Mar</span>
                <span>Apr</span>
                <span>May</span>
                <span className="text-[#007A64]">Jun</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-6 mt-8">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-gray-300" />
                <span className="text-xs font-bold text-gray-500">Historical Avg</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-[#007A64]" />
                <span className="text-xs font-bold text-gray-900">Current Pre-plan</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Optimized Trajectory */}
            <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm hover:border-[#007A64] transition-colors cursor-pointer group">
              <div className="flex justify-between items-start mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#EAF5F2] text-[#007A64] flex items-center justify-center">
                  <MSIcon name="trending_up" />
                </div>
                <div className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded uppercase tracking-widest">
                  Simulation A
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Optimized Trajectory</h3>
              <div className="text-3xl font-black text-[#007A64] mb-3">
                +$4,250 <span className="text-base font-bold text-gray-500">Surplus</span>
              </div>
              <p className="text-sm font-medium text-gray-500 leading-relaxed">
                Assumes strict adherence to category caps and a 5% reduction in...
              </p>
            </div>

            {/* High-Variance Impact */}
            <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm hover:border-red-400 transition-colors cursor-pointer group">
              <div className="flex justify-between items-start mb-6">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center">
                  <MSIcon name="trending_down" />
                </div>
                <div className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded uppercase tracking-widest">
                  Simulation B
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">High-Variance Impact</h3>
              <div className="text-3xl font-black text-red-500 mb-3">
                -$1,120 <span className="text-base font-bold text-gray-500">Deficit</span>
              </div>
              <p className="text-sm font-medium text-gray-500 leading-relaxed">
                Models potential impact of historical Q3 utility spikes and unbudgeted...
              </p>
            </div>
          </div>
        </div>

        {/* Side Panel: Algorithmic Insights */}
        <div className="w-full lg:w-[360px] shrink-0">
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm sticky top-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <MSIcon name="lightbulb" className="text-[18px]" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Algorithmic Insights</h3>
            </div>
            <p className="text-sm font-medium text-gray-500 leading-relaxed mb-8">
              Pattern recognition based on past 12 months.
            </p>

            <div className="space-y-4 mb-8">
              {/* Insight 1: Dining */}
              <div className="bg-gray-50 border border-gray-100 p-5 rounded-2xl hover:bg-white hover:border-gray-200 transition-colors shadow-sm">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                    <MSIcon name="restaurant" className="text-[16px]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-1">Dining Deviation</h4>
                    <p className="text-xs font-medium text-gray-600 leading-relaxed mb-3">
                      Your dining costs typically exceed pre-plans by <span className="font-bold text-red-500">12%</span> during summer months.
                    </p>
                    <button className="text-[10px] font-bold text-[#007A64] uppercase tracking-widest hover:text-[#00604f]">
                      Review Category Cap
                    </button>
                  </div>
                </div>
              </div>

              {/* Insight 2: Transportation */}
              <div className="bg-gray-50 border border-gray-100 p-5 rounded-2xl hover:bg-white hover:border-gray-200 transition-colors shadow-sm">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#EAF5F2] text-[#007A64] flex items-center justify-center shrink-0">
                    <MSIcon name="directions_car" className="text-[16px]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-1">Transportation Efficiency</h4>
                    <p className="text-xs font-medium text-gray-600 leading-relaxed mb-3">
                      Recent shifts to public transit have created a <span className="font-bold text-[#007A64]">$340</span> monthly surplus.
                    </p>
                    <button className="text-[10px] font-bold text-[#007A64] uppercase tracking-widest hover:text-[#00604f]">
                      Reallocate Funds
                    </button>
                  </div>
                </div>
              </div>

              {/* Insight 3: Utilities */}
              <div className="bg-gray-50 border border-gray-100 p-5 rounded-2xl hover:bg-white hover:border-gray-200 transition-colors shadow-sm">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <MSIcon name="ac_unit" className="text-[16px]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-1">Seasonal Utility Spike</h4>
                    <p className="text-xs font-medium text-gray-600 leading-relaxed mb-3">
                      Historical data indicates a likely 15% increase in cooling costs next month. Pre-plan currently under-allocates.
                    </p>
                    <button className="text-[10px] font-bold text-[#007A64] uppercase tracking-widest hover:text-[#00604f]">
                      Auto-Adjust Plan
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
              <div className="flex items-end justify-between mb-3">
                <span className="text-xs font-bold text-gray-600">Pre-plan Confidence Score</span>
                <span className="text-2xl font-black text-[#007A64]">84%</span>
              </div>
              <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden mb-3">
                <div className="h-full bg-[#007A64] w-[84%] rounded-full" />
              </div>
              <div className="text-[10px] font-medium text-gray-500 text-center">
                Based on simulation stability.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
