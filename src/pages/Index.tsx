import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Shield, Clock, CheckCircle, Users, Award, ArrowRight } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import RooferCard from "@/components/RooferCard";
import LeadCaptureForm from "@/components/LeadCaptureForm";
import FAQSection from "@/components/FAQSection";
import TestimonialCard from "@/components/TestimonialCard";
import heroImage from "@/assets/hero-roofing.jpg";

const roofers = [
  {
    rank: 1,
    name: "Summit Roofing Cedar City",
    description: "Family-owned roofing company with over 20 years of experience serving Cedar City and Iron County. Known for exceptional craftsmanship and customer service.",
    services: ["Roof Replacement", "Storm Damage", "Metal Roofing", "Inspections"],
    rating: 4.9,
    reviewCount: 287,
    phone: "(435) 555-0101",
    yearsInBusiness: 22,
  },
  {
    rank: 2,
    name: "Red Rock Roofing & Construction",
    description: "Full-service roofing contractor specializing in residential and commercial projects. GAF Master Elite certified with industry-leading warranties.",
    services: ["Commercial Roofing", "Residential", "Flat Roofs", "Repairs"],
    rating: 4.8,
    reviewCount: 234,
    phone: "(435) 555-0102",
    yearsInBusiness: 15,
  },
  {
    rank: 3,
    name: "Iron County Roofing Pros",
    description: "Local experts in Southern Utah roofing challenges. Fast response times and competitive pricing with no hidden fees.",
    services: ["Emergency Repairs", "Shingle Roofing", "Tile Roofing", "Gutters"],
    rating: 4.8,
    reviewCount: 198,
    phone: "(435) 555-0103",
    yearsInBusiness: 12,
  },
  {
    rank: 4,
    name: "Desert View Roofing",
    description: "Specializing in energy-efficient roofing solutions perfect for Utah's desert climate. Cool roofs and solar-ready installations.",
    services: ["Cool Roofs", "Solar Ready", "Asphalt Shingles", "Maintenance"],
    rating: 4.7,
    reviewCount: 156,
    phone: "(435) 555-0104",
    yearsInBusiness: 10,
  },
  {
    rank: 5,
    name: "Cedar Valley Roofers",
    description: "Budget-friendly roofing solutions without compromising quality. Financing options available for qualifying homeowners.",
    services: ["Affordable Repairs", "Re-Roofing", "Insurance Claims", "Skylights"],
    rating: 4.7,
    reviewCount: 142,
    phone: "(435) 555-0105",
    yearsInBusiness: 8,
  },
];

const testimonials = [
  {
    name: "Michael S.",
    location: "Cedar City, UT",
    rating: 5,
    text: "Found an amazing roofer through this guide after a hailstorm damaged our roof. They responded within hours and handled everything including the insurance claim.",
    date: "Nov 2025",
  },
  {
    name: "Sarah T.",
    location: "Enoch, UT",
    rating: 5,
    text: "As a first-time homeowner, I had no idea how to find a reliable roofer. This guide made it so easy - got three quotes within 48 hours!",
    date: "Oct 2025",
  },
  {
    name: "David M.",
    location: "Cedar City, UT",
    rating: 5,
    text: "The roofer I was matched with did excellent work on our complete roof replacement. Fair price and finished ahead of schedule.",
    date: "Sep 2025",
  },
];

