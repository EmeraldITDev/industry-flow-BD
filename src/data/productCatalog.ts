// Linked Product -> Sub-product catalog (frontend option lists only)
export const PRODUCT_CATALOG: { product: string; subproducts: string[] }[] = [
  {
    product: 'Capital Parts',
    subproducts: [
      'Spares',
      'Valves',
      'Pumps',
      'Compressors',
      'Motors',
      'Gearboxes',
      'Nozzles',
      'Transformers',
      'Panels',
      'Rotating Equipment',
    ],
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
  { product: 'O&M services', subproducts: [] },
  { product: 'Petroleum Products', subproducts: [] },
  { product: 'Urea', subproducts: [] },
  { product: 'Meters', subproducts: [] },
  { product: 'Other Products', subproducts: [] },
];

export const PRODUCT_OPTIONS = PRODUCT_CATALOG.map((p) => ({ value: p.product, label: p.product }));

export function getSubproductOptions(selectedProducts: string[]) {
  const set = new Set<string>();
  selectedProducts.forEach((p) => {
    PRODUCT_CATALOG.find((c) => c.product === p)?.subproducts.forEach((s) => set.add(s));
  });
  return Array.from(set).map((v) => ({ value: v, label: v }));
}
