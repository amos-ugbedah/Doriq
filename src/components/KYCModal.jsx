import React, { useState, useEffect } from 'react';

import API_BASE from "../config/api";

const countries = [
    { code: "US", name: "United States", idLabel: "SSN (XXX-XX-XXXX)", documentType: "ssn", currency: "USD" },
    { code: "GB", name: "United Kingdom", idLabel: "National Insurance Number", documentType: "nino", currency: "GBP" },
    { code: "CA", name: "Canada", idLabel: "Social Insurance Number", documentType: "sin", currency: "CAD" },
    { code: "NG", name: "Nigeria", idLabel: "NIN (11 digits)", documentType: "nin", currency: "NGN" },
    { code: "KE", name: "Kenya", idLabel: "National ID", documentType: "national_id", currency: "KES" },
    { code: "GH", name: "Ghana", idLabel: "Ghana Card", documentType: "ghana_card", currency: "GHS" },
    { code: "ZA", name: "South Africa", idLabel: "ID Number", documentType: "id_number", currency: "ZAR" },
    { code: "IN", name: "India", idLabel: "Aadhaar (12 digits)", documentType: "aadhaar", currency: "INR" },
    { code: "AU", name: "Australia", idLabel: "Tax File Number", documentType: "tfn", currency: "AUD" },
    { code: "DE", name: "Germany", idLabel: "Steuer ID", documentType: "steuer_id", currency: "EUR" },
    { code: "FR", name: "France", idLabel: "NIR (Social Security)", documentType: "nir", currency: "EUR" },
    { code: "IT", name: "Italy", idLabel: "Codice Fiscale", documentType: "codice_fiscale", currency: "EUR" },
    { code: "ES", name: "Spain", idLabel: "DNI / NIE", documentType: "nie", currency: "EUR" },
    { code: "JP", name: "Japan", idLabel: "My Number (12 digits)", documentType: "my_number", currency: "JPY" },
    { code: "BR", name: "Brazil", idLabel: "CPF (XXX.XXX.XXX-XX)", documentType: "cpf", currency: "BRL" },
    { code: "MX", name: "Mexico", idLabel: "CURP", documentType: "curp", currency: "MXN" }
].sort((a, b) => a.name.localeCompare(b.name));

