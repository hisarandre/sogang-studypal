import { Link } from "react-router-dom";
import React from "react";

interface ButtonProps {
  navigateTo: string;
  buttonText: React.ReactNode;
  variant?: "filled" | "outline";
}

export default function Btn({ navigateTo, buttonText, variant = "filled" }: ButtonProps) {
  return (
    <Link
      to={navigateTo}
      className={`button ${variant === "outline" ? "button-outline" : ""}`}
    >
      {buttonText}
    </Link>
  );
}