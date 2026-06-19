import { useState } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import PreplanningDashboard from './PreplanningDashboard';
import CreatePlanFlow from './CreatePlanFlow';
import PlanDetail from './PlanDetail';
import PlanInsights from './PlanInsights';
import type { ExpenseWithCreator, Plan } from '../../types/api';
import type { PreplanningView } from '../../types/ui';

interface PreplanningHubProps {
  currentUserId: number;
  onAddExpense: (plan: Plan) => void;
}

export default function PreplanningHub({ currentUserId, onAddExpense }: PreplanningHubProps) {
  const navigate = useNavigate();

  const navigateTo = (view: PreplanningView, planId: number | null = null) => {
    if (view === 'dashboard') navigate('/preplanning');
    else if (view === 'create') navigate('/preplanning/create');
    else if (view === 'detail') navigate(`/preplanning/${planId}`);
    else if (view === 'insights') navigate(`/preplanning/${planId}/insights`);
  };

  return (
    <div className="h-full w-full bg-[#F8F9FA] overflow-y-auto relative p-8">
      <Routes>
        <Route path="/" element={<PreplanningDashboard onNavigate={navigateTo} />} />
        <Route path="create" element={<CreatePlanFlow onNavigate={navigateTo} />} />
        <Route path=":planId" element={<PlanDetailWrapper currentUserId={currentUserId} onNavigate={navigateTo} onAddExpense={onAddExpense} />} />
        <Route path=":planId/insights" element={<PlanInsightsWrapper onNavigate={navigateTo} />} />
      </Routes>
    </div>
  );
}

function PlanDetailWrapper({ currentUserId, onNavigate, onAddExpense }: any) {
  const { planId } = useParams();
  const navigate = useNavigate();
  return <PlanDetail planId={Number(planId)} currentUserId={currentUserId} onNavigate={onNavigate} onAddExpense={onAddExpense} onSelectExpense={(exp) => navigate(`/expenses/${exp.id}`, { state: { from: 'preplanning' } })} />
}

function PlanInsightsWrapper({ onNavigate }: any) {
  const { planId } = useParams();
  return <PlanInsights planId={Number(planId)} onNavigate={onNavigate} />
}
