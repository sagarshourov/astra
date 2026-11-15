import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import ChatDashboard from '@/components/ChatDashboard';
export default async function Dashboard(){const session=await auth();if(!session?.user?.id)redirect('/login');return <ChatDashboard name={session.user.name||session.user.email||'Friend'}/>}
