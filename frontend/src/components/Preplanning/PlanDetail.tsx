import { useState } from 'react';
import AddGroupModal from './AddGroupModal';
import LoadingState from '../ui/LoadingState';
import ErrorState from '../ui/ErrorState';
import PlanAllocations from './PlanAllocations';
import PlanHeaderSection from './PlanHeaderSection';
import PlanMetrics from './PlanMetrics';
import PlanPredecisionsPanel from './PlanPredecisionsPanel';
import { planCategories } from './planDetailUtils';
import { useGroups } from '../../features/groups/api';
import { useCreatePredecision, usePlan, useUpdateAllocations, useUpdatePlanGroups } from '../../features/preplanning/api';
import type { ExpenseCategory, ExpenseWithCreator, Plan, PlanAllocationCreate } from '../../types/api';
import type { ExpandedAllocation } from './planDetailUtils';
import type { GroupWithOptionalAvatar, PlanNavigationProps } from '../../types/ui';

interface PlanDetailProps extends PlanNavigationProps {
  planId: number | null;
  onAddExpense: (plan: Plan) => void;
  onSelectExpense: (expense: ExpenseWithCreator) => void;
}

export default function PlanDetail({ planId, onNavigate, onAddExpense, onSelectExpense }: PlanDetailProps) {
  const [newPredTitle, setNewPredTitle] = useState('');
  const [newPredCategory, setNewPredCategory] = useState<ExpenseCategory>('General');
  const [newPredAmount, setNewPredAmount] = useState('');
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showAddAlloc, setShowAddAlloc] = useState(false);
  const [newAllocCategory, setNewAllocCategory] = useState<ExpenseCategory>('Dining');
  const [newAllocAmount, setNewAllocAmount] = useState('');
  const [expandedAllocation, setExpandedAllocation] = useState<ExpandedAllocation>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const planQuery = usePlan(planId);
  const groupsQuery = useGroups();
  const createPredecision = useCreatePredecision(planId);
  const updateAllocations = useUpdateAllocations(planId);
  const updatePlanGroups = useUpdatePlanGroups(planId);
  const groups = groupsQuery.data ?? [];

  if (planQuery.isPending) return <LoadingState label="Loading plan details..." />;
  if (planQuery.isError) return <ErrorState title="Unable to load plan" message={planQuery.error.message} />;

  const plan = planQuery.data;
  if (!plan) return <div className="p-8 text-center text-gray-500 font-bold">Plan not found</div>;

  const durationDays = plan.start_date && plan.end_date
    ? Math.ceil((new Date(plan.end_date).getTime() - new Date(plan.start_date).getTime()) / (1000 * 60 * 60 * 24))
    : '--';
  const trackedGroups = (plan.tracked_groups ?? []) as GroupWithOptionalAvatar[];

  const toggleAllocation = (allocId: ExpandedAllocation) => {
    setExpandedAllocation(expandedAllocation === allocId ? null : allocId);
  };

  const handleAddPredecision = async () => {
    if (!newPredTitle || !newPredAmount) return;
    try {
      await createPredecision.mutateAsync({
        title: newPredTitle,
        category: newPredCategory,
        expected_amount: parseInt(newPredAmount.replace(/,/g, ''), 10) * 100,
        status: 'expected'
      });
      setNewPredTitle('');
      setNewPredAmount('');
    } catch(e) { console.error(e); }
  };

  const handleAddAllocation = async () => {
    if (!newAllocAmount) return;
    const currentAllocs: PlanAllocationCreate[] = plan.allocations.map(a => ({
      category: a.category,
      allocated_amount: a.allocated_amount
    }));
    currentAllocs.push({
      category: newAllocCategory,
      allocated_amount: parseInt(newAllocAmount.replace(/,/g, ''), 10) * 100
    });

    try {
      await updateAllocations.mutateAsync(currentAllocs);
      setShowAddAlloc(false);
      setNewAllocAmount('');
    } catch(e) { console.error(e); }
  };

  const handleGroupsSave = async (selectedIds: number[]) => {
    try {
      await updatePlanGroups.mutateAsync(selectedIds);
      setIsModalOpen(false);
    } catch(e) { console.error(e); }
  };

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-right-8 duration-500">
      <PlanHeaderSection
        plan={plan}
        durationDays={durationDays}
        trackedGroups={trackedGroups}
        onBack={() => onNavigate('dashboard')}
        onAddExpense={() => onAddExpense(plan)}
        onOpenGroups={() => setIsModalOpen(true)}
      />
      <AddGroupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        groups={groups}
        initialSelectedIds={plan.tracked_groups?.map(g => g.id) || []}
        onSave={handleGroupsSave}
      />
      <PlanMetrics plan={plan} />
      <div className="flex flex-col lg:flex-row gap-8">
        <PlanAllocations
          plan={plan}
          categories={planCategories}
          showAddAlloc={showAddAlloc}
          newAllocCategory={newAllocCategory}
          newAllocAmount={newAllocAmount}
          expandedAllocation={expandedAllocation}
          isUpdatingAllocations={updateAllocations.isPending}
          onSelectExpense={onSelectExpense}
          onToggleAddAlloc={() => setShowAddAlloc(!showAddAlloc)}
          onToggleAllocation={toggleAllocation}
          onAddAllocation={handleAddAllocation}
          setNewAllocCategory={setNewAllocCategory}
          setNewAllocAmount={setNewAllocAmount}
        />
        <PlanPredecisionsPanel
          plan={plan}
          categories={planCategories}
          newPredTitle={newPredTitle}
          newPredCategory={newPredCategory}
          newPredAmount={newPredAmount}
          showCategoryMenu={showCategoryMenu}
          isCreatingPredecision={createPredecision.isPending}
          onAddPredecision={handleAddPredecision}
          setNewPredTitle={setNewPredTitle}
          setNewPredCategory={setNewPredCategory}
          setNewPredAmount={setNewPredAmount}
          setShowCategoryMenu={setShowCategoryMenu}
        />
      </div>
    </div>
  );
}
