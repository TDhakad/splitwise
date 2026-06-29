import clsx from 'clsx';
import MSIcon from './MSIcon';
import type { ShoppingInsights } from '../types/api';

interface ShoppingInsightsCardProps {
  data: ShoppingInsights;
}

const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'staples': return 'kitchen';
    case 'produce': return 'eco';
    case 'beverages': return 'local_bar';
    case 'snacks': return 'cookie';
    default: return 'shopping_cart';
  }
};

const getBrandIcon = (brand: string) => {
  if (brand.includes('starbucks')) return 'coffee';
  if (brand.includes('walmart') || brand.includes('target')) return 'store';
  if (brand.includes('whole foods')) return 'organic';
  return 'storefront';
};

export default function ShoppingInsightsCard({ data }: ShoppingInsightsCardProps) {
  const maxCategoryAmount = Math.max(...data.shopping_categories.map(cat => cat.amount_cents), 1);
  const maxBrandAmount = Math.max(...data.brand_preferences.map(brand => brand.amount_cents), 1);

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
          <MSIcon name="insights" className="text-[18px]" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Shopping Patterns</h3>
          <p className="text-xs text-gray-500">From receipt scans</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-bold text-gray-700 mb-3">Top Categories</h4>
          <div className="space-y-3">
            {data.shopping_categories.slice(0, 3).map(category => (
              <div key={category.category}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <MSIcon name={getCategoryIcon(category.category)} className="text-sm text-gray-500" />
                    <span className="text-sm font-semibold text-gray-900 capitalize">{category.category}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-600">{formatMoney(category.amount_cents)}</span>
                </div>
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-green-500" style={{ width: `${Math.max(8, (category.amount_cents / maxCategoryAmount) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-bold text-gray-700 mb-3">Brand Preferences</h4>
          <div className="space-y-3">
            {data.brand_preferences.filter(brand => brand.brand !== 'other').slice(0, 3).map(brand => (
              <div key={brand.brand}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <MSIcon name={getBrandIcon(brand.brand)} className="text-sm text-gray-500" />
                    <span className="text-sm font-semibold text-gray-900 capitalize">{brand.brand.replace('-', ' ')}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-600">{formatMoney(brand.amount_cents)}</span>
                </div>
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.max(8, (brand.amount_cents / maxBrandAmount) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}