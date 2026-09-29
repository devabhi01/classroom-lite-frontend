import React from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, LogIn, Presentation, Edit3, Monitor, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';

export const Home: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const isStudent = user?.role === 'STUDENT';

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Hero Section */}
      <section className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center sm:px-6 lg:px-8">
        <div className="max-w-3xl space-y-6">
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
            Classroom-Focused & Minimal
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl sm:leading-tight">
            TDP Classroom <span className="text-primary">Lite</span>
          </h1>

          <p className="text-xl font-medium text-muted-foreground sm:text-2xl">
            "Teach. Share. Learn."
          </p>

          <p className="mx-auto max-w-xl text-sm sm:text-base text-muted-foreground">
            A fast, distraction-free virtual classroom environment featuring interactive collaborative whiteboards, synchronized PDF slide presentations, and low-latency WebRTC screen sharing.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            {!isStudent && (
              <Link to={isAuthenticated ? '/create-classroom' : '/login?redirect=/create-classroom'} className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto font-semibold shadow-md">
                  <PlusCircle className="mr-2 h-5 w-5" />
                  Create Classroom
                </Button>
              </Link>
            )}

            <Link to={isAuthenticated ? '/join-classroom' : '/login?redirect=/join-classroom'} className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto font-semibold">
                <LogIn className="mr-2 h-5 w-5" />
                Join Classroom
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="border-t border-border bg-card/40 py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Built for seamless online teaching
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Everything educators and students need, without unnecessary bloat or complex menus.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border border-border/80 bg-card hover:border-primary/40 transition-colors">
              <CardContent className="pt-6">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <Edit3 className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-base mb-2">Real-Time Whiteboard</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Collaborative vector drawing using pointer events and HTML5 Canvas with pen, eraser, colors, and zero screenshot transmission.
                </p>
              </CardContent>
            </Card>

            <Card className="border border-border/80 bg-card hover:border-primary/40 transition-colors">
              <CardContent className="pt-6">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center mb-4">
                  <Presentation className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-base mb-2">Synchronized PDF Viewer</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Host controls slide progression and zoom, while all connected students follow along in lockstep with synchronized page states.
                </p>
              </CardContent>
            </Card>

            <Card className="border border-border/80 bg-card hover:border-primary/40 transition-colors">
              <CardContent className="pt-6">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-4">
                  <Monitor className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-base mb-2">WebRTC Screen Sharing</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Peer-to-peer screen streaming powered by modern browser WebRTC APIs and NestJS Socket.IO signaling for ultra-low latency.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Host/Student Flow Summary */}
          <div className="mt-12 rounded-xl border border-border bg-background p-6">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-5 w-5 text-primary" />
              <h4 className="text-sm font-semibold">Moderated Room Access</h4>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Hosts maintain complete classroom privacy with instant approval and rejection of student join requests, live participant lists, and one-click classroom closure.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
