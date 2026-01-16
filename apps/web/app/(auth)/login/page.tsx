'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface LoginCredentials {
  email: string
  password: string
}

interface LoginResponse {
  user: {
    id: string
    email: string
    name: string
    roles: string[]
    orgId: string
  }
  accessToken: string
  refreshToken: string
}

interface LoginError {
  error: string
  code: string
  statusCode: number
}

// API base URL - try multiple endpoints
const API_BASE_URL = typeof window !== 'undefined' 
  ? `http://${window.location.hostname}:3001`
  : 'http://localhost:3001'

async function loginUser(credentials: LoginCredentials): Promise<LoginResponse> {
  console.log('Attempting login to:', `${API_BASE_URL}/api/v1/auth/login`)
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
      credentials: 'include',
    })

    console.log('Response status:', response.status)

    if (!response.ok) {
      const error: LoginError = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
        code: 'HTTP_ERROR',
        statusCode: response.status,
      }))
      throw new Error(error.error || 'Login failed')
    }

    const data = await response.json()
    console.log('Login successful')
    return data
  } catch (error) {
    console.error('Login error:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Network error or server unreachable')
  }
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showDebug, setShowDebug] = useState(false)

  const loginMutation = useMutation({
    mutationFn: loginUser,
    onSuccess: (data) => {
      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('user', JSON.stringify(data.user))
      router.push('/dashboard')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      alert('Please fill in all fields')
      return
    }
    loginMutation.mutate({ email, password })
  }

  const testAPI = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`)
      const data = await response.json()
      alert(`✅ API is running!\n\n${JSON.stringify(data, null, 2)}`)
    } catch (error) {
      alert(`❌ API is not reachable\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n\nMake sure the server is running on port 3001`)
    }
  }

  return (
    <div className="bg-white shadow-lg rounded-lg p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-primary-600">ScheduleRight</h1>
        <p className="mt-2 text-neutral-600">Sign in to your account</p>
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error Message */}
        {loginMutation.isError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            <p className="text-sm font-medium mb-1">
              {loginMutation.error instanceof Error
                ? loginMutation.error.message
                : 'An error occurred during login'}
            </p>
            <p className="text-xs text-red-600 mt-2">
              💡 Hint: Make sure the API server is running on port 3001. 
              <button 
                type="button"
                onClick={testAPI}
                className="underline ml-1 font-semibold hover:text-red-800"
              >
                Test API Connection
              </button>
            </p>
          </div>
        )}

        {/* Email Field */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-neutral-700 mb-1"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="admin@example.com"
            disabled={loginMutation.isPending}
          />
        </div>

        {/* Password Field */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-neutral-700 mb-1"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Enter your password"
            disabled={loginMutation.isPending}
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loginMutation.isPending}
          className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-neutral-400 text-white font-semibold py-2 px-4 rounded-md transition-colors duration-200"
        >
          {loginMutation.isPending ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      {/* Demo Credentials */}
      <div className="mt-6 pt-6 border-t border-neutral-200">
        <p className="text-xs text-neutral-500 text-center mb-3">
          Demo Credentials (Development Only)
        </p>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-neutral-50 p-3 rounded">
            <p className="font-semibold text-neutral-700">Admin</p>
            <p className="text-neutral-600 font-mono">admin@example.com</p>
            <p className="text-neutral-600 font-mono">admin123</p>
          </div>
          <div className="bg-neutral-50 p-3 rounded">
            <p className="font-semibold text-neutral-700">Staff</p>
            <p className="text-neutral-600 font-mono">staff@example.com</p>
            <p className="text-neutral-600 font-mono">staff123</p>
          </div>
        </div>
      </div>

      {/* Debug/Help Section */}
      <div className="mt-6 pt-6 border-t border-neutral-200">
        <button
          type="button"
          onClick={() => setShowDebug(!showDebug)}
          className="w-full text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          {showDebug ? '▼' : '▶'} {showDebug ? 'Hide' : 'Show'} Troubleshooting
        </button>
        
        {showDebug && (
          <div className="mt-4 space-y-3 text-xs bg-blue-50 p-3 rounded border border-blue-200">
            <div>
              <p className="font-semibold text-blue-900 mb-1">🔍 API Configuration:</p>
              <p className="text-blue-800 font-mono break-all">{API_BASE_URL}/api/v1/auth/login</p>
            </div>
            
            <div>
              <p className="font-semibold text-blue-900 mb-1">✅ Test Connection:</p>
              <button
                type="button"
                onClick={testAPI}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded font-semibold"
              >
                Check API Health
              </button>
            </div>

            <div>
              <p className="font-semibold text-blue-900 mb-1">📋 Next Steps:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>Make sure the server is running: <code className="bg-white px-1">pnpm dev</code></li>
                <li>Verify CouchDB is accessible (will show in health check)</li>
                <li>Check browser console for detailed errors</li>
                <li>Visit <Link href="/status" className="underline">API Status Page</Link></li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
