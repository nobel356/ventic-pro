import crypto from 'crypto';
export const COOKIE='ventic_admin';
function secret(){return process.env.AUTH_SECRET||'change-me-in-production'}
export function sign(email:string){const sig=crypto.createHmac('sha256',secret()).update(email).digest('hex');return Buffer.from(`${email}|${sig}`).toString('base64url')}
export function verify(token?:string){if(!token)return null;try{const raw=Buffer.from(token,'base64url').toString();const i=raw.lastIndexOf('|');const email=raw.slice(0,i),sig=raw.slice(i+1),expected=crypto.createHmac('sha256',secret()).update(email).digest('hex');return crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected))?email:null}catch{return null}}
