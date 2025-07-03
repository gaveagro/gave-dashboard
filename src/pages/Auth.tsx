import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Leaf, Mail, Lock, User } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import LanguageToggle from '@/components/LanguageToggle';

const Auth = () => {
  const { signIn, signUp, user } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });
  const { toast } = useToast();

  // Redirect if already authenticated
  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    if (error) setError(null);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await signIn(formData.email, formData.password);
    
    if (error) {
      setError(error.message);
    }
    
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await signUp(formData.email, formData.password, formData.name);
    
    if (error) {
      setError(error.message);
    } else {
      setError(null);
      toast({
        title: t('auth.signUpSuccess'),
        description: t('auth.checkEmail'),
      });
    }
    
    setLoading(false);
  };

  const handlePasswordReset = async () => {
    if (!formData.email) {
      setError(t('auth.enterEmailFirst'));
      return;
    }

    setResetLoading(true);
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      toast({
        title: t('auth.resetEmailSent'),
        description: t('auth.checkEmailForReset'),
      });
    }

    setResetLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      {/* Language Toggle */}
      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>
      
      <div className="w-full max-w-md space-y-6">
        {/* Logo and Header */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-white/90 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg border border-primary/20">
            <img 
              src="/lovable-uploads/18fae893-7739-4fe1-bd49-75690fca47bd.png" 
              alt="Gavé Logo" 
              className="w-16 h-12 object-contain"
            />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-agave bg-clip-text text-transparent">
              Gavé Agrotecnología
            </h1>
            <p className="text-muted-foreground mt-2">
              Plataforma de Inversiones en Agricultura Regenerativa
            </p>
          </div>
        </div>

        {/* Auth Form */}
        <Card className="border-primary/20 shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Leaf className="h-5 w-5 text-primary" />
              {t('auth.signIn')}
            </CardTitle>
            <CardDescription>
              Accede a tu panel de inversiones
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">{t('auth.signIn')}</TabsTrigger>
                <TabsTrigger value="signup">{t('auth.signUp')}</TabsTrigger>
              </TabsList>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {t('auth.email')}
                    </Label>
                    <Input
                      id="signin-email"
                      name="email"
                      type="email"
                      placeholder="tu@email.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="border-primary/20 focus:border-primary"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      {t('auth.password')}
                    </Label>
                    <Input
                      id="signin-password"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      className="border-primary/20 focus:border-primary"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-agave hover:opacity-90"
                    disabled={loading}
                  >
                    {loading ? t('common.loading') : t('auth.signIn')}
                  </Button>
                  
                  <Button 
                    type="button"
                    variant="link" 
                    className="w-full text-sm text-muted-foreground hover:text-primary"
                    onClick={handlePasswordReset}
                    disabled={resetLoading}
                  >
                    {resetLoading ? t('common.loading') : t('auth.forgotPassword')}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {t('auth.name')}
                    </Label>
                    <Input
                      id="signup-name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="border-primary/20 focus:border-primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {t('auth.email')}
                    </Label>
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="border-primary/20 focus:border-primary"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      {t('auth.password')}
                    </Label>
                    <Input
                      id="signup-password"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      className="border-primary/20 focus:border-primary"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-agave hover:opacity-90"
                    disabled={loading}
                  >
                    {loading ? t('common.loading') : t('auth.signUp')}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;