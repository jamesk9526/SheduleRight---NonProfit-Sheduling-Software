'use client'

import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useHelpShortcut } from '@/lib/hooks/useHelpShortcut'
import { getApiBaseUrl } from '@/lib/apiBase'

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
const API_BASE_URL = getApiBaseUrl()

async function loginUser(credentials: LoginCredentials): Promise<LoginResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
      credentials: 'include',
    })

    if (!response.ok) {
      const error: LoginError = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
        code: 'HTTP_ERROR',
        statusCode: response.status,
      }))
      throw new Error(error.error || 'Login failed')
    }

    const data = await response.json()
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
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showDebug, setShowDebug] = useState(false)
  const [branding, setBranding] = useState<{ logoUrl?: string; primaryColor?: string; secondaryColor?: string; name?: string } | null>(null)

  // Enable help keyboard shortcuts
  useHelpShortcut()

  const orgIdFromQuery = searchParams?.get('orgId') || process.env.NEXT_PUBLIC_DEFAULT_ORG_ID || ''

  useEffect(() => {
    const loadBranding = async () => {
      if (!orgIdFromQuery) return
      try {
        const res = await fetch(`${API_BASE_URL}/api/public/orgs/${orgIdFromQuery}/branding`)
        if (!res.ok) return
        const data = await res.json()
        setBranding(data.data)
      } catch (e) {
        console.warn('Branding fetch failed', e)
      }
    }
    loadBranding()
  }, [orgIdFromQuery])

  const primaryColor = branding?.primaryColor || '#4F46E5'
  const secondaryColor = branding?.secondaryColor || '#10B981'

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--brand-primary', primaryColor)
    root.style.setProperty('--brand-secondary', secondaryColor)
  }, [primaryColor, secondaryColor])

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
      alert(`❌ API is not reachable\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n\nMake sure the server is running on port 5710`)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 branded-bg">
      <div className="w-full max-w-md">
        <div className="bg-white shadow-2xl rounded-2xl p-8 border border-gray-100 brand-card">
          {/* Header */}
          <div className="text-center mb-8">
            {branding?.logoUrl ? (
              <div className="flex justify-center mb-4">
                <div className="bg-gray-50 rounded-lg p-3 shadow-sm">
                  <img src={branding.logoUrl} alt={branding.name || 'Organization logo'} className="h-12 object-contain" />
                </div>
              </div>
            ) : null}
            <h1 className="text-3xl md:text-4xl font-bold brand-gradient-text break-words leading-tight">{branding?.name || 'ScheduleRight'}</h1>
            <p className="mt-3 text-gray-600 text-sm font-medium">Sign in to your account</p>
            <p className="mt-2 text-xs text-neutral-500">Need a brand change? Update it in Org → Settings.</p>
            <div className="mt-4">
              <Link href="/help" className="inline-flex items-center gap-2 text-sm font-medium brand-link hover:opacity-80 transition-opacity">
                <span className="text-base">📚</span>
                <span>Need help? Visit our Help Center</span>
              </Link>
            </div>
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
              💡 Hint: Make sure the API server is running on port 5710. 
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
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[color:var(--brand-primary)] focus:border-transparent transition-all duration-200"
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
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[color:var(--brand-primary)] focus:border-transparent transition-all duration-200"
            placeholder="Enter your password"
            disabled={loginMutation.isPending}
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loginMutation.isPending}
          className="w-full text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed brand-btn shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
        >
          {loginMutation.isPending ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

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
                className="px-3 py-1 rounded font-semibold text-white brand-btn"
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
      </div>
      <style jsx global>{`
        :root {
          --brand-primary: #4F46E5;
          --brand-secondary: #10B981;
        }
        
        .branded-bg {
          background: linear-gradient(
            135deg,
            color-mix(in srgb, var(--brand-primary) 15%, white) 0%,
            color-mix(in srgb, var(--brand-secondary) 15%, white) 50%,
            color-mix(in srgb, var(--brand-primary) 20%, white) 100%
          );
          animation: gradient-shift 15s ease infinite;
          background-size: 200% 200%;
        }
        
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        .brand-card {
          backdrop-filter: blur(10px);
          background: rgba(255, 255, 255, 0.95);
        }
        
        .brand-gradient-text {
          background: linear-gradient(
            90deg,
            var(--brand-primary),
            var(--brand-secondary)
          );
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .brand-link {
          color: var(--brand-primary);
          transition: all 0.2s;
        }
        
        .brand-link:hover {
          color: var(--brand-secondary);
          transform: translateX(4px);
        }
        
        .brand-btn {
          background: linear-gradient(
            135deg,
            var(--brand-primary),
            color-mix(in srgb, var(--brand-primary) 80%, var(--brand-secondary) 20%)
          );
        }
        
        .brand-btn:hover:not(:disabled) {
          background: linear-gradient(
            135deg,
            color-mix(in srgb, var(--brand-primary) 90%, black),
            color-mix(in srgb, var(--brand-primary) 70%, var(--brand-secondary) 30%)
          );
        }
      `}</style>
    </div>
  )
}
