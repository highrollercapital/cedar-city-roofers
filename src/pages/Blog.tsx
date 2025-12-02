import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import BlogCard from "@/components/BlogCard";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import stormDamageImg from "@/assets/blog-storm-damage.jpg";
import roofingMaterialsImg from "@/assets/blog-roofing-materials.jpg";
import roofCostImg from "@/assets/blog-roof-cost.jpg";

const blogPosts = [
  {
    slug: "roof-damage-storm",
    title: "How to Spot Roof Damage After a Storm in Cedar City",
    excerpt: "Learn the telltale signs of storm damage to your roof and when it's time to call a professional roofing contractor in Cedar City, Utah.",
    image: stormDamageImg,
    date: "Dec 1, 2025",
    readTime: "6 min read",
    category: "Storm Damage",
  },
  {
    slug: "roofing-materials",
    title: "Top 3 Roofing Materials for Homes in Southern Utah",
    excerpt: "Discover which roofing materials perform best in Utah's desert climate and why local roofers recommend them for Cedar City homes.",
    image: roofingMaterialsImg,
    date: "Nov 28, 2025",
    readTime: "8 min read",
    category: "Materials",
  },
  {
    slug: "roof-repair-cost",
    title: "Cedar City Roof Repair Cost: What to Expect in 2026",
    excerpt: "A comprehensive breakdown of roof repair and replacement costs in Cedar City, with tips for getting the best value from local contractors.",
    image: roofCostImg,
    date: "Nov 25, 2025",
    readTime: "7 min read",
    category: "Cost Guide",
  },
  {
    slug: "choosing-roofer",
    title: "5 Questions to Ask Before Hiring a Cedar City Roofer",
    excerpt: "Make sure you're hiring the right contractor by asking these essential questions before signing any roofing contract.",
    image: stormDamageImg,
    date: "Nov 20, 2025",
    readTime: "5 min read",
    category: "Hiring Tips",
  },
  {
    slug: "winter-roof-maintenance",
    title: "Winter Roof Maintenance Tips for Utah Homeowners",
    excerpt: "Prepare your roof for Utah's harsh winter weather with these essential maintenance tips from local roofing experts.",
    image: roofingMaterialsImg,
    date: "Nov 15, 2025",
    readTime: "6 min read",
    category: "Maintenance",
  },
  {
    slug: "insurance-claims",
    title: "Navigating Roof Insurance Claims in Cedar City",
    excerpt: "Everything you need to know about filing insurance claims for roof damage in Utah, plus how local roofers can help.",
    image: roofCostImg,
    date: "Nov 10, 2025",
    readTime: "9 min read",
    category: "Insurance",
  },
];

const Blog = () => {
  return (
    <Layout>
      <Helmet>
        <title>Roofing Blog - Cedar City Roofing Tips & Resources | Cedar City Roofing Guide</title>
        <meta
          name="description"
          content="Expert roofing tips, cost guides, and maintenance advice for Cedar City, Utah homeowners. Learn about roof repair, materials, and finding trusted contractors."
        />
        <meta name="keywords" content="Cedar City roofing blog, roof repair tips, roofing materials Utah, roof maintenance Cedar City" />
        <link rel="canonical" href="https://cedarcityroofingguide.com/blog" />
      </Helmet>

      {/* Hero */}
      <section className="py-16 md:py-24 bg-trust">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-display text-4xl md:text-5xl font-bold text-primary-foreground mb-6">
              Roofing Tips & Resources
            </h1>
            <p className="text-lg text-primary-foreground/80 mb-8">
              Expert advice, cost guides, and maintenance tips to help Cedar City homeowners make informed decisions about their roofs.
            </p>
            <Button variant="hero" asChild>
              <Link to="/#quote">Get Free Roofing Quote</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Blog Grid */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogPosts.map((post, index) => (
              <div
                key={post.slug}
                className="animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <BlogCard {...post} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-warm">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">
              Need a Roofer Right Now?
            </h2>
            <p className="text-muted-foreground mb-6">
              Skip the research and get matched with verified Cedar City roofers in minutes.
            </p>
            <Button variant="cta" size="lg" asChild>
              <Link to="/#quote">
                Get Matched With The Best Roofer
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Blog;
