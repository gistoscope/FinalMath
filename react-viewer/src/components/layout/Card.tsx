import React, { type ReactNode } from "react";

interface CardProps {
  title: string;
  children: ReactNode;
  footerNote?: string;
  className?: string;
}

const Card: React.FC<CardProps> = ({
  title,
  children,
  footerNote,
  className = "",
}) => {
  return (
    <section className={`card ${className}`}>
      <h2>{title}</h2>
      {children}
      {footerNote && <div className="footer-note">{footerNote}</div>}
    </section>
  );
};

export default Card;
