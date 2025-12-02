import { Helmet } from "react-helmet-async";
import Layout from "@/components/layout/Layout";

const Terms = () => {
  return (
    <Layout>
      <Helmet>
        <title>Terms of Service - Cedar City Roofing Guide</title>
        <meta name="description" content="Terms of service for Cedar City Roofing Guide. Please read these terms carefully before using our website." />
      </Helmet>

      <section className="py-16 md:py-24 bg-background">
        <div className="container">
          <div className="max-w-3xl mx-auto prose prose-slate">
            <h1 className="font-display">Terms of Service</h1>
            <p className="lead">Last updated: December 1, 2025</p>

            <h2>Acceptance of Terms</h2>
            <p>
              By accessing and using Cedar City Roofing Guide, you agree to be bound by these Terms of Service and all applicable laws and regulations.
            </p>

            <h2>Our Service</h2>
            <p>
              Cedar City Roofing Guide is a free service that connects homeowners with roofing contractors. We do not perform roofing work ourselves and are not responsible for the work performed by contractors in our network.
            </p>

            <h2>Contractor Information</h2>
            <p>
              While we make every effort to verify contractors in our network, we cannot guarantee the quality of work or services provided. We recommend that users:
            </p>
            <ul>
              <li>Verify contractor licenses and insurance independently</li>
              <li>Get multiple quotes before making a decision</li>
              <li>Review contracts carefully before signing</li>
              <li>Check references and reviews</li>
            </ul>

            <h2>Limitation of Liability</h2>
            <p>
              Cedar City Roofing Guide shall not be liable for any damages arising from the use of our service or any transactions between users and contractors.
            </p>

            <h2>Intellectual Property</h2>
            <p>
              All content on this website, including text, graphics, logos, and images, is the property of Cedar City Roofing Guide and is protected by copyright laws.
            </p>

            <h2>Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting to this website.
            </p>

            <h2>Contact</h2>
            <p>
              Questions about these terms can be directed to:
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

export default Terms;
