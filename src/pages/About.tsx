import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Shield, Users, Award, Heart, CheckCircle, ArrowRight } from "lucide-react";

const About = () => {
  return (
    <Layout>
      <Helmet>
        <title>About Us - Cedar City Roofing Guide | Trusted Roofer Directory</title>
        <meta
          name="description"
          content="Learn about Cedar City Roofing Guide's mission to connect homeowners with verified, trusted roofing contractors in Iron County, Utah."
        />
        <link rel="canonical" href="https://cedarcityroofingguide.com/about" />
      </Helmet>

      {/* Hero */}
      <section className="py-16 md:py-24 bg-trust">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-display text-4xl md:text-5xl font-bold text-primary-foreground mb-6">
              About Cedar City Roofing Guide
            </h1>
            <p className="text-lg text-primary-foreground/80">
              Your trusted resource for finding verified, top-rated roofing contractors in Cedar City and Iron County, Utah.
            </p>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
                Our Mission
              </h2>
              <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
                Finding a trustworthy roofer shouldn't be stressful. That's why we created Cedar City Roofing Guide – to help homeowners in our community connect with reliable, verified roofing contractors they can trust.
              </p>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                As lifelong Cedar City residents, we understand the unique challenges of maintaining a home in Southern Utah. From intense summer heat to occasional storms and winter weather, your roof works hard to protect your family.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Our goal is simple: make it easy for you to find the best local roofers, compare options, and make informed decisions about your home. We do the research so you don't have to.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-6">
              {[
                { icon: Shield, label: "Verified Contractors", value: "100%" },
                { icon: Users, label: "Homeowners Helped", value: "1,000+" },
                { icon: Award, label: "Years Experience", value: "10+" },
                { icon: Heart, label: "Satisfaction Rate", value: "98%" },
              ].map((stat, index) => (
                <div
                  key={index}
                  className="bg-card rounded-xl p-6 border border-border text-center"
                >
                  <stat.icon className="w-8 h-8 mx-auto mb-3 text-accent" />
                  <p className="font-display text-3xl font-bold text-foreground mb-1">
                    {stat.value}
                  </p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-24 bg-warm">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              How Our Guide Works
            </h2>
            <p className="text-muted-foreground">
              A simple process to connect you with the right roofer
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                step: "1",
                title: "Submit Your Request",
                description:
                  "Tell us about your roofing needs – whether it's repairs, replacement, or inspection. It only takes 2 minutes.",
              },
              {
                step: "2",
                title: "Get Matched",
                description:
                  "We connect you with our top-rated, verified roofers who specialize in your type of project.",
              },
              {
                step: "3",
                title: "Compare & Choose",
                description:
                  "Receive free quotes, compare options, and choose the contractor that's right for you. No obligation.",
              },
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 rounded-full bg-accent text-accent-foreground flex items-center justify-center mx-auto mb-4 font-display text-2xl font-bold">
                  {item.step}
                </div>
                <h3 className="font-display text-xl font-bold text-foreground mb-2">
                  {item.title}
                </h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Verification Process */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
                Our Verification Standards
              </h2>
              <p className="text-muted-foreground">
                Every contractor in our guide meets strict criteria
              </p>
            </div>

            <div className="space-y-4">
              {[
                {
                  title: "Licensed & Registered",
                  description:
                    "Valid Utah contractor license verified with the state Division of Occupational and Professional Licensing.",
                },
                {
                  title: "Fully Insured",
                  description:
                    "General liability insurance and workers' compensation coverage to protect you from any liability.",
                },
                {
                  title: "BBB Accredited",
                  description:
                    "A+ rating or better with the Better Business Bureau, with a track record of resolving customer concerns.",
                },
                {
                  title: "Proven Track Record",
                  description:
                    "Minimum 5 years of experience serving Cedar City and Iron County with verifiable references.",
                },
                {
                  title: "Customer Reviews",
                  description:
                    "4.5+ star average rating across Google, Yelp, and other review platforms from real customers.",
                },
              ].map((item, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 bg-card rounded-xl p-6 border border-border"
                >
                  <CheckCircle className="w-6 h-6 text-success shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">
                      {item.title}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 bg-accent-gradient">
        <div className="container text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-accent-foreground mb-4">
            Ready to Find Your Perfect Roofer?
          </h2>
          <p className="text-accent-foreground/90 text-lg mb-8 max-w-2xl mx-auto">
            Join thousands of Cedar City homeowners who've found trusted contractors through our guide.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="trust" size="xl" asChild>
              <Link to="/#quote">
                Get Free Quote
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="bg-accent-foreground/10 border-accent-foreground/30 text-accent-foreground hover:bg-accent-foreground/20"
              asChild
            >
              <Link to="/contact">Contact Us</Link>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default About;
