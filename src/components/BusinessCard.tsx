import React, { useState } from 'react';
import { ArrowRight, Phone, Star, Clock, MessageSquare, Globe, MapPin } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';

interface BusinessCardProps {
  name: string;
  distance: string;
  category: string;
  status?: 'Open' | 'Closed';
  image?: string;
  icon?: React.ReactNode;
  iconBg?: string;
  iconColor?: string;
  label?: string;
  labelType?: 'top-rated' | 'new';
  neighbors?: number;
  closingTime?: string;
  hasCall?: boolean;
  onChat?: () => void;
  isMemberBusiness?: boolean;
  phone?: string;
  website?: string;
  description?: string;
  address?: string;
}

/** Sanitize website URL — only allow http/https */
const sanitizeUrl = (url: string): string | null => {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.href;
  } catch { /* invalid */ }
  return null;
};

/** Format phone for tel: link */
const formatTelLink = (phone: string): string => {
  return 'tel:' + phone.replace(/[\s\-()]/g, '');
};

export const BusinessCard: React.FC<BusinessCardProps> = ({
  name,
  distance,
  category,
  status,
  image,
  icon,
  iconBg,
  iconColor,
  label,
  labelType,
  neighbors,
  closingTime,
  hasCall,
  onChat,
  isMemberBusiness,
  phone,
  website,
  description,
  address
}) => {
  const [imgError, setImgError] = useState(false);
  const safeWebsite = website ? sanitizeUrl(website) : null;

  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      className={cn(
        "bg-white rounded-3xl p-4 flex gap-4 shadow-ambient transition-all cursor-pointer",
        isMemberBusiness 
          ? "border-2 border-purple-400/60 hover:border-purple-500 shadow-purple-100" 
          : "border border-transparent hover:border-secondary/10"
      )}
    >
      <div className={cn(
        "relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center",
        iconBg || "bg-surface-container"
      )}>
        {image && !imgError ? (
          <img 
            className="w-full h-full object-cover" 
            src={image} 
            alt={name}
            referrerPolicy="no-referrer"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className={cn("text-3xl", iconColor || "text-primary")}>
            {icon || name.charAt(0).toUpperCase()}
          </div>
        )}
        {labelType === 'top-rated' && (
          <div className="absolute top-1 left-1">
            <div className="clay-gradient text-[8px] text-white px-1.5 py-0.5 rounded-full font-bold uppercase flex items-center gap-0.5">
              <Star className="w-2 h-2 fill-current" />
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0">
        <div>
          <div className="flex justify-between items-start gap-2">
            <h3 className="font-bold text-primary text-base leading-tight font-headline truncate">{name}</h3>
            <span className="text-[10px] font-bold text-outline bg-surface-container px-2 py-0.5 rounded-full flex-shrink-0">{distance}</span>
          </div>
          <p className="text-outline text-xs mt-0.5">
            {category} • {status && (
              <span className={cn(status === 'Open' ? "text-green-600" : "text-error", "font-medium")}>
                {status}
              </span>
            )}
          </p>
          {description && (
            <p className="text-outline/70 text-[11px] mt-1 line-clamp-2 leading-relaxed">{description}</p>
          )}
          {address && (
            <p className="text-outline/50 text-[10px] mt-1 flex items-center gap-1 truncate">
              <MapPin className="w-2.5 h-2.5 flex-shrink-0" />{address}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {neighbors !== undefined ? (
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="w-5 h-5 rounded-full border-2 border-white bg-surface-container-high" />
                  ))}
                </div>
                <span className="text-[10px] text-outline font-medium">{neighbors} neighbors visited</span>
              </div>
            ) : closingTime ? (
              <p className="text-[10px] text-outline flex items-center gap-1">
                <Clock className="w-3 h-3" /> Closes {closingTime}
              </p>
            ) : label ? (
              <span className={cn(
                "text-[10px] font-medium px-2 py-0.5 rounded",
                labelType === 'top-rated' ? "text-amber-700 bg-amber-50" : "text-primary bg-primary/5"
              )}>
                {label}
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {phone && (
              <a
                href={formatTelLink(phone)}
                onClick={(e) => e.stopPropagation()}
                className="w-8 h-8 rounded-full clay-gradient text-white flex items-center justify-center shadow-ambient active:scale-95 transition-transform"
                title={`Call ${phone}`}
              >
                <Phone className="w-4 h-4" />
              </a>
            )}
            {safeWebsite && (
              <a
                href={safeWebsite}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors active:scale-95"
                title="Visit Website"
              >
                <Globe className="w-4 h-4" />
              </a>
            )}
            {onChat && (
              <button
                onClick={(e) => { e.stopPropagation(); onChat(); }}
                className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors active:scale-95"
                title={`Chat with ${name}`}
              >
                <MessageSquare className="w-4 h-4" />
              </button>
            )}
            {!phone && !safeWebsite && !onChat && (
              hasCall ? (
                <button className="w-8 h-8 rounded-full clay-gradient text-white flex items-center justify-center shadow-ambient">
                  <Phone className="w-4 h-4" />
                </button>
              ) : (
                <button className="text-primary">
                  <ArrowRight className="w-5 h-5" />
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
