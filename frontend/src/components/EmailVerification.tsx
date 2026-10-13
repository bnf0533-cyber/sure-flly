import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api, errorMessage } from '../services/api';
import { authService } from '../services/auth.service';
import { useAuthStore } from '../store/authStore';
import { Button } from './common/Button';
export function EmailVerification() {
    const user=useAuthStore(s=>s.user), setUser=useAuthStore(s=>s.setUser);
    const location=useLocation(), navigate=useNavigate();
    const token=new URLSearchParams(location.hash.slice(1)).get('verify');
    const [busy,setBusy]=useState(false), [message,setMessage]=useState('');
    if (user?.emailVerified && !token) return null;
    async function act() {
        setBusy(true);setMessage('');
        try {
            if (token) { await api.post('/verification/confirm',{token}); setUser(await authService.me()); navigate(location.pathname,{replace:true}); }
            else { await api.post('/verification/request'); setMessage('נשלח קישור אימות. בדוק גם בספאם; אפשר לבקש שוב בעוד דקה.'); }
        } catch(error) {setMessage(errorMessage(error));} finally {setBusy(false);}
    }
    return <section dir="rtl" className="card p-4 mb-6 border-amber-200 bg-amber-50"><h2 className="font-semibold">אימות כתובת המייל</h2><p className="text-sm my-2">כדי לשלוח אליך עדכוני טיסות ומסמכים, יש לאמת את הכתובת {user?.email}.</p><Button loading={busy} onClick={()=>void act()}>{token?'אמת את הכתובת שלי':'שלח קישור אימות'}</Button>{message && <p role="status" className="text-sm mt-3">{message}</p>}</section>;
}
