import { Helmet } from "react-helmet-async";
import Layout from "@/components/layout/Layout";

const Privacy = () => {
  return (
    <Layout>
      <Helmet>
        <title>Privacy Policy - Cedar City Roofing Guide</title>
        <meta name="description" content="Privacy policy for Cedar City Roofing Guide. Learn how we collect, use, and protect your personal information." />
      </Helmet>

      <section className="py-16 md:py-24 bg-background">
        <div className="container">
          <div className="max-w-3xl mx-auto prose prose-slate">
            <h1 className="font-display">Privacy Policy</h1>
            <p className="lead">Last updated: December 1, 2025</p>

            <h2>Information We Collect</h2>
            <p>
              When you use Cedar City Roofing Guide, we may collect the following information:
            </p>
            <ul>
              <li>Name, email address, and phone number when you submit a quote request</li>
              <li>Information about your roofing needs and project details</li>
              <li>Usage data including pages visited and time spent on site</li>
              <li>Device and browser information for analytics purposes</li>
            </ul>

            <h2>How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul>
              <li>Connect you with qualified roofing contractors in Cedar City</li>
              <li>Respond to your inquiries and provide customer support</li>
              <li>Improve our website and services</li>
              <li>Send relevant updates about your roofing project</li>
            </ul>

            <h2>Information Sharing</h2>
            <p>
              We share your contact information with verified roofing contractors in our network to provide you with quotes. We do not sell your personal information to third parties for marketing purposes.
            </p>

            <h2>Data Security</h2>
            <p>
              We implement appropriate security measures to protect your personal information from unauthorized access, alteration, or disclosure.
            </p>

            <h2>Your Rights</h2>
            <p>You have the right to:</p>
            <ul>
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of your information</li>
              <li>Opt out of marketing communications</li>
            </ul>

            <h2>Contact Us</h2>
            <p>
              If you have questions about this privacy policy, please contact us at:
              <br />
              Email: info@cedarcityroofers.com
              <br />
              Phone: (435) 555-1234
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Privacy;
