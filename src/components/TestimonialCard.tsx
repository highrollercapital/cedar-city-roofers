import { Star, Quote } from "lucide-react";

interface TestimonialCardProps {
  name: string;
  location: string;
  rating: number;
  text: string;
  date: string;
}

const TestimonialCard = ({
  name,
  location,
  rating,
  text,
  date,
}: TestimonialCardProps) => {
  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-trust/10 flex items-center justify-center shrink-0">
          <Quote className="w-5 h-5 text-trust" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1 mb-2">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${
                  i < rating
                    ? "fill-roof text-roof"
                    : "fill-muted text-muted"
                }`}
              />
            ))}
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed mb-4">
            "{text}"
          </p>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-foreground text-sm">{name}</p>
              <p className="text-xs text-muted-foreground">{location}</p>
            </div>
            <span className="text-xs text-muted-foreground">{date}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestimonialCard;
