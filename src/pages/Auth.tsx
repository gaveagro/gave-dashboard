
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

const Auth = () => {
  const { user, signIn } = useAuth();
  const { toast } = useToast();
  const { language, setLanguage, t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error.message);
      }
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError('Por favor ingresa tu correo electrónico primero');
      return;
    }

    setResetLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) throw error;

      toast({
        title: "Correo de restablecimiento enviado",
        description: "Revisa tu correo para restablecer tu contraseña",
      });
    } catch (err: any) {
      setError(err.message || 'Error al enviar correo de restablecimiento');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-between items-center mb-4">
            <div></div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
              className="flex items-center gap-2"
            >
              <Globe className="h-4 w-4" />
              {language === 'es' ? 'EN' : 'ES'}
            </Button>
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-agave bg-clip-text text-transparent">
            Gavé Dashboard
          </CardTitle>
          <CardDescription>
            {t('auth.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder={t('auth.emailPlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('auth.signIn')}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Button 
              variant="link" 
              onClick={handleResetPassword}
              disabled={resetLoading}
              className="text-sm"
            >
              {resetLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('auth.forgotPassword')}
            </Button>
          </div>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>{t('auth.noAccess')}</p>
            <p>{t('auth.contactAdmin')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
