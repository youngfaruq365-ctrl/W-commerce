import React, { useState, useRef, useCallback } from 'react';
import { ShieldCheck, Camera, PenTool, X } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import Webcam from 'react-webcam';
import { motion, AnimatePresence } from 'framer-motion';

export const ProofVerification = ({ isOpen, onClose, onVerify }) => {
    const [method, setMethod] = useState('OTP'); // OTP, PHOTO, SIGNATURE
    const [otp, setOtp] = useState('');
    const [photo, setPhoto] = useState(null);

    const webcamRef = useRef(null);
    const sigCanvas = useRef({});

    const capture = useCallback(() => {
        if (webcamRef.current) {
            const imageSrc = webcamRef.current.getScreenshot();
            setPhoto(imageSrc);
        }
    }, [webcamRef]);

    const clearSignature = () => {
        if (sigCanvas.current) {
            sigCanvas.current.clear();
        }
    };

    if (!isOpen) return null;

    const handleComplete = () => {
        let proofData = null;
        if (method === 'OTP') proofData = otp;
        else if (method === 'PHOTO') proofData = photo;
        else if (method === 'SIGNATURE') {
            proofData = sigCanvas.current && !sigCanvas.current.isEmpty() ? sigCanvas.current.toDataURL() : null;
        }

        onVerify({ type: method, proofData });
        onClose();
    };

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end justify-center sm:items-center p-4"
            >
                <motion.div 
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
                >
                    <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                        <h2 className="text-white font-bold flex items-center">
                            <ShieldCheck size={18} className="mr-2 text-green-400" />
                            Delivery Verification
                        </h2>
                        <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-4">
                        <div className="flex bg-slate-950 rounded-lg p-1 mb-6">
                            {['OTP', 'PHOTO', 'SIGNATURE'].map(m => (
                                <button
                                    key={m}
                                    onClick={() => setMethod(m)}
                                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
                                        method === m ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'
                                    }`}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>

                        <div className="min-h-[150px] flex flex-col items-center justify-center bg-slate-950/50 rounded-xl border border-dashed border-slate-800 p-6">
                            {method === 'OTP' && (
                                <div className="w-full">
                                    <label className="text-xs text-slate-400 uppercase font-semibold block mb-2 text-center">Ask Customer for Code</label>
                                    <input 
                                        type="text" 
                                        maxLength={6}
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                                        placeholder="••••••"
                                    />
                                </div>
                            )}

                            {method === 'PHOTO' && (
                                <div className="text-center w-full">
                                    {!photo ? (
                                        <div className="relative rounded-xl overflow-hidden border border-slate-700 w-full aspect-video bg-black">
                                            <Webcam
                                                audio={false}
                                                ref={webcamRef}
                                                screenshotFormat="image/jpeg"
                                                videoConstraints={{ facingMode: "environment" }}
                                                className="w-full h-full object-cover"
                                            />
                                            <button 
                                                onClick={capture}
                                                className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white text-slate-900 rounded-full p-3 shadow-lg hover:scale-105 transition"
                                            >
                                                <Camera size={24} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="relative rounded-xl overflow-hidden border border-slate-700 w-full aspect-video">
                                            <img src={photo} alt="Delivery proof" className="w-full h-full object-cover" />
                                            <button 
                                                onClick={() => setPhoto(null)}
                                                className="absolute top-2 right-2 bg-slate-900/80 text-white rounded-full p-1.5 hover:bg-red-500 transition"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {method === 'SIGNATURE' && (
                                <div className="text-center w-full relative">
                                    <div className="border border-slate-700 bg-white rounded-xl overflow-hidden touch-none h-48 w-full relative">
                                        <SignatureCanvas 
                                            ref={sigCanvas}
                                            penColor="black"
                                            canvasProps={{ className: 'w-full h-full cursor-crosshair' }}
                                        />
                                    </div>
                                    <button 
                                        onClick={clearSignature}
                                        className="mt-3 text-xs text-slate-400 hover:text-white transition flex items-center justify-center mx-auto"
                                    >
                                        <X size={14} className="mr-1" /> Clear Signature
                                    </button>
                                </div>
                            )}
                        </div>

                        <button 
                            onClick={handleComplete}
                            disabled={(method === 'OTP' && otp.length < 4) || (method === 'PHOTO' && !photo)}
                            className="w-full mt-6 bg-green-500 hover:bg-green-400 text-slate-950 font-bold py-3.5 rounded-xl shadow-[0_0_20px_rgba(34,197,94,0.3)] disabled:opacity-50 disabled:shadow-none transition-all"
                        >
                            Verify & Complete Delivery
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ProofVerification;
