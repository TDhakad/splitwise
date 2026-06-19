import { useState } from 'react';
import PreplanningDashboard from './PreplanningDashboard';
import CreatePlanFlow from './CreatePlanFlow';
import PlanDetail from './PlanDetail';
import PlanInsights from './PlanInsights';
import type { ExpenseWithCreator, Plan } from '../../types/api';
import type { PreplanningView } from '../../types/ui';

interface PreplanningHubProps {
  onAddExpense: (plan: Plan) => void;
  onSelectExpense: (expense: ExpenseWithCreator) => void;
}

export default function PreplanningHub({ onAddExpense, onSelectExpense }: PreplanningHubProps) {
  const [currentView, setCurrentView] = useState<PreplanningView>('dashboard');
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);

  const navigateTo = (view: PreplanningView, planId: number | null = null) => {
    setCurrentView(view);
    if (planId !== undefined) {
      setSelectedPlanId(planId);
    }
  };

  return (
    <div className="h-full w-full bg-[#F8F9FA] overflow-y-auto relative p-8">
      {currentView === 'dashboard' && <PreplanningDashboard onNavigate={navigateTo} />}
      {currentView === 'create' && <CreatePlanFlow onNavigate={navigateTo} />}
      {currentView === 'detail' && <PlanDetail planId={selectedPlanId} onNavigate={navigateTo} onAddExpense={onAddExpense} onSelectExpense={onSelectExpense} />}
      {currentView === 'insights' && <PlanInsights planId={selectedPlanId} onNavigate={navigateTo} />}
    </div>
  );
}
