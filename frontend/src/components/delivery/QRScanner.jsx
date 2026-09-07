import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const qrcodeRegionId = "html5qr-code-full-region";

const QRScanner = ({ onScanSuccess, onScanError }) => {
    const scannerRef = useRef(null);

    useEffect(() => {
        if (!scannerRef.current) {
            scannerRef.current = new Html5QrcodeScanner(
                qrcodeRegionId,
                { fps: 10, qrbox: { width: 250, height: 250 } },
                false
            );

            scannerRef.current.render(onScanSuccess, onScanError);
        }

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(error => {
                    // error ignored
                });
                scannerRef.current = null;
            }
        };
    }, [onScanSuccess, onScanError]);

    return (
        <div className="w-full">
            <div id={qrcodeRegionId} className="w-full rounded-xl overflow-hidden" />
        </div>
    );
};

export default QRScanner;
