import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, MapPin, Trophy, Target, Sparkles, CheckCircle2, Phone, Star, Check } from "lucide-react"
import BayStatusDisplay from "@/components/BayStatusDisplay"

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border/40 bg-background/95 backdrop-blur-sm sticky top-0 z-50 shadow-md">
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex items-center justify-between gap-4">
            {/* Logo Section - SIGNIFICANTLY LARGER */}
            <Link href="/" className="flex items-center gap-3 sm:gap-4 flex-shrink-0 group">
              <Image
                src="/images/upscalelogomulligan.jpeg"
                alt="The Mulligan Logo"
                width={90}
                height={90}
                className="object-contain w-16 h-16 sm:w-20 sm:h-20 lg:w-[90px] lg:h-[90px] transition-transform duration-300 group-hover:scale-105"
                priority
              />
              <span className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
                The Mulligan
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-6 xl:gap-8">
              <Link
                href="#pricing"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200 relative group"
              >
                Pricing
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-secondary transition-all duration-300 group-hover:w-full" />
              </Link>
              <Link
                href="#features"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200 relative group"
              >
                Benefits
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-secondary transition-all duration-300 group-hover:w-full" />
              </Link>
              <Link
                href="#location"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200 relative group"
              >
                Location
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-secondary transition-all duration-300 group-hover:w-full" />
              </Link>
              <Button
                asChild
                className="bg-secondary text-white hover:bg-secondary/90 font-medium shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
              >
                <Link href="/booking">Book</Link>
              </Button>
            </nav>

            {/* Mobile/Tablet Book Button */}
            <Button
              asChild
              size="sm"
              className="lg:hidden bg-secondary text-white hover:bg-secondary/90 font-medium shadow-md"
            >
              <Link href="/booking">Book</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative bg-gradient-to-br from-primary via-primary/95 to-primary/80 text-primary-foreground py-24 md:py-40 lg:py-48 overflow-hidden">
        {/* Enhanced background with multiple overlays for depth */}
        <div className="absolute inset-0 bg-[url('/golf-simulator-bay-with-augusta-national-on-screen.jpg')] bg-cover bg-center opacity-30 mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-transparent to-primary/60" />

        {/* Dynamic animated elements */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-secondary/30 rounded-full blur-3xl animate-glow" />
        <div
          className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent/20 rounded-full blur-3xl animate-glow"
          style={{ animationDelay: "1s" }}
        />

        {/* Decorative golf ball pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />

        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="max-w-5xl mx-auto text-center">
            {/* Eye-catching badge */}
            <div className="inline-flex items-center gap-2 bg-secondary/20 backdrop-blur-sm border border-secondary/40 rounded-full px-6 py-3 mb-8 animate-fade-in">
              <span className="w-2 h-2 bg-secondary rounded-full animate-pulse" />
              <span className="text-sm sm:text-base font-semibold tracking-wide">
                VANDERBIJLPARK'S PREMIER SIMULATOR
              </span>
            </div>

            {/* Massive, dramatic headline */}
            <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold mb-6 text-balance leading-[1.1] tracking-tight">
              The Simulator
              <span
                className="block text-secondary mt-2 text-6xl sm:text-7xl md:text-8xl lg:text-9xl"
                style={{
                  textShadow: "0 0 40px rgba(184, 134, 66, 0.5)",
                }}
              >
                Never Judges
              </span>
            </h1>

            <p className="text-xl sm:text-2xl md:text-3xl mb-10 text-primary-foreground/95 leading-relaxed max-w-3xl mx-auto font-light">
              Premium <span className="font-semibold text-secondary">Pro Tee</span> experience with{" "}
              <span className="font-semibold">Augusta National</span> and 400+ world-class courses
            </p>

            {/* Bold, eye-catching CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center mb-12">
              <Button
                asChild
                size="lg"
                className="bg-secondary text-white hover:bg-secondary/90 text-lg h-16 px-10 rounded-full font-bold shadow-2xl hover:shadow-secondary/50 hover:scale-105 transition-all duration-300"
              >
                <Link href="/booking">
                  Book Your Session
                  <span className="ml-2 text-2xl">→</span>
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="bg-white/10 backdrop-blur-sm border-2 border-white text-white hover:bg-white hover:text-primary h-16 px-10 rounded-full font-bold shadow-xl hover:scale-105 transition-all duration-300"
              >
                <Link href="#special-offer">
                  4-Ball Special: R150/person
                  <span className="ml-2 text-xl">⚡</span>
                </Link>
              </Button>
            </div>

            {/* Social proof / trust indicators */}
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 text-sm sm:text-base text-primary-foreground/80">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-secondary" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="font-semibold">Premium Pro Tee Technology</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="font-semibold">Open Mon-Fri 9AM-8PM, Sat 8AM-8PM, Sun 10AM-4PM</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span className="font-semibold">Vanderbijlpark SW5</span>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative bottom wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg
            className="w-full h-16 sm:h-24 text-background"
            viewBox="0 0 1440 120"
            fill="currentColor"
            preserveAspectRatio="none"
          >
            <path d="M0,64L80,69.3C160,75,320,85,480,80C640,75,800,53,960,48C1120,43,1280,53,1360,58.7L1440,64L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z" />
          </svg>
        </div>
      </section>

      <section className="py-8 sm:py-12 bg-gradient-to-b from-background to-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-6">
              <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2">
                Live Bay Availability
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                Real-time status • Walk-ins welcome • Book online to guarantee your bay
              </p>
            </div>
            <BayStatusDisplay />
          </div>
        </div>
      </section>

      <section id="special-offer" className="py-12 sm:py-16 md:py-20 bg-secondary/5">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8 sm:mb-12">
              <div className="inline-block px-4 py-2 bg-secondary/10 rounded-full mb-4">
                <span className="text-secondary font-semibold text-sm sm:text-base">Special Offer</span>
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-3 sm:mb-4">
                4-Ball Famous Course Special
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed px-4">
                Experience world-renowned courses with your group. Perfect for competitive play and memorable sessions.
              </p>
            </div>

            <Card className="border-2 border-secondary/20 shadow-xl bg-card hover:shadow-2xl transition-all duration-300">
              <CardHeader className="text-center pb-4 sm:pb-6 pt-6 sm:pt-8 px-4 sm:px-6">
                <CardTitle className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2 sm:mb-3">
                  R150 per person/hour
                </CardTitle>
                <CardDescription className="text-base sm:text-lg text-muted-foreground">
                  Play iconic courses like Augusta National, Pebble Beach, and Pine Valley
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6 pb-6 sm:pb-8">
                <div className="grid gap-3 sm:gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 icon-badge-secondary">
                      <Check className="w-4 h-4 sm:w-5 sm:h-5 text-secondary icon-enhanced" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm sm:text-base">4 Players Required</p>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Minimum booking of 4 players</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 icon-badge-secondary">
                      <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-secondary icon-enhanced" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm sm:text-base">Minimum 3 Hours</p>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                        Extended play for full 18-hole rounds
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 icon-badge-secondary">
                      <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-secondary icon-enhanced" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm sm:text-base">World-Famous Courses</p>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                        Augusta, Pebble Beach, Pine Valley &amp; more
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-2 sm:pt-4">
                  <Button
                    asChild
                    size="lg"
                    className="w-full bg-secondary hover:bg-secondary/90 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] h-12 sm:h-14 text-base sm:text-lg mobile-touch-target"
                  >
                    <Link href="/booking">Book 4-Ball Special</Link>
                  </Button>
                  <p className="text-center text-xs sm:text-sm text-muted-foreground mt-3 sm:mt-4">
                    Total: R600 for 3 hours (R200 deposit, R400 in-store)
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4 text-foreground">How It Works</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Three simple steps to your perfect golf experience
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                {
                  step: "1",
                  title: "Choose Your Experience",
                  desc: "Select Famous Course 18-hole special or Quick Play for challenges and practice",
                },
                {
                  step: "2",
                  title: "Pick Your Time",
                  desc: "Book online in 60 seconds or walk in and pay at terminal",
                },
                {
                  step: "3",
                  title: "Play & Compete",
                  desc: "Enjoy Pro Tee precision and automatically enter monthly competitions",
                },
              ].map((item) => (
                <Card key={item.step} className="border-border text-center">
                  <CardContent className="pt-8 pb-6">
                    <div className="w-16 h-16 rounded-full bg-secondary/20 text-secondary text-2xl font-serif font-bold flex items-center justify-center mx-auto mb-4">
                      {item.step}
                    </div>
                    <h3 className="font-semibold text-xl mb-2 text-foreground">{item.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-primary/10 text-primary border-0">Pro Tee Technology</Badge>
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4 text-foreground">
              World-Class GS Pro Simulation
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Experience GS Pro's industry-leading golf simulation platform with 400+ championship courses and
              photorealistic graphics
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <div className="icon-container-primary w-16 h-16 flex items-center justify-center mb-4">
                    <Target className="w-8 h-8 text-white icon-enhanced" />
                  </div>
                  <h3 className="font-semibold text-xl mb-2 text-foreground">400+ Championship Courses</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Play the world's most famous courses including Augusta National, St Andrews, Pebble Beach, and more
                    with GS Pro
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <div className="icon-container-primary w-16 h-16 flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8 text-white icon-sparkle-enhanced" />
                  </div>
                  <h3 className="font-semibold text-xl mb-2 text-foreground">Photorealistic Graphics</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Immersive 4K graphics with dynamic lighting, weather effects, and authentic course details powered
                    by GS Pro
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <div className="icon-container-primary w-16 h-16 flex items-center justify-center mb-4">
                    <Trophy className="w-8 h-8 text-white icon-trophy-enhanced" />
                  </div>
                  <h3 className="font-semibold text-xl mb-2 text-foreground">Advanced Shot Analytics</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Track every metric including carry distance, spin rates, ball speed, and launch angle with
                    professional-grade accuracy
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="pricing" className="py-12 sm:py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-3 sm:mb-4">
              Quick Play Sessions
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
              Perfect for practice rounds and casual play • Add club rental for R100
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-6xl mx-auto">
            <Card className="border-border hover:border-secondary/50 transition-all duration-300 hover:shadow-lg">
              <CardHeader className="pb-3 sm:pb-4 pt-5 sm:pt-6 px-4 sm:px-6">
                <CardTitle className="text-xl sm:text-2xl font-bold text-center">1 Player</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-2 sm:space-y-3 px-4 sm:px-6 pb-5 sm:pb-6">
                <div>
                  <p className="text-3xl sm:text-4xl font-bold text-secondary">R250</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">per hour</p>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground pt-1 sm:pt-2">
                  Solo practice or focused training
                </p>
              </CardContent>
            </Card>
            <Card className="border-border hover:border-secondary/50 transition-all duration-300 hover:shadow-lg">
              <CardHeader className="pb-3 sm:pb-4 pt-5 sm:pt-6 px-4 sm:px-6">
                <CardTitle className="text-xl sm:text-2xl font-bold text-center">2 Players</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-2 sm:space-y-3 px-4 sm:px-6 pb-5 sm:pb-6">
                <div>
                  <p className="text-3xl sm:text-4xl font-bold text-secondary">R360</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">per hour</p>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground pt-1 sm:pt-2">
                  Pair up and challenge each other
                </p>
              </CardContent>
            </Card>
            <Card className="border-border hover:border-secondary/50 transition-all duration-300 hover:shadow-lg">
              <CardHeader className="pb-3 sm:pb-4 pt-5 sm:pt-6 px-4 sm:px-6">
                <CardTitle className="text-xl sm:text-2xl font-bold text-center">3 Players</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-2 sm:space-y-3 px-4 sm:px-6 pb-5 sm:pb-6">
                <div>
                  <p className="text-3xl sm:text-4xl font-bold text-secondary">R480</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">per hour</p>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground pt-1 sm:pt-2">
                  Small group play for camaraderie
                </p>
              </CardContent>
            </Card>
            <Card className="border-border hover:border-secondary/50 transition-all duration-300 hover:shadow-lg">
              <CardHeader className="pb-3 sm:pb-4 pt-5 sm:pt-6 px-4 sm:px-6">
                <CardTitle className="text-xl sm:text-2xl font-bold text-center">4 Players</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-2 sm:space-y-3 px-4 sm:px-6 pb-5 sm:pb-6">
                <div>
                  <p className="text-3xl sm:text-4xl font-bold text-secondary">R600</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">per hour</p>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground pt-1 sm:pt-2">
                  Full group play for ultimate fun
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="competitions" className="py-12 md:py-20 bg-muted/30 shadow-md">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4 text-foreground">
              Included With Every Booking: Win Real Prizes
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Compete in monthly challenges and win amazing prizes
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <div className="icon-container-secondary w-16 h-16 flex items-center justify-center mb-4">
                    <Trophy className="w-8 h-8 text-white icon-trophy-enhanced" />
                  </div>
                  <h3 className="font-semibold text-xl mb-2 text-foreground">Longest Drive Challenge</h3>
                  <p className="text-muted-foreground leading-relaxed"></p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <div className="icon-container-secondary w-16 h-16 flex items-center justify-center mb-4">
                    <Star className="w-8 h-8 text-white icon-enhanced" />
                  </div>
                  <h3 className="font-semibold text-xl mb-2 text-foreground">Hole-in-One Challenge</h3>
                  <p className="text-muted-foreground leading-relaxed"></p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <div className="icon-container-secondary w-16 h-16 flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8 text-white icon-enhanced" />
                  </div>
                  <h3 className="font-semibold text-xl mb-2 text-foreground">Closest to Pin</h3>
                  <p className="text-muted-foreground leading-relaxed">Free session for monthly champion</p>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="text-center">
            <Image
              src="/images/footerimage.jpeg"
              alt="indoor golf simulator Vanderbijlpark"
              width={800}
              height={400}
              className="rounded-lg mx-auto max-w-full h-auto"
            />
          </div>
        </div>
      </section>

      <section id="location" className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4 text-foreground">
                Visit Us in Vanderbijlpark
              </h2>
              <p className="text-muted-foreground text-lg">
                Walk-ins welcome • Book online for guaranteed bay • Mon-Fri 9AM-8PM, Sat 8AM-8PM, Sun 10AM-4PM
              </p>
            </div>

            <Card className="mb-8">
              <CardContent className="pt-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="icon-badge-secondary mt-1">
                        <MapPin className="w-5 h-5 text-secondary icon-enhanced" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">Location</p>
                        <p className="text-sm text-muted-foreground">38A Chopin St, Vanderbijlpark S. W. 5</p>
                        <p className="text-sm text-muted-foreground">Vanderbijlpark, 1911, South Africa</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="icon-badge-secondary mt-1">
                        <Clock className="w-5 h-5 text-secondary icon-enhanced" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">Operating Hours</p>
                        <p className="text-sm text-muted-foreground">Monday - Friday: 9AM - 8PM</p>
                        <p className="text-sm text-muted-foreground">Saturday: 8AM - 8PM</p>
                        <p className="text-sm text-muted-foreground">Sunday: 10AM - 4PM</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="icon-badge-secondary mt-1">
                        <Phone className="w-5 h-5 text-secondary icon-enhanced" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">Payment Options</p>
                        <p className="text-sm text-muted-foreground">Book online or pay via Yoco terminal on-site</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-6 flex items-center justify-center">
                    <div className="text-center">
                      <div className="icon-container-accent w-20 h-20 flex items-center justify-center mx-auto mb-3">
                        <MapPin className="w-10 h-10 text-secondary icon-enhanced" />
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">Find us on Google Maps</p>
                      <Button asChild variant="outline" size="sm">
                        <a
                          href="https://maps.google.com/?q=38A+Chopin+St,+Vanderbijlpark+S.+W.+5,+Vanderbijlpark,+1911,+South+Africa"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Get Directions
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-12 md:py-16 bg-primary text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 bg-[url('/golf-simulator-bay-with-augusta-national-on-screen.jpg')] bg-cover bg-center opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/80 to-primary/60" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">Ready to Experience Augusta National?</h2>
          <p className="text-lg mb-6 text-primary-foreground/90 max-w-2xl mx-auto">
            Book your bay now and play the world's most legendary golf course. Walk-ins welcome!
          </p>
          <Button asChild size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 text-base">
            <Link href="/booking">Check Availability Now</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border py-12 bg-card">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-6">
            <div className="flex items-center gap-3">
              <Image
                src="/images/upscalelogomulligan.jpeg"
                alt="The Mulligan Logo"
                width={70}
                height={70}
                className="object-contain"
              />
              <div className="flex flex-col">
                <span className="font-serif text-xl font-bold text-foreground leading-tight">The Mulligan</span>
                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                  The Simulator Never Judges
                </span>
              </div>
            </div>
            <div className="text-center md:text-right">
              <p className="text-sm font-semibold text-foreground mb-1">Mon-Fri: 9AM - 8PM</p>
              <p className="text-sm text-muted-foreground">38A Chopin St, Vanderbijlpark S. W. 5</p>
              <p className="text-sm text-muted-foreground">Vanderbijlpark, 1911</p>
            </div>
          </div>
          <div className="text-center border-t border-border pt-6">
            <p className="text-sm text-muted-foreground">
              © 2025 The Mulligan. Premium GS Pro golf simulation experience in Vanderbijlpark, Gauteng.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
