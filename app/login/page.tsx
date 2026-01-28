import { redirect } from 'next/navigation'

export default function LoginPageRedirect() {
    redirect('/admin/login')
}