const Index = () => {
  return (
    <Layout>
      <Helmet>
        <title>Cedar City Roofers – Top Rated Roofing Companies 2026</title>
        <meta
          name="description"
          content="Looking for a reliable roofer in Cedar City, Utah? Our verified top 5 list helps homeowners choose the best local roofing companies. Get free quotes today!"
        />
        <meta name="keywords" content="Cedar City roofers, roof repair Cedar City, best roofing companies Cedar City, roof replacement Cedar City Utah" />
        <link rel="canonical" href="https://cedarcityroofingguide.com/" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            "name": "Cedar City Roofing Guide",
            "description": "Connecting Cedar City homeowners with verified, top-rated roofing contractors.",
            "address": {
              "@type": "PostalAddress",
              "streetAddress": "123 Main Street",
              "addressLocality": "Cedar City",
              "addressRegion": "UT",
              "postalCode": "84720"
            },
            "telephone": "(435) 555-1234",
            "areaServed": "Cedar City, Utah"
          })}
        </script>
      </Helmet>

      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src={heroImage}
            alt="Beautiful home with new roof in Cedar City Utah"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-hero-gradient opacity-80" />
        </div>

        <div className="container relative z-10 py-16 md:py-24">
          <div className="max-w-2xl animate-fade-in-up">
            <div className="inline-flex items-center gap-2 bg-accent/20 text-accent-foreground px-4 py-2 rounded-full text-sm font-semibold mb-6">
              <Award className="w-4 h-4" />
              Trusted by 1,000+ Cedar City Homeowners
            </div>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-6 leading-tight">
              Top 5 Cedar City Roofers – Verified & Rated 2026
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/90 mb-8 leading-relaxed">
              We help homeowners find reliable roofing companies fast. Compare verified contractors, read real reviews, and get matched with the perfect roofer for your project.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="hero" size="xl" asChild>
                <a href="#quote">Get Your Free Roofing Quote</a>
              </Button>
              <Button variant="outline" size="lg" className="bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/20" asChild>
                <a href="#roofers">View Top 5 Roofers</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-8 bg-card border-b border-border">
        <div className="container">
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Shield className="w-6 h-6 text-success" />
              <span className="text-sm font-medium">Verified Contractors</span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <CheckCircle className="w-6 h-6 text-success" />
              <span className="text-sm font-medium">Licensed & Insured</span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <Clock className="w-6 h-6 text-success" />
              <span className="text-sm font-medium">24-48hr Response</span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <Users className="w-6 h-6 text-success" />
              <span className="text-sm font-medium">1,000+ Matches Made</span>
            </div>
          </div>
        </div>
      </section>

      {/* Top 5 Roofers Section */}
      <section id="roofers" className="py-16 md:py-24 bg-background">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Top 5 Roofing Companies in Cedar City
            </h2>
            <p className="text-muted-foreground text-lg">
              Our handpicked list of the best local roofers, verified for quality, reliability, and customer satisfaction.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roofers.map((roofer, index) => (
              <div
                key={roofer.rank}
                className="animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <RooferCard {...roofer} />
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-muted-foreground mb-4">
              Not sure which roofer is right for you?
            </p>
            <Button variant="cta" size="lg" asChild>
              <a href="#quote">
                Get Matched With The Best Roofer
                <ArrowRight className="w-4 h-4" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Why Use Our Guide */}
      <section className="py-16 md:py-24 bg-warm">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
                Why Use Our Cedar City Roofing Guide?
              </h2>
              <p className="text-muted-foreground mb-8 text-lg leading-relaxed">
                Finding a trustworthy roofer shouldn't be a gamble. We've done the research so you don't have to. Every contractor in our guide is thoroughly vetted and verified.
              </p>
              <ul className="space-y-4">
                {[
                  "Rigorous 5-point verification process",
                  "Real reviews from Cedar City homeowners",
                  "BBB accredited contractors only",
                  "No cost or obligation to you",
                  "Local experts who know Utah roofing",
                ].map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-success mt-0.5 shrink-0" />
                    <span className="text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-card rounded-2xl p-8 shadow-lg border border-border">
              <h3 className="font-display text-2xl font-bold text-foreground mb-2">
                Our Verification Process
              </h3>
              <p className="text-muted-foreground mb-6">
                Every roofer must pass these checks:
              </p>
              <div className="space-y-4">
                {[
                  { title: "License Verification", desc: "Valid Utah contractor license" },
                  { title: "Insurance Check", desc: "Liability & workers' comp coverage" },
                  { title: "BBB Rating", desc: "A+ rating or better" },
                  { title: "Review Analysis", desc: "4.5+ stars across platforms" },
                  { title: "Experience", desc: "5+ years in Cedar City area" },
                ].map((check, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-background rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-success">{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{check.title}</p>
                      <p className="text-sm text-muted-foreground">{check.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Lead Capture Form */}
      <section id="quote" className="py-16 md:py-24 bg-trust">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
                Get Your Free Roofing Quote
              </h2>
              <p className="text-primary-foreground/80 text-lg">
                Fill out the form below and we'll match you with the best Cedar City roofers for your project. No obligation, completely free.
              </p>
            </div>
            <div className="bg-card rounded-2xl p-6 md:p-10 shadow-xl">
              <LeadCaptureForm />
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              What Cedar City Homeowners Say
            </h2>
            <p className="text-muted-foreground">
              Real reviews from real people who found their perfect roofer through our guide.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <TestimonialCard {...testimonial} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Blog Preview */}
      <section className="py-16 md:py-24 bg-warm">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-12">
            <div>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
                Roofing Tips & Resources
              </h2>
              <p className="text-muted-foreground">
                Expert advice for Cedar City homeowners
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link to="/blog">
                View All Articles
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: "How to Spot Roof Damage After a Storm in Cedar City",
                excerpt: "Learn the warning signs of storm damage and when to call a professional...",
                link: "/blog/roof-damage-storm",
              },
              {
                title: "Top 3 Roofing Materials for Homes in Southern Utah",
                excerpt: "Discover which roofing materials perform best in Utah's desert climate...",
                link: "/blog/roofing-materials",
              },
              {
                title: "Cedar City Roof Repair Cost: What to Expect in 2026",
                excerpt: "A comprehensive guide to roofing costs in the Cedar City area...",
                link: "/blog/roof-repair-cost",
              },
            ].map((post, index) => (
              <Link
                key={index}
                to={post.link}
                className="bg-card rounded-xl p-6 border border-border hover:shadow-lg transition-shadow group"
              >
                <h3 className="font-display text-lg font-bold text-foreground mb-2 group-hover:text-accent transition-colors">
                  {post.title}
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {post.excerpt}
                </p>
                <span className="text-sm font-semibold text-accent inline-flex items-center gap-2">
                  Read More
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <FAQSection />

      {/* Final CTA */}
      <section className="py-16 md:py-24 bg-accent-gradient">
        <div className="container text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-accent-foreground mb-4">
            Ready to Find Your Perfect Roofer?
          </h2>
          <p className="text-accent-foreground/90 text-lg mb-8 max-w-2xl mx-auto">
            Join over 1,000 Cedar City homeowners who found trusted roofing contractors through our guide.
          </p>
          <Button variant="trust" size="xl" asChild>
            <a href="#quote">Get Matched Today – It's Free!</a>
          </Button>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
