import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How do you verify the roofers on your list?",
    answer:
      "We thoroughly vet each roofing company by checking their licensing, insurance, Better Business Bureau rating, and customer reviews. We also verify they have at least 5 years of experience serving Cedar City and Iron County.",
  },
  {
    question: "Is it really free to get matched with a roofer?",
    answer:
      "Yes, our service is 100% free for homeowners. We're compensated by roofing companies when they receive quality leads, which means you never pay a dime to use our matching service.",
  },
  {
    question: "How long does it take to get quotes?",
    answer:
      "Most homeowners receive their first quote within 24-48 hours of submitting their request. During busy storm seasons, it may take slightly longer, but we always prioritize getting you connected quickly.",
  },
  {
    question: "What types of roofing services can I request?",
    answer:
      "Our network of Cedar City roofers handles everything from minor repairs and inspections to complete roof replacements, storm damage restoration, and new construction roofing. Whether you need asphalt shingles, metal roofing, or tile, we can connect you with the right specialist.",
  },
  {
    question: "Do you serve areas outside Cedar City?",
    answer:
      "Yes! While we specialize in Cedar City, our network of roofers serves the entire Iron County area, including Enoch, Parowan, and surrounding communities in Southern Utah.",
  },
  {
    question: "What should I look for when choosing a roofer?",
    answer:
      "Key factors include proper licensing and insurance, positive reviews, experience with your roof type, transparent pricing, and a solid warranty. All roofers in our Top 5 list meet these criteria.",
  },
  {
    question: "How much does a new roof cost in Cedar City?",
    answer:
      "Roof replacement costs in Cedar City typically range from $8,000 to $25,000+ depending on roof size, materials, and complexity. Our roofers provide free, no-obligation estimates so you can compare prices.",
  },
  {
    question: "Do Cedar City roofers offer financing?",
    answer:
      "Many of our verified roofers offer flexible financing options, including 0% APR plans for qualified homeowners. Ask about financing when you receive your quotes.",
  },
];

const FAQSection = () => {
  return (
    <section id="faq" className="py-16 md:py-24 bg-warm">
      <div className="container">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground">
            Get answers to common questions about finding the best roofers in Cedar City.
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-card rounded-lg border border-border px-6 data-[state=open]:shadow-md transition-shadow"
              >
                <AccordionTrigger className="text-left font-semibold hover:text-accent hover:no-underline py-4">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>

      {/* FAQ Schema Markup */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: {
                "@type": "Answer",
                text: faq.answer,
              },
            })),
          }),
        }}
      />
    </section>
  );
};

export default FAQSection;
