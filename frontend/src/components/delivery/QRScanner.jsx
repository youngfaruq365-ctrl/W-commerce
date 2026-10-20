import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const qrcodeRegionId = "html5qr-code-full-region";

const QRScanner = ({ onScanSuccess, onScanError }) => {
    const scannerRef = useRef(null);
    const successRef = useRef(onScanSuccess);
    const errorRef = useRef(onScanError);

    useEffect(() => {
        successRef.current = onScanSuccess;
        errorRef.current = onScanError;
    }, [onScanSuccess, onScanError]);

    useEffect(() => {
        if (!scannerRef.current) {
            scannerRef.current = new Html5QrcodeScanner(
                qrcodeRegionId,
                { fps: 10, qrbox: { width: 250, height: 250 } },
                false
            );

            scannerRef.current.render(
                (text, result) => {
                    if (import.meta.env.DEV) console.log("[QRScanner] Successfully scanned:", text);
                    successRef.current?.(text, result);
                },
                (error) => {
                    // html5-qrcode calls this constantly when no QR code is in frame
                    errorRef.current?.(error);
                }
            );
        }

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(error => {
                    // error ignored
                });
                scannerRef.current = null;
            }
        };
    }, []);

    return (
        <div className="w-full">
            <div id={qrcodeRegionId} className="w-full rounded-xl overflow-hidden" />
        </div>
    );
};

export default QRScanner;
