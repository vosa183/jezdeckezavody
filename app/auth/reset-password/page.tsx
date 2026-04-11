'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const supabase = createClient()
  const router = useRouter()

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.updateUser({
      password: password
    })

    if (error) {
      setMessage('Chyba: ' + error.message)
    } else {
      setMessage('Heslo bylo úspěšně změněno! Přesměrovávám...')
      setTimeout(() => router.push('/login'), 2000)
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <form onSubmit={handleReset} className="p-8 bg-white shadow-md rounded-lg border border-gray-200 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4 text-center">Nastavit nové heslo</h1>
        <input
          type="password"
          placeholder="Nové heslo"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 mb-4 border border-gray-300 rounded text-black"
          required
          minLength={6}
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Ukládám...' : 'Uložit nové heslo'}
        </button>
        {message && <p className="mt-4 text-center text-sm font-semibold">{message}</p>}
      </form>
    </div>
  )
}
