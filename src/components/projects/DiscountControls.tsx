import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { computeDiscountedContract } from "@/lib/contractValue";

export type DiscountType = "percent" | "amount" | "";

type Props = {
  currency: "NGN" | "USD";
  contractValue: string;
  discountType: DiscountType;
  discountValue: string;
  canEdit: boolean;
  onTypeChange: (type: DiscountType) => void;
  onValueChange: (value: string) => void;
};

export function DiscountControls({
  currency,
  contractValue,
  discountType,
  discountValue,
  canEdit,
  onTypeChange,
  onValueChange,
}: Props) {
  const symbol = currency === "NGN" ? "₦" : "$";
  const original = parseFloat(contractValue);
  const discVal = parseFloat(discountValue);
  const discounted =
    discountType && Number.isFinite(original) && Number.isFinite(discVal)
      ? computeDiscountedContract(original, discountType, discVal)
      : null;

  if (!canEdit && !discountType) {
    return null;
  }

  return (
    <div className="space-y-2 pt-1">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs text-muted-foreground">Discount</Label>
        {canEdit ? (
          <div className="flex rounded-md border border-border overflow-hidden">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 rounded-none px-2 text-xs",
                discountType === "percent" && "bg-muted"
              )}
              onClick={() =>
                onTypeChange(discountType === "percent" ? "" : "percent")
              }
            >
              %
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 rounded-none px-2 text-xs border-l",
                discountType === "amount" && "bg-muted"
              )}
              onClick={() =>
                onTypeChange(discountType === "amount" ? "" : "amount")
              }
            >
              {symbol}
            </Button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">
            {discountType === "percent" ? "Percent" : "Amount"}
          </span>
        )}
      </div>

      {(canEdit ? discountType : discountType) ? (
        <>
          <Input
            type="number"
            value={discountValue}
            onChange={(e) => onValueChange(e.target.value)}
            placeholder={discountType === "percent" ? "0" : "0.00"}
            disabled={!canEdit}
            className={!canEdit ? "bg-muted cursor-not-allowed" : undefined}
            min={0}
            max={discountType === "percent" ? 100 : undefined}
          />
          {discounted != null && Number.isFinite(original) && (
            <p className="text-[11px] text-muted-foreground">
              <span className="line-through mr-2">
                {symbol}
                {original.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              <span className="font-medium text-foreground">
                {symbol}
                {discounted.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                after discount
              </span>
            </p>
          )}
        </>
      ) : canEdit ? (
        <p className="text-[11px] text-muted-foreground">
          Toggle % or {symbol} to apply a discount to this contract value.
        </p>
      ) : null}
    </div>
  );
}

export function buildDiscountPayload(
  contractStr: string,
  type: DiscountType,
  valueStr: string
): {
  discountType: "percent" | "amount" | null;
  discountValue: number | null;
  discountedContractValue: number | null;
} {
  const original = parseFloat(contractStr);
  const value = parseFloat(valueStr);
  if (
    !type ||
    !Number.isFinite(original) ||
    !Number.isFinite(value) ||
    value < 0
  ) {
    return {
      discountType: null,
      discountValue: null,
      discountedContractValue: null,
    };
  }
  const discounted = computeDiscountedContract(original, type, value);
  return {
    discountType: type,
    discountValue: value,
    discountedContractValue: discounted,
  };
}
