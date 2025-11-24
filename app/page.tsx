import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, MapPin, Trophy, Target, Sparkles, CheckCircle2, Phone, ArrowRight, Star } from 'lucide-react'
import { BayStatusDisplay } from "@/components/bay-status-display"

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/mulligan-logo.jpg" alt="The Mulligan Logo" width={70} height={70} className="object-contain" />
            <div className="flex flex-col">
              <span className="font-serif text-xl font-bold text-foreground leading-tight">The Mulligan</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                The Simulator Never Judges
              </span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <nav className="flex items-center gap-6">
              <Link
                href="#pricing"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Pricing
              </Link>
              <Link
                href="#features"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Pro Tee
              </Link>
              <Link
                href="#location"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Location
              </Link>
              <Button asChild size="sm" className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
                <Link href="/booking">Book an Hour</Link>
              </Button>
            </nav>
          </div>
          <div className="md:hidden">
            <Button asChild size="sm" className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
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
              Premium Pro Tee experience. Play Augusta National (and many more), compete in challenges, and refine your game in
              Vanderbijlpark's finest simulator facility.
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

      <section id="special-offer" className="py-16 md:py-24 bg-gradient-to-br from-secondary/10 to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <Card className="border-2 border-secondary shadow-2xl overflow-hidden">
              <div className="grid md:grid-cols-2 gap-0">
                <div className="relative h-64 md:h-auto">
                  <Image
                    src="/aerial-view-of-augusta-national-golf-course.jpg"
                    alt="Augusta National Famous Course"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute top-4 left-4">
                    <Badge className="bg-secondary text-secondary-foreground border-0 text-sm px-3 py-1">
                      <Sparkles className="w-4 h-4 mr-1" />
                      Famous Course Special
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-8 md:p-10 flex flex-col justify-center">
                  <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4 text-foreground">
                    18-Hole Famous Course
                    <br />
                    <span className="text-secondary">4-Ball Special</span>
                  </h2>
                  <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
                    Experience Pro Tee's legendary courses including Augusta National with our exclusive group rate.
                  </p>
                  <div className="space-y-4 mb-8">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-6 h-6 text-secondary mt-1 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-foreground text-lg">R100 per person / hour</p>
                        <p className="text-sm text-muted-foreground">4 players required • 3-hour minimum</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-6 h-6 text-secondary mt-1 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-foreground">Deposit: R400 (balance in-store)</p>
                        <p className="text-sm text-muted-foreground">Total: R1,200 for 3 hours • Pay R800 on arrival</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-6 h-6 text-secondary mt-1 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-foreground">GS Pro Software Included</p>
                        <p className="text-sm text-muted-foreground">
                          Industry-leading simulation with 400+ courses
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button
                    asChild
                    size="lg"
                    className="bg-secondary text-secondary-foreground hover:bg-secondary/90 w-full md:w-auto"
                  >
                    <Link href="/booking">
                      Book 4-Ball Special
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </CardContent>
              </div>
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
              Experience GS Pro's industry-leading golf simulation platform with 400+ championship courses and photorealistic graphics
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
                    Play the world's most famous courses including Augusta National, St Andrews, Pebble Beach, and more with GS Pro
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
                    Immersive 4K graphics with dynamic lighting, weather effects, and authentic course details powered by GS Pro
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
                    Track every metric including carry distance, spin rates, ball speed, and launch angle with professional-grade accuracy
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="pricing" className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4 text-foreground">Transparent Pricing</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Choose the experience that suits your game
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-12">
            {/* Famous Course Pricing */}
            <Card className="border-2 border-secondary shadow-lg">
              <CardContent className="pt-6">
                <div className="text-center mb-6">
                  <Badge className="mb-3 bg-secondary text-secondary-foreground border-0">Famous Courses</Badge>
                  <h3 className="font-serif text-2xl font-bold text-foreground mb-2">18-Hole Experience</h3>
                  <p className="text-sm text-muted-foreground">Augusta National & other legendary courses</p>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-secondary/10 rounded-lg border border-secondary/20">
                    <div>
                      <p className="font-semibold text-foreground">4-Ball Special</p>
                      <p className="text-xs text-muted-foreground">R100/person/hour • 3-hour minimum</p>
                    </div>
                    <p className="font-serif text-2xl font-bold text-secondary">R1,200</p>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-semibold text-foreground">3-Ball</p>
                      <p className="text-xs text-muted-foreground">R120/person/hour • 2-hour minimum</p>
                    </div>
                    <p className="font-serif text-2xl font-bold text-foreground">R720</p>
                  </div>
                  <div className="mt-4 p-3 bg-secondary/5 border border-secondary/20 rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      <strong>4-Ball:</strong> R400 deposit online, R800 balance in-store<br />
                      <strong>3-Ball:</strong> R300 deposit online, R420 balance in-store
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Play Pricing */}
            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="text-center mb-6">
                  <Badge className="mb-3 bg-primary/10 text-primary border-0">Quick Play</Badge>
                  <h3 className="font-serif text-2xl font-bold text-foreground mb-2">Skills & Challenges</h3>
                  <p className="text-sm text-muted-foreground">Practice range, nearest-pin, all courses</p>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                      <p className="text-sm text-muted-foreground mb-1">1 Player</p>
                      <p className="font-serif text-xl font-bold text-foreground">R250</p>
                      <p className="text-xs text-muted-foreground">per hour</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                      <p className="text-sm text-muted-foreground mb-1">2 Players</p>
                      <p className="font-serif text-xl font-bold text-foreground">R360</p>
                      <p className="text-xs text-muted-foreground">per hour</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                      <p className="text-sm text-muted-foreground mb-1">3 Players</p>
                      <p className="font-serif text-xl font-bold text-foreground">R480</p>
                      <p className="text-xs text-muted-foreground">per hour</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                      <p className="text-sm text-muted-foreground mb-1">4 Players</p>
                      <p className="font-serif text-xl font-bold text-foreground">R600</p>
                      <p className="text-xs text-muted-foreground">per hour</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="max-w-5xl mx-auto">
            <h3 className="font-serif text-2xl font-bold text-center mb-8 text-foreground">
              Pro Tee Challenges & Practice Modes
            </h3>
            <div className="grid md:grid-cols-4 gap-4">
              {[
                { name: "Nearest to Pin", icon: Target },
                { name: "Hole-in-One", icon: Trophy },
                { name: "Practice Range", icon: Sparkles },
                { name: "Skills Challenge", icon: CheckCircle2 },
              ].map((mode) => (
                <Card key={mode.name} className="border-border">
                  <CardContent className="pt-4 pb-4 text-center">
                    <mode.icon className="w-8 h-8 text-primary mx-auto mb-2" />
                    <p className="font-medium text-foreground text-sm">{mode.name}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="text-center text-muted-foreground mt-6 text-sm">
              All challenges included with Quick Play sessions • No minimum booking times
            </p>
          </div>

          <div className="text-center mt-10">
            <Button
              asChild
              size="lg"
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90 h-14 px-8"
            >
              <Link href="/booking">Book Your Session Now</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-8 md:py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <BayStatusDisplay />
        </div>
      </section>

      <section id="competitions" className="py-12 md:py-20 bg-muted/30">
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
                  <p className="text-muted-foreground leading-relaxed">Monthly winner gets R2000 voucher</p>
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
                  <p className="text-muted-foreground leading-relaxed">Instant prizes on designated holes</p>
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
          <div className="text-center mt-8">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/footerimage-7hzqyOq1LxxFegvl7lltVLQIKdT79D.jpeg"
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
                src="/mulligan-logo.jpg"
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
