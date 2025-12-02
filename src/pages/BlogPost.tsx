import { Helmet } from "react-helmet-async";
import { useParams, Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import LeadCaptureForm from "@/components/LeadCaptureForm";
import { ArrowLeft, Calendar, Clock, User, ArrowRight } from "lucide-react";
import stormDamageImg from "@/assets/blog-storm-damage.jpg";
import roofingMaterialsImg from "@/assets/blog-roofing-materials.jpg";
import roofCostImg from "@/assets/blog-roof-cost.jpg";

const blogContent: Record<string, {
  title: string;
  metaDescription: string;
  date: string;
  readTime: string;
  author: string;
  image: string;
  content: React.ReactNode;
}> = {
  "roof-damage-storm": {
    title: "How to Spot Roof Damage After a Storm in Cedar City",
    metaDescription: "Learn the telltale signs of storm damage to your roof and when it's time to call a professional roofing contractor in Cedar City, Utah.",
    date: "December 1, 2025",
    readTime: "6 min read",
    author: "Cedar City Roofing Guide",
    image: stormDamageImg,
    content: (
      <>
        <p className="lead">
          Living in Cedar City, Utah, means dealing with unpredictable weather – from intense summer thunderstorms to heavy winter snow. After any major weather event, it's crucial to inspect your roof for damage. Here's how to spot the warning signs and when to call a professional Cedar City roofer.
        </p>

        <h2>Common Signs of Storm Damage</h2>
        <p>
          After a storm passes through Iron County, take time to safely inspect your property. Here are the most common signs of roof damage that Cedar City homeowners should look for:
        </p>

        <h3>1. Missing or Damaged Shingles</h3>
        <p>
          High winds can tear shingles completely off your roof or cause them to lift and crack. Look for bare spots on your roof, shingles in your yard, or shingles that appear curled or buckling. In Cedar City's climate, this damage can quickly lead to leaks if not addressed.
        </p>

        <h3>2. Hail Damage</h3>
        <p>
          Southern Utah experiences occasional hailstorms that can cause significant roof damage. Look for dents in metal flashing, cracked or bruised shingles, and damaged gutters. Hail damage isn't always visible from the ground, which is why a professional inspection is recommended.
        </p>

        <h3>3. Debris Impact</h3>
        <p>
          Tree branches and other debris can puncture or crack roofing materials during storms. Check for any visible holes, torn underlayment, or debris still lodged on your roof.
        </p>

        <h3>4. Water Stains Inside</h3>
        <p>
          Sometimes the first sign of roof damage appears inside your home. Check your attic and ceilings for water stains, dampness, or mold growth – all indicators that water is getting through your roof.
        </p>

        <h2>What to Do After Finding Damage</h2>
        <p>
          If you notice any of these signs, take action quickly:
        </p>
        <ul>
          <li><strong>Document everything:</strong> Take photos and videos of all visible damage for insurance purposes.</li>
          <li><strong>Prevent further damage:</strong> If safe, cover any holes with tarps to prevent water intrusion.</li>
          <li><strong>Contact your insurance:</strong> Report the damage to start the claims process.</li>
          <li><strong>Get professional inspection:</strong> Have a licensed Cedar City roofer assess the full extent of the damage.</li>
        </ul>

        <h2>Why Choose a Local Cedar City Roofer?</h2>
        <p>
          Local roofing contractors understand the unique challenges of Cedar City's climate. They know which materials perform best in our desert environment and have experience dealing with our specific weather patterns. Plus, local roofers can respond quickly after storms when you need help most.
        </p>

        <div className="bg-warm rounded-xl p-6 my-8 border border-border">
          <h3 className="text-lg font-bold mb-2">Need a Roof Inspection?</h3>
          <p className="text-muted-foreground mb-4">
            Our verified Cedar City roofers offer free storm damage inspections. Get matched with a trusted contractor today.
          </p>
          <Button variant="cta" asChild>
            <Link to="/#quote">Get Free Inspection</Link>
          </Button>
        </div>

        <h2>Preventing Future Storm Damage</h2>
        <p>
          While you can't control the weather, you can prepare your roof for it:
        </p>
        <ul>
          <li>Schedule annual roof inspections</li>
          <li>Trim trees near your home</li>
          <li>Ensure gutters are clear and properly attached</li>
          <li>Address minor repairs before they become major issues</li>
          <li>Consider impact-resistant roofing materials</li>
        </ul>

        <h2>Conclusion</h2>
        <p>
          Storm damage to your roof can lead to costly repairs if left unaddressed. By knowing what to look for and acting quickly, Cedar City homeowners can protect their investment and keep their families safe. When in doubt, always consult with a professional roofing contractor who can provide an expert assessment.
        </p>
      </>
    ),
  },
  "roofing-materials": {
    title: "Top 3 Roofing Materials for Homes in Southern Utah",
    metaDescription: "Discover which roofing materials perform best in Utah's desert climate and why local roofers recommend them for Cedar City homes.",
    date: "November 28, 2025",
    readTime: "8 min read",
    author: "Cedar City Roofing Guide",
    image: roofingMaterialsImg,
    content: (
      <>
        <p className="lead">
          Choosing the right roofing material for your Cedar City home is more than just an aesthetic decision – it's about performance, durability, and value. Here are the top three roofing materials recommended by local contractors for Southern Utah's unique climate.
        </p>

        <h2>1. Asphalt Shingles</h2>
        <p>
          Asphalt shingles remain the most popular roofing choice in Cedar City, and for good reason. They offer an excellent balance of affordability, durability, and aesthetic versatility.
        </p>
        
        <h3>Why They Work in Cedar City:</h3>
        <ul>
          <li>Modern architectural shingles resist UV damage</li>
          <li>Available in light colors that reflect heat</li>
          <li>Easy to repair and replace</li>
          <li>25-30 year lifespan with proper maintenance</li>
        </ul>
        
        <p>
          <strong>Cost:</strong> $3.50 - $5.50 per square foot installed<br />
          <strong>Best for:</strong> Budget-conscious homeowners, traditional home styles
        </p>

        <h2>2. Metal Roofing</h2>
        <p>
          Metal roofing has grown increasingly popular in Cedar City thanks to its exceptional durability and energy efficiency. Standing seam and metal tile options are particularly well-suited to our climate.
        </p>
        
        <h3>Why They Work in Cedar City:</h3>
        <ul>
          <li>Reflects solar heat, reducing cooling costs by 10-25%</li>
          <li>Withstands high winds and hail</li>
          <li>50+ year lifespan</li>
          <li>Excellent for snow shedding</li>
          <li>Fire-resistant (important in wildfire-prone areas)</li>
        </ul>
        
        <p>
          <strong>Cost:</strong> $7.00 - $14.00 per square foot installed<br />
          <strong>Best for:</strong> Long-term homeowners, energy-conscious buyers, modern homes
        </p>

        <h2>3. Concrete Tile</h2>
        <p>
          Concrete tile roofing offers a distinctive look that's particularly popular in Southwestern architecture. These tiles are incredibly durable and handle Cedar City's temperature extremes well.
        </p>
        
        <h3>Why They Work in Cedar City:</h3>
        <ul>
          <li>Exceptional thermal mass for temperature regulation</li>
          <li>Can last 50+ years</li>
          <li>Resistant to fire, wind, and insects</li>
          <li>Available in various colors and profiles</li>
        </ul>
        
        <p>
          <strong>Cost:</strong> $9.00 - $18.00 per square foot installed<br />
          <strong>Best for:</strong> Spanish/Mediterranean style homes, luxury properties
        </p>

        <h2>Factors to Consider</h2>
        <p>
          When choosing a roofing material for your Cedar City home, consider:
        </p>
        <ul>
          <li><strong>Your budget:</strong> Both upfront and long-term costs</li>
          <li><strong>Home style:</strong> Some materials suit certain architectural styles better</li>
          <li><strong>HOA requirements:</strong> Check any neighborhood restrictions</li>
          <li><strong>Energy efficiency:</strong> Light colors and reflective materials save on cooling</li>
          <li><strong>Maintenance needs:</strong> How much upkeep can you commit to?</li>
        </ul>

        <div className="bg-warm rounded-xl p-6 my-8 border border-border">
          <h3 className="text-lg font-bold mb-2">Not Sure Which Material Is Right for You?</h3>
          <p className="text-muted-foreground mb-4">
            Get free advice from verified Cedar City roofing contractors who can assess your home and recommend the best option.
          </p>
          <Button variant="cta" asChild>
            <Link to="/#quote">Get Expert Recommendations</Link>
          </Button>
        </div>

        <h2>Conclusion</h2>
        <p>
          The best roofing material for your Cedar City home depends on your specific needs, budget, and preferences. All three options discussed here perform well in Southern Utah's climate when properly installed by a qualified contractor. Consider getting quotes for multiple materials to make an informed decision.
        </p>
      </>
    ),
  },
  "roof-repair-cost": {
    title: "Cedar City Roof Repair Cost: What to Expect in 2026",
    metaDescription: "A comprehensive breakdown of roof repair and replacement costs in Cedar City, with tips for getting the best value from local contractors.",
    date: "November 25, 2025",
    readTime: "7 min read",
    author: "Cedar City Roofing Guide",
    image: roofCostImg,
    content: (
      <>
        <p className="lead">
          Whether you need a minor repair or a complete roof replacement, understanding costs helps you budget appropriately and avoid being overcharged. Here's a comprehensive guide to roofing costs in Cedar City for 2026.
        </p>

        <h2>Average Roof Repair Costs in Cedar City</h2>
        <p>
          Minor to moderate roof repairs in Cedar City typically range from <strong>$300 to $1,500</strong>, depending on the type and extent of damage. Here's a breakdown:
        </p>

        <h3>Common Repair Costs:</h3>
        <ul>
          <li><strong>Shingle replacement (small area):</strong> $150 - $400</li>
          <li><strong>Leak repair:</strong> $300 - $1,000</li>
          <li><strong>Flashing repair:</strong> $200 - $500</li>
          <li><strong>Vent boot replacement:</strong> $150 - $300</li>
          <li><strong>Gutter repair:</strong> $100 - $400</li>
          <li><strong>Valley repair:</strong> $400 - $1,000</li>
        </ul>

        <h2>Roof Replacement Costs</h2>
        <p>
          A complete roof replacement in Cedar City ranges from <strong>$8,000 to $25,000+</strong> for an average-sized home (1,500-2,500 sq ft). Factors affecting price include:
        </p>

        <h3>Cost by Material:</h3>
        <ul>
          <li><strong>3-tab asphalt shingles:</strong> $6,000 - $12,000</li>
          <li><strong>Architectural shingles:</strong> $8,000 - $16,000</li>
          <li><strong>Metal roofing:</strong> $15,000 - $30,000</li>
          <li><strong>Concrete tile:</strong> $18,000 - $35,000</li>
        </ul>

        <h2>Factors That Affect Your Quote</h2>
        <p>
          Several factors can impact your final roofing cost:
        </p>
        <ul>
          <li><strong>Roof size and pitch:</strong> Steeper roofs require more labor and safety equipment</li>
          <li><strong>Number of layers:</strong> Removing old roofing adds to disposal costs</li>
          <li><strong>Accessibility:</strong> Multi-story homes or difficult access points increase labor</li>
          <li><strong>Structural repairs:</strong> Damaged decking or rafters need replacement</li>
          <li><strong>Time of year:</strong> Spring and fall are peak seasons</li>
          <li><strong>Material choices:</strong> Premium materials cost more but last longer</li>
        </ul>

        <h2>How to Get the Best Value</h2>
        <p>
          Follow these tips to ensure you're getting fair pricing:
        </p>
        <ul>
          <li><strong>Get multiple quotes:</strong> Compare at least 3 estimates</li>
          <li><strong>Check for hidden costs:</strong> Ensure quotes include cleanup and disposal</li>
          <li><strong>Ask about warranties:</strong> Both material and labor warranties matter</li>
          <li><strong>Verify licensing and insurance:</strong> Protects you from liability</li>
          <li><strong>Look for financing options:</strong> Many roofers offer payment plans</li>
          <li><strong>Consider timing:</strong> Off-season work may be cheaper</li>
        </ul>

        <div className="bg-warm rounded-xl p-6 my-8 border border-border">
          <h3 className="text-lg font-bold mb-2">Get Free, No-Obligation Quotes</h3>
          <p className="text-muted-foreground mb-4">
            Compare prices from verified Cedar City roofers. Our contractors provide detailed, transparent estimates.
          </p>
          <Button variant="cta" asChild>
            <Link to="/#quote">Get Free Quotes Now</Link>
          </Button>
        </div>

        <h2>Red Flags to Watch For</h2>
        <p>
          Be cautious of contractors who:
        </p>
        <ul>
          <li>Offer quotes significantly below others (may cut corners)</li>
          <li>Require large upfront payments</li>
          <li>Pressure you to sign immediately</li>
          <li>Can't provide proof of insurance or licensing</li>
          <li>Won't provide a written contract</li>
        </ul>

        <h2>Conclusion</h2>
        <p>
          Understanding roofing costs helps you make informed decisions and avoid surprises. While price is important, remember that the cheapest option isn't always the best value. Invest in quality materials and experienced contractors to protect your home for decades to come.
        </p>
      </>
    ),
  },
};

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? blogContent[slug] : null;

  if (!post) {
    return (
      <Layout>
        <div className="container py-24 text-center">
          <h1 className="font-display text-3xl font-bold mb-4">Post Not Found</h1>
          <p className="text-muted-foreground mb-8">The article you're looking for doesn't exist.</p>
          <Button variant="cta" asChild>
            <Link to="/blog">Back to Blog</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Helmet>
        <title>{post.title} | Cedar City Roofing Guide</title>
        <meta name="description" content={post.metaDescription} />
        <link rel="canonical" href={`https://cedarcityroofingguide.com/blog/${slug}`} />
      </Helmet>

      <article>
        {/* Hero */}
        <header className="relative py-16 md:py-24 bg-trust">
          <div className="container">
            <Link
              to="/blog"
              className="inline-flex items-center gap-2 text-primary-foreground/80 hover:text-primary-foreground mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Blog
            </Link>
            <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-6 max-w-4xl">
              {post.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-primary-foreground/80 text-sm">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                {post.author}
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {post.date}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {post.readTime}
              </div>
            </div>
          </div>
        </header>

        {/* Featured Image */}
        <div className="container -mt-8 relative z-10">
          <img
            src={post.image}
            alt={post.title}
            className="w-full max-w-4xl mx-auto rounded-xl shadow-xl aspect-video object-cover"
          />
        </div>

        {/* Content */}
        <div className="container py-12 md:py-16">
          <div className="max-w-3xl mx-auto prose prose-lg prose-slate">
            {post.content}
          </div>
        </div>

        {/* CTA Section */}
        <section className="py-16 bg-trust">
          <div className="container">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="font-display text-2xl md:text-3xl font-bold text-primary-foreground mb-4">
                  Get Matched With the Best Roofer in Cedar City Today
                </h2>
                <p className="text-primary-foreground/80">
                  Ready to start your roofing project? Fill out the form below for free quotes from verified local contractors.
                </p>
              </div>
              <div className="bg-card rounded-2xl p-6 md:p-10 shadow-xl">
                <LeadCaptureForm variant="compact" />
              </div>
            </div>
          </div>
        </section>

        {/* Related Posts */}
        <section className="py-16 bg-background">
          <div className="container">
            <h2 className="font-display text-2xl font-bold text-foreground mb-8">
              Related Articles
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Object.entries(blogContent)
                .filter(([key]) => key !== slug)
                .slice(0, 3)
                .map(([key, relatedPost]) => (
                  <Link
                    key={key}
                    to={`/blog/${key}`}
                    className="bg-card rounded-xl p-6 border border-border hover:shadow-lg transition-shadow group"
                  >
                    <h3 className="font-display text-lg font-bold text-foreground mb-2 group-hover:text-accent transition-colors line-clamp-2">
                      {relatedPost.title}
                    </h3>
                    <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                      {relatedPost.metaDescription}
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
      </article>
    </Layout>
  );
};

export default BlogPost;
