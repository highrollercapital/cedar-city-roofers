import { Star, BadgeCheck, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface RooferCardProps {
  rank: number;
  name: string;
  description: string;
  services: string[];
  rating: number;
  reviewCount: number;
  phone: string;
  yearsInBusiness: number;
}

const RooferCard = ({
  rank,
  name,
  description,
  services,
  rating,
  reviewCount,
  phone,
  yearsInBusiness,
}: RooferCardProps) => {
  return (
    <div className="relative bg-card rounded-xl border border-border shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden group">
      {/* Rank Badge */}
      <div className="absolute top-4 left-4 z-10">
        <div className="w-10 h-10 rounded-full bg-trust text-primary-foreground flex items-center justify-center font-display font-bold text-lg">
          #{rank}
        </div>
      </div>

      {/* Verified Badge */}
      <div className="absolute top-4 right-4 z-10">
        <Badge className="bg-success text-primary-foreground border-0 gap-1">
          <BadgeCheck className="w-3 h-3" />
          Verified 2026
        </Badge>
      </div>

      <div className="p-6 pt-16">
        {/* Company Name */}
        <h3 className="font-display text-xl font-bold text-foreground mb-2 group-hover:text-accent transition-colors">
          {name}
        </h3>

        {/* Rating */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${
                  i < Math.floor(rating)
                    ? "fill-roof text-roof"
                    : "fill-muted text-muted"
                }`}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-foreground">{rating}</span>
          <span className="text-sm text-muted-foreground">
            ({reviewCount} reviews)
          </span>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {description}
        </p>

        {/* Services */}
        <div className="flex flex-wrap gap-2 mb-4">
          {services.slice(0, 4).map((service) => (
            <Badge key={service} variant="secondary" className="text-xs">
              {service}
            </Badge>
          ))}
        </div>

        {/* Meta Info */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            Cedar City, UT
          </div>
          <div>{yearsInBusiness}+ years</div>
        </div>

        {/* CTA */}
        <div className="flex gap-3">
          <Button variant="cta" size="sm" className="flex-1" asChild>
            <a href="#quote">Get Quote</a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={`tel:${phone}`}>
              <Phone className="w-4 h-4" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RooferCard;
