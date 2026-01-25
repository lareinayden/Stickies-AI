'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAllUsers, type TestUser } from '@/lib/auth/users';
import { setCurrentUserId, getCurrentUserId } from '@/lib/auth/session';

export default function LoginPage() {
  const router = useRouter();
  const [users] = useState<TestUser[]>(getAllUsers());
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // If already logged in, redirect to home
    const currentUserId = getCurrentUserId();
    if (currentUserId) {
      router.push('/');
    }
  }, [router]);

  const handleLogin = async () => {
    if (!selectedUserId) {
      return;
    }

    setIsLoading(true);
    try {
      // Set user session on client (localStorage)
      setCurrentUserId(selectedUserId);

      // Set user session on server (cookie)
      const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: selectedUserId }),
      });

      if (!response.ok) {
        throw new Error('Failed to set session');
      }

      // Redirect to home page
      router.push('/');
    } catch (error) {
      console.error('Login error:', error);
      alert('Failed to login. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-8">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          🎤 Stickies AI
        </h1>
        <p className="text-gray-600 mb-8">
          Select an account to continue
        </p>

        <div className="space-y-4">
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => setSelectedUserId(user.id)}
              className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                selectedUserId === user.id
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-800">
                    {user.displayName}
                  </p>
                  <p className="text-sm text-gray-500">@{user.username}</p>
                </div>
                {selectedUserId === user.id && (
                  <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={handleLogin}
          disabled={!selectedUserId || isLoading}
          className="w-full mt-6 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Logging in...' : 'Continue'}
        </button>

        <p className="mt-4 text-xs text-gray-500 text-center">
          This is a mock authentication system for testing.
          <br />
          Real authentication will be implemented in Option 2.
        </p>
      </div>
    </main>
  );
}
