import React from 'react';
import { X, CheckCircle, XCircle, Truck, User, FileText } from 'lucide-react';

const KycDetailsModal = ({ isOpen, onClose, verification, onApprove, onReject, isLoading }) => {
  if (!isOpen || !verification) return null;

  const isCourier = verification.isCourier || verification.type === 'COURIER_KYC';

  const parseJson = (str) => {
    if (!str) return null;
    try {
      return JSON.parse(str);
    } catch {
      return str;
    }
  };

  const identityData = parseJson(verification.identityData);
  const businessData = parseJson(verification.businessData);
  const ownershipData = parseJson(verification.ownershipData);
  const addressData = parseJson(verification.addressData);
  const payoutData = parseJson(verification.payoutData);
  const documents = parseJson(verification.documentUrls);

  // Courier profile fields
  const guarantorName = verification.guarantorName || verification.raw?.guarantorName;
  const guarantorPhone = verification.guarantorPhone || verification.raw?.guarantorPhone;
  const guarantorAddress = verification.guarantorAddress || verification.raw?.guarantorAddress;
  const driversLicenseUrl = verification.driversLicenseUrl || verification.raw?.driversLicenseUrl;
  const vehicles = verification.vehicles || verification.raw?.vehicles || [];

  const renderDataSection = (title, data) => {
    if (!data) return null;
    return (
      <div className="mb-6">
        <h4 className="font-bold text-lg mb-2 text-[var(--accent-primary)]">{title}</h4>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
          {Object.entries(data).map(([key, value]) => {
            if (typeof value === 'object' && value !== null) {
              return (
                <div key={key} className="mt-2">
                  <span className="font-semibold text-sm text-gray-500 uppercase">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                  <div className="ml-4 mt-1 border-l-2 border-gray-200 dark:border-gray-700 pl-2">
                     {Object.entries(value).map(([subK, subV]) => (
                        <div key={subK} className="flex flex-col sm:flex-row sm:justify-between text-sm py-1 border-b border-gray-100 dark:border-gray-700 last:border-0">
                          <span className="text-gray-500 capitalize">{subK.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <span className="font-medium">{String(subV)}</span>
                        </div>
                     ))}
                  </div>
                </div>
              );
            }
            return (
              <div key={key} className="flex flex-col sm:flex-row sm:justify-between text-sm py-1 border-b border-gray-200 dark:border-gray-700 last:border-0">
                <span className="text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                <span className="font-medium">{String(value)}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="modal-panel bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-200 text-gray-900 dark:text-gray-100">
        <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-800">
          <h2 className="font-black text-2xl text-black dark:text-white flex items-center gap-2">
            {isCourier && <Truck size={24} className="text-blue-500" />}
            {isCourier ? 'Courier Verification Details' : 'Verification Details'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500 transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200 dark:border-gray-800">
             <div>
                <p className="text-sm text-gray-500 uppercase font-bold tracking-wider mb-1">Applicant</p>
                <p className="font-black text-xl">{verification.user?.fullName || verification.store?.storeName || 'Unknown'}</p>
                <p className="text-gray-500">{verification.user?.email || verification.email}</p>
             </div>
             <div className="ml-auto text-right">
                <p className="text-sm text-gray-500 uppercase font-bold tracking-wider mb-1">Status</p>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase ${verification.status === 'APPROVED' ? 'bg-green-100 text-green-700' : verification.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                   {verification.status || 'PENDING'}
                </span>
                <p className="text-xs text-gray-400 mt-2">Submitted: {new Date(verification.createdAt).toLocaleDateString()}</p>
             </div>
          </div>

          {isCourier ? (
            <div className="space-y-6">
              {/* Guarantor Section */}
              <div>
                <h4 className="font-bold text-lg mb-3 text-blue-600 dark:text-blue-400 flex items-center gap-2">
                  <User size={18} /> Guarantor Information
                </h4>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-3 border border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center text-sm py-1 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-gray-500 font-medium">Full Name</span>
                    <span className="font-bold">{guarantorName || 'Not Provided'}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm py-1 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-gray-500 font-medium">Phone Number</span>
                    <span className="font-mono font-medium">{guarantorPhone || 'Not Provided'}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm py-1">
                    <span className="text-gray-500 font-medium">Physical Address</span>
                    <span className="font-medium text-right max-w-[250px]">{guarantorAddress || 'Not Provided'}</span>
                  </div>
                </div>
              </div>

              {/* Vehicles Section */}
              <div>
                <h4 className="font-bold text-lg mb-3 text-blue-600 dark:text-blue-400 flex items-center gap-2">
                  <Truck size={18} /> Registered Vehicles ({vehicles.length})
                </h4>
                {vehicles.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {vehicles.map((vh, i) => (
                      <div key={vh.id || i} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold uppercase bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{vh.type}</span>
                          <span className="font-mono text-xs font-bold bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">{vh.plateNumber}</span>
                        </div>
                        <p className="font-bold text-sm">{vh.make} {vh.model}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl text-center text-sm text-gray-500 border border-gray-200 dark:border-gray-700">No vehicles registered yet.</div>
                )}
              </div>

              {/* Driver's License */}
              <div>
                <h4 className="font-bold text-lg mb-3 text-blue-600 dark:text-blue-400 flex items-center gap-2">
                  <FileText size={18} /> Driver's License Document
                </h4>
                {driversLicenseUrl ? (
                  <a href={driversLicenseUrl} target="_blank" rel="noreferrer" className="block max-w-xs aspect-video bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:opacity-90 transition-opacity">
                    <img src={driversLicenseUrl} alt="Driver's License" className="w-full h-full object-cover" />
                  </a>
                ) : (
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl text-center text-sm text-gray-500 border border-gray-200 dark:border-gray-700">No license document uploaded.</div>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                <div className="space-y-2">
                  {renderDataSection('Identity Information', identityData)}
                  {renderDataSection('Business Information', businessData)}
                </div>
                <div className="space-y-2">
                  {renderDataSection('Ownership Information', ownershipData)}
                  {renderDataSection('Address Information', addressData)}
                  {renderDataSection('Payout Information', payoutData)}
                </div>
              </div>

              {documents && (Array.isArray(documents) ? documents.length > 0 : Object.keys(documents).length > 0) && (
                <div className="mt-4">
                  <h4 className="font-bold text-lg mb-2 text-[var(--accent-primary)]">Documents</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {Array.isArray(documents) ? documents.map((doc, idx) => (
                      <a key={idx} href={doc} target="_blank" rel="noreferrer" className="block aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:opacity-80 transition-opacity">
                        {doc.match(/\.(jpeg|jpg|gif|png)$/) != null ? (
                          <img src={doc} alt="Document" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-bold">Document {idx + 1}</div>
                        )}
                      </a>
                    )) : Object.entries(documents).map(([key, doc]) => (
                       <a key={key} href={doc} target="_blank" rel="noreferrer" className="flex flex-col aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:opacity-80 transition-opacity">
                        <div className="flex-1 w-full bg-gray-200 dark:bg-gray-900 flex items-center justify-center">
                            {typeof doc === 'string' && doc.match(/\.(jpeg|jpg|gif|png)$/) != null ? (
                              <img src={doc} alt={key} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-gray-400 text-xs font-bold p-2 text-center overflow-hidden break-words">{typeof doc === 'string' ? 'View Document' : 'View Data'}</span>
                            )}
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 p-2 text-xs font-bold text-center capitalize border-t border-gray-200 dark:border-gray-700">
                           {key.replace(/([A-Z])/g, ' $1').trim()}
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {(!identityData && !businessData && !ownershipData && !addressData && !payoutData) && (
                 <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg text-center text-gray-500">
                    No detailed KYC JSON data available for this request.
                 </div>
              )}
            </>
          )}
        </div>

        {(verification.status === 'PENDING' || verification.status === 'SUBMITTED' || !verification.status) && (
          <div className="border-t border-gray-200 dark:border-gray-800 p-5 flex justify-end gap-3 bg-gray-50 dark:bg-gray-900">
            <button 
              onClick={() => onReject(verification)}
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors disabled:opacity-50"
            >
              <XCircle size={18} />
              Reject
            </button>
            <button 
              onClick={() => onApprove(verification)}
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-white bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-50 shadow-md shadow-green-500/20"
            >
              <CheckCircle size={18} />
              Approve
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default KycDetailsModal;
