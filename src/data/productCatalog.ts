// Linked Product -> Sub-product catalog (frontend option lists only)
export const PRODUCT_CATALOG: { product: string; subproducts: string[] }[] = [
  {
    product: 'Capital Parts',
    subproducts: ['Spares', 'Valves', 'Pumps', 'Compressors', 'Motors', 'Gearboxes', 'Nozzles', 'Transformers', 'Panels'],
  },
  {
    product: 'Consumables',
    subproducts: ['Gaskets', 'Hoses', 'Lube Oils', 'Filters', 'Seals', 'Belts'],
  },
  {
    product: 'Repairs / Upgrades / Services',
    subproducts: ['Repairs', 'Overhauls', 'Rewinding', 'Commissioning', 'Inspections', 'Training', 'Field Service'],
  },
  {
    product: 'NPD / NMI',
    subproducts: ['CNG', 'Inventory Automation', 'Metering', 'Solar', 'Other New-Market Pilots'],
  },
  { product: 'N/A - Internal / Non-commercial', subproducts: [] },
  { product: 'N/A - Trading Commodity', subproducts: [] },
];

export const PRODUCT_OPTIONS = PRODUCT_CATALOG.map((p) => ({ value: p.product, label: p.product }));

export function getSubproductOptions(selectedProducts: string[]) {
  const set = new Set<string>();
  selectedProducts.forEach((p) => {
    PRODUCT_CATALOG.find((c) => c.product === p)?.subproducts.forEach((s) => set.add(s));
  });
  return Array.from(set).map((v) => ({ value: v, label: v }));
}
