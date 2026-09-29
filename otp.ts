import crypto from 'crypto';
export function newOtp(){return String(crypto.randomInt(100000,1000000))}
export function hashOtp(orderId:string,otp:string){return crypto.createHmac('sha256',process.env.AUTH_SECRET||'change-me-in-production').update(`${orderId}:${otp}`).digest('hex')}
export function otpMatches(orderId:string,otp:string,hash:string){const a=Buffer.from(hashOtp(orderId,otp));const b=Buffer.from(hash);return a.length===b.length&&crypto.timingSafeEqual(a,b)}
