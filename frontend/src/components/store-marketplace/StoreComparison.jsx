import React from 'react';
import { Check, Minus } from 'lucide-react';

const StoreComparison = () => {
  const tiers = [
    { name: 'Essential', price: '₦5', desc: 'Core storefront functionality' },
    { name: 'Plus', price: '₦9', desc: 'Conversion & customization' },
    { name: 'Pro', price: '₦14', desc: 'Advanced interactions & AI' },
    { name: 'Studio', price: '₦19', desc: 'Premium components & automation' },
    { name: 'Signature', price: '₦25', desc: 'Flagship AI & business tools' },
  ];

  const features = [
    { category: 'Storefront', items: [
      { name: 'Industry-Specific Layout', values: [true, true, true, true, true] },
      { name: 'Basic Catalog', values: [true, true, true, true, true] },
      { name: 'Advanced Sections', values: [false, true, true, true, true] },
      { name: 'Premium Components', values: [false, false, false, true, true] },
      { name: 'Exclusive Design Systems', values: [false, false, false, false, true] },
    ]},
    { category: 'Intelligence', items: [
      { name: 'Basic Analytics', values: [true, true, true, true, true] },
      { name: 'AI Features', values: [false, false, true, true, true] },
      { name: 'Flagship AI Agents', values: [false, false, false, false, true] },
    ]},
    { category: 'Operations', items: [
      { name: 'Advanced Customization', values: [false, true, true, true, true] },
      { name: 'Conversion Tools', values: [false, false, true, true, true] },
      { name: 'Advanced Automation', values: [false, false, false, true, true] },
      { name: 'Premium Business Tools', values: [false, false, false, false, true] },
    ]}
  ];

  return (
    <div className="bg-white rounded-2xl border border-[var(--border-color)] overflow-hidden shadow-sm">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr>
              <th className="p-6 bg-[var(--bg-tertiary)] border-b border-[var(--border-color)] w-1/3">
                <h3 className="font-extrabold text-black text-xl">Compare Tiers</h3>
                <p className="text-sm text-[var(--text-muted)] font-normal mt-1">Find the perfect experience for your business.</p>
              </th>
              {tiers.map((tier, i) => (
                <th key={i} className="p-6 bg-[var(--bg-tertiary)] border-b border-l border-[var(--border-color)] text-center min-w-[120px]">
                  <div className="font-bold text-black text-lg">{tier.name}</div>
                  <div className="font-black text-2xl text-[var(--accent-gray-dark)] my-1">{tier.price}<span className="text-[10px] uppercase text-[var(--text-muted)] tracking-wider">/3mo</span></div>
                  <div className="text-xs text-[var(--text-muted)] font-normal leading-tight">{tier.desc}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {features.map((section, sIdx) => (
              <React.Fragment key={sIdx}>
                <tr>
                  <td colSpan={6} className="bg-gray-50 py-3 px-6 font-bold text-sm text-black border-b border-[var(--border-color)] uppercase tracking-wider">
                    {section.category}
                  </td>
                </tr>
                {section.items.map((item, iIdx) => (
                  <tr key={iIdx} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6 border-b border-[var(--border-color)] text-sm font-medium text-gray-700">
                      {item.name}
                    </td>
                    {item.values.map((val, vIdx) => (
                      <td key={vIdx} className="py-4 px-6 border-b border-l border-[var(--border-color)] text-center">
                        {val ? (
                          <Check size={18} className="text-green-500 mx-auto" />
                        ) : (
                          <Minus size={18} className="text-gray-300 mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StoreComparison;
