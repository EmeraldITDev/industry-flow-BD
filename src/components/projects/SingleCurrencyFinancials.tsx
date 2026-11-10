import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { projectCostSummary, type ProjectCurrency } from '@/lib/projectCosts';
import { DiscountControls, buildDiscountPayload, type DiscountType } from '@/components/projects/DiscountControls';

type Props = {
  currency: ProjectCurrency;
  onCurrencyChange: (currency: ProjectCurrency) => void;
  contractValue: string;
  onContractValueChange: (value: string) => void;
  discountType: DiscountType;
  discountValue: string;
  canEditDiscount: boolean;
  onDiscountTypeChange: (type: DiscountType) => void;
  onDiscountValueChange: (value: string) => void;
  supplierDirectCost: string;
  onSupplierDirectCostChange: (value: string) => void;
  otherProjectCost: string;
  onOtherProjectCostChange: (value: string) => void;
  /**
   * When provided, Margin % can be typed by hand while no costs are entered
   * (projects whose margin was recorded without costs). Entering a cost
   * switches margin back to being calculated from costs.
   */
  manualMarginPercent?: string;
  onManualMarginPercentChange?: (value: string) => void;
};

function parseAmount(value: string): number | null {
  if (value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function SingleCurrencyFinancials({
  currency,
  onCurrencyChange,
  contractValue,
  onContractValueChange,
  discountType,
  discountValue,
  canEditDiscount,
  onDiscountTypeChange,
  onDiscountValueChange,
  supplierDirectCost,
  onSupplierDirectCostChange,
  otherProjectCost,
  onOtherProjectCostChange,
  manualMarginPercent,
  onManualMarginPercentChange,
}: Props) {
  const symbol = currency === 'NGN' ? '₦' : '$';
  const discount = buildDiscountPayload(contractValue, discountType, discountValue);
  const contract = parseAmount(contractValue);
  const base = discount.discountedContractValue ?? contract;
  const summary = projectCostSummary(
    base,
    parseAmount(supplierDirectCost),
    parseAmount(otherProjectCost)
  );

  const manualMargin = onManualMarginPercentChange != null && summary.totalProjectCost == null;
  const manualPct = manualMargin ? parseAmount(manualMarginPercent ?? '') : null;
  const marginValue = manualMargin
    ? base != null && manualPct != null
      ? (base * manualPct) / 100
      : null
    : summary.marginValue;

  const money = (value: number | null) =>
    value == null ? '' : value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Currency</p>
          <p className="text-xs text-muted-foreground">
            Revenue and costs for this project are recorded in one currency.
          </p>
        </div>
        <div className="inline-flex rounded-md border p-0.5">
          {(['NGN', 'USD'] as const).map((code) => (
            <button
              key={code}
              type="button"
              className={cn(
                'rounded px-3 py-1.5 text-sm',
                currency === code ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
              )}
              onClick={() => onCurrencyChange(code)}
            >
              {code === 'NGN' ? '₦ NGN' : '$ USD'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Contract/PO Value ({symbol})</Label>
        <Input
          type="number"
          value={contractValue}
          onChange={(e) => onContractValueChange(e.target.value)}
          placeholder="0"
        />
      </div>

      <DiscountControls
        currency={currency}
        contractValue={contractValue}
        discountType={discountType}
        discountValue={discountValue}
        canEdit={canEditDiscount}
        onTypeChange={onDiscountTypeChange}
        onValueChange={onDiscountValueChange}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Supplier Direct Cost ({symbol})</Label>
          <Input
            type="number"
            min="0"
            value={supplierDirectCost}
            onChange={(e) => onSupplierDirectCostChange(e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="space-y-2">
          <Label>Other Project Cost ({symbol})</Label>
          <Input
            type="number"
            min="0"
            value={otherProjectCost}
            onChange={(e) => onOtherProjectCostChange(e.target.value)}
            placeholder="e.g. delivery"
          />
          <p className="text-[10px] text-muted-foreground">For example delivery or other project costs.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label>Total Project Cost ({symbol})</Label>
          <Input readOnly className="bg-muted" value={money(summary.totalProjectCost)} placeholder="Supplier DC + Other PC" />
        </div>
        <div className="space-y-2">
          <Label>Margin Value ({symbol})</Label>
          <Input readOnly className="bg-muted" value={money(marginValue)} placeholder="Auto-calculated" />
        </div>
        <div className="space-y-2">
          <Label>Margin %</Label>
          {manualMargin ? (
            <Input
              type="number"
              value={manualMarginPercent ?? ''}
              onChange={(e) => onManualMarginPercentChange?.(e.target.value)}
              placeholder="0"
            />
          ) : (
            <Input
              readOnly
              className="bg-muted"
              value={summary.marginPercent == null ? '' : summary.marginPercent.toFixed(2)}
              placeholder="Auto-calculated"
            />
          )}
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground">
        {manualMargin
          ? 'No costs entered, so Margin % is entered by hand. Add a cost to calculate margin from costs instead.'
          : 'Margin value is the contract (after discount, when set) minus total project cost. Margin % is that value divided by the contract.'}
      </p>
    </div>
  );
}
