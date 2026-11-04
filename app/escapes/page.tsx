import { redirect } from 'next/navigation'

// Escapes has become the Shop. Keep old links working.
export default function Page() {
  redirect('/shop')
}
