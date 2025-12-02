import { Link } from "react-router-dom";
import { Calendar, Clock, ArrowRight } from "lucide-react";

interface BlogCardProps {
  slug: string;
  title: string;
  excerpt: string;
  image: string;
  date: string;
  readTime: string;
  category: string;
}

const BlogCard = ({
  slug,
  title,
  excerpt,
  image,
  date,
  readTime,
  category,
}: BlogCardProps) => {
  return (
    <article className="group bg-card rounded-xl border border-border overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
      <Link to={`/blog/${slug}`} className="block">
        <div className="aspect-video overflow-hidden bg-muted">
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      </Link>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs font-semibold text-accent uppercase tracking-wide">
            {category}
          </span>
          <span className="text-muted-foreground">•</span>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            {date}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {readTime}
          </div>
        </div>
        <Link to={`/blog/${slug}`}>
          <h3 className="font-display text-xl font-bold text-foreground mb-2 group-hover:text-accent transition-colors line-clamp-2">
            {title}
          </h3>
        </Link>
        <p className="text-muted-foreground text-sm leading-relaxed mb-4 line-clamp-2">
          {excerpt}
        </p>
        <Link
          to={`/blog/${slug}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-accent hover:gap-3 transition-all"
        >
          Read More
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </article>
  );
};

export default BlogCard;
