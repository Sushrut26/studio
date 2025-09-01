'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Chrome, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await login();
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mb-6">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              PollPULSE
            </h1>
            <div className="w-16 h-1 bg-gradient-to-r from-blue-600 to-purple-600 mx-auto rounded-full"></div>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">Join the Conversation</h2>
          <p className="text-gray-600 leading-relaxed">
            Discover what people think about the topics that matter. Vote, comment, and engage with polls from around the world.
          </p>
        </div>
        
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="pt-8 pb-8">
            <div className="space-y-4">
              <div className="text-center mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Get Started</h3>
                <p className="text-sm text-gray-500">Sign in with your Google account to start polling</p>
              </div>
              
              <Button
                onClick={handleLogin}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <Chrome className="mr-2 h-4 w-4" />
                    Continue with Google
                  </>
                )}
              </Button>
              
              <div className="text-center">
                <p className="text-xs text-gray-500">
                  By signing in, you agree to our terms of service and privacy policy
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="text-center space-y-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-blue-600 text-sm font-bold">✓</span>
              </div>
              <p className="text-xs text-gray-600">Vote on polls</p>
            </div>
            <div className="space-y-2">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-purple-600 text-sm font-bold">💬</span>
              </div>
              <p className="text-xs text-gray-600">Add comments</p>
            </div>
            <div className="space-y-2">
              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-indigo-600 text-sm font-bold">📊</span>
              </div>
              <p className="text-xs text-gray-600">See results</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

