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
  { product: 'Electricals', subproducts: [] },
  { product: 'Automation & Controls', subproducts: [] },
  { product: 'Other rotating equipment', subproducts: [] },
  { product: 'Other services', subproducts: [] },
];

export const PRODUCT_OPTIONS = PRODUCT_CATALOG.map((p) => ({ value: p.product, label: p.product }));

export function getSubproductOptions(selectedProducts: string[]) {
  const set = new Set<string>();
  selectedProducts.forEach((p) => {
    PRODUCT_CATALOG.find((c) => c.product === p)?.subproducts.forEach((s) => set.add(s));
  });
  return Array.from(set).map((v) => ({ value: v, label: v }));
}
