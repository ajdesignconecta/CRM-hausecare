"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type PageBackProps = {
  className?: string;
  buttonClassName?: string;
  fallbackHref?: string;
  label?: string;
};

export function PageBack({
  className,
  buttonClassName,
  fallbackHref = "/dashboard",
  label = "Voltar"
}: PageBackProps) {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(fallbackHref);
  };

  return (
    <div className={cn(className)}>
      <Button
        type="button"
        variant="secondary"
        className={cn("rounded-xl px-5 py-2.5", buttonClassName)}
        onClick={handleBack}
      >
        {label}
      </Button>
    </div>
  );
}