export default function KYCModal({ userId, onVerified, onClose, isRequired = false }) {
    const [loading, setLoading] = useState(false);
    const [validating, setValidating] = useState(false);
    const [detectedCountry, setDetectedCountry] = useState(null);
    const [idValid, setIdValid] = useState(null);
    const [idErrorMessage, setIdErrorMessage] = useState('');
    const [uploadedDocument, setUploadedDocument] = useState(null);
    const [uploadedSelfie, setUploadedSelfie] = useState(null);
    const [documentPreview, setDocumentPreview] = useState(null);
    const [selfiePreview, setSelfiePreview] = useState(null);
    const [step, setStep] = useState(1); // 1: Personal Info, 2: Document Upload
    const [form, setForm] = useState({ 
        firstName: "", 
        lastName: "", 
        country: "US", 
        idNumber: "",
        phoneNumber: "",
        email: "",
        documentType: "national_id"
    });

    useEffect(() => {
        detectUserLocation();
        const fetchUserEmail = async () => {
            try {
                const res = await fetch(`${API_BASE}/user/${userId}`);
                const data = await res.json();
                if (data.success && data.email) {
                    setForm(prev => ({ ...prev, email: data.email }));
                }
            } catch (error) {
                console.error('Failed to fetch user email:', error);
            }
        };
        fetchUserEmail();
    }, [userId]);

    const detectUserLocation = async () => {
        try {
            const response = await fetch('https://ipapi.co/json/');
            const data = await response.json();
            const countryCode = data.country_code;
            const existingCountry = countries.find(c => c.code === countryCode);
            if (existingCountry) {
                setDetectedCountry(existingCountry);
                setForm(prev => ({ ...prev, country: countryCode }));
            }
        } catch (error) {
            console.error('Location detection failed:', error);
        }
    };

    const currentCountry = countries.find(c => c.code === form.country);
    const detectedCurrency = currentCountry?.currency || 'USD';

    const validateIdNumber = async (idNumber, countryCode) => {
        if (!idNumber || idNumber.length < 4) {
            setIdValid(null);
            setIdErrorMessage('');
            return;
        }

        setValidating(true);
        try {
            const res = await fetch(`${API_BASE}/validate-id`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    idNumber: idNumber,
                    countryCode: countryCode,
                    documentType: currentCountry?.documentType || 'national_id'
                })
            });
            const data = await res.json();
            
            if (data.valid) {
                setIdValid(true);
                setIdErrorMessage('');
            } else {
                setIdValid(false);
                setIdErrorMessage(data.message || 'Invalid ID format for this country');
            }
        } catch (error) {
            console.error('Validation error:', error);
            setIdValid(null);
        } finally {
            setValidating(false);
        }
    };

    const handleIdNumberChange = (value) => {
        setForm({ ...form, idNumber: value });
        validateIdNumber(value, form.country);
    };

    const handleDocumentUpload = (e, type) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert('Image must be less than 5MB');
                return;
            }
            
            const reader = new FileReader();
            reader.onloadend = () => {
                if (type === 'document') {
                    setDocumentPreview(reader.result);
                    setUploadedDocument(reader.result.split(',')[1]);
                } else {
                    setSelfiePreview(reader.result);
                    setUploadedSelfie(reader.result.split(',')[1]);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleNext = () => {
        if (!form.idNumber || !form.firstName || !form.lastName) {
            alert("Please complete all required fields.");
            return;
        }
        if (idValid !== true) {
            alert("Please enter a valid ID number for your selected country.");
            return;
        }
        setStep(2);
    };

    const handleBack = () => {
        setStep(1);
    };

    const handleVerify = async () => {
        if (!uploadedDocument || !uploadedSelfie) {
            alert("Please upload both your ID document and a selfie.");
            return;
        }
        
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/upload-kyc-document`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    userId, 
                    documentType: currentCountry?.documentType || 'national_id',
                    documentImage: uploadedDocument,
                    selfieImage: uploadedSelfie
                })
            });
            const uploadData = await res.json();
            
            if (uploadData.success) {
                const verifyRes = await fetch(`${API_BASE}/verify-kyc`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        userId, 
                        ...form,
                        currency: detectedCurrency,
                        idValid: idValid
                    })
                });
                const data = await verifyRes.json();
                if (verifyRes.ok && data.success) {
                    alert(`✅ Identity Verification Submitted!\n\nYour documents have been submitted for review.\nWe'll notify you within 24-48 hours.`);
                    if (onVerified) onVerified();
                } else {
                    alert(data.error || "Verification submission failed.");
                }
            } else {
                alert("Failed to upload documents. Please try again.");
            }
        } catch (e) { 
            alert("Verification system error. Please try again later."); 
        }
        setLoading(false);
    };

    const getValidationIcon = () => {
        if (validating) return <span className="text-yellow-400 animate-pulse">⏳</span>;
        if (idValid === true) return <span className="text-green-400">✅</span>;
        if (idValid === false) return <span className="text-red-400">❌</span>;
        return null;
    };

    return (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[400] flex items-center justify-center p-4 overflow-auto">
            <div className="bg-zinc-900 w-full max-w-2xl rounded-3xl border border-white/10 shadow-2xl relative">
                {/* Header */}
                <div className="p-6 border-b border-white/10">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-black italic text-white">Verify Your Identity</h2>
                            <p className="text-zinc-500 text-xs mt-1">
                                Step {step} of 2 • {step === 1 ? 'Personal Information' : 'Document Upload'}
                            </p>
                        </div>
                        {!isRequired && (
                            <button onClick={onClose} className="text-zinc-500 hover:text-white text-xl">✕</button>
                        )}
                    </div>
                    {/* Progress Bar */}
                    <div className="mt-4 h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div className={`h-full bg-blue-600 transition-all duration-300 ${step === 1 ? 'w-1/2' : 'w-full'}`}></div>
                    </div>
                </div>

                {/* Step 1: Personal Information */}
                {step === 1 && (
                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <input 
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-blue-500 outline-none" 
                                placeholder="First Name *" 
                                value={form.firstName}
                                onChange={e => setForm({...form, firstName: e.target.value})} 
                            />
                            <input 
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-blue-500 outline-none" 
                                placeholder="Last Name *" 
                                value={form.lastName}
                                onChange={e => setForm({...form, lastName: e.target.value})} 
                            />
                        </div>
                        
                        <select 
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-blue-500 outline-none" 
                            value={form.country}
                            onChange={e => {
                                setForm({...form, country: e.target.value, idNumber: ''});
                                setIdValid(null);
                            }}
                        >
                            {countries.map(c => (
                                <option key={c.code} value={c.code} className="bg-zinc-900">
                                    {c.name} ({c.currency})
                                </option>
                            ))}
                        </select>

                        <div className="relative">
                            <input 
                                className={`w-full bg-black/40 border rounded-xl p-3 text-sm font-mono text-white focus:border-blue-500 outline-none transition-all ${
                                    idValid === true ? 'border-green-500' : idValid === false ? 'border-red-500' : 'border-white/10'
                                }`} 
                                placeholder={`${currentCountry?.idLabel || "ID Number"} *`}
                                value={form.idNumber}
                                onChange={e => handleIdNumberChange(e.target.value)} 
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                {getValidationIcon()}
                            </div>
                        </div>
                        {idValid === false && idErrorMessage && (
                            <p className="text-red-400 text-[10px] -mt-2">{idErrorMessage}</p>
                        )}
                        {idValid === true && (
                            <p className="text-green-400 text-[10px] -mt-2">✓ Valid format for {currentCountry?.name}</p>
                        )}

                        <input 
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-blue-500 outline-none" 
                            placeholder="Phone Number (with country code)"
                            value={form.phoneNumber}
                            onChange={e => setForm({...form, phoneNumber: e.target.value})} 
                        />

                        <input 
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-blue-500 outline-none" 
                            placeholder="Email Address"
                            type="email"
                            value={form.email}
                            onChange={e => setForm({...form, email: e.target.value})} 
                        />

                        <button 
                            onClick={handleNext}
                            disabled={idValid !== true || !form.firstName || !form.lastName || !form.idNumber}
                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 py-3 rounded-xl font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Continue to Document Upload →
                        </button>
                    </div>
                )}

                {/* Step 2: Document Upload */}
                {step === 2 && (
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="text-zinc-400 text-sm block mb-2">📄 Upload ID Document (Passport/Driver's License/National ID)</label>
                            <div className="border-2 border-dashed border-white/20 rounded-xl p-4 text-center hover:border-blue-500 transition-colors cursor-pointer"
                                 onClick={() => document.getElementById('documentInput').click()}>
                                {documentPreview ? (
                                    <img src={documentPreview} alt="Document Preview" className="max-h-32 mx-auto rounded-lg" />
                                ) : (
                                    <div>
                                        <div className="text-4xl mb-2">📄</div>
                                        <p className="text-zinc-400 text-sm">Click to upload ID document</p>
                                        <p className="text-zinc-600 text-xs mt-1">JPG, PNG up to 5MB</p>
                                    </div>
                                )}
                                <input id="documentInput" type="file" accept="image/*" onChange={(e) => handleDocumentUpload(e, 'document')} className="hidden" />
                            </div>
                        </div>

                        <div>
                            <label className="text-zinc-400 text-sm block mb-2">📸 Selfie with ID (Hold ID next to your face)</label>
                            <div className="border-2 border-dashed border-white/20 rounded-xl p-4 text-center hover:border-blue-500 transition-colors cursor-pointer"
                                 onClick={() => document.getElementById('selfieInput').click()}>
                                {selfiePreview ? (
                                    <img src={selfiePreview} alt="Selfie Preview" className="max-h-32 mx-auto rounded-lg" />
                                ) : (
                                    <div>
                                        <div className="text-4xl mb-2">📸</div>
                                        <p className="text-zinc-400 text-sm">Click to upload selfie</p>
                                        <p className="text-zinc-600 text-xs mt-1">Hold ID next to your face</p>
                                    </div>
                                )}
                                <input id="selfieInput" type="file" accept="image/*" onChange={(e) => handleDocumentUpload(e, 'selfie')} className="hidden" />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={handleBack} className="flex-1 bg-zinc-700 hover:bg-zinc-600 py-3 rounded-xl font-bold text-white">
                                ← Back
                            </button>
                            <button 
                                onClick={handleVerify} 
                                disabled={loading || !uploadedDocument || !uploadedSelfie} 
                                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 py-3 rounded-xl font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? "SUBMITTING..." : "SUBMIT FOR REVIEW"}
                            </button>
                        </div>

                        <p className="text-zinc-500 text-[10px] text-center">
                            Your documents will be reviewed within 24-48 hours.
                            We'll notify you once your identity is verified.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}