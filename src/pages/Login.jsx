import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const ALLOWED_EMAIL = 'samyak@teachmint.com';
const HARDCODED_OTP = '190231';

const Login = () => {
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState('email'); // 'email' or 'otp'
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSendOtp = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Simulate API delay
        setTimeout(() => {
            if (email !== ALLOWED_EMAIL) {
                setError('Not allowed');
                setLoading(false);
                return;
            }

            setStep('otp');
            setLoading(false);
        }, 500);
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Simulate API delay
        setTimeout(() => {
            if (otp === HARDCODED_OTP) {
                sessionStorage.setItem('ifp_dashboard_session', 'true');
                navigate('/dashboard');
            } else {
                setError('Invalid OTP');
            }
            setLoading(false);
        }, 500);
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h2>IFP Dashboard Login</h2>
                {error && <div className="error-message">{error}</div>}

                {step === 'email' ? (
                    <form onSubmit={handleSendOtp}>
                        <div className="form-group">
                            <label>Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your email"
                                required
                            />
                        </div>
                        <button type="submit" disabled={loading}>
                            {loading ? 'Processing...' : 'Send OTP'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOtp}>
                        <div className="form-group">
                            <label>Enter OTP</label>
                            <input
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                placeholder="Enter OTP"
                                required
                            />
                        </div>
                        <div className="email-display">
                            Sent to: {email} <span onClick={() => { setStep('email'); setOtp(''); setError(''); }}>(Change)</span>
                        </div>
                        <button type="submit" disabled={loading}>
                            {loading ? 'Verifying...' : 'Login'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default Login;
