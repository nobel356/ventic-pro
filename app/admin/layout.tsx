import {cookies} from 'next/headers';import {redirect} from 'next/navigation';import {COOKIE,verify} from '@/lib/auth';
export default async function AdminLayout({children}:{children:React.ReactNode}){const c=await cookies();if(!verify(c.get(COOKIE)?.value))redirect('/login');return <>{children}</>}
