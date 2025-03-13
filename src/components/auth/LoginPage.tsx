import React from 'react';
import { useState } from 'react';
import GoogleLoginButton from './GoogleLoginButton';
import { Button } from '../ui/button';
import { useToast } from '../../lib/use-toast';
import { ArrowRight, Check, Shield, Mail, BarChart3, Zap, Github, Code, Download, LineChart, Sparkles, Play, BarChart2, Code2, Copy, Lock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
} from "../ui/dialog";

// Define the props interface
export interface LoginPageProps {
  onSignIn: (token: string) => void;
}

export function LoginPage({ onSignIn }: LoginPageProps) {
  const [isResettingAuth, setIsResettingAuth] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const { toast } = useToast();

  const handleForceReauth = async () => {
    setIsResettingAuth(true);
    document.cookie.split(";").forEach(function(c) {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    window.open('https://myaccount.google.com/permissions', '_blank');
    toast({
      title: "Reset Permissions",
      description: "Please find 'MailMop' in the list of apps, click on it and select 'Remove Access', then return to this page and sign in again.",
      duration: 10000,
    });
    setTimeout(() => {
      setIsResettingAuth(false);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Decorative Elements */}
      <div className="fixed bottom-0 left-0 w-1/3 h-64 bg-blue-500/5 rounded-tr-full -z-10"></div>
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-100/30 via-transparent to-transparent dark:from-gray-900/20 dark:via-transparent dark:to-transparent -z-20"></div>
      
      {/* Navbar */}
      <nav className="container mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex items-center">
          <div className="w-32 h-auto">
            <img 
              src="/images/logo.png" 
              alt="MailMop Logo" 
              className="w-full object-contain"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <a 
            href="https://github.com/neilbhammar/mailmop" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground h-10 px-4 rounded-md border border-gray-200 hover:border-gray-300 transition-colors"
          >
            <Github className="h-5 w-5 mr-2" />
            GitHub
          </a>
          <GoogleLoginButton onSuccess={onSignIn} />
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-12 pb-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 max-w-2xl">
              <div className="inline-flex items-center px-3 py-1 mb-6 text-sm font-medium rounded-full bg-gradient-to-r from-gray-900 to-blue-900 text-white">
                <Code size={16} className="mr-2" /> Open Source
              </div>
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
                Take Control of Your Inbox. <span className="text-blue-600">For Free.</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                MailMop helps you identify <span className="font-medium text-foreground">which senders</span> are cluttering your inbox, 
                so you can clean them out and reclaim your digital space.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Button 
                  onClick={() => document.getElementById('request-access')?.scrollIntoView({ behavior: 'smooth' })}
                  className="relative p-[1px] bg-gradient-to-r from-blue-600 to-violet-600 rounded-md hover:opacity-90"
                >
                  <div className="bg-white rounded-md px-4 py-2 h-full">
                    <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
                      Request Access to MailMop
                    </span>
                  </div>
                </Button>
              </div>
              
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center">
                  <Shield size={16} className="mr-2 text-primary" />
                  <span>Privacy-first</span>
                </div>
                <div className="flex items-center">
                  <Check size={16} className="mr-2 text-primary" />
                  <span>100% Free</span>
                </div>
                <div className="flex items-center">
                  <Zap size={16} className="mr-2 text-primary" />
                  <span>Setup in seconds</span>
                </div>
              </div>
            </div>
            
            <div className="md:col-span-2 order-1 md:order-2 flex justify-center items-center">
              <div className="relative w-full max-w-[650px] aspect-[16/9] md:aspect-auto">
                <img 
                  src="/images/hero.png" 
                  alt="MailMop Dashboard" 
                  className="w-full h-full object-contain rounded-lg shadow-none"
                />
                
                {/* Play button overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <button 
                    onClick={() => setShowVideo(true)}
                    className="flex flex-col items-center"
                  >
                    <div className="w-16 h-16 rounded-full bg-white/90 shadow-lg flex items-center justify-center mb-2 hover:scale-105 transition-transform">
                      <Play className="h-8 w-8 text-primary ml-1" />
                    </div>
                    <span className="font-medium text-sm px-3 py-1 bg-white/90 rounded-full shadow-md">See MailMop in Action</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Video Modal */}
      <Dialog open={showVideo} onOpenChange={setShowVideo}>
        <DialogContent className="p-0 border-none bg-transparent max-w-[80vw]">
          <iframe 
            src="https://www.youtube.com/embed/IfTeb3zfTL4?si=hND8Y9IHwdbf0Czu&autoplay=0&controls=0" 
            title="YouTube video player" 
            className="w-full h-[500px]" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
            allowFullScreen
          />
        </DialogContent>
      </Dialog>

      {/* How it Works Section */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-3">How MailMop Works</h2>
          <p className="text-gray-600 text-center text-xl mb-10">Clean up your inbox in four simple steps</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: <Mail className="w-6 h-6" />,
                title: "Connect Your Email",
                description: "Securely connect your Gmail account with read-only access to analyze your inbox",
                gradient: "from-blue-500 to-blue-600"
              },
              {
                icon: <Shield className="w-6 h-6" />,
                title: "Select Preferences",
                description: "Choose what types of emails you want to analyze and set your filtering criteria",
                gradient: "from-violet-500 to-violet-600"
              },
              {
                icon: <BarChart3 className="w-6 h-6" />,
                title: "Analyze Inbox",
                description: "Our intelligent email analysis identifies patterns and shows you who's filling your inbox",
                gradient: "from-emerald-500 to-emerald-600"
              },
              {
                icon: <Zap className="w-6 h-6" />,
                title: "Take Action",
                description: "Easily unsubscribe or create rules to manage your email subscriptions",
                gradient: "from-orange-500 to-orange-600"
              }
            ].map((step, i) => (
              <div key={i} className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
                <div className={`bg-gradient-to-r ${step.gradient} text-white p-3 rounded-xl inline-block mb-4`}>
                  {step.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why MailMop Section */}
      <section className="py-12 pt-8 container mx-auto px-4">
        <div className="relative">
          {/* Background decoration */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-blue-100/50 blur-3xl"></div>
            <div className="absolute left-0 bottom-0 h-64 w-64 rounded-full bg-violet-100/50 blur-3xl"></div>
          </div>

          <div className="text-center relative">
            <h2 className="mt-8 text-4xl font-bold mb-3">Why MailMop</h2>
            <p className="text-gray-600 text-xl mb-12 max-w-2xl mx-auto">
              I built MailMop to take back my personal inbox after years of it being buried in newsletter and promotional emails. Hopefully you find it helpful too!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <Lock className="w-6 h-6" />,
                title: "100% Browser-Based",
                description: "MailMop runs entirely in your browser. No data leaves your device, ensuring maximum privacy and security.",
                gradient: "from-blue-500 to-blue-600"
              },
              {
                icon: <BarChart2 className="w-6 h-6" />,
                title: "Advanced Analysis",
                description: "Identify exactly who's sending you the most emails with our detailed sender analytics and visualization tools.",
                gradient: "from-violet-500 to-violet-600"
              },
              {
                icon: <Zap className="w-6 h-6" />,
                title: "Quick Setup",
                description: "Sign in with Google, set your preferences, and get immediate insights into your inbox clutter.",
                gradient: "from-orange-500 to-orange-600"
              },
              {
                icon: <Sparkles className="w-6 h-6" />,
                title: "Easy Cleanup",
                description: "Quickly identify and unsubscribe from unwanted senders with just a few clicks.",
                gradient: "from-emerald-500 to-emerald-600"
              },
              {
                icon: <Code2 className="w-6 h-6" />,
                title: "Open Source",
                description: "MailMop is completely open source. View our code on GitHub to see exactly how we protect your privacy.",
                gradient: "from-indigo-500 to-indigo-600"
              },
              {
                icon: <Download className="w-6 h-6" />,
                title: "Exportable Data",
                description: "Download your analysis as a CSV file for further processing or record keeping.",
                gradient: "from-rose-500 to-rose-600"
              }
            ].map((feature, i) => (
              <div key={i} className="group relative bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
                <div className={`bg-gradient-to-r ${feature.gradient} text-white p-3 rounded-xl inline-block mb-4`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2 group-hover:text-blue-600 transition-colors">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy First Section */}
      <section className="relative py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-50 to-white -z-10"></div>
        {/* Decorative elements */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/4 top-1/4 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl"></div>
          <div className="absolute right-1/4 bottom-1/4 w-96 h-96 bg-violet-100/50 rounded-full blur-3xl"></div>
        </div>

        <div className="container mx-auto px-4">
          <div className="bg-white/80 backdrop-blur-lg rounded-3xl p-12 max-w-4xl mx-auto shadow-xl border border-gray-100">
            <div className="text-center">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-blue-600 to-violet-600 text-white font-medium text-sm mb-6">
                <Shield className="w-4 h-4 mr-2" /> Your Data Stays With You
              </div>
              <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
                Privacy First, Always
              </h2>
              <p className="text-gray-600 text-lg mb-8 max-w-2xl mx-auto">
                MailMop runs entirely in your browser - your data never leaves your device.
                Our code is open source and available on GitHub, so you can verify exactly
                how we handle your information.
              </p>
              <div className="flex items-center justify-center gap-4">
                <Button variant="default" className="bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700" 
                  onClick={() => window.open('https://github.com/neilbhammar/mailmop', '_blank')}>
                  <Github className="mr-2 h-4 w-4" /> View on GitHub
                </Button>
                <Button variant="outline" className="border-2" onClick={() => window.open('https://support.google.com/accounts/answer/3466521', '_blank')}>
                  Reset permissions
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Request Access Section */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Request Access</h2>
            <p className="text-gray-600 text-lg">
              Due to Gmail API restrictions, we need to add you to our test user list.
            </p>
          </div>

          <div className="bg-gradient-to-r from-gray-50 to-white rounded-3xl p-10 shadow-lg border border-gray-100">
            <div className="text-center">
              <p className="text-gray-800 text-lg mb-6">
                To keep MailMop free, we have to add you to a whitelisted set of users. 
                Send an email with the subject "MailMop" to:
              </p>
              <div className="bg-white inline-flex items-center gap-3 px-6 py-4 rounded-2xl shadow-sm border border-gray-100 max-w-full overflow-hidden">
                <Mail className="h-6 w-6 text-blue-600 flex-shrink-0" />
                <span className="font-mono text-lg md:text-xl font-medium truncate">hi@neilbhammar.com</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="ml-2 flex-shrink-0"
                  onClick={() => navigator.clipboard.writeText('hi@neilbhammar.com')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <img src="/images/logo.png" alt="MailMop Logo" className="h-10 w-auto" />
              <p className="text-sm text-muted-foreground mt-2">
                © {new Date().getFullYear()} MailMop. All rights reserved.
              </p>
            </div>
            <div className="flex gap-8">
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms</a>
              <a 
                href="https://github.com/neilbhammar/mailmop" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LoginPage;
