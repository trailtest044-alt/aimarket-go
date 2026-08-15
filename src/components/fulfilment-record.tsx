import { cn } from "@/lib/utils";

/**
 * The record strip.
 *
 * Ledger's signature element and the reason the direction works: it answers
 * "will this actually arrive" with published numbers instead of asking for
 * faith. It appears on product cards, product pages and checkout.
 *
 * Every figure is real. When there isn't enough history to be honest about a
 * number, the cell is omitted rather than filled with a placeholder — an
 * empty record is more trustworthy than an invented one.
 */

export type Fulfilment = {
  medianApprovalMinutes: number | null;
  deliveredLast30Days: number;
};

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  if (hours < 24) return `${hours % 1 === 0 ? hours : hours.toFixed(1)} hr`;
  const days = Math.round(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"}`;
}

type Cell = { label: string; value: string; tone?: "settled" | "pending" | "plain" };

export function FulfilmentRecord({
  fulfilment,
  stock,
  className,
}: {
  fulfilment?: Fulfilment | null;
  stock?: number;
  className?: string;
}) {
  const cells: Cell[] = [];

  if (typeof stock === "number") {
    cells.push({
      label: "In stock",
      value: stock === 0 ? "None" : `${stock}`,
      tone: stock === 0 ? "pending" : "plain",
    });
  }

  if (fulfilment?.medianApprovalMinutes != null) {
    cells.push({
      label: "Median approval",
      value: formatDuration(fulfilment.medianApprovalMinutes),
      tone: "settled",
    });
  }

  if (fulfilment && fulfilment.deliveredLast30Days > 0) {
    cells.push({
      label: "Delivered, 30d",
      value: `${fulfilment.deliveredLast30Days}`,
      tone: "plain",
    });
  }

  if (!cells.length) return null;

  return (
    <dl className={cn("record", className)}>
      {cells.map((cell, i) => (
        <div key={cell.label} className={cn("record-cell", i === 0 && "record-cell-first")}>
          <dt className="record-label">{cell.label}</dt>
          <dd
            className={cn(
              "record-value",
              cell.tone === "settled" && "text-success",
              cell.tone === "pending" && "text-warning",
            )}
          >
            {cell.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Site-wide version for the storefront header. Reads as a masthead line —
 * one sentence of published record, not a stat block.
 */
export function FulfilmentLine({ fulfilment }: { fulfilment?: Fulfilment | null }) {
  if (!fulfilment || fulfilment.deliveredLast30Days === 0) return null;

  return (
    <p className="text-sm text-muted-foreground">
      <span className="font-mono font-medium text-foreground">
        {fulfilment.deliveredLast30Days}
      </span>{" "}
      orders delivered in the last 30 days
      {fulfilment.medianApprovalMinutes != null && (
        <>
          , median approval{" "}
          <span className="font-mono font-medium text-success">
            {formatDuration(fulfilment.medianApprovalMinutes)}
          </span>
        </>
      )}
      .
    </p>
  );
}
