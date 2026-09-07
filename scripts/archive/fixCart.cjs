const fs = require('fs');

const lines = fs.readFileSync('src/pages/Cart.jsx', 'utf8').split('\n');
const newLines = lines.slice(0, 903); // keep up to index 902

const tail = `                      <div className="absolute inset-2 rounded-full border-4 border-transparent border-b-white border-l-white animate-[spin_1.5s_linear_infinite_reverse]"></div>
                      <div className="absolute inset-0 flex items-center justify-center text-3xl drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] animate-bounce">
                        {loadingStep === 1 && '🧮'}
                        {loadingStep === 2 && '🔎'}
                        {loadingStep === 3 && '🚀'}
                      </div>
                    </div>
                    <div className="text-xl font-bold text-black mb-2">
                      {loadingStep === 1 && 'Calculating Total Price...'}
                      {loadingStep === 2 && 'Checking Proof...'}
                      {loadingStep === 3 && 'Finalizing Payment...'}
                    </div>
                    <div className="text-sm text-[var(--text-muted)] animate-pulse">
                      Please do not close this window
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const Cart = () => {
  const { profile, fetchProfile } = useBuyerStore();
  const proStatus = profile?.proStatus;
  const [hasDismissedGate, setHasDismissedGate] = useState(false);
  
  useEffect(() => {
    if (fetchProfile) fetchProfile();
  }, [fetchProfile]);

  const showUpgradeGate = !proStatus?.isPro && !hasDismissedGate;

  const handleSubscribe = async () => {
    try {
      const res = await axios.post('/api/v1/pro-subscription/init', { tier: 'Pro' });
      if (res.data.authorization_url) {
        window.location.href = res.data.authorization_url;
      }
    } catch (err) {
      console.error('Subscription error', err);
    }
  };

  if (proStatus?.isPro) {
    return <Cart1 />;
  }

  return (
    <>
      <BasicCart />
      
      {showUpgradeGate && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[var(--bg-secondary)] border border-[var(--accent-gray)] rounded-2xl max-w-md w-full p-8 shadow-[0_0_40px_rgba(255,255,255,0.1)] relative">
            <button onClick={() => setHasDismissedGate(true)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-white">
              <X size={24} />
            </button>
            
            <div className="text-center mb-8">
              <span className="text-4xl mb-4 block">✨</span>
              <h2 className="text-2xl font-extrabold text-white tracking-widest mb-2">PRO CART OS</h2>
              <p className="text-[var(--text-muted)]">Your cart just got smarter.</p>
            </div>
            
            <ul className="space-y-3 mb-8 text-sm">
              <li className="flex items-center gap-3">
                <CheckCircle2 size={18} className="text-[var(--accent-gray)]" /> Multi-seller smart checkout
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 size={18} className="text-[var(--accent-gray)]" /> Inventory reservation
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 size={18} className="text-[var(--accent-gray)]" /> Price-change protection
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 size={18} className="text-[var(--accent-gray)]" /> Smart shipping
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 size={18} className="text-[var(--accent-gray)]" /> Buyer protection
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 size={18} className="text-[var(--accent-gray)]" /> AI cart optimization
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 size={18} className="text-[var(--accent-gray)]" /> One-click reorder
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 size={18} className="text-[var(--accent-gray)]" /> Advanced payment recovery
              </li>
            </ul>
            
            <div className="text-center mb-8">
               <div className="text-3xl font-bold text-white mb-1">$1</div>
               <div className="text-xs text-[var(--text-muted)] uppercase tracking-widest">First Payment</div>
            </div>
            
            <div className="space-y-3">
              <button onClick={handleSubscribe} className="w-full bg-[var(--accent-gray)] text-black font-bold py-4 rounded-xl hover:opacity-90 transition shadow-[0_0_15px_var(--accent-gray-dim)]">
                Unlock Pro Cart
              </button>
              <button onClick={() => setHasDismissedGate(true)} className="w-full bg-transparent border border-[var(--border-color)] text-[var(--text-main)] font-bold py-4 rounded-xl hover:bg-[var(--bg-tertiary)] transition">
                Continue with Basic Cart
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Cart;
`;

fs.writeFileSync('src/pages/Cart.jsx', newLines.join('\n') + '\n' + tail);
console.log('Fixed Cart.jsx');
