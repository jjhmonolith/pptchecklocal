'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ConfigStatus {
  valid: boolean;
  config?: {
    auth: { passwordSet: boolean; jwtSecretSet: boolean };
    server: { port: number; nodeEnv: string };
    ai: { anthropicApiKey: boolean; openaiApiKey: boolean };
    files: { maxSizeMB: number; cleanupIntervalHours: number; uploadTimeoutSeconds: number };
    cloudflare: { tunnelTokenSet: boolean; domainSet: boolean };
  };
  files?: {
    envLocalExists: boolean;
    envExampleContent: string;
  };
  system?: {
    nodeVersion: string;
    platform: string;
    pid: number;
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
  };
  error?: string;
}

interface TunnelStatus {
  status: {
    configured: boolean;
    cloudflaredInstalled: boolean;
    tunnelRunning: boolean;
    accessible: boolean;
  };
  config: {
    tokenSet: boolean;
    token: string | null;
    domain: string | null;
  };
  process: {
    running: boolean;
    pids: string[];
    count: number;
  };
  cloudflared: {
    installed: boolean;
    version: string;
  };
  urls: {
    local: string;
    tunnel: string | null;
  };
}

export default function SettingsPage() {
  const [configStatus, setConfigStatus] = useState<ConfigStatus | null>(null);
  const [tunnelStatus, setTunnelStatus] = useState<TunnelStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // 폼 상태
  const [formData, setFormData] = useState({
    authPassword: '',
    jwtSecret: '',
    anthropicApiKey: '',
    openaiApiKey: '',
    tunnelToken: '',
    domain: ''
  });

  // 설정 로드
  const loadConfig = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/config', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setConfigStatus(data);
      } else {
        throw new Error('설정 로드 실패');
      }
    } catch (err) {
      setError('설정 로드 중 오류가 발생했습니다.');
      console.error(err);
    }
  };

  // 터널 상태 로드
  const loadTunnelStatus = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/tunnel', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTunnelStatus(data);
      } else {
        console.warn('터널 상태 로드 실패');
      }
    } catch (err) {
      console.warn('터널 상태 로드 중 오류:', err);
    }
  };

  // 초기 로드
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([loadConfig(), loadTunnelStatus()]);
      setLoading(false);
    };
    load();
  }, []);

  // 환경변수 업데이트
  const updateConfig = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      const token = localStorage.getItem('auth-token');
      const configToUpdate: Record<string, string> = {};
      
      if (formData.authPassword) configToUpdate.AUTH_PASSWORD = formData.authPassword;
      if (formData.jwtSecret) configToUpdate.JWT_SECRET = formData.jwtSecret;
      if (formData.anthropicApiKey) configToUpdate.ANTHROPIC_API_KEY = formData.anthropicApiKey;
      if (formData.openaiApiKey) configToUpdate.OPENAI_API_KEY = formData.openaiApiKey;
      if (formData.tunnelToken) configToUpdate.CLOUDFLARE_TUNNEL_TOKEN = formData.tunnelToken;
      if (formData.domain) configToUpdate.CLOUDFLARE_DOMAIN = formData.domain;
      
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'update_env',
          config: configToUpdate
        })
      });
      
      if (response.ok) {
        setSuccess('설정이 업데이트되었습니다. 서버 재시작을 권장합니다.');
        await loadConfig(); // 설정 다시 로드
        
        // 폼 초기화
        setFormData({
          authPassword: '',
          jwtSecret: '',
          anthropicApiKey: '',
          openaiApiKey: '',
          tunnelToken: '',
          domain: ''
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || '설정 업데이트 실패');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '설정 업데이트 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // .env.local 파일 생성
  const createEnvLocal = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'create_env_local'
        })
      });
      
      if (response.ok) {
        setSuccess('.env.local 파일이 생성되었습니다.');
        await loadConfig();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || '파일 생성 실패');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '파일 생성 중 오류가 발생했습니다.');
    }
  };

  // 터널 제어
  const controlTunnel = async (action: string) => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/tunnel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });
      
      if (response.ok) {
        const data = await response.json();
        setSuccess(data.message || `터널 ${action} 완료`);
        await loadTunnelStatus(); // 상태 다시 로드
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || `터널 ${action} 실패`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `터널 ${action} 중 오류가 발생했습니다.`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">설정을 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* 헤더 */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">시스템 설정</h1>
          <p className="text-gray-600">환경변수와 터널 설정을 관리합니다</p>
        </div>

        {/* 에러/성공 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        )}

        {/* 시스템 상태 */}
        {configStatus && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {configStatus.valid ? (
                  <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                ) : (
                  <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                )}
                시스템 상태
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {configStatus.valid ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">보안 설정</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>패스워드:</span>
                        <span className={configStatus.config?.auth.passwordSet ? 'text-green-600' : 'text-red-600'}>
                          {configStatus.config?.auth.passwordSet ? '설정됨' : '미설정'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>JWT 시크릿:</span>
                        <span className={configStatus.config?.auth.jwtSecretSet ? 'text-green-600' : 'text-red-600'}>
                          {configStatus.config?.auth.jwtSecretSet ? '설정됨' : '미설정'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">AI API</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Anthropic (Claude):</span>
                        <span className={configStatus.config?.ai.anthropicApiKey ? 'text-green-600' : 'text-gray-500'}>
                          {configStatus.config?.ai.anthropicApiKey ? '설정됨' : '미설정'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>OpenAI (GPT):</span>
                        <span className={configStatus.config?.ai.openaiApiKey ? 'text-green-600' : 'text-gray-500'}>
                          {configStatus.config?.ai.openaiApiKey ? '설정됨' : '미설정'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">서버</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>포트:</span>
                        <span>{configStatus.config?.server.port}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>환경:</span>
                        <span>{configStatus.config?.server.nodeEnv}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">파일 처리</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>최대 크기:</span>
                        <span>{configStatus.config?.files.maxSizeMB}MB</span>
                      </div>
                      <div className="flex justify-between">
                        <span>정리 주기:</span>
                        <span>{configStatus.config?.files.cleanupIntervalHours}시간</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-red-600">
                  <p className="font-medium">설정 오류가 발견되었습니다:</p>
                  <p className="text-sm mt-1">{configStatus.error}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 터널 상태 */}
        {tunnelStatus && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {tunnelStatus.status.accessible ? (
                  <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                ) : tunnelStatus.status.tunnelRunning ? (
                  <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                ) : (
                  <span className="w-3 h-3 bg-gray-500 rounded-full"></span>
                )}
                Cloudflare 터널
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">설정 상태</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>cloudflared 설치:</span>
                      <span className={tunnelStatus.cloudflared.installed ? 'text-green-600' : 'text-red-600'}>
                        {tunnelStatus.cloudflared.installed ? `v${tunnelStatus.cloudflared.version}` : '미설치'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>터널 토큰:</span>
                      <span className={tunnelStatus.config.tokenSet ? 'text-green-600' : 'text-gray-500'}>
                        {tunnelStatus.config.tokenSet ? '설정됨' : '미설정'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>도메인:</span>
                      <span className={tunnelStatus.config.domain ? 'text-green-600' : 'text-gray-500'}>
                        {tunnelStatus.config.domain || '미설정'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">실행 상태</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>터널 실행:</span>
                      <span className={tunnelStatus.status.tunnelRunning ? 'text-green-600' : 'text-gray-500'}>
                        {tunnelStatus.status.tunnelRunning ? '실행 중' : '중지됨'}
                      </span>
                    </div>
                    {tunnelStatus.status.tunnelRunning && (
                      <div className="flex justify-between">
                        <span>프로세스 ID:</span>
                        <span className="text-gray-600">{tunnelStatus.process.pids.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* 접속 URL */}
              <div>
                <h4 className="font-medium mb-2">접속 주소</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">로컬:</span>
                    <a href={tunnelStatus.urls.local} target="_blank" rel="noopener noreferrer" 
                       className="text-blue-600 hover:underline">
                      {tunnelStatus.urls.local}
                    </a>
                  </div>
                  {tunnelStatus.urls.tunnel && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">터널:</span>
                      <a href={tunnelStatus.urls.tunnel} target="_blank" rel="noopener noreferrer" 
                         className="text-blue-600 hover:underline">
                        {tunnelStatus.urls.tunnel}
                      </a>
                    </div>
                  )}
                </div>
              </div>
              
              {/* 터널 제어 버튼 */}
              {tunnelStatus.cloudflared.installed && tunnelStatus.config.tokenSet && (
                <div className="flex gap-2">
                  {!tunnelStatus.status.tunnelRunning ? (
                    <Button onClick={() => controlTunnel('start')} size="sm">
                      터널 시작
                    </Button>
                  ) : (
                    <Button onClick={() => controlTunnel('stop')} variant="outline" size="sm">
                      터널 중지
                    </Button>
                  )}
                  <Button onClick={() => controlTunnel('restart')} variant="outline" size="sm">
                    터널 재시작
                  </Button>
                  <Button onClick={loadTunnelStatus} variant="outline" size="sm">
                    상태 새로고침
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 환경변수 설정 */}
        <Card>
          <CardHeader>
            <CardTitle>환경변수 설정</CardTitle>
            <CardDescription>
              환경변수를 업데이트합니다. 빈 값은 변경되지 않습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  로그인 패스워드
                </label>
                <Input
                  type="password"
                  value={formData.authPassword}
                  onChange={(e) => setFormData({...formData, authPassword: e.target.value})}
                  placeholder="새 패스워드 (변경시에만 입력)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  JWT 시크릿 (최소 32자)
                </label>
                <Input
                  type="password"
                  value={formData.jwtSecret}
                  onChange={(e) => setFormData({...formData, jwtSecret: e.target.value})}
                  placeholder="새 JWT 시크릿 (변경시에만 입력)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Anthropic API 키 (Claude)
                </label>
                <Input
                  type="password"
                  value={formData.anthropicApiKey}
                  onChange={(e) => setFormData({...formData, anthropicApiKey: e.target.value})}
                  placeholder="sk-ant-..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  OpenAI API 키 (GPT)
                </label>
                <Input
                  type="password"
                  value={formData.openaiApiKey}
                  onChange={(e) => setFormData({...formData, openaiApiKey: e.target.value})}
                  placeholder="sk-..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Cloudflare 터널 토큰
                </label>
                <Input
                  type="password"
                  value={formData.tunnelToken}
                  onChange={(e) => setFormData({...formData, tunnelToken: e.target.value})}
                  placeholder="터널 토큰"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  도메인 주소
                </label>
                <Input
                  value={formData.domain}
                  onChange={(e) => setFormData({...formData, domain: e.target.value})}
                  placeholder="your-app.your-domain.com"
                />
              </div>
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button 
                onClick={updateConfig} 
                disabled={saving}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {saving ? '저장 중...' : '설정 저장'}
              </Button>
              
              {configStatus && !configStatus.files?.envLocalExists && (
                <Button 
                  onClick={createEnvLocal} 
                  variant="outline"
                >
                  .env.local 파일 생성
                </Button>
              )}
              
              <Button 
                onClick={loadConfig} 
                variant="outline"
              >
                설정 새로고침
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 돌아가기 */}
        <div className="text-center">
          <Button 
            onClick={() => window.location.href = '/'}
            variant="outline"
          >
            메인으로 돌아가기
          </Button>
        </div>
      </div>
    </div>
  );
}