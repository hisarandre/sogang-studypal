import { Link } from "react-router-dom";
import React from "react";

interface TagProps {
  text: string;
}

export default function Tag({ text }: TagProps) {
  return (
    <span className="bg-primary/10 text-primary text-xs font-semibold px-2.5 py-0.5 rounded-full mb-4">
      {text}
    </span>
  );
}