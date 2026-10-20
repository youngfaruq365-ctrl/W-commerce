import React, { useState, useEffect } from 'react';
import { storeRegistry } from '../../store-config/storeRegistry';
import { generateStyleProfile } from '../../engines/universal/styles/ExperienceStyleGenerator';

const detectDuplicateProfiles = (stores) => {
  const map = {};
  const duplicates = [];
  stores.forEach(store => {
    try {
      const profile = generateStyleProfile(store);
      const key = `${profile.hero}-${profile.grid}-${profile.nav}`;
      if (map[key]) {
        duplicates.push({ storeId: store.id, duplicatesWith: map[key] });
      } else {
        map[key] = store.id;
      }
    } catch(e) {}
  });
  return duplicates;
};

export const StoreVerifier = () => {
  const [stores, setStores] = useState([]);
  const [duplicates, setDuplicates] = useState([]);

  useEffect(() => {
    // Generate profiles for all stores to verify config integrity
    const mappedStores = storeRegistry.map(store => {
      try {
        const profile = generateStyleProfile(store);
        return { ...store, profile, status: 'PASS' };
      } catch (err) {
        return { ...store, status: 'FAIL', error: err.message };
      }
    });

    setStores(mappedStores);
    setDuplicates(detectDuplicateProfiles(storeRegistry));
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-black mb-2">Dev: Store Verification Engine</h1>
        <p className="text-gray-500 mb-8">Validating {storeRegistry.length} Store Configurations...</p>

        {duplicates.length > 0 && (
          <div className="bg-red-100 border-l-4 border-red-500 p-4 mb-8">
            <h3 className="font-bold text-red-700">Duplicate Profiles Detected!</h3>
            <ul className="list-disc pl-5 text-red-600">
              {duplicates.map((d, i) => (
                <li key={i}>{d.storeId} has identical layout to {d.duplicatesWith}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-bold text-sm text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 font-bold text-sm text-gray-500 uppercase tracking-wider">Store ID</th>
                <th className="px-6 py-4 font-bold text-sm text-gray-500 uppercase tracking-wider">Engine</th>
                <th className="px-6 py-4 font-bold text-sm text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-6 py-4 font-bold text-sm text-gray-500 uppercase tracking-wider">Generated Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {stores.map(store => (
                <tr key={store.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${store.status === 'PASS' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {store.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-gray-900">{store.id}</td>
                  <td className="px-6 py-4 text-gray-500 capitalize">{store.engine}</td>
                  <td className="px-6 py-4 font-black">₦{store.price}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                    {store.profile?.hero} + {store.profile?.grid} + {store.profile?.nav}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
