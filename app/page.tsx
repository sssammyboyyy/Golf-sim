import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, MapPin, Trophy, Target, Sparkles, CheckCircle2, Phone, Star, Check } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border/40 bg-background sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Logo Section */}
            <Link href="/" className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <Image
                src="/images/upscalelogomulligan.jpeg"
                alt="The Mulligan Logo"
                width={60}
                height={60}
                className="object-contain w-12 h-12 sm:w-[60px] sm:h-[60px]"
              />
              <span className="font-serif text-lg sm:text-xl lg:text-2xl font-bold text-foreground">The Mulligan</span>
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

      <section className="relative bg-primary text-primary-foreground py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/golf-simulator-bay-with-augusta-national-on-screen.jpg')] bg-cover bg-center opacity-20" />
        {/* Subtle animated light effect */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-glow" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl font-bold mb-6 text-balance leading-tight">
              The Simulator Never Judges
            </h1>
            <p className="text-lg md:text-2xl mb-8 text-primary-foreground/90 leading-relaxed max-w-2xl mx-auto">
              Premium Pro Tee experience. Play Augusta National (and many more), compete in challenges, and refine your
              game in Vanderbijlpark's finest simulator facility.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90 text-base h-14 px-8"
              >
                <Link href="/booking">Book an Hour</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="bg-transparent border-2 border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary h-14 px-8"
              >
                <Link href="#special-offer">4-Ball Special: R100/person</Link>
              </Button>
            </div>
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
                  R100 per person/hour
                </CardTitle>
                <CardDescription className="text-base sm:text-lg text-muted-foreground">
                  Play iconic courses like Augusta National, Pebble Beach, and Pine Valley  
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6 pb-6 sm:pb-8">
                <div className="grid gap-3 sm:gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-secondary/20 flex items-center justify-center mt-0.5">
                      <Check className="w-3 h-3 sm:w-4 sm:h-4 text-secondary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm sm:text-base">4 Players Required</p>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Minimum booking of 4 players</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-secondary/20 flex items-center justify-center mt-0.5">
                      <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-secondary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm sm:text-base">Minimum 3 Hours</p>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                        Extended play for full 18-hole rounds
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-secondary/20 flex items-center justify-center mt-0.5">
                      <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-secondary" />
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
                    Total: R1,200 for 3 hours (R400 deposit, R800 in-store)
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
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
              { step: "2", title: "Pick Your Time", desc: "Book online in 60 seconds or walk in and pay at terminal" },
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
                  <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Target className="w-7 h-7 text-primary" />
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
                  <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Sparkles className="w-7 h-7 text-primary" />
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
                  <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Trophy className="w-7 h-7 text-primary" />
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
              Perfect for practice rounds and casual play
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
                  <div className="w-14 h-14 rounded-lg bg-secondary/20 flex items-center justify-center mb-4">
                    <Trophy className="w-7 h-7 text-secondary" />
                  </div>
                  <h3 className="font-semibold text-xl mb-2 text-foreground">Longest Drive Challenge</h3>
                  <p className="text-muted-foreground leading-relaxed"></p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-lg bg-secondary/20 flex items-center justify-center mb-4">
                    <Star className="w-7 h-7 text-secondary" />
                  </div>
                  <h3 className="font-semibold text-xl mb-2 text-foreground">Hole-in-One Challenge</h3>
                  <p className="text-muted-foreground leading-relaxed"></p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-lg bg-secondary/20 flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-7 h-7 text-secondary" />
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
                Walk-ins welcome • Book online for guaranteed bay • Mon-Sat 9AM-8PM
              </p>
            </div>

            <Card className="mb-8">
              <CardContent className="pt-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-secondary mt-1" />
                      <div>
                        <p className="font-semibold text-foreground">Location</p>
                        <p className="text-sm text-muted-foreground">38A Chopin St, Vanderbijlpark S. W. 5</p>
                        <p className="text-sm text-muted-foreground">Vanderbijlpark, 1911, South Africa</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-secondary mt-1" />
                      <div>
                        <p className="font-semibold text-foreground">Operating Hours</p>
                        <p className="text-sm text-muted-foreground">Monday - Saturday: 9AM - 8PM</p>
                        <p className="text-sm text-muted-foreground">Sunday: Closed</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 text-secondary mt-1" />
                      <div>
                        <p className="font-semibold text-foreground">Payment Options</p>
                        <p className="text-sm text-muted-foreground">Book online or pay via Yoco terminal on-site</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-6 flex items-center justify-center">
                    <div className="text-center">
                      <MapPin className="w-12 h-12 text-secondary mx-auto mb-3" />
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
              <p className="text-sm font-semibold text-foreground mb-1">Mon-Sat: 9AM - 8PM</p>
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
